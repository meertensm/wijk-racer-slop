import * as THREE from 'three'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const WORLD = new URLSearchParams(location.search).get('world') || 'urmond'
const world = await fetch(`worlds/${WORLD}.json`).then(response => response.json())

const COLORS = {
  walls:  [0xf6e3c5, 0xe8b89b, 0xdcd5c8, 0xf2c9a0, 0xc9d7e2, 0xefd5d0].map(hex => new THREE.Color(hex)),
  roofs:  [0x8b3a2f, 0x6b4a3a, 0x555a66, 0xa04a3b, 0x4a5a6a, 0x7a3f3f].map(hex => new THREE.Color(hex)),
  road:   new THREE.Color(0x4c4f57),
  path:   new THREE.Color(0xc9c1b2),
  water:  new THREE.Color(0x5fb6e6),
  grass:  new THREE.Color(0x8fd06b),
  forest: new THREE.Color(0x4f9a48),
  field:  new THREE.Color(0xd9c86a),
  ground: 0xa9d682,
  sky:    0x9fdcff
}

const CELL = 40
const CAR = { length: 3.4, width: 1.5 }
const PANDA = { topSpeed: 34, reverseSpeed: 4, acceleration: 3.4, braking: 7, wheelbase: 2.16, steeringLock: 0.55, grip: 9 }

const scene = new THREE.Scene()
scene.background = new THREE.Color(COLORS.sky)
scene.fog = new THREE.Fog(COLORS.sky, 350, 1100)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 2500)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.prepend(renderer.domElement)
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0022, defaultColor: [0.12, 0.08, 0.1] })

scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf70, 1.2))
const sun = new THREE.DirectionalLight(0xffffff, 1.5)
sun.position.set(300, 500, 200)
scene.add(sun)

const atlas = world.atlas && await new THREE.TextureLoader().loadAsync(`worlds/${world.atlas.file}`).catch(() => null)
if (atlas) {
  atlas.colorSpace = THREE.SRGBColorSpace
  atlas.anisotropy = renderer.capabilities.getMaxAnisotropy()
}

const gradient = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1)
gradient.minFilter = gradient.magFilter = THREE.NearestFilter
gradient.needsUpdate = true
const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide, map: atlas || null })
const solid = color => new THREE.MeshToonMaterial({ color, gradientMap: gradient })

function paint(geometry, color) {
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function uvFill(geometry, u, v) {
  const count = geometry.attributes.position.count
  const uvs = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) uvs.set([u, v], i * 2)
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}

function cellUv(cell) {
  const { columns, rows, cell: [width, height] } = world.atlas
  const column = cell % columns, row = Math.floor(cell / columns)
  const pad = 2
  return { u0: (column * width + pad) / (columns * width), u1: ((column + 1) * width - pad) / (columns * width),
           v0: 1 - ((row + 1) * height - pad) / (rows * height), v1: 1 - (row * height + pad) / (rows * height) }
}

function facadeQuad(facade) {
  const building = world.buildings[facade.b]
  const A = building.p[facade.e], B = building.p[(facade.e + 1) % building.p.length]
  const length = Math.hypot(B[0] - A[0], B[1] - A[1])
  let nx = (B[1] - A[1]) / length, nz = -(B[0] - A[0]) / length
  const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2
  if (inside(building.p, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz }
  const [L, R] = (B[0] - A[0]) * nz - (B[1] - A[1]) * nx > 0 ? [A, B] : [B, A]
  const lx = L[0] + nx * 0.05, lz = L[1] + nz * 0.05, rx = R[0] + nx * 0.05, rz = R[1] + nz * 0.05
  const h = building.h
  const { u0, u1, v0, v1 } = cellUv(facade.cell)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([lx, 0, lz, rx, 0, rz, rx, h, rz, lx, 0, lz, rx, h, rz, lx, h, lz], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([nx, 0, nz]).flat(), 3))
  return paint(geometry, new THREE.Color(0xffffff))
}

