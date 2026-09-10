import * as THREE from 'three'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const WORLD = new URLSearchParams(location.search).get('world') || 'urmond'
const world = await fetch(`worlds/${WORLD}.json`, { cache: 'no-store' }).then(response => response.json())

const COLORS = {
  walls:      [0x9c5a45, 0x6e4636, 0xc9b48a, 0xe8e4da, 0xb8b4ac, 0xa8705a].map(hex => new THREE.Color(hex)),
  roofs:      [0x4a3a36, 0x6b3b2f, 0x3e3e44, 0x5a4034, 0x4a4a52, 0x703a30].map(hex => new THREE.Color(hex)),
  glass:      new THREE.Color(0x26323f),
  door:       new THREE.Color(0x4a3222),
  chimney:    new THREE.Color(0x6b4a3a),
  road:       new THREE.Color(0x4c4f57),
  sidewalk:   new THREE.Color(0xa9a59c),
  dash:       new THREE.Color(0xe8e8e0),
  path:       new THREE.Color(0xc9c1b2),
  water:      new THREE.Color(0x4f9fd6),
  grass:      new THREE.Color(0x8fd06b),
  forest:     new THREE.Color(0x4f9a48),
  field:      new THREE.Color(0xd9c86a),
  ground:     new THREE.Color(0xa9d682),
  concrete:   new THREE.Color(0x8a8d90),
  rail:       new THREE.Color(0xd0d3d6),
  embankment: new THREE.Color(0x7c9a5a),
  horizon:    new THREE.Color(0xdfeeff),
  zenith:     new THREE.Color(0x5aa9e8)
}

const CELL = 40
const CAR = { length: 3.4, width: 1.5 }
const PANDA = { topSpeed: 42, reverseSpeed: 5, acceleration: 6, braking: 10, wheelbase: 2.16, steeringLock: 0.6, grip: 12 }
const GRADE = 0.06
const T = world.terrain

const scene = new THREE.Scene()
scene.background = COLORS.horizon
scene.fog = new THREE.Fog(COLORS.horizon, 400, 1600)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 5000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.prepend(renderer.domElement)
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0022, defaultColor: [0.12, 0.08, 0.1] })

scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf70, 1.0))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = sun.shadow.camera.bottom = -140
sun.shadow.camera.right = sun.shadow.camera.top = 140
sun.shadow.camera.near = 1
sun.shadow.camera.far = 900
sun.shadow.bias = -0.0006
scene.add(sun, sun.target)

const gradient = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1)
gradient.minFilter = gradient.magFilter = THREE.NearestFilter
gradient.needsUpdate = true
const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide })
const solid = (color, map) => new THREE.MeshToonMaterial({ color, map, gradientMap: gradient })

// TEXTURES:

let seed = 7
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const grey = (value, alpha = 1) => `rgba(${value | 0},${value | 0},${value | 0},${alpha})`

function texture(metresPerTile, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  draw(canvas.getContext('2d'), 256)
  const map = new THREE.CanvasTexture(canvas)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1 / metresPerTile, 1 / metresPerTile)
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

function speckle(ctx, size, base, spread, count, blob) {
  ctx.fillStyle = grey(base)
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = grey(base + (random() - 0.5) * spread, 0.6)
    const radius = blob * (0.5 + random())
    ctx.fillRect(random() * size, random() * size, radius, radius)
  }
}

const TEXTURES = {
  grass:   texture(6, (ctx, size) => { speckle(ctx, size, 205, 70, 1500, 14); speckle(ctx, size, 205, 90, 3000, 2) }),
  asphalt: texture(3, (ctx, size) => speckle(ctx, size, 215, 70, 5000, 2.5)),
  foliage: texture(1, (ctx, size) => speckle(ctx, size, 200, 110, 1500, 12)),
  paving: texture(1.4, (ctx, size) => {
    ctx.fillStyle = grey(170)
    ctx.fillRect(0, 0, size, size)
    for (let x = 0; x < size; x += 64) for (let y = 0; y < size; y += 64) {
      ctx.fillStyle = grey(200 + (random() - 0.5) * 24)
      ctx.fillRect(x + 2, y + 2, 60, 60)
    }
  }),
  brick: texture(2.4, (ctx, size) => {
    ctx.fillStyle = grey(210)
    ctx.fillRect(0, 0, size, size)
    for (let row = 0; row < 8; row++) for (let column = -1; column < 4; column++) {
      ctx.fillStyle = grey(165 + random() * 40)
      ctx.fillRect(column * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28)
    }
  }),
  tiles: texture(2, (ctx, size) => {
    ctx.fillStyle = grey(150)
    ctx.fillRect(0, 0, size, size)
    for (let row = 0; row < 8; row++) for (let column = -1; column < 8; column++) {
      ctx.fillStyle = grey(185 + random() * 35)
      ctx.fillRect(column * 32 + (row % 2) * 16 + 1, row * 32, 30, 27)
    }
  })
}

const textured = map => new THREE.MeshToonMaterial({ map, vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide })
const MATERIALS = { plain: toon, asphalt: textured(TEXTURES.asphalt), paving: textured(TEXTURES.paving), brick: textured(TEXTURES.brick), tiles: textured(TEXTURES.tiles), ground: textured(TEXTURES.grass) }

function uvWorld(geometry) {
  const position = geometry.attributes.position
  const uvs = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) uvs.set([position.getX(i), position.getZ(i)], i * 2)
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}

// TERRAIN:

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function terrainHeight(x, z) {
  const gx = clamp((x - T.x0) / T.sx, 0, T.cols - 1.001), gz = clamp((z - T.z0) / T.sz, 0, T.rows - 1.001)
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j
  const h = (c, r) => T.heights[r * T.cols + c]
  return (h(i, j) * (1 - fx) + h(i + 1, j) * fx) * (1 - fz) + (h(i, j + 1) * (1 - fx) + h(i + 1, j + 1) * fx) * fz
}

function pointToSegment(x, z, [ax, az], [bx, bz]) {
  const abx = bx - ax, abz = bz - az
  const t = clamp(((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz || 1), 0, 1)
  return { t, distance: Math.hypot(ax + abx * t - x, az + abz * t - z) }
}

function polylineDistance(x, z, points) {
  let best = Infinity
  for (let i = 1; i < points.length; i++) best = Math.min(best, pointToSegment(x, z, points[i - 1], points[i]).distance)
  return best
}

function digWater() {
  world.roads.filter(road => road.kind === 'water' && road.w >= 10).forEach(road => {
    const samples = road.p.map(([x, z]) => terrainHeight(x, z)).sort((a, b) => a - b)
    road.level = samples[Math.floor(samples.length / 2)]
    const reach = road.w / 2 + T.sx * 0.6
    const xs = road.p.map(p => p[0]), zs = road.p.map(p => p[1])
    const c0 = clamp(Math.floor((Math.min(...xs) - reach - T.x0) / T.sx), 0, T.cols - 1), c1 = clamp(Math.ceil((Math.max(...xs) + reach - T.x0) / T.sx), 0, T.cols - 1)
    const r0 = clamp(Math.floor((Math.min(...zs) - reach - T.z0) / T.sz), 0, T.rows - 1), r1 = clamp(Math.ceil((Math.max(...zs) + reach - T.z0) / T.sz), 0, T.rows - 1)
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (polylineDistance(T.x0 + c * T.sx, T.z0 + r * T.sz, road.p) < reach) T.heights[r * T.cols + c] = Math.min(T.heights[r * T.cols + c], road.level - 3)
    }
  })
}