function flat(points, y) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0)
}

function ribbon(points, width, y) {
  const positions = [], indices = []
  const half = width / 2
  points.forEach(([x, z], i) => {
    const [px, pz] = points[Math.max(i - 1, 0)]
    const [nx, nz] = points[Math.min(i + 1, points.length - 1)]
    const length = Math.hypot(nx - px, nz - pz) || 1
    const dx = (nx - px) / length, dz = (nz - pz) / length
    positions.push(x - dz * half, y, z + dx * half, x + dz * half, y, z - dx * half)
    if (i > 0) indices.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function hipRoof(building) {
  const points = building.p
  let angle = 0, longest = 0
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length]
    const length = (nx - x) ** 2 + (nz - z) ** 2
    if (length > longest) { longest = length; angle = Math.atan2(nz - z, nx - x) }
  })
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const local = points.map(([x, z]) => [x * cos + z * sin, -x * sin + z * cos])
  const xs = local.map(p => p[0]), zs = local.map(p => p[1])
  const minX = Math.min(...xs) - 0.4, maxX = Math.max(...xs) + 0.4
  const minZ = Math.min(...zs) - 0.4, maxZ = Math.max(...zs) + 0.4
  const inset = Math.min((maxZ - minZ) / 2, (maxX - minX) / 2)
  const rise = Math.min((maxZ - minZ) * 0.45, 3.5)
  const midZ = (minZ + maxZ) / 2
  const back = ([lx, lz, y]) => [lx * cos - lz * sin, y + building.h, lx * sin + lz * cos]
  const A = back([minX, minZ, 0]), B = back([maxX, minZ, 0]), C = back([maxX, maxZ, 0]), D = back([minX, maxZ, 0])
  const R1 = back([minX + inset, midZ, rise]), R2 = back([maxX - inset, midZ, rise])
  const positions = [...A, ...B, ...R2, ...A, ...R2, ...R1, ...C, ...D, ...R1, ...C, ...R1, ...R2, ...B, ...C, ...R2, ...D, ...A, ...R1]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function buildWorld() {
  const parts = []

  world.areas.forEach(area => parts.push(paint(flat(area.p, area.kind === 'water' ? 0.03 : 0.02), COLORS[area.kind])))

  world.roads.forEach(road => {
    const y = road.kind === 'road' ? 0.06 : 0.05
    parts.push(paint(ribbon(road.p, road.w, y), COLORS[road.kind]))
    if (road.w >= 3) road.p.forEach(([x, z]) => parts.push(paint(new THREE.CircleGeometry(road.w / 2, 10).rotateX(-Math.PI / 2).translate(x, y, z), COLORS[road.kind])))
  })

  world.buildings.forEach(building => {
    const shape = new THREE.Shape(building.p.map(([x, z]) => new THREE.Vector2(x, -z)))
    parts.push(paint(new THREE.ExtrudeGeometry(shape, { depth: building.h, bevelEnabled: false }).rotateX(-Math.PI / 2), COLORS.walls[building.c]))
    if (building.roof === 'hip') parts.push(paint(hipRoof(building), COLORS.roofs[building.c]))
  })

  const white = atlas && cellUv(0)
  const geometries = parts.map(part => {
    part.deleteAttribute('uv')
    const geometry = part.index ? part.toNonIndexed() : part
    return white ? uvFill(geometry, (white.u0 + white.u1) / 2, (white.v0 + white.v1) / 2) : geometry
  })
  if (atlas) (world.facades || []).forEach(facade => geometries.push(facadeQuad(facade)))
  scene.add(new THREE.Mesh(mergeGeometries(geometries), toon))

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), solid(COLORS.ground))
  scene.add(ground)

  buildTrees()
}