function prepareRoads() {
  const key = ([x, z]) => `${x},${z}`
  const bigWater = world.roads.filter(road => road.level !== undefined)

  world.roads.forEach(road => {
    road.hs = road.p.map(([x, z]) => terrainHeight(x, z))
    if (road.kind === 'water') {
      road.hs = road.level === undefined ? road.hs.map(h => h + 0.04) : road.p.map(() => road.level + 0.2)
    } else if (road.bridge) {
      const [mx, mz] = road.p[Math.floor(road.p.length / 2)]
      const waterLevel = Math.max(-Infinity, ...bigWater.filter(water => polylineDistance(mx, mz, water.p) < water.w).map(water => water.level + 7))
      const deck = Math.max(road.hs[0], road.hs[road.hs.length - 1])
      road.hs = road.p.map(() => Math.max(deck, waterLevel))
    }
  })

  const elevatedAt = new Map()
  world.roads.filter(road => road.bridge).forEach(road => road.p.forEach((p, i) => elevatedAt.set(key(p), Math.max(elevatedAt.get(key(p)) || 0, road.hs[i]))))

  world.roads.filter(road => road.kind !== 'water' && !road.bridge).forEach(road => {
    road.p.forEach((p, i) => { if (elevatedAt.has(key(p))) road.hs[i] = Math.max(road.hs[i], elevatedAt.get(key(p))) })
    const span = i => Math.hypot(road.p[i][0] - road.p[i - 1][0], road.p[i][1] - road.p[i - 1][1])
    for (let i = 1; i < road.p.length; i++) road.hs[i] = Math.max(road.hs[i], road.hs[i - 1] - GRADE * span(i))
    for (let i = road.p.length - 2; i >= 0; i--) road.hs[i] = Math.max(road.hs[i], road.hs[i + 1] - GRADE * span(i + 1))
  })

  world.roads.forEach(road => {
    road.ground = road.p.map(([x, z]) => terrainHeight(x, z))
    road.elevated = road.hs.some((h, i) => h > road.ground[i] + 0.4)
  })
}

function sample(road) {
  const points = []
  for (let i = 1; i < road.p.length; i++) {
    const [ax, az] = road.p[i - 1], [bx, bz] = road.p[i]
    const raisedSegment = road.hs[i - 1] > road.ground[i - 1] + 0.4 || road.hs[i] > road.ground[i] + 0.4 || road.kind === 'water'
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 8))
    for (let k = i === 1 ? 0 : 1; k <= steps; k++) {
      const t = k / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t
      points.push([x, z, raisedSegment ? road.hs[i - 1] + (road.hs[i] - road.hs[i - 1]) * t : terrainHeight(x, z), raisedSegment])
    }
  }
  return points
}

// GEOMETRY HELPERS:

function paint(geometry, color) {
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function edges(points, width) {
  const half = width / 2
  return points.map(([x, z, y, elevated], i) => {
    const [px, pz] = points[Math.max(i - 1, 0)], [nx, nz] = points[Math.min(i + 1, points.length - 1)]
    const length = Math.hypot(nx - px, nz - pz) || 1
    const dx = (nx - px) / length, dz = (nz - pz) / length
    const left = [x - dz * half, z + dx * half], right = [x + dz * half, z - dx * half]
    return [[left[0], elevated ? y : terrainHeight(...left), left[1]], [right[0], elevated ? y : terrainHeight(...right), right[1]]]
  })
}

function skirt(top, bottom) {
  const positions = []
  for (let i = 1; i < top.length; i++) positions.push(...top[i - 1], ...bottom[i - 1], ...bottom[i], ...top[i - 1], ...bottom[i], ...top[i])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function ribbon(points, width, lift) {
  const sides = edges(points, width)
  return skirt(sides.map(([left]) => [left[0], left[1] + lift, left[2]]), sides.map(([, right]) => [right[0], right[1] + lift, right[2]]))
}

function disc([x, z, y, elevated], radius, lift) {
  const height = (px, pz) => (elevated ? y : terrainHeight(px, pz)) + lift
  const rim = Array.from({ length: 11 }, (_, k) => [x + Math.cos(k / 10 * Math.PI * 2) * radius, z + Math.sin(k / 10 * Math.PI * 2) * radius])
  const positions = []
  for (let k = 0; k < 10; k++) positions.push(x, height(x, z), z, ...[rim[k + 1][0], height(...rim[k + 1]), rim[k + 1][1]], ...[rim[k][0], height(...rim[k]), rim[k][1]])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function strip(points, width, lift, color, parts, rounded = true) {
  parts.push(paint(ribbon(points, width, lift), color))
  if (rounded && width >= 3) points.forEach(point => parts.push(paint(disc(point, width / 2, lift), color)))
}

function dashes(points, parts) {
  for (let i = 1; i < points.length; i++) {
    const [ax, az, ay] = points[i - 1], [bx, bz, by] = points[i]
    const length = Math.hypot(bx - ax, bz - az)
    for (let d = 2; d + 3 <= length; d += 9) {
      const t0 = d / length, t1 = (d + 3) / length
      parts.push(paint(ribbon([[ax + (bx - ax) * t0, az + (bz - az) * t0, ay + (by - ay) * t0], [ax + (bx - ax) * t1, az + (bz - az) * t1, ay + (by - ay) * t1]], 0.15, 0.2), COLORS.dash))
    }
  }
}

function quad(cx, cz, ux, uz, nx, nz, width, bottom, height, color) {
  const ox = nx * 0.04, oz = nz * 0.04, half = width / 2
  const x0 = cx - ux * half + ox, z0 = cz - uz * half + oz, x1 = cx + ux * half + ox, z1 = cz + uz * half + oz
  const top = bottom + height
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, bottom, z0, x1, bottom, z1, x1, top, z1, x0, bottom, z0, x1, top, z1, x0, top, z0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([nx, 0, nz]).flat(), 3))
  return paint(geometry, color)
}

// WORLD:

function buildRoads(groups) {
  world.roads.forEach(road => {
    const points = sample(road)
    if (road.kind === 'water') {
      strip(points, road.w, road.level === undefined ? 0.12 : 0, COLORS.water, groups.plain)
    } else if (road.kind === 'path') {
      strip(points, road.w, 0.12, COLORS.path, groups.paving)
    } else {
      if (road.w <= 8 && !road.elevated) strip(points, road.w + 3, 0.12, COLORS.sidewalk, groups.paving, false)
      strip(points, road.w, 0.18, COLORS.road, groups.asphalt)
      if (road.w >= 7) dashes(points, groups.plain)
      if (road.bridge) bridge(points, road.w, groups.plain)
      else if (road.elevated) embankment(points, road.w, groups.ground)
    }
  })
}

function bridge(points, width, parts) {
  const sides = edges(points, width + 1)
  const ground = points.map(([x, z]) => terrainHeight(x, z))
  for (const side of [0, 1]) {
    const top = sides.map(pair => pair[side])
    parts.push(paint(skirt(top, top.map(([x, y, z]) => [x, y - 1.2, z])), COLORS.concrete))
    parts.push(paint(skirt(top.map(([x, y, z]) => [x, y + 1.1, z]), top), COLORS.rail))
  }
  parts.push(paint(skirt(sides.map(pair => [pair[0][0], pair[0][1] - 1.2, pair[0][2]]), sides.map(pair => [pair[1][0], pair[1][1] - 1.2, pair[1][2]])), COLORS.concrete))
  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    travelled += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    if (travelled >= 25) {
      travelled = 0
      const [x, z, y] = points[i]
      const depth = y - 1.2 - ground[i] + 1
      parts.push(paint(new THREE.CylinderGeometry(1, 1.2, depth, 8).translate(x, y - 1.2 - depth / 2, z), COLORS.concrete))
    }
  }
}

function embankment(points, width, parts) {
  const sides = edges(points, width + 1)
  for (const side of [0, 1]) {
    const top = sides.map(pair => pair[side])
    const bottom = top.map(([x, y, z], i) => {
      const ground = terrainHeight(x, z), drop = Math.max(0, y - ground)
      const outward = [(x - points[i][0]), (z - points[i][1])]
      const length = Math.hypot(...outward) || 1
      return [x + outward[0] / length * drop * 1.5, ground - 0.2, z + outward[1] / length * drop * 1.5]
    })
    parts.push(paint(skirt(top, bottom), COLORS.embankment))
  }
}