function buildTrees() {
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 6).translate(0, 1, 0), solid(0x7a5230), world.trees.length)
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8, 1).translate(0, 3.4, 0), solid(0x4faa4a), world.trees.length)
  const matrix = new THREE.Matrix4()
  world.trees.forEach(([x, z], i) => {
    const scale = 0.8 + ((x * 7 + z * 13) % 10) / 20
    matrix.makeScale(scale, scale, scale).setPosition(x, 0, z)
    trunks.setMatrixAt(i, matrix)
    crowns.setMatrixAt(i, matrix)
  })
  scene.add(trunks, crowns)
}

function buildCar() {
  const car = new THREE.Group()
  const part = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid(color))
    mesh.position.set(x, y, z)
    car.add(mesh)
    return mesh
  }
  const body = 0xefe6cf, glass = 0x2b3a4a, plastic = 0x3a3a3a

  part(1.46, 0.5, 3.38, body, 0, 0.6, 0)
  part(1.42, 0.6, 2.4, body, 0, 1.15, -0.45)
  part(1.48, 0.14, 3.42, plastic, 0, 0.42, 0)
  part(1.5, 0.12, 0.12, plastic, 0, 0.45, 1.72)
  part(1.5, 0.12, 0.12, plastic, 0, 0.45, -1.72)

  for (const side of [-1, 1]) {
    part(0.02, 0.4, 0.9, glass, side * 0.72, 1.2, 0.2)
    part(0.02, 0.4, 0.95, glass, side * 0.72, 1.2, -0.9)
  }
  part(1.3, 0.42, 0.02, glass, 0, 1.2, -1.66)
  part(1.3, 0.5, 0.02, glass, 0, 1.17, 0.7).rotation.x = -0.4

  for (const x of [-0.5, 0.5]) {
    part(0.34, 0.16, 0.04, 0xfff3c4, x, 0.72, 1.7)
    part(0.12, 0.3, 0.04, 0xd32f2f, x * 1.3, 0.68, -1.7)
  }
  part(0.5, 0.14, 0.04, 0x222222, 0, 0.72, 1.7)

  const tyre = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12).rotateZ(Math.PI / 2)
  const cap = new THREE.CylinderGeometry(0.16, 0.16, 0.17, 10).rotateZ(Math.PI / 2)
  for (const [x, z] of [[-0.66, 1.08], [0.66, 1.08], [-0.66, -1.08], [0.66, -1.08]]) {
    for (const [geometry, color] of [[tyre, 0x111111], [cap, 0xbdbdbd]]) {
      const mesh = new THREE.Mesh(geometry, solid(color))
      mesh.position.set(x, 0.28, z)
      car.add(mesh)
    }
  }
  scene.add(car)
  return car
}