function hipRoof(building, groups) {
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
  const top = building.base + building.h
  const back = ([lx, lz, y]) => [lx * cos - lz * sin, y + top, lx * sin + lz * cos]
  const A = back([minX, minZ, 0]), B = back([maxX, minZ, 0]), C = back([maxX, maxZ, 0]), D = back([minX, maxZ, 0])
  const R1 = back([minX + inset, midZ, rise]), R2 = back([maxX - inset, midZ, rise])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...R2, ...A, ...R2, ...R1, ...C, ...D, ...R1, ...C, ...R1, ...R2, ...B, ...C, ...R2, ...D, ...A, ...R1], 3))
  geometry.computeVertexNormals()
  groups.tiles.push(paint(geometry, COLORS.roofs[building.c]))

  const [chimneyX, , chimneyZ] = back([minX + inset + (maxX - minX - 2 * inset) * 0.3, midZ, 0])
  groups.plain.push(paint(new THREE.BoxGeometry(0.6, rise + 0.8, 0.6).translate(chimneyX, top + (rise + 0.8) / 2, chimneyZ), COLORS.chimney))
}

function facadeDetails(building, parts) {
  const points = building.p
  const floors = Math.max(1, Math.floor((building.h - 2.3) / 3) + 1)
  const front = frontEdge(building)
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length]
    const length = Math.hypot(bx - ax, bz - az)
    if (length < 3) return

    const ux = (bx - ax) / length, uz = (bz - az) / length
    let nx = uz, nz = -ux
    const mx = (ax + bx) / 2, mz = (az + bz) / 2
    if (inside(points, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz }

    const count = Math.floor((length - 1.2) / 2.6)
    const spacing = length / (count + 1)
    for (let k = 1; k <= count; k++) {
      const cx = ax + ux * spacing * k, cz = az + uz * spacing * k
      for (let floor = 0; floor < floors; floor++) {
        if (i === front && floor === 0 && k === 1 && building.h >= 3) parts.push(quad(cx, cz, ux, uz, nx, nz, 1.0, terrainHeight(cx, cz), 2.2 + building.base - terrainHeight(cx, cz), COLORS.door))
        else parts.push(quad(cx, cz, ux, uz, nx, nz, 1.1, building.base + floor * 3 + 1, 1.3, COLORS.glass))
      }
    }
  })
}

function frontEdge(building) {
  let best = -1, bestDistance = 60
  building.p.forEach(([ax, az], i) => {
    const [bx, bz] = building.p[(i + 1) % building.p.length]
    const { distance } = nearestSegment((ax + bx) / 2, (az + bz) / 2)
    if (distance < bestDistance) { bestDistance = distance; best = i }
  })
  return best
}

function buildBuildings(groups) {
  world.buildings.forEach(building => {
    const heights = building.p.map(([x, z]) => terrainHeight(x, z))
    building.base = Math.max(...heights)
    const bottom = Math.min(...heights) - 0.5
    const shape = new THREE.Shape(building.p.map(([x, z]) => new THREE.Vector2(x, -z)))
    groups.brick.push(paint(new THREE.ExtrudeGeometry(shape, { depth: building.base + building.h - bottom, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, bottom, 0), COLORS.walls[building.c]))
    if (building.roof === 'hip') hipRoof(building, groups)
    facadeDetails(building, groups.plain)
  })
}

function buildGround() {
  const [minX, minZ, maxX, maxZ] = world.bounds
  const resolution = 8
  const cols = Math.ceil((maxX - minX) / resolution), rows = Math.ceil((maxZ - minZ) / resolution)
  const geometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, cols, rows).rotateX(-Math.PI / 2).translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const areaGrid = new Map()
  world.areas.forEach((area, i) => {
    const xs = area.p.map(p => p[0]), zs = area.p.map(p => p[1])
    for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++)
      for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++) {
        const key = `${x},${z}`
        if (!areaGrid.has(key)) areaGrid.set(key, [])
        areaGrid.get(key).push(i)
      }
  })
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i)
    position.setY(i, terrainHeight(x, z))
    let color = COLORS.ground
    for (const index of areaGrid.get(cellKey(x, z)) || []) if (inside(world.areas[index].p, x, z)) color = COLORS[world.areas[index].kind]
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  uvWorld(geometry)
  geometry.computeVertexNormals()
  const ground = new THREE.Mesh(geometry, MATERIALS.ground)
  ground.receiveShadow = true
  scene.add(ground)
}

function buildWorld() {
  const groups = { plain: [], asphalt: [], paving: [], brick: [], tiles: [], ground: [] }
  buildRoads(groups)
  buildBuildings(groups)
  for (const [name, parts] of Object.entries(groups)) {
    if (!parts.length) continue
    const geometries = parts.map(part => {
      const geometry = part.index ? part.toNonIndexed() : part
      if (name === 'plain') geometry.deleteAttribute('uv')
      else if (!geometry.attributes.uv) uvWorld(geometry)
      return geometry
    })
    const mesh = new THREE.Mesh(mergeGeometries(geometries), MATERIALS[name])
    mesh.castShadow = mesh.receiveShadow = true
    scene.add(mesh)
  }
  buildGround()
  buildTrees()
  buildSky()
}

function instances(geometry, color, placements, map, variation = 0) {
  const mesh = new THREE.InstancedMesh(geometry, solid(color, map), placements.length)
  const matrix = new THREE.Matrix4()
  const tint = new THREE.Color()
  placements.forEach(([x, y, z, scale, rotation], i) => {
    matrix.makeRotationY(rotation || 0).scale(new THREE.Vector3(scale, scale, scale)).setPosition(x, y, z)
    mesh.setMatrixAt(i, matrix)
    if (variation) mesh.setColorAt(i, tint.setHSL(0.28 + (random() - 0.5) * variation, 0.5 + random() * 0.2, 0.35 + random() * 0.15))
  })
  mesh.castShadow = true
  scene.add(mesh)
  return mesh
}

function buildTrees() {
  const placements = world.trees.map(([x, z]) => [x, terrainHeight(x, z) - 0.1, z, 0.8 + ((x * 7 + z * 13) % 10) / 20, 0])
  const conifers = placements.filter(([x, , z]) => (Math.abs(x * 3 + z * 5) | 0) % 4 === 0)
  const leafy = placements.filter(p => !conifers.includes(p))
  instances(new THREE.CylinderGeometry(0.25, 0.35, 2, 6).translate(0, 1, 0), 0x7a5230, leafy)
  instances(new THREE.IcosahedronGeometry(1.8, 1).translate(0, 3.4, 0), 0xffffff, leafy, TEXTURES.foliage, 0.1)
  instances(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6).translate(0, 0.75, 0), 0x5a3d25, conifers)
  instances(new THREE.ConeGeometry(1.6, 5, 7).translate(0, 4, 0), 0xffffff, conifers, TEXTURES.foliage, 0.06)
}

let skyDome, clouds

function buildSky() {
  const sky = new THREE.SphereGeometry(2400, 24, 12)
  const colors = new Float32Array(sky.attributes.position.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < sky.attributes.position.count; i++) {
    color.copy(COLORS.horizon).lerp(COLORS.zenith, Math.sqrt(Math.max(0, sky.attributes.position.getY(i) / 2400)))
    colors.set([color.r, color.g, color.b], i * 3)
  }
  sky.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  skyDome = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))
  skyDome.material.userData.outlineParameters = { visible: false }
  scene.add(skyDome)

  const blobs = []
  for (let i = 0; i < 40; i++) {
    const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 3000, z = ((Math.sin(i * 78.233) * 12345.678) % 1) * 3000
    for (let k = 0; k < 3; k++) blobs.push([x + k * 22 - 22, 0, z + (k % 2) * 12, 14 + (i % 5) * 4, 0])
  }
  clouds = instances(new THREE.IcosahedronGeometry(1, 1).scale(1, 0.45, 1).translate(0, 9, 0), 0xffffff, blobs)
  clouds.material.fog = false
  clouds.material.userData.outlineParameters = { visible: false }
  clouds.castShadow = false
}

function buildCar() {
  const car = new THREE.Group()
  car.rotation.order = 'YXZ'
  const part = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid(color))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
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
      mesh.castShadow = true
      car.add(mesh)
    }
  }
  scene.add(car)
  return car
}