const grid = new Map()
const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`

function index(items, bounds) {
  items.forEach((item, i) => {
    const [minX, minZ, maxX, maxZ] = bounds(item)
    for (let x = Math.floor(minX / CELL); x <= Math.floor(maxX / CELL); x++)
      for (let z = Math.floor(minZ / CELL); z <= Math.floor(maxZ / CELL); z++) {
        const key = `${x},${z}`
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(i)
      }
  })
}

function inside(polygon, x, z) {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j]
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) hit = !hit
  }
  return hit
}

function blocked(x, z) {
  return (grid.get(cellKey(x, z)) || []).some(i => inside(world.buildings[i].p, x, z))
}

const segments = world.roads.filter(road => road.kind === 'road' && road.name).flatMap(road => road.p.slice(1).map((b, i) => ({ a: road.p[i], b, name: road.name })))
const segmentGrid = new Map()
segments.forEach((segment, i) => {
  const key = cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2)
  if (!segmentGrid.has(key)) segmentGrid.set(key, [])
  segmentGrid.get(key).push(i)
})

function streetName(x, z) {
  let best = null, bestDistance = 25
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const i of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      const { a, b, name } = segments[i]
      const abx = b[0] - a[0], abz = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[1]) * abz) / (abx * abx + abz * abz || 1)))
      const distance = Math.hypot(a[0] + abx * t - x, a[1] + abz * t - z)
      if (distance < bestDistance) { bestDistance = distance; best = name }
    }
  }
  return best
}

index(world.buildings, building => {
  const xs = building.p.map(p => p[0]), zs = building.p.map(p => p[1])
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
})
buildWorld()
const car = buildCar()

const keys = new Set()
addEventListener('keydown', event => { keys.add(event.code); if (event.code.startsWith('Arrow')) event.preventDefault() })
addEventListener('keyup', event => keys.delete(event.code))
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const state = { x: world.start.x, z: world.start.z, heading: world.start.heading, speed: 0, shake: 0 }
const [minX, minZ, maxX, maxZ] = world.bounds
const speedEl = document.getElementById('speed')
const streetEl = document.getElementById('street')
let last = performance.now()
let streetTimer = 0

function corners(x, z, heading) {
  const fx = Math.sin(heading), fz = Math.cos(heading)
  const rx = Math.cos(heading), rz = -Math.sin(heading)
  const l = CAR.length / 2, w = CAR.width / 2
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [x + fx * l * a + rx * w * b, z + fz * l * a + rz * w * b])
}

function step(dt) {
  const gas = keys.has('ArrowUp') || keys.has('KeyW')
  const brake = keys.has('ArrowDown') || keys.has('KeyS')
  const handbrake = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const steer = (keys.has('ArrowRight') || keys.has('KeyD')) - (keys.has('ArrowLeft') || keys.has('KeyA'))

  const speed = Math.abs(state.speed)
  if (gas && state.speed >= 0) state.speed = Math.min(state.speed + PANDA.acceleration * (1 - speed / PANDA.topSpeed) * dt, PANDA.topSpeed)
  else if (gas) state.speed = Math.min(state.speed + PANDA.braking * dt, 0)
  else if (brake && state.speed > 0) state.speed = Math.max(state.speed - PANDA.braking * dt, 0)
  else if (brake) state.speed = Math.max(state.speed - PANDA.acceleration * 0.5 * dt, -PANDA.reverseSpeed)
  else state.speed -= Math.sign(state.speed) * Math.min(speed, (0.6 + speed * 0.04) * dt)
  if (handbrake) state.speed -= Math.sign(state.speed) * Math.min(speed, 6 * dt)

  const yawRate = Math.min(speed * Math.tan(PANDA.steeringLock) / PANDA.wheelbase, PANDA.grip / Math.max(speed, 0.1))
  state.heading -= steer * yawRate * Math.sign(state.speed) * dt

  const x = state.x + Math.sin(state.heading) * state.speed * dt
  const z = state.z + Math.cos(state.heading) * state.speed * dt
  const hit = corners(x, z, state.heading).some(([cx, cz]) => blocked(cx, cz))

  if (hit) {
    state.shake = Math.min(Math.abs(state.speed) / 10, 1)
    state.speed *= -0.35
  } else {
    state.x = Math.max(minX, Math.min(maxX, x))
    state.z = Math.max(minZ, Math.min(maxZ, z))
  }

  car.position.set(state.x, 0, state.z)
  car.rotation.y = state.heading
  car.rotation.z = steer * -0.04 * Math.tanh(state.speed / 10)

  const distance = 9 + Math.abs(state.speed) * 0.15
  const target = new THREE.Vector3(state.x - Math.sin(state.heading) * distance, 4.5, state.z - Math.cos(state.heading) * distance)
  camera.position.lerp(target, 1 - Math.exp(-dt * 4))
  camera.position.y += (Math.random() - 0.5) * state.shake
  camera.lookAt(state.x, 1.2, state.z)
  state.shake *= 0.85

  speedEl.innerHTML = `${Math.round(Math.abs(state.speed) * 3.6)}<small>km/u</small>`
  streetTimer -= dt
  if (streetTimer < 0) {
    streetTimer = 0.25
    streetEl.textContent = streetName(state.x, state.z) || ''
  }
}

camera.position.set(state.x - Math.sin(state.heading) * 9, 4.5, state.z - Math.cos(state.heading) * 9)

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  step(dt)
  effect.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