// SPATIAL LOOKUPS:

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

const segments = world.roads.filter(road => road.kind === 'road').flatMap(road => road.p.slice(1).map((b, i) => ({ road, i, a: road.p[i], b })))
const segmentGrid = new Map()
segments.forEach((segment, i) => {
  const key = cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2)
  if (!segmentGrid.has(key)) segmentGrid.set(key, [])
  segmentGrid.get(key).push(i)
})

function nearestSegment(x, z) {
  let best = null, bestDistance = Infinity, bestT = 0
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const i of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      const { t, distance } = pointToSegment(x, z, segments[i].a, segments[i].b)
      if (distance < bestDistance) { bestDistance = distance; best = segments[i]; bestT = t }
    }
  }
  return { segment: best, distance: bestDistance, t: bestT }
}

function groundHeight(x, z) {
  const { segment, distance, t } = nearestSegment(x, z)
  if (segment && segment.road.elevated && distance < segment.road.w / 2 + 1.5) return segment.road.hs[segment.i] + (segment.road.hs[segment.i + 1] - segment.road.hs[segment.i]) * t
  return terrainHeight(x, z)
}

function streetName(x, z) {
  const { segment, distance } = nearestSegment(x, z)
  return distance < 25 && segment.road.name || ''
}

// MINIMAP:

const minimap = document.getElementById('minimap')
const map = minimap.getContext('2d')
const MAP_RADIUS = 220

function drawMinimap() {
  const size = minimap.width, scale = size / 2 / MAP_RADIUS
  map.clearRect(0, 0, size, size)
  map.save()
  map.translate(size / 2, size / 2)
  map.rotate(-(state.heading + Math.PI))
  map.scale(scale, scale)
  map.translate(-state.x, -state.z)
  map.lineCap = map.lineJoin = 'round'

  const near = road => road.p.some(([x, z]) => Math.abs(x - state.x) < MAP_RADIUS * 1.5 && Math.abs(z - state.z) < MAP_RADIUS * 1.5)
  const stroke = (road, color, width) => {
    map.strokeStyle = color
    map.lineWidth = width
    map.beginPath()
    road.p.forEach(([x, z], i) => i ? map.lineTo(x, z) : map.moveTo(x, z))
    map.stroke()
  }
  world.roads.filter(near).forEach(road => {
    if (road.kind === 'water') stroke(road, '#4f9fd6', Math.max(road.w, 4))
    else if (road.kind === 'road') stroke(road, road.elevated ? '#8a8d90' : '#5a5d63', Math.max(road.w + 2, 6))
  })
  map.fillStyle = '#6b6259'
  const cx = Math.floor(state.x / CELL), cz = Math.floor(state.z / CELL), reach = Math.ceil(MAP_RADIUS / CELL)
  const drawn = new Set()
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    for (const i of grid.get(`${cx + dx},${cz + dz}`) || []) {
      if (drawn.has(i)) continue
      drawn.add(i)
      map.beginPath()
      world.buildings[i].p.forEach(([x, z], k) => k ? map.lineTo(x, z) : map.moveTo(x, z))
      map.fill()
    }
  }
  map.restore()

  map.save()
  map.translate(size / 2, size / 2)
  map.fillStyle = '#e53935'
  map.beginPath()
  map.moveTo(0, -12)
  map.lineTo(8, 10)
  map.lineTo(-8, 10)
  map.closePath()
  map.fill()
  map.rotate(-(state.heading + Math.PI))
  map.fillStyle = '#fff'
  map.font = 'bold 22px system-ui'
  map.textAlign = 'center'
  map.fillText('N', 0, -size / 2 + 34)
  map.restore()
}

// GAME:

index(world.buildings, building => {
  const xs = building.p.map(p => p[0]), zs = building.p.map(p => p[1])
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
})
digWater()
prepareRoads()
buildWorld()
const car = buildCar()

const keys = new Set()
window.debug = { keys, get state() { return state } }
addEventListener('keydown', event => { keys.add(event.code); if (event.code.startsWith('Arrow')) event.preventDefault() })
addEventListener('keyup', event => keys.delete(event.code))
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const state = { x: world.start.x, z: world.start.z, heading: world.start.heading, speed: 0, steer: 0, shake: 0 }
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

function step(dt, now) {
  const gas = keys.has('ArrowUp') || keys.has('KeyW')
  const brake = keys.has('ArrowDown') || keys.has('KeyS')
  const handbrake = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const wanted = (keys.has('ArrowRight') || keys.has('KeyD')) - (keys.has('ArrowLeft') || keys.has('KeyA'))
  state.steer += (wanted - state.steer) * Math.min(1, dt * (wanted ? 4 : 8))

  const speed = Math.abs(state.speed)
  if (gas && state.speed >= 0) state.speed = Math.min(state.speed + PANDA.acceleration * (1 - speed / PANDA.topSpeed) * dt, PANDA.topSpeed)
  else if (gas) state.speed = Math.min(state.speed + PANDA.braking * dt, 0)
  else if (brake && state.speed > 0) state.speed = Math.max(state.speed - PANDA.braking * dt, 0)
  else if (brake) state.speed = Math.max(state.speed - PANDA.acceleration * 0.5 * dt, -PANDA.reverseSpeed)
  else state.speed -= Math.sign(state.speed) * Math.min(speed, (0.6 + speed * 0.04) * dt)
  if (handbrake) state.speed -= Math.sign(state.speed) * Math.min(speed, 6 * dt)

  const yawRate = Math.min(speed * Math.tan(PANDA.steeringLock) / PANDA.wheelbase, PANDA.grip / Math.max(speed, 0.1))
  state.heading -= state.steer * yawRate * Math.sign(state.speed) * dt

  const x = state.x + Math.sin(state.heading) * state.speed * dt
  const z = state.z + Math.cos(state.heading) * state.speed * dt
  const hit = corners(x, z, state.heading).some(([cx, cz]) => blocked(cx, cz))

  if (hit) {
    state.shake = Math.min(Math.abs(state.speed) / 10, 1)
    state.speed *= -0.35
  } else {
    state.x = clamp(x, minX, maxX)
    state.z = clamp(z, minZ, maxZ)
  }

  const fx = Math.sin(state.heading), fz = Math.cos(state.heading)
  const y = groundHeight(state.x, state.z)
  const pitch = Math.atan2(groundHeight(state.x + fx * 1.7, state.z + fz * 1.7) - groundHeight(state.x - fx * 1.7, state.z - fz * 1.7), 3.4)
  const roll = Math.atan2(groundHeight(state.x - fz * 0.75, state.z + fx * 0.75) - groundHeight(state.x + fz * 0.75, state.z - fx * 0.75), 1.5)
  car.position.set(state.x, y, state.z)
  car.rotation.set(-pitch, state.heading, -roll + state.steer * -0.04 * Math.tanh(state.speed / 10))

  const distance = 9 + Math.abs(state.speed) * 0.15
  const target = new THREE.Vector3(state.x - fx * distance, y + 4.5, state.z - fz * distance)
  camera.position.lerp(target, 1 - Math.exp(-dt * 4))
  camera.position.y = Math.max(camera.position.y, terrainHeight(camera.position.x, camera.position.z) + 1.5) + (Math.random() - 0.5) * state.shake
  camera.lookAt(state.x, y + 1.2, state.z)
  state.shake *= 0.85

  sun.position.set(state.x + 150, y + 250, state.z + 100)
  sun.target.position.set(state.x, y, state.z)
  skyDome.position.set(camera.position.x, 0, camera.position.z)
  clouds.position.x = (now / 1000 * 2) % 400 - 200

  speedEl.innerHTML = `${Math.round(Math.abs(state.speed) * 3.6)}<small>km/u</small>`
  streetTimer -= dt
  if (streetTimer < 0) {
    streetTimer = 0.25
    streetEl.textContent = streetName(state.x, state.z)
  }
  drawMinimap()
}

camera.position.set(state.x - Math.sin(state.heading) * 9, groundHeight(state.x, state.z) + 4.5, state.z - Math.cos(state.heading) * 9)

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  step(dt, now)
  effect.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
