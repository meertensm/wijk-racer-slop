import * as THREE from 'three'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import polygonClipping from 'polygon-clipping'

const WORLD = new URLSearchParams(location.search).get('world') || 'sittard-geleen'

// LOADING SCREEN:

const TIPS = [
  'Rij een niet poep oprapende labradoodle uitlater omver voor een G-Point.',
  'Binnen 5 seconden achteruit en weer vooruit over hem heen: twee halve G-Points extra.',
  'De labradoodle is onsterfelijk en rent weg. Beagles ook onsterfelijk, maar dan ontploft jouw Panda.',
  'In Einighausen lopen alleen kale mannetjes rond.',
  'Druk op T om naar een supermarkt, skatebaan of station te springen.',
  'Bij het eet.nu-kantoor aan de Brugstraat staat iemand voor de deur.',
  'Shift is de handrem. De Panda haalt 150 op de A2.',
  'Het terrein is echt: AHN-hoogtedata, het Julianakanaal ligt hoger dan Urmond.'
]
const loadingEl = document.getElementById('loading')
const loadingBar = loadingEl.querySelector('#loading-bar i')
const loadingPhase = document.getElementById('loading-phase')
const loadingSlides = document.getElementById('loading-slides')
document.getElementById('loading-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)]
let snapshots = []
try { snapshots = JSON.parse(localStorage.getItem('snapshots') || '[]') } catch {}
const credits = await fetch('assets/intro/credits.json').then(response => response.json()).catch(() => [])
const slides = [...credits.map(credit => credit.file).sort(() => Math.random() - 0.5), ...snapshots]
if (credits.length) document.getElementById('loading-credits').textContent = 'Foto’s: Wikimedia Commons, ' + [...new Set(credits.map(credit => credit.license))].join(' / ')
let slide = 0
function nextSlide() {
  if (!slides.length) return
  const img = document.createElement('img')
  img.src = slides[slide++ % slides.length]
  loadingSlides.append(img)
  while (loadingSlides.children.length > 2) loadingSlides.firstChild.remove()
}
nextSlide()
const slideTimer = setInterval(nextSlide, 4000)
let progress = 0
const PHASES = { fetch: 3, terrain: 12, stamp: 2, prepare: 3, index: 1, roads: 8, buildings: 30, merge: 10, ground: 20, trees: 3, walkers: 8 }
const total = Object.values(PHASES).reduce((a, b) => a + b, 0)
const LABELS = { fetch: 'Kaart ophalen', terrain: 'Terrein boetseren', stamp: 'Wegen aanleggen', prepare: 'Bruggen bouwen', index: 'Straatnamen leren', roads: 'Asfalt gieten', buildings: 'Huizen metselen', merge: 'Wijken samenvoegen', ground: 'Gras zaaien', trees: 'Bomen planten', walkers: 'Beagles loslaten' }

async function phase(name, fn) {
  loadingPhase.textContent = LABELS[name] + '…'
  await new Promise(resolve => setTimeout(resolve, 20))
  const started = performance.now()
  try { await fn() } catch (error) { console.error(`phase ${name} failed: ${error.stack}`); loadingPhase.textContent = `Fout in ${LABELS[name]}: ${error.message}`; throw error }
  progress += PHASES[name]
  loadingBar.style.width = `${Math.round(progress / total * 100)}%`
  console.info(`${name}: ${Math.round(performance.now() - started)} ms`)
}

let world
await phase('fetch', async () => { world = await fetch(`worlds/${WORLD}.json`, { cache: 'no-store' }).then(response => response.json()) })

const COLORS = {
  walls:      [0x9c5a45, 0x6e4636, 0xc9b48a, 0xe8e4da, 0xb8b4ac, 0xa8705a].map(hex => new THREE.Color(hex)),
  roofs:      [0x4a3a36, 0x6b3b2f, 0x3e3e44, 0x5a4034, 0x4a4a52, 0x703a30].map(hex => new THREE.Color(hex)),
  glass:      new THREE.Color(0x26323f),
  door:       new THREE.Color(0x4a3222),
  chimney:    new THREE.Color(0x6b4a3a),
  road:       new THREE.Color(0x585b62),
  sidewalk:   new THREE.Color(0xa9a59c),
  curb:       new THREE.Color(0xc4c1b8),
  dash:       new THREE.Color(0xe8e8e0),
  path:       new THREE.Color(0xc9c1b2),
  water:      new THREE.Color(0x4f9fd6),
    grass:      new THREE.Color(0x9ccf78),
  forest:     new THREE.Color(0x4f9a48),
    field:      new THREE.Color(0xd9c86a),
    parking:    new THREE.Color(0x5f6268),
    lot:        new THREE.Color(0xb3ae9f),
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
scene.fog = new THREE.Fog(COLORS.horizon, 250, 1300)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 1900)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
document.body.prepend(renderer.domElement)
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0022, defaultColor: [0.12, 0.08, 0.1] })

scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf70, 1.0))
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
sun.shadow.camera.left = sun.shadow.camera.bottom = -220
sun.shadow.camera.right = sun.shadow.camera.top = 220
sun.shadow.camera.near = 1
sun.shadow.camera.far = 900
sun.shadow.bias = -0.0006
scene.add(sun, sun.target)

const gradient = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]), 3, 1)
gradient.minFilter = gradient.magFilter = THREE.NearestFilter
gradient.needsUpdate = true
// POOP INFECTION:

const POOP_SLOTS = 48
const poopUniform = { value: Array.from({ length: POOP_SLOTS }, () => new THREE.Vector4()) }

function infectable(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.poops = poopUniform
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPoopWorld;')
      .replace('#include <project_vertex>', [
        'vec4 poopWorld = vec4(transformed, 1.0);',
        '#ifdef USE_INSTANCING',
        'poopWorld = instanceMatrix * poopWorld;',
        '#endif',
        'vPoopWorld = (modelMatrix * poopWorld).xyz;',
        '#include <project_vertex>'
      ].join('\n'))
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPoopWorld;\nuniform vec4 poops[${POOP_SLOTS}];`)
      .replace('#include <dithering_fragment>', [
        '#include <dithering_fragment>',
        'float infected = 0.0;',
        `for (int i = 0; i < ${POOP_SLOTS}; i++) {`,
        '  vec4 poop = poops[i];',
        '  if (poop.w <= 0.0) continue;',
        '  float d = distance(vPoopWorld.xz, poop.xz);',
        '  infected = max(infected, smoothstep(poop.w, poop.w * 0.75, d));',
        '}',
        'float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));',
        'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(lum) * vec3(0.62, 0.66, 0.42) + vec3(0.06, 0.05, 0.0), infected);'
      ].join('\n'))
  }
  return material
}

const toon = infectable(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide }))
const solid = (color, map) => infectable(new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...(map && { map }) }))

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
  asphalt: texture(3, (ctx, size) => { speckle(ctx, size, 210, 40, 400, 30); speckle(ctx, size, 210, 90, 6000, 2) }),
  foliage: texture(1, (ctx, size) => speckle(ctx, size, 200, 110, 1500, 12)),
  paving: texture(1.2, (ctx, size) => {
    ctx.fillStyle = grey(170)
    ctx.fillRect(0, 0, size, size)
    for (let x = 0; x < size; x += 64) for (let y = 0; y < size; y += 64) {
      ctx.fillStyle = grey(200 + (random() - 0.5) * 24)
      ctx.fillRect(x + 2, y + 2, 60, 60)
    }
  }),
  brick: texture(2.4, (ctx, size) => {
    ctx.fillStyle = grey(215)
    ctx.fillRect(0, 0, size, size)
    const w = size / 10, h = size / 32
    for (let row = 0; row < 32; row++) for (let column = -1; column < 10; column++) {
      ctx.fillStyle = grey(160 + random() * 50)
      ctx.fillRect(column * w + (row % 2) * w / 2 + 1, row * h + 1, w - 2, h - 2)
    }
  }),
  window: texture(1, (ctx, size) => {
    const glass = ctx.createLinearGradient(0, 0, size / 2, size)
    glass.addColorStop(0, '#5d7f9f')
    glass.addColorStop(0.45, '#324a63')
    glass.addColorStop(0.5, '#6f90ad')
    glass.addColorStop(1, '#22303f')
    ctx.fillStyle = '#f2f0ea'
    ctx.fillRect(0, 0, size / 2, size)
    ctx.fillStyle = glass
    ctx.fillRect(12, 12, size / 2 - 24, size - 24)
    ctx.fillStyle = '#f2f0ea'
    ctx.fillRect(size / 4 - 4, 12, 8, size - 24)
    ctx.fillRect(12, size * 0.4 - 4, size / 2 - 24, 8)
    ctx.fillStyle = '#4a3222'
    ctx.fillRect(size / 2, 0, size / 2, size)
    ctx.fillStyle = '#5c4030'
    for (let k = 0; k < 2; k++) ctx.fillRect(size / 2 + 24, 24 + k * size * 0.42, size / 2 - 48, size * 0.3)
    ctx.fillStyle = '#d9c26a'
    ctx.fillRect(size / 2 + 28, size * 0.5, 14, 14)
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

const textured = map => infectable(new THREE.MeshToonMaterial({ map, vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide }))
const MATERIALS = { plain: toon, asphalt: textured(TEXTURES.asphalt), paving: textured(TEXTURES.paving), brick: textured(TEXTURES.brick), tiles: textured(TEXTURES.tiles), ground: textured(TEXTURES.grass), window: textured(TEXTURES.window) }
MATERIALS.window.map.wrapS = MATERIALS.window.map.wrapT = THREE.ClampToEdgeWrapping
MATERIALS.window.map.repeat.set(1, 1)
MATERIALS.window.userData.outlineParameters = { visible: false }
;['plain', 'asphalt', 'paving', 'ground'].forEach(name => { MATERIALS[name].userData.outlineParameters = { visible: false } })

const UPPER = ['hornbach', 'jumbo', 'aldi', 'lidl', 'hema', 'gamma', 'praxis', 'karwei', 'action', 'ikea', 'kfc', 'bp', 'plus', 'spar', 'coop', 'expert', 'wibra', 'intertoys', 'decathlon', 'primark', 'kwantum', 'shell', 'ing']
const BRANDS = [['hornbach', '#f58220'], ['jumbo', '#f9c400', '#000'], ['albert heijn', '#00a0e2'], ['action', '#0c4da2'], ['kruidvat', '#e30613'],
  ['lidl', '#0050aa'], ['aldi', '#001e5a'], ['hema', '#e2001a'], ['praxis', '#f07f00'], ['gamma', '#0072bc'], ['karwei', '#e2001a'],
  ['mcdonald', '#da291c'], ['kfc', '#a4141e'], ['shell', '#dd1d21'], ['bp', '#009639'], ['total', '#e2001a'], ['blokker', '#0093d0'],
  ['zeeman', '#ffd500', '#000'], ['primark', '#00a0e0'], ['plus', '#009b3a'], ['coop', '#f39200'], ['spar', '#009a44'], ['etos', '#009fe3'],
  ['bruna', '#e2001a'], ['mediamarkt', '#df0000'], ['media markt', '#df0000'], ['ikea', '#0058a3'], ['decathlon', '#0082c3'],
  ['burger king', '#d62300'], ['domino', '#006491'], ['subway', '#009b48'], ['rabobank', '#ff6600'], ['ing', '#ff6200'], ['abn', '#009286'],
  ['kwantum', '#e2001a'], ['leen bakker', '#e30613'], ['expert', '#f39200'], ['intertoys', '#e2001a'], ['big bazar', '#e30613'], ['wibra', '#d50032']]
const SIGN = { width: 512, height: 64, columns: 8 }
const brandOf = sign => BRANDS.find(([name]) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(sign.toLowerCase()))

function signAtlas(signs) {
  const rows = Math.max(1, Math.ceil(signs.length / SIGN.columns))
  const canvas = document.createElement('canvas')
  canvas.width = SIGN.width * SIGN.columns
  canvas.height = SIGN.height * rows
  const ctx = canvas.getContext('2d')
  signs.forEach((sign, i) => {
    const x = (i % SIGN.columns) * SIGN.width, y = Math.floor(i / SIGN.columns) * SIGN.height
    const brand = brandOf(sign)
    const text = brand && UPPER.includes(brand[0]) ? sign.toUpperCase() : sign
    ctx.fillStyle = brand ? brand[1] : '#1f3a5f'
    ctx.fillRect(x, y, SIGN.width, SIGN.height)
    ctx.fillStyle = brand && brand[2] ? brand[2] : '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
      let size = 48
      ctx.font = `900 ${size}px system-ui, sans-serif`
      while (ctx.measureText(text).width > SIGN.width - 30 && size > 14) ctx.font = `900 ${size -= 2}px system-ui, sans-serif`
      ctx.fillText(text, x + SIGN.width / 2, y + SIGN.height / 2 + 2)
  })
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return { map, rows }
}

const SIGNS = [...new Set(world.buildings.map(building => building.sign).filter(Boolean))].sort((a, b) => (brandOf(b) ? 1 : 0) - (brandOf(a) ? 1 : 0)).slice(0, 128)
const signs = signAtlas(SIGNS)
MATERIALS.sign = infectable(new THREE.MeshToonMaterial({ map: signs.map, gradientMap: gradient, side: THREE.DoubleSide }))
MATERIALS.sign.userData.outlineParameters = { visible: false }

function signQuad(sign, cx, cz, ux, uz, nx, nz, width, bottom, height) {
  const index = SIGNS.indexOf(sign)
  if (index < 0) return null
  const column = index % SIGN.columns, row = Math.floor(index / SIGN.columns)
  const u0 = column / SIGN.columns, u1 = (column + 1) / SIGN.columns
  if (ux * nz - uz * nx < 0) { ux = -ux; uz = -uz }
  const v1 = 1 - row / signs.rows, v0 = 1 - (row + 1) / signs.rows
  const ox = nx * 0.1, oz = nz * 0.1, half = width / 2
  const x0 = cx - ux * half + ox, z0 = cz - uz * half + oz, x1 = cx + ux * half + ox, z1 = cz + uz * half + oz
  const top = bottom + height
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, bottom, z0, x1, bottom, z1, x1, top, z1, x0, bottom, z0, x1, top, z1, x0, top, z0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([nx, 0, nz]).flat(), 3))
  return geometry
}

function uvWorld(geometry) {
  const position = geometry.attributes.position
  const uvs = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) uvs.set([position.getX(i), position.getZ(i)], i * 2)
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return geometry
}

// TERRAIN:

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function smoothTerrain() {
  const source = T.heights.slice()
  const at = (c, r) => source[clamp(r, 0, T.rows - 1) * T.cols + clamp(c, 0, T.cols - 1)]
  for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
    let sum = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) sum += at(c + dc, r + dr)
    T.heights[r * T.cols + c] = sum / 9
  }
}

const cubic = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))

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
    for (let i = 1; i < road.p.length; i++) {
      const a = road.p[i - 1], b = road.p[i]
      const c0 = clamp(Math.floor((Math.min(a[0], b[0]) - reach - T.x0) / T.sx), 0, T.cols - 1), c1 = clamp(Math.ceil((Math.max(a[0], b[0]) + reach - T.x0) / T.sx), 0, T.cols - 1)
      const r0 = clamp(Math.floor((Math.min(a[1], b[1]) - reach - T.z0) / T.sz), 0, T.rows - 1), r1 = clamp(Math.ceil((Math.max(a[1], b[1]) + reach - T.z0) / T.sz), 0, T.rows - 1)
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (pointToSegment(T.x0 + c * T.sx, T.z0 + r * T.sz, a, b).distance < reach) T.heights[r * T.cols + c] = Math.min(T.heights[r * T.cols + c], road.level - 3)
      }
    }
  })
}

function stampRoads() {
  const sum = new Float32Array(T.heights.length), weight = new Float32Array(T.heights.length)
  world.roads.filter(road => road.kind === 'road' && !road.bridge).forEach(road => {
    const curve = new THREE.CatmullRomCurve3(road.p.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
    const points = curve.getSpacedPoints(Math.max(2, Math.ceil(curve.getLength() / 10)))
    const heights = points.map(({ x, z }) => terrainHeight(x, z))
    const reach = road.w / 2 + 6
    points.forEach(({ x, z }, i) => {
      let total = 0, count = 0
      for (let k = -3; k <= 3; k++) if (heights[i + k] !== undefined) { total += heights[i + k]; count++ }
      const level = total / count
      if (Math.abs(level - heights[i]) > 2.5) return
      const c0 = clamp(Math.floor((x - reach - T.x0) / T.sx), 0, T.cols - 1), c1 = clamp(Math.ceil((x + reach - T.x0) / T.sx), 0, T.cols - 1)
      const r0 = clamp(Math.floor((z - reach - T.z0) / T.sz), 0, T.rows - 1), r1 = clamp(Math.ceil((z + reach - T.z0) / T.sz), 0, T.rows - 1)
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const distance = Math.hypot(T.x0 + c * T.sx - x, T.z0 + r * T.sz - z)
        if (distance > reach) continue
        const w = distance < road.w / 2 + 1 ? 1 : 1 - (distance - road.w / 2 - 1) / 5
        sum[r * T.cols + c] += level * w
        weight[r * T.cols + c] += w
      }
    })
  })
  T.heights = T.heights.map((h, i) => weight[i] ? h + (sum[i] / weight[i] - h) * Math.min(1, weight[i]) : h)
}

function markDualCarriageways() {
  const wide = world.roads.filter(road => road.kind === 'road' && road.w >= 7)
  const grid = new Map()
  wide.forEach(road => road.p.forEach(([x, z]) => { const key = cellKey(x, z); if (!grid.has(key)) grid.set(key, new Set()); grid.get(key).add(road) }))
  wide.forEach(road => {
    const [mx, mz] = road.p[Math.floor(road.p.length / 2)]
    const cx = Math.floor(mx / CELL), cz = Math.floor(mz / CELL)
    const candidates = new Set()
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) (grid.get(`${cx + dx},${cz + dz}`) || []).forEach(other => candidates.add(other))
    road.dual = [...candidates].some(other => other !== road && other.name === road.name && other.w === road.w && !other.p.some(p => road.p.some(q => p[0] === q[0] && p[1] === q[1])) && polylineDistance(mx, mz, other.p) < (road.w >= 10 ? 32 : 20))
  })
  wide.forEach(road => { if (road.dual) road.w = road.w >= 10 ? 9 : 5.5 })
}

function prepareRoads() {
  markDualCarriageways()
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
    const lifted = (y, ground) => road.kind === 'water' || road.bridge || (road.elevated && y > ground + 0.4)
    road.nodes = road.p.map(([x, z], i) => [x, z, lifted(road.hs[i], road.ground[i]) ? road.hs[i] : road.ground[i], lifted(road.hs[i], road.ground[i])])
    const curve = new THREE.CatmullRomCurve3(road.p.map(([x, z], i) => new THREE.Vector3(x, road.hs[i], z)), false, 'centripetal')
    road.samples = curve.getSpacedPoints(Math.max(1, Math.ceil(curve.getLength() / 4))).map(({ x, y, z }) => {
      const ground = terrainHeight(x, z)
      if (road.kind === 'water' || road.bridge) return [x, z, y, true]
      const level = Math.max(y, ground)
      return lifted(level, ground) ? [x, z, level, true] : [x, z, ground, false]
    })
  })
}

function pointAt(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const [ax, az, ay] = points[i - 1], [bx, bz, by] = points[i]
    const length = Math.hypot(bx - ax, bz - az)
    if (distance <= length) {
      const t = distance / length
      return [ax + (bx - ax) * t, az + (bz - az) * t, ay + (by - ay) * t, points[i][3]]
    }
    distance -= length
  }
  return points[points.length - 1]
}

// GEOMETRY HELPERS:

function paint(geometry, color) {
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function offsetLine(points, offset, lift = 0) {
  return points.map(([x, z, y, elevated], i) => {
    const [px, pz] = points[Math.max(i - 1, 0)], [nx, nz] = points[Math.min(i + 1, points.length - 1)]
    const length = Math.hypot(nx - px, nz - pz) || 1
    const ox = x - (nz - pz) / length * offset, oz = z + (nx - px) / length * offset
    return [ox, (elevated ? y : terrainHeight(ox, oz)) + lift, oz]
  })
}

function edges(points, width) {
  const left = offsetLine(points, width / 2), right = offsetLine(points, -width / 2)
  return left.map((point, i) => [point, right[i]])
}

function trim(points, cutStart, cutEnd) {
  const cut = (list, amount) => {
    let remaining = amount
    while (list.length > 2 && remaining > 0) {
      const [ax, az, ay, ae] = list[0], [bx, bz, by] = list[1]
      const length = Math.hypot(bx - ax, bz - az)
      if (length <= remaining) { remaining -= length; list.shift(); continue }
      const t = remaining / length
      list[0] = [ax + (bx - ax) * t, az + (bz - az) * t, ay + (by - ay) * t, ae]
      remaining = 0
    }
    return list
  }
  return cut(cut([...points], cutStart).reverse(), cutEnd).reverse()
}

function boundary(keep, drop, predicate) {
  let a = keep, b = drop
  for (let i = 0; i < 6; i++) {
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2
    const mid = [x, z, (a[2] + b[2]) / 2, a[3]]
    if (predicate(mid)) b = mid
    else a = mid
  }
  return a
}

function splitWhere(points, predicate) {
  const pieces = []
  let piece = []
  points.forEach((point, i) => {
    if (predicate(point)) {
      if (piece.length) piece.push(boundary(piece[piece.length - 1], point, predicate))
      if (piece.length > 1) pieces.push(piece)
      piece = []
    } else {
      if (!piece.length && i > 0) piece.push(boundary(point, points[i - 1], predicate))
      piece.push(point)
    }
  })
  if (piece.length > 1) pieces.push(piece)
  return pieces
}

function onAnyAsphalt(x, z, margin) {
  return onOtherAsphalt(x, z, null, margin)
}

function onOtherAsphalt(x, z, road, margin) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const i of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      const segment = segments[i]
      if (segment.road !== road && pointToSegment(x, z, segment.a, segment.b).distance < segment.road.w / 2 + margin) return true
    }
  }
  return false
}

function cutOut(points, gaps) {
  const pieces = []
  let piece = [], travelled = 0
  for (let i = 0; i < points.length; i++) {
    if (i > 0) travelled += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    if (gaps.some(([from, to]) => travelled > from && travelled < to)) {
      if (piece.length > 1) pieces.push(piece)
      piece = []
    } else {
      piece.push(points[i])
    }
  }
  if (piece.length > 1) pieces.push(piece)
  return pieces
}

function band(points, offset, width, lift, color, parts) {
  const inner = offsetLine(points, offset, lift), outer = offsetLine(points, offset + Math.sign(offset) * width, lift)
  parts.push(paint(skirt(inner, outer), color))
  return inner
}

function upward(a, b, c) {
  const ny = (c[0] - a[0]) * (b[2] - a[2]) - (c[2] - a[2]) * (b[0] - a[0])
  return ny < -0.01 ? [a, c, b] : [a, b, c]
}

function skirt(top, bottom) {
  const positions = []
  for (let i = 1; i < top.length; i++) {
    positions.push(...upward(top[i - 1], bottom[i - 1], bottom[i]).flat(), ...upward(top[i - 1], bottom[i], top[i]).flat())
  }
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

function strip(road, width, lift, color, parts, nodes = road.nodes) {
  parts.push(paint(ribbon(road.samples, width, lift), color))
  if (width >= 3) nodes.forEach(node => parts.push(paint(disc(node, width / 2, lift), color)))
}

function dashes(points, parts) {
  const total = points.slice(1).reduce((sum, [x, z], i) => sum + Math.hypot(x - points[i][0], z - points[i][1]), 0)
  for (let d = 2; d + 3 <= total; d += 9) parts.push(paint(ribbon([pointAt(points, d), pointAt(points, d + 3)], 0.15, 0.26), COLORS.dash))
}

function quad(cx, cz, ux, uz, nx, nz, width, bottom, height, color) {
  if (ux * nz - uz * nx < 0) { ux = -ux; uz = -uz }
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
  const nodes = new Map()
  world.roads.filter(road => road.kind === 'road').forEach(road => road.p.forEach(point => {
    const key = point.join(',')
    if (!nodes.has(key)) nodes.set(key, [])
    nodes.get(key).push(road)
  }))
  const clearance = (road, point) => Math.max(0, ...nodes.get(point.join(',')).filter(other => other !== road).map(other => other.w / 2 + 1.5))
  const gaps = (road, extra) => {
    let travelled = 0, index = 0
    return road.p.flatMap((point, i) => {
      for (; index < road.samples.length - 1 && Math.hypot(road.samples[index][0] - point[0], road.samples[index][1] - point[1]) > 2.5; index++) {
        travelled += Math.hypot(road.samples[index + 1][0] - road.samples[index][0], road.samples[index + 1][1] - road.samples[index][1])
      }
      const cut = clearance(road, point)
      return cut ? [[travelled - cut - extra, travelled + cut + extra]] : []
    })
  }

  world.roads.forEach(road => {
    const points = road.samples
    if (road.kind === 'water') {
      strip(road, road.w, road.level === undefined ? 0.12 : 0, COLORS.water, groups.plain)
    } else if (road.kind === 'path') {
      strip(road, Math.min(road.w, 1.5), 0.12, COLORS.path, groups.paving)
    } else {
      if (road.elevated || road.bridge) strip(road, road.w, 0.22, COLORS.road, groups.asphalt)
      if (road.w >= 7 || road.dual) {
            splitWhere(points, ([x, z]) => onOtherAsphalt(x, z, road, 2.5)).forEach(marks => {
                if (!road.dual || road.w >= 9) dashes(marks, groups.plain)
          for (const side of [-1, 1]) band(marks, side * (road.w / 2 - 0.35), 0.12, 0.26, COLORS.dash, groups.plain)
        })
      }
            if (road.bridge) bridge(points, road.w, groups.plain)
            else if (road.elevated) embankment(points, road.w, groups.ground)
          }
        })
          buildRoadPolygons(groups)
        }

function bufferRing(points, width) {
  const sides = edges(points, width)
  const left = sides.map(([l]) => [l[0], l[2]]), right = sides.map(([, r]) => [r[0], r[2]])
  const cap = (center, from) => {
    const start = Math.atan2(from[1] - center[1], from[0] - center[0]), radius = width / 2, arc = []
    for (let k = 1; k < 8; k++) arc.push([center[0] + Math.cos(start - k / 8 * Math.PI) * radius, center[1] + Math.sin(start - k / 8 * Math.PI) * radius])
    return arc
  }
  const last = points.length - 1
  const ring = [...left, ...cap([points[last][0], points[last][1]], left[last]), ...right.reverse(), ...cap([points[0][0], points[0][1]], right[right.length - 1])]
  ring.push(ring[0])
  return ring
}

function polygonGeometry(rings, lift, color) {
  const shape = new THREE.Shape(rings[0].map(([x, z]) => new THREE.Vector2(x, -z)))
  rings.slice(1).forEach(hole => shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z)))))
  const base = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2)
  const source = base.attributes.position.array, index = base.index.array
  const stack = []
  for (let i = 0; i < index.length; i += 3) stack.push([0, 1, 2].map(k => [source[index[i + k] * 3], source[index[i + k] * 3 + 2]]))
  const positions = [], normals = [], colors = []
  while (stack.length) {
    const [a, b, c] = stack.pop()
    const lengths = [Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(a[0] - c[0], a[1] - c[1])]
    const longest = lengths.indexOf(Math.max(...lengths))
    if (lengths[longest] > 7) {
      const [p, q, r] = [[a, b, c], [b, c, a], [c, a, b]][longest]
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      stack.push([p, m, r], [m, q, r])
      continue
    }
    const tri = upward([a[0], 0, a[1]], [b[0], 0, b[1]], [c[0], 0, c[1]])
    tri.forEach(([x, , z]) => { positions.push(x, terrainHeight(x, z) + lift, z); normals.push(0, 1, 0); colors.push(color.r, color.g, color.b) })
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

function curb(ring, top, bottom, parts) {
  const upper = ring.map(([x, z]) => [x, terrainHeight(x, z) + top, z]), lower = ring.map(([x, z]) => [x, terrainHeight(x, z) + bottom, z])
  parts.push(paint(skirt(upper, lower), COLORS.curb))
}

function buildRoadPolygons(groups) {
  const tiles = new Map()
  world.roads.filter(road => road.kind === 'road' && !road.elevated && !road.bridge).forEach(road => {
    const coarse = road.samples.filter((_, i) => i % 2 === 0 || i === road.samples.length - 1)
    road.asphalt = [bufferRing(coarse, road.w)]
    road.walkway = road.w >= 5 && road.w <= 8 && !road.dual ? [bufferRing(coarse, road.w + 3.1)] : null
    const xs = road.samples.map(p => p[0]), zs = road.samples.map(p => p[1])
    const margin = road.w / 2 + 2
    for (let tx = Math.floor((Math.min(...xs) - margin) / TILE); tx <= Math.floor((Math.max(...xs) + margin) / TILE); tx++)
      for (let tz = Math.floor((Math.min(...zs) - margin) / TILE); tz <= Math.floor((Math.max(...zs) + margin) / TILE); tz++) {
        const key = `${tx},${tz}`
        if (!tiles.has(key)) tiles.set(key, [])
        tiles.get(key).push(road)
      }
  })
  tiles.forEach((roads, key) => {
    const [tx, tz] = key.split(',').map(Number)
    const box = [[[tx * TILE, tz * TILE], [(tx + 1) * TILE, tz * TILE], [(tx + 1) * TILE, (tz + 1) * TILE], [tx * TILE, (tz + 1) * TILE], [tx * TILE, tz * TILE]]]
    let asphalt, walkways
    try {
      asphalt = polygonClipping.union(...roads.map(road => road.asphalt))
      const walks = roads.filter(road => road.walkway).map(road => road.walkway)
      walkways = walks.length ? polygonClipping.difference(polygonClipping.intersection(polygonClipping.union(...walks), box), asphalt) : []
      asphalt = polygonClipping.intersection(asphalt, box)
    } catch (error) {
      console.warn('road polygons failed for tile', key, error)
      return
    }
    asphalt.forEach(polygon => groups.asphalt.push(polygonGeometry(polygon, 0.22, COLORS.road)))
    walkways.forEach(polygon => {
      groups.paving.push(polygonGeometry(polygon, 0.3, COLORS.sidewalk))
      polygon.forEach(ring => curb(ring, 0.3, 0.16, groups.plain))
    })
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

function quadInto(acc, cx, cz, ux, uz, nx, nz, width, bottom, height, color, cell = -1) {
  if (ux * nz - uz * nx < 0) { ux = -ux; uz = -uz }
  const ox = nx * 0.04, oz = nz * 0.04, half = width / 2
  const x0 = cx - ux * half + ox, z0 = cz - uz * half + oz, x1 = cx + ux * half + ox, z1 = cz + uz * half + oz
  const top = bottom + height
  acc.positions.push(x0, bottom, z0, x1, bottom, z1, x1, top, z1, x0, bottom, z0, x1, top, z1, x0, top, z0)
  for (let k = 0; k < 6; k++) {
    acc.normals.push(nx, 0, nz)
    acc.colors.push(color.r, color.g, color.b)
  }
  if (cell >= 0 && acc.uvs) {
    const u0 = cell / 2, u1 = (cell + 1) / 2
    acc.uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1)
  }
}

function flush(acc) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(acc.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(acc.normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(acc.colors, 3))
  if (acc.uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uvs, 2))
  return geometry
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

function facadeDetails(building, parts, signParts) {
  const points = building.p
  const acc = { positions: [], normals: [], colors: [], uvs: [] }
  const white = new THREE.Color(0xffffff)
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

    const brand = building.sign && brandOf(building.sign)
    if (brand && building.h >= 3 && length >= 6) {
      const slots = Math.max(1, Math.floor(length / 10)), step = length / slots
      for (let k = 0; k < slots; k++) {
        const sign = signQuad(building.sign, ax + ux * step * (k + 0.5), az + uz * step * (k + 0.5), ux, uz, nx, nz, Math.min(8, step - 1), building.base + building.h - 2.5, 2.2)
        if (sign) signParts.push(sign)
      }
    } else if (building.sign && building.h >= 3 && length >= 4 && i === front) {
      const sign = signQuad(building.sign, mx, mz, ux, uz, nx, nz, Math.min(length - 0.8, 14), building.base + building.h - 1.9, 1.6)
      if (sign) signParts.push(sign)
    }

    const count = Math.floor((length - 1.2) / 2.6)
    const spacing = length / (count + 1)
    for (let k = 1; k <= count; k++) {
      const cx = ax + ux * spacing * k, cz = az + uz * spacing * k
      for (let floor = 0; floor < (brand ? 1 : floors); floor++) {
              if (i === front && floor === 0 && k === 1 && building.h >= 3) quadInto(acc, cx, cz, ux, uz, nx, nz, 1.0, terrainHeight(cx, cz), 2.2 + building.base - terrainHeight(cx, cz), white, 1)
              else quadInto(acc, cx, cz, ux, uz, nx, nz, 1.2, building.base + floor * 3 + 1, 1.4, white, 0)
            }
          }
        })
        if (acc.positions.length) parts.push(flush(acc))
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
    facadeDetails(building, groups.window, groups.sign)

  })
}

function buildGround() {
  const [minX, minZ, maxX, maxZ] = world.bounds
  const kinds = new Uint8Array(T.cols * T.rows)
  const KINDS_BY_INDEX = ['ground', 'grass', 'forest', 'field', 'water', 'parking', 'lot']
  world.areas.forEach(area => {
    const kind = KINDS_BY_INDEX.indexOf(area.kind)
    if (kind < 0) return
    const xs = area.p.map(p => p[0]), zs = area.p.map(p => p[1])
    const c0 = clamp(Math.floor((Math.min(...xs) - T.x0) / T.sx), 0, T.cols - 1), c1 = clamp(Math.ceil((Math.max(...xs) - T.x0) / T.sx), 0, T.cols - 1)
    const r0 = clamp(Math.floor((Math.min(...zs) - T.z0) / T.sz), 0, T.rows - 1), r1 = clamp(Math.ceil((Math.max(...zs) - T.z0) / T.sz), 0, T.rows - 1)
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inside(area.p, T.x0 + c * T.sx, T.z0 + r * T.sz)) kinds[r * T.cols + c] = kind
  })
  const kindAt = (x, z) => KINDS_BY_INDEX[kinds[clamp(Math.round((z - T.z0) / T.sz), 0, T.rows - 1) * T.cols + clamp(Math.round((x - T.x0) / T.sx), 0, T.cols - 1)]]
  const segments = Math.round(TILE / Math.min(T.sx, T.sz, 10))
  for (let tx = minX; tx < maxX; tx += TILE) for (let tz = minZ; tz < maxZ; tz += TILE) {
    const width = Math.min(TILE, maxX - tx), depth = Math.min(TILE, maxZ - tz)
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments).rotateX(-Math.PI / 2).translate(tx + width / 2, 0, tz + depth / 2)
    const position = geometry.attributes.position
    const colors = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i)
      position.setY(i, terrainHeight(x, z))
      const kind = kindAt(x, z)
      const color = wasteAt(x, z) && kind !== 'water' && kind !== 'parking' ? COLORS[kind].clone().lerp(DEAD, 0.75) : COLORS[kind]
      colors.set([color.r, color.g, color.b], i * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    uvWorld(geometry)
    geometry.computeVertexNormals()
    const ground = new THREE.Mesh(geometry, MATERIALS.ground)
    ground.receiveShadow = true
    scene.add(ground)
  }
}

async function buildWorld() {
  const groups = { plain: [], asphalt: [], paving: [], brick: [], tiles: [], ground: [], sign: [], window: [] }
  await phase('roads', () => buildRoads(groups))
  await phase('buildings', () => buildBuildings(groups))
  await phase('merge', () => { for (const [name, parts] of Object.entries(groups)) {
    const tiles = new Map()
    parts.forEach(part => {
      const geometry = part.index ? part.toNonIndexed() : part
      if (name === 'plain') geometry.deleteAttribute('uv')
      else if (!geometry.attributes.uv) uvWorld(geometry)
      geometry.computeBoundingBox()
      const center = geometry.boundingBox.getCenter(new THREE.Vector3())
      const key = tileKey(center.x, center.z)
      if (!tiles.has(key)) tiles.set(key, [])
      tiles.get(key).push(geometry)
    })
        tiles.forEach(geometries => {
          const mesh = new THREE.Mesh(mergeGeometries(geometries), MATERIALS[name])
          mesh.castShadow = mesh.receiveShadow = true
          scene.add(mesh)
        })
        } })
        await phase('ground', buildGround)
        await phase('trees', buildTrees)
        buildSky()
      }

const TILE = 400
const tileKey = (x, z) => `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`

function instances(geometry, color, placements, map, variation = 0, tiled = true) {
  const material = solid(color, map)
  const tiles = new Map()
  placements.forEach(placement => {
    const key = tiled ? tileKey(placement[0], placement[2]) : 'all'
    if (!tiles.has(key)) tiles.set(key, [])
    tiles.get(key).push(placement)
  })
  const matrix = new THREE.Matrix4()
  const tint = new THREE.Color()
  let mesh
  tiles.forEach(list => {
    mesh = new THREE.InstancedMesh(geometry, material, list.length)
    list.forEach(([x, y, z, scale, rotation], i) => {
      matrix.makeRotationY(rotation || 0).scale(new THREE.Vector3(scale, scale, scale)).setPosition(x, y, z)
      mesh.setMatrixAt(i, matrix)
      if (variation) mesh.setColorAt(i, tint.setHSL(0.28 + (random() - 0.5) * variation, 0.5 + random() * 0.2, 0.35 + random() * 0.15))
    })
    mesh.computeBoundingSphere()
    mesh.castShadow = true
    scene.add(mesh)
  })
  return mesh
}

function buildTrees() {
  const placements = world.trees.map(([x, z]) => [x, terrainHeight(x, z) - 0.1, z, 0.8 + ((x * 7 + z * 13) % 10) / 20, 0])
  const dead = placements.filter(([x, , z]) => wasteAt(x, z))
  const alive = placements.filter(p => !dead.includes(p))
  const conifers = alive.filter(([x, , z]) => (Math.abs(x * 3 + z * 5) | 0) % 4 === 0)
  const leafy = alive.filter(p => !conifers.includes(p))
  instances(new THREE.CylinderGeometry(0.12, 0.3, 3.2, 5).translate(0, 1.6, 0), 0x4a4038, dead)
  instances(new THREE.CylinderGeometry(0.05, 0.1, 1.6, 4).rotateZ(0.7).translate(0.4, 3.1, 0), 0x4a4038, dead)
  instances(new THREE.CylinderGeometry(0.25, 0.35, 2, 6).translate(0, 1, 0), 0x7a5230, leafy)
  instances(new THREE.IcosahedronGeometry(1.8, 1).translate(0, 3.4, 0), 0xffffff, leafy, TEXTURES.foliage, 0.1)
  instances(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6).translate(0, 0.75, 0), 0x5a3d25, conifers)
  instances(new THREE.ConeGeometry(1.6, 5, 7).translate(0, 4, 0), 0xffffff, conifers, TEXTURES.foliage, 0.06)
}

let skyDome, clouds

function buildSky() {
  const sky = new THREE.SphereGeometry(1800, 24, 12)
  const colors = new Float32Array(sky.attributes.position.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < sky.attributes.position.count; i++) {
    color.copy(COLORS.horizon).lerp(COLORS.zenith, Math.sqrt(Math.max(0, sky.attributes.position.getY(i) / 1800)))
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
  clouds = instances(new THREE.IcosahedronGeometry(1, 1).scale(1, 0.45, 1).translate(0, 9, 0), 0xffffff, blobs, null, 0, false)
  clouds.material.fog = false
  clouds.material.userData.outlineParameters = { visible: false }
  clouds.castShadow = false
}

const bodyParts = []
const CLEAN = new THREE.Color(0xefe6cf), FILTHY = new THREE.Color(0x4a3a24)

function dirty(amount) {
  state.dirt = Math.min(1, (state.dirt || 0) + amount)
  bodyParts.forEach((mesh, i) => mesh.material.color.copy(CLEAN).lerp(FILTHY, state.dirt * (i ? 0.8 : 1)))
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

  bodyParts.push(part(1.46, 0.5, 3.38, body, 0, 0.6, 0), part(1.42, 0.6, 2.4, body, 0, 1.15, -0.45))
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

// WALKERS:

const walkers = []
let explosion = null

function box(parts, w, h, d, color, x, y, z, tilt = 0) {
  parts.push(paint(new THREE.BoxGeometry(w, h, d).rotateX(tilt).translate(x, y, z), new THREE.Color(color)))
}

function merged(parts) {
  return mergeGeometries(parts.map(part => { part.deleteAttribute('uv'); return part }))
}

function beagleGeometry() {
  const parts = []
  box(parts, 0.28, 0.26, 0.7, 0xf2ede4, 0, 0.38, 0)
  box(parts, 0.29, 0.12, 0.42, 0x3b2a1e, 0, 0.5, -0.08)
  box(parts, 0.22, 0.22, 0.28, 0xa5683a, 0, 0.5, 0.42)
  box(parts, 0.14, 0.12, 0.14, 0xf2ede4, 0, 0.44, 0.6)
  box(parts, 0.04, 0.04, 0.04, 0x111111, 0, 0.47, 0.68)
  for (const side of [-1, 1]) box(parts, 0.06, 0.2, 0.14, 0x6b3f22, side * 0.14, 0.42, 0.42)
  for (const [x, z] of [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]]) box(parts, 0.08, 0.26, 0.08, 0xf2ede4, x, 0.13, z)
  box(parts, 0.06, 0.06, 0.32, 0xf2ede4, 0, 0.55, -0.42, -0.9)
  return merged(parts)
}

function man(parts, hair, shirt, skin = 0xe8b894, trousers = 0x2f3a4a) {
  for (const side of [-1, 1]) {
    box(parts, 0.16, 0.8, 0.2, trousers, side * 0.1, 0.4, 0)
    box(parts, 0.12, 0.6, 0.14, shirt, side * 0.27, 1.12, 0)
    box(parts, 0.1, 0.12, 0.12, skin, side * 0.27, 0.78, 0)
  }
  box(parts, 0.4, 0.6, 0.24, shirt, 0, 1.1, 0)
  box(parts, 0.22, 0.26, 0.24, skin, 0, 1.55, 0)
  if (hair) box(parts, 0.23, 0.07, 0.25, 0x3a2a1a, 0, 1.71, 0)
}

function zwerverGeometry() {
  const parts = []
  man(parts, false, 0x5a4634, 0xd9b18f, 0x3d3a33)
  box(parts, 0.5, 0.5, 0.3, 0x4a3a2c, 0, 1.0, 0)
  box(parts, 0.25, 0.14, 0.27, 0x777777, 0, 1.7, 0)
  box(parts, 0.22, 0.12, 0.06, 0x8a7a66, 0, 1.44, 0.12)
  box(parts, 0.3, 0.4, 0.2, 0x7a6a4a, -0.4, 0.55, 0.1)
  return merged(parts)
}

function zombieGeometry() {
  const parts = []
  for (const side of [-1, 1]) {
    box(parts, 0.16, 0.8, 0.2, 0x3a3f3a, side * 0.1, 0.4, 0)
    box(parts, 0.12, 0.14, 0.6, 0x7a9a5a, side * 0.27, 1.3, 0.3)
    box(parts, 0.1, 0.12, 0.12, 0x7a9a5a, side * 0.27, 1.3, 0.62)
  }
  box(parts, 0.4, 0.6, 0.24, 0x4a5a4a, 0, 1.1, 0)
  box(parts, 0.22, 0.26, 0.24, 0x7a9a5a, 0, 1.52, 0.05, 0.25)
  box(parts, 0.05, 0.05, 0.05, 0xff2a2a, -0.06, 1.56, 0.17)
  box(parts, 0.05, 0.05, 0.05, 0xff2a2a, 0.06, 1.56, 0.17)
  return merged(parts)
}

function junkieGeometry() {
  const parts = []
  man(parts, false, 0x2b2b30, 0xd8c8c0, 0x1f2430)
  box(parts, 0.3, 0.3, 0.3, 0x2b2b30, 0, 1.58, -0.03)
  box(parts, 0.12, 0.28, 0.3, 0x333338, 0, 1.15, 0)
  box(parts, 0.08, 0.05, 0.03, 0xf0e6d0, 0.32, 0.8, 0.08)
  return merged(parts)
}

function baldManGeometry() {
  const parts = []
  man(parts, false, 0x6b8fb5)
  return merged(parts)
}

function tattooManGeometry() {
  const parts = []
  man(parts, false, 0xf4f4f4)
  const ink = 0x35566e
  for (const side of [-1, 1]) {
    box(parts, 0.13, 0.5, 0.15, ink, side * 0.27, 1.07, 0)
    box(parts, 0.11, 0.06, 0.13, ink, side * 0.27, 0.85, 0)
  }
  box(parts, 0.16, 0.1, 0.25, ink, 0, 1.44, 0)
  box(parts, 0.42, 0.08, 0.25, ink, 0, 1.38, 0)
  return merged(parts)
}

function dogWalkerGeometry() {
  const parts = []
  man(parts, true, 0x9a4a3a)
  const hand = new THREE.Vector3(0.27, 0.72, 0), collar = new THREE.Vector3(0, 0.62, 1.4)
  const leash = new THREE.BoxGeometry(0.02, 0.02, hand.distanceTo(collar)).lookAt(collar.clone().sub(hand)).translate(...hand.clone().add(collar).multiplyScalar(0.5).toArray())
  parts.push(paint(leash, new THREE.Color(0x222222)))
  return merged(parts)
}

function labradoodleGeometry() {
  const parts = []
  const dz = 0, fur = 0xc9a67a
  box(parts, 0.3, 0.32, 0.6, fur, 0, 0.42, dz, 0.35)
  box(parts, 0.22, 0.22, 0.24, fur, 0, 0.62, dz + 0.4)
  for (const side of [-1, 1]) {
    box(parts, 0.06, 0.18, 0.12, 0xb8935f, side * 0.13, 0.56, dz + 0.4)
    box(parts, 0.08, 0.36, 0.08, fur, side * 0.1, 0.18, dz + 0.22)
    box(parts, 0.09, 0.18, 0.12, fur, side * 0.11, 0.09, dz - 0.2)
  }
  box(parts, 0.04, 0.04, 0.04, 0x222222, 0, 0.6, dz + 0.53)
  box(parts, 0.05, 0.05, 0.25, fur, 0, 0.5, dz - 0.4, -0.6)
  box(parts, 0.09, 0.07, 0.09, 0x4a2e12, 0.02, 0.035, dz - 0.42)
  box(parts, 0.07, 0.06, 0.07, 0x4a2e12, -0.02, 0.09, dz - 0.42)
  return merged(parts)
}

function speakerboyGeometry() {
  const parts = []
  const wheel = (z) => parts.push(paint(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 14).rotateZ(Math.PI / 2).translate(0, 0.35, z), new THREE.Color(0x111111)))
  wheel(0.55)
  wheel(-0.55)
  box(parts, 0.05, 0.05, 1.1, 0x2255aa, 0, 0.62, 0)
  box(parts, 0.05, 0.4, 0.05, 0x2255aa, 0, 0.8, -0.15)
  box(parts, 0.05, 0.45, 0.05, 0x2255aa, 0, 0.8, 0.45)
  box(parts, 0.5, 0.04, 0.04, 0x333333, 0, 1.02, 0.5)
  box(parts, 0.25, 0.05, 0.2, 0x222222, 0, 1.0, -0.15)
  for (const side of [-1, 1]) {
    box(parts, 0.12, 0.5, 0.14, 0x2f3a4a, side * 0.12, 0.75, 0.05)
    box(parts, 0.1, 0.42, 0.1, 0xff6a00, side * 0.22, 1.2, 0.25, -0.9)
  }
  box(parts, 0.34, 0.5, 0.22, 0xff6a00, 0, 1.3, -0.08)
  box(parts, 0.2, 0.22, 0.2, 0xe8b894, 0, 1.68, -0.05)
  box(parts, 0.26, 0.13, 0.28, 0x39ff14, 0, 1.84, -0.04)
  box(parts, 0.5, 0.3, 0.25, 0x111111, 0, 0.82, -0.65)
  box(parts, 0.42, 0.22, 0.03, 0x555555, 0, 0.82, -0.79)
  box(parts, 0.06, 0.06, 0.06, 0x2299ff, 0.18, 0.95, -0.78)
  return merged(parts)
}

const KINDS = {
  beagle:    { geometry: beagleGeometry,    label: 'Beagle',              bob: 0.05, speed: () => random() < 0.25 ? 0 : 0.6 + random() * 1.2 },
  baldman:   { geometry: baldManGeometry,   label: 'Kale man',            bob: 0.03, speed: () => random() < 0.3 ? 0 : 0.8 + random() * 0.6 },
  dogwalker:   { geometry: dogWalkerGeometry,   label: 'Niet poep oprapende labradoodle uitlater', bob: 0.03, speed: () => random() < 0.35 ? 0 : 0.7 + random() * 0.5 },
  labradoodle: { geometry: labradoodleGeometry, label: 'Labradoodle',         bob: 0.08, speed: () => 0 },
  tattooman:   { geometry: tattooManGeometry,   label: 'Getatoeëerde kale man', bob: 0, speed: () => 0 },
  speakerboy:  { geometry: speakerboyGeometry,  label: 'Speakerboy',            bob: 0.02, speed: () => 4.5 + random() * 1.5 },
  zwerver:     { geometry: zwerverGeometry,     label: 'Zwerver',               bob: 0.02, speed: () => random() < 0.6 ? 0 : 0.3 + random() * 0.3 },
  zombie:      { geometry: zombieGeometry,      label: 'Zombie',                bob: 0.06, speed: () => 0.6 },
  junkie:      { geometry: junkieGeometry,      label: 'Junk',                  bob: 0.05, speed: () => random() < 0.2 ? 0 : 1.6 + random() * 1.2 }
}

const walkerMeshes = {}
const dummy = new THREE.Object3D()

function buildWalkers() {
  const spots = []
  world.roads.filter(road => road.kind === 'road' && road.w >= 5 && road.w <= 8).forEach(road => {
    const points = road.samples
    for (let i = 4; i < points.length; i += 8) {
      const [x, z] = points[i], [px, pz] = points[i - 1]
      const length = Math.hypot(x - px, z - pz) || 1
      const side = random() < 0.5 ? -1 : 1, offset = road.w / 2 + 2.5
      spots.push([x - (z - pz) / length * offset * side, z + (x - px) / length * offset * side])
    }
  })
  const zones = world.zones || []
  const zoneOf = ([x, z]) => zones.find(zone => inside(zone.p, x, z))
  const fromStart = ([x, z]) => Math.hypot(x - world.start.x, z - world.start.z)
  const candidates = spots.sort(() => random() - 0.5).filter(spot => fromStart(spot) > 30 && !blocked(...spot))
  const chosen = new Set([...candidates.filter(spot => fromStart(spot) < 600).slice(0, 400), ...candidates.filter(spot => fromStart(spot) >= 600).slice(0, 600)])
  zones.forEach(zone => candidates.filter(spot => zoneOf(spot) === zone).slice(0, 150).forEach(spot => chosen.add(spot)))

  chosen.forEach(([x, z]) => {
    const zone = zoneOf([x, z])
    const kinds = zone ? zone.kind.split(',') : null
    const kind = kinds ? kinds[Math.floor(random() * kinds.length)] : random() < 0.17 ? 'dogwalker' : 'beagle'
    const heading = random() * Math.PI * 2
    const walker = { kind, x, z, home: [x, z], heading, speed: 0, timer: 0 }
    walkers.push(walker)
    if (kind === 'dogwalker') walkers.push(walker.dog = { kind: 'labradoodle', owner: walker, x: x + Math.sin(heading) * 1.1, z: z + Math.cos(heading) * 1.1, home: [x, z], heading, speed: 0, timer: 1e9 })
  })
    ;(world.spots || []).forEach(spot => walkers.push({ kind: spot.kind, x: spot.x, z: spot.z, home: [spot.x, spot.z], heading: spot.heading, speed: 0, timer: 1e9 }))
    Object.entries(KINDS).forEach(([kind, { geometry }]) => {
      const group = walkers.filter(walker => walker.kind === kind)
    if (!group.length) return
    const mesh = new THREE.InstancedMesh(geometry(), toon, group.length)
    mesh.castShadow = true
    mesh.frustumCulled = false
    scene.add(mesh)
    walkerMeshes[kind] = mesh
    group.forEach((walker, index) => { walker.index = index; placeWalker(walker, 0) })
  })
}

function placeWalker(walker, bob) {
  dummy.position.set(walker.x, terrainHeight(walker.x, walker.z) + bob, walker.z)
  dummy.rotation.set(0, walker.heading, 0)
  dummy.scale.set(1, 1, 1)
  if (walker.dead) {
    dummy.position.y += 0.15
    dummy.rotation.set(Math.PI / 2, walker.heading, 0)
    dummy.scale.y = 0.4
  }
  dummy.updateMatrix()
  walkerMeshes[walker.kind].setMatrixAt(walker.index, dummy.matrix)
  walkerMeshes[walker.kind].instanceMatrix.needsUpdate = true
}

function updateWalkers(dt, now) {
  walkers.forEach(walker => {
    if (walker.dead) return combo(walker)
    if (Math.hypot(walker.x - state.x, walker.z - state.z) > 700) return
    const kind = KINDS[walker.kind]
    if (walker.kind === 'labradoodle' && !walker.owner.dead) {
      walker.x = walker.owner.x + Math.sin(walker.owner.heading) * 1.1
      walker.z = walker.owner.z + Math.cos(walker.owner.heading) * 1.1
      walker.heading = walker.owner.heading
      placeWalker(walker, walker.owner.speed ? Math.abs(Math.sin(now / 1000 * 12)) * 0.08 : 0)
      if (!explosion && Math.hypot(walker.x - state.x, walker.z - state.z) < 1.6) runOver(walker.owner)
      return
    }
    walker.timer -= dt
    if (walker.kind === 'labradoodle' && walker.owner.dead && walker.timer < 0) {
      walker.panic = (walker.panic || 0) - 1
      walker.speed = walker.panic > 0 ? 4.5 : 1.2 + random()
      walker.heading = walker.panic > 0 ? Math.atan2(walker.x - state.x, walker.z - state.z) + (random() - 0.5) : walker.heading + (random() - 0.5) * 3
      walker.timer = 0.8 + random()
    } else if (walker.timer < 0) {
      walker.speed = kind.speed()
      if (walker.kind === 'zombie' && Math.hypot(walker.x - state.x, walker.z - state.z) < 70) {
        walker.heading = Math.atan2(state.x - walker.x, state.z - walker.z) + (random() - 0.5) * 0.4
        walker.timer = 0.6
        return
      }
      if (walker.kind === 'junkie') walker.timer = 0.4 + random() * 0.8
      if (walker.kind === 'speakerboy') { walker.timer = 3 + random() * 4; walker.heading += (random() - 0.5) * 0.8 }
      if (walker.kind === 'dogwalker' && !walker.speed && walker.dog && random() < 0.5 && now - (walker.pooped || 0) > 45000) { walker.pooped = now; dropPoop(walker.dog.x, walker.dog.z) }
      if (walker.speed) {
        const far = Math.hypot(walker.home[0] - walker.x, walker.home[1] - walker.z) > (walker.kind === 'dogwalker' ? 150 : walker.kind === 'speakerboy' ? 400 : 40)
        walker.heading = far ? Math.atan2(walker.home[0] - walker.x, walker.home[1] - walker.z) : walker.heading + (random() - 0.5) * 3
      }
      walker.timer = 2 + random() * 4
    }
    const x = walker.x + Math.sin(walker.heading) * walker.speed * dt, z = walker.z + Math.cos(walker.heading) * walker.speed * dt
    if (blocked(x, z)) {
      walker.heading += Math.PI
    } else {
      walker.x = clamp(x, minX, maxX)
      walker.z = clamp(z, minZ, maxZ)
    }
    placeWalker(walker, walker.speed ? Math.abs(Math.sin(now / 1000 * 12)) * kind.bob : 0)
    if (explosion || Math.hypot(walker.x - state.x, walker.z - state.z) >= 1.6) return
    if (walker.kind === 'dogwalker') runOver(walker)
    else if (walker.kind === 'labradoodle') { if (!walker.owner.dead) runOver(walker.owner) }
    else if (['zombie', 'zwerver', 'junkie'].includes(walker.kind)) squash(walker)
    else explode(kind.label)
  })
}
const blood = new THREE.MeshBasicMaterial({ color: 0x7a0c0c, transparent: true, opacity: 0.9 })
blood.userData.outlineParameters = { visible: false }

const slime = new THREE.MeshBasicMaterial({ color: 0x4f8a2a, transparent: true, opacity: 0.85 })
slime.userData.outlineParameters = { visible: false }

function squash(walker) {
  walker.dead = true
  placeWalker(walker, 0)
  const splat = new THREE.Mesh(new THREE.CircleGeometry(1.2, 12).rotateX(-Math.PI / 2), walker.kind === 'zombie' ? slime : blood)
  splat.position.set(walker.x, groundHeight(walker.x, walker.z) + 0.21, walker.z)
  scene.add(splat)
  streetEl.textContent = `${KINDS[walker.kind].label} geplet: +0,2 G-Point`
  thud(0.8)
    awardCoin(walker.x, walker.z, 0.2)
    dirty(0.12)
  }

function runOver(walker) {
  walker.dead = true
  walker.deadAt = performance.now()
  walker.stage = 0
  walker.onTop = true
  placeWalker(walker, 0)
  const splat = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12).rotateX(-Math.PI / 2), blood)
  splat.position.set(walker.x, groundHeight(walker.x, walker.z) + 0.21, walker.z)
  scene.add(splat)
    const dog = walkers.find(other => other.owner === walker)
    if (dog) { dog.panic = 6; dog.timer = 0 }
    state.blood = 45
    state.bloodAt = [state.x, state.z]
  streetEl.textContent = 'Niet poep oprapende labradoodle uitlater overreden: +1 G-Point'
  thud(1)
  curse()
  dirty(0.2)
  awardCoin(walker.x, walker.z)
}

const coinsEl = document.getElementById('coins')
const coinFace = new THREE.TextureLoader().load('assets/gcoin.jpg')
coinFace.colorSpace = THREE.SRGBColorSpace
const coinMaterial = [new THREE.MeshToonMaterial({ color: 0xffc233, gradientMap: gradient }), new THREE.MeshToonMaterial({ map: coinFace, gradientMap: gradient }), new THREE.MeshToonMaterial({ map: coinFace, gradientMap: gradient })]
const coinGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24).rotateX(Math.PI / 2)
const coins = []
let gpunten = Number(localStorage.getItem('gpunten') || 0)
coinsEl.querySelector('span').textContent = gpunten.toLocaleString('nl-NL')
coinsEl.hidden = gpunten === 0

function awardCoin(x, z, amount = 1) {
  gpunten += amount
  localStorage.setItem('gpunten', gpunten)
      coinsEl.querySelector('span').textContent = gpunten.toLocaleString('nl-NL')
      coinsEl.hidden = false
      coinsEl.classList.remove('bump')
  requestAnimationFrame(() => coinsEl.classList.add('bump'))
  const coin = new THREE.Mesh(coinGeometry, coinMaterial)
  coin.position.set(x, groundHeight(x, z) + 1, z)
  scene.add(coin)
  coins.push({ coin, born: performance.now() })
}

function updateCoins(dt) {
  coins.forEach(({ coin, born }, i) => {
    const age = (performance.now() - born) / 1000
    coin.position.y += dt * 1.5
    coin.rotation.y += dt * 6
    if (age > 1.5) { scene.remove(coin); coins.splice(i, 1) }
  })
}

const townSign = document.getElementById('townsign')
let currentTown = null, townTimer = 0

function updateTown(dt) {
  townTimer -= dt
  if (townTimer > 0 || !world.towns) return
  townTimer = 0.5
  const town = world.towns.reduce((best, town) => {
    const score = Math.hypot(town.x - state.x, town.z - state.z) / (town.town ? 3 : 1)
    return score < best.score ? { town, score } : best
  }, { town: null, score: 900 }).town
  if (!town || town.name === currentTown) return
  currentTown = town.name
  townSign.textContent = town.name
  townSign.classList.remove('show')
  requestAnimationFrame(() => townSign.classList.add('show'))
}

function combo(walker) {
  if (walker.kind !== 'dogwalker' || walker.stage >= 2) return
  const near = Math.hypot(walker.x - state.x, walker.z - state.z) < 1.8
  if (!near) { walker.onTop = false; return }
  if (walker.onTop || performance.now() - walker.deadAt > 5000) return
  const wanted = walker.stage === 0 ? state.speed < -0.5 : state.speed > 0.5
  if (!wanted) return
  walker.onTop = true
  walker.stage++
  walker.deadAt = performance.now()
  state.blood = 45
  state.bloodAt = [state.x, state.z]
  streetEl.textContent = walker.stage === 1 ? 'Achteruit over de uitlater: +½ G-Point' : 'En nog eens vooruit: +½ G-Point'
  awardCoin(walker.x, walker.z, 0.5)
}

function bloodTrail() {
  if (!(state.blood > 0)) return
  const travelled = Math.hypot(state.x - state.bloodAt[0], state.z - state.bloodAt[1])
  if (travelled < 1.2) return
  state.bloodAt = [state.x, state.z]
  state.blood -= travelled
  const material = blood.clone()
  material.opacity = 0.85 * state.blood / 45
  for (const side of [-1, 1]) {
    const x = state.x + Math.cos(state.heading) * side * 0.66 - Math.sin(state.heading) * 1.1
    const z = state.z - Math.sin(state.heading) * side * 0.66 - Math.cos(state.heading) * 1.1
    const smear = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.5).rotateX(-Math.PI / 2), material)
    smear.position.set(x, groundHeight(x, z) + 0.22, z)
    smear.rotation.y = state.heading
    scene.add(smear)
  }
}

const poops = []
const poopGeometry = mergeGeometries([
  new THREE.BoxGeometry(0.16, 0.12, 0.16).translate(0.02, 0.06, 0),
  new THREE.BoxGeometry(0.11, 0.1, 0.11).translate(-0.02, 0.16, 0.01)
])
const poopMaterial = solid(0x4a2e12)

function dropPoop(x, z) {
  const mesh = new THREE.Mesh(poopGeometry, poopMaterial)
  mesh.position.set(x, groundHeight(x, z), z)
  scene.add(mesh)
  poops.push({ x, z, y: mesh.position.y, born: performance.now(), mesh })
  if (poops.length > 120) scene.remove(poops.shift().mesh)
}

const PUFFS = 200
const puffMaterial = new THREE.MeshBasicMaterial({ color: 0x7dff2a, transparent: true, opacity: 0.5, depthWrite: false })
puffMaterial.userData.outlineParameters = { visible: false }
const puffMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), puffMaterial, PUFFS)
puffMesh.frustumCulled = false
scene.add(puffMesh)
const puffs = []
const puffDummy = new THREE.Object3D()
let puffTimer = 0

function updatePuffs(dt, now) {
  puffTimer -= dt
  if (puffTimer < 0) {
    puffTimer = 0.25
    poops.forEach(poop => {
      if (Math.hypot(poop.x - state.x, poop.z - state.z) < 160 && random() < 0.5 && puffs.length < PUFFS) {
        puffs.push({ x: poop.x + (random() - 0.5) * 0.4, y: groundHeight(poop.x, poop.z) + 0.3, z: poop.z + (random() - 0.5) * 0.4, drift: (random() - 0.5) * 0.3, born: now })
      }
    })
  }
  for (let i = puffs.length - 1; i >= 0; i--) if (now - puffs[i].born > 2600) puffs.splice(i, 1)
  puffs.forEach((puff, i) => {
    const age = (now - puff.born) / 2600
    puffDummy.position.set(puff.x + puff.drift * age * 2, puff.y + age * 2.2, puff.z + Math.sin(age * 6 + i) * 0.15)
    puffDummy.scale.setScalar(0.25 + age * 0.9 * (1 - age * 0.5))
    puffDummy.updateMatrix()
    puffMesh.setMatrixAt(i, puffDummy.matrix)
  })
  puffMesh.count = puffs.length
  puffMesh.instanceMatrix.needsUpdate = true
}

const SMEAR_LIFE = 60000
const smears = []
const poo = new THREE.MeshBasicMaterial({ color: 0x6b4a1e, transparent: true, opacity: 0.85 })
poo.userData.outlineParameters = { visible: false }

function pickUpPoop() {
  const index = poops.findIndex(poop => Math.hypot(poop.x - state.x, poop.z - state.z) < 1.4)
  if (index < 0) return
  scene.remove(poops[index].mesh)
  poops.splice(index, 1)
  state.poo = 45
  state.pooAt = [state.x, state.z]
  streetEl.textContent = 'Door de drol gereden'
  dirty(0.15)
}

function pooTrail(now) {
  if (!(state.poo > 0)) return
  const travelled = Math.hypot(state.x - state.pooAt[0], state.z - state.pooAt[1])
  if (travelled < 1.2) return
  state.pooAt = [state.x, state.z]
  state.poo -= travelled
  const material = poo.clone()
  for (const side of [-1, 1]) {
    const x = state.x + Math.cos(state.heading) * side * 0.66 - Math.sin(state.heading) * 1.1
    const z = state.z - Math.sin(state.heading) * side * 0.66 - Math.cos(state.heading) * 1.1
    const smear = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.5).rotateX(-Math.PI / 2), material)
    smear.position.set(x, groundHeight(x, z) + 0.23, z)
    smear.rotation.y = state.heading
    scene.add(smear)
    smears.push({ mesh: smear, x, z, y: smear.position.y, born: now })
  }
}

function updateInfection(now) {
  while (smears.length && now - smears[0].born > SMEAR_LIFE) scene.remove(smears.shift().mesh)
  smears.forEach(smear => { smear.mesh.material.opacity = 0.85 * (1 - (now - smear.born) / SMEAR_LIFE) })
  const sources = [
    ...smears.map(smear => ({ x: smear.x, y: smear.y, z: smear.z, radius: 2 * (1 - (now - smear.born) / SMEAR_LIFE) })),
    ...poops.map(poop => ({ x: poop.x, y: poop.y, z: poop.z, radius: Math.min(30, (now - poop.born) / 1000 * 0.4) }))
  ]
  const nearest = sources.map(source => ({ source, distance: Math.hypot(source.x - state.x, source.z - state.z) - source.radius })).sort((a, b) => a.distance - b.distance).slice(0, POOP_SLOTS)
    poopUniform.value.forEach((slot, i) => {
      const entry = nearest[i]
      if (entry) slot.set(entry.source.x, entry.source.y, entry.source.z, entry.source.radius)
      else slot.set(0, 0, 0, 0)
    })
    const stink = nearest.reduce((sum, entry) => sum + Math.max(0, Math.min(1, -entry.distance / Math.max(entry.source.radius, 1))), 0)
    state.drunk += (Math.min(1, stink / 3) - state.drunk) * 0.02
  }

function explode(label) {
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true }))
  fireball.material.userData.outlineParameters = { visible: false }
  fireball.position.set(state.x, groundHeight(state.x, state.z) + 1, state.z)
  scene.add(fireball)
  explosion = { fireball, debris: [], at: performance.now() }
  for (const mesh of [...car.children]) {
    scene.attach(mesh)
    explosion.debris.push({ mesh, velocity: new THREE.Vector3((random() - 0.5) * 12, 5 + random() * 9, (random() - 0.5) * 12), spin: (random() - 0.5) * 12 })
  }
  state.speed = 0
  state.shake = 3
  thud(1.5)
  streetEl.textContent = `BOEM! ${label} geraakt`
  setTimeout(() => location.reload(), 2500)
}

function updateExplosion(dt) {
  const age = (performance.now() - explosion.at) / 1000
  explosion.debris.forEach(({ mesh, velocity, spin }) => {
    velocity.y -= 9.8 * dt
    mesh.position.addScaledVector(velocity, dt)
    mesh.rotation.x += spin * dt
    mesh.rotation.z += spin * dt
    const ground = terrainHeight(mesh.position.x, mesh.position.z)
    if (mesh.position.y < ground) {
      mesh.position.y = ground
      velocity.set(0, 0, 0)
    }
  })
  explosion.fireball.scale.setScalar(1 + age * 8)
  explosion.fireball.material.opacity = Math.max(0, 1 - age * 1.2)
  camera.position.y += (Math.random() - 0.5) * state.shake
  state.shake *= 0.92
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

let segments = []
const segmentGrid = new Map()

function indexRoads() {
  segments = world.roads.filter(road => road.kind === 'road').flatMap(road => road.samples.slice(1).map((b, i) => ({ road, a: road.samples[i], b })))
  segments.forEach((segment, i) => {
    const key = cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2)
    if (!segmentGrid.has(key)) segmentGrid.set(key, [])
    segmentGrid.get(key).push(i)
  })
}

function nearestSegment(x, z, reach = 1) {
  let best = null, bestDistance = Infinity, bestT = 0
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    for (const i of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      const { t, distance } = pointToSegment(x, z, segments[i].a, segments[i].b)
      if (distance < bestDistance) { bestDistance = distance; best = segments[i]; bestT = t }
    }
  }
  return { segment: best, distance: bestDistance, t: bestT }
}

function groundHeight(x, z) {
  const { segment, distance, t } = nearestSegment(x, z)
  if (segment && segment.road.elevated && distance < segment.road.w / 2 + 1.5) return segment.a[2] + (segment.b[2] - segment.a[2]) * t
  return terrainHeight(x, z)
}

const roadDistance = (x, z) => nearestSegment(x, z).distance

function streetName(x, z) {
  const { segment, distance } = nearestSegment(x, z)
  return distance < 25 && segment.road.name || ''
}

// MINIMAP:

const minimap = document.getElementById('minimap')
const map = minimap.getContext('2d')
const MAP_RADIUS = 300
let mapHeading = 0

function drawMinimap(dt) {
  const turn = Math.atan2(Math.sin(state.heading - mapHeading), Math.cos(state.heading - mapHeading))
  mapHeading += turn * Math.min(1, dt * 3)
  const size = minimap.width, scale = size / 2 / MAP_RADIUS
  map.clearRect(0, 0, size, size)
  map.save()
  map.translate(size / 2, size / 2)
  map.rotate(-(mapHeading + Math.PI))
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
        else if (road.kind === 'road' && road.w < 5) stroke(road, '#8d9096', 4)
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
  walkers.forEach(walker => {
    if (walker.dead || Math.abs(walker.x - state.x) > MAP_RADIUS || Math.abs(walker.z - state.z) > MAP_RADIUS) return
    map.fillStyle = walker.kind === 'beagle' ? '#ff9f1a' : walker.kind === 'labradoodle' ? '#ffe28a' : walker.kind === 'baldman' ? '#ff4fd8' : '#4fd2ff'
    map.beginPath()
    map.arc(walker.x, walker.z, 4, 0, Math.PI * 2)
    map.fill()
  })
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
  map.rotate(-(mapHeading + Math.PI))
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
const waste = new Uint8Array(T.cols * T.rows)
;(world.zones || []).filter(zone => zone.kind.includes('zombie')).forEach(zone => {
  const xs = zone.p.map(p => p[0]), zs = zone.p.map(p => p[1])
  const c0 = clamp(Math.floor((Math.min(...xs) - T.x0) / T.sx), 0, T.cols - 1), c1 = clamp(Math.ceil((Math.max(...xs) - T.x0) / T.sx), 0, T.cols - 1)
  const r0 = clamp(Math.floor((Math.min(...zs) - T.z0) / T.sz), 0, T.rows - 1), r1 = clamp(Math.ceil((Math.max(...zs) - T.z0) / T.sz), 0, T.rows - 1)
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inside(zone.p, T.x0 + c * T.sx, T.z0 + r * T.sz)) waste[r * T.cols + c] = 1
})
const wasteAt = (x, z) => waste[clamp(Math.round((z - T.z0) / T.sz), 0, T.rows - 1) * T.cols + clamp(Math.round((x - T.x0) / T.sx), 0, T.cols - 1)] === 1
const DEAD = new THREE.Color(0x8a7f66)
await phase('terrain', () => { smoothTerrain(); digWater() })
await phase('stamp', stampRoads)
await phase('prepare', prepareRoads)
await phase('index', indexRoads)
await buildWorld()
const car = buildCar()
await phase('walkers', buildWalkers)
console.info(`ready: ${Math.round(performance.now())} ms`)
clearInterval(slideTimer)
loadingEl.classList.add('done')
setTimeout(() => loadingEl.remove(), 900)

// HARDSTYLE:

let audio, hardstyle, nextBeat = 0, beat = 0
const NOTES = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196]

function startAudio() {
  if (audio) return
  audio = new AudioContext()
  hardstyle = audio.createGain()
  hardstyle.gain.value = 0
  const drive = audio.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 4)
  drive.curve = curve
  drive.connect(hardstyle)
  hardstyle.connect(audio.destination)
  nextBeat = audio.currentTime + 0.1
  startSfx()
  setInterval(() => {
    while (nextBeat < audio.currentTime + 0.3) {
      kick(nextBeat, drive)
      if (beat % 2 === 1) lead(nextBeat, NOTES[(beat >> 1) % NOTES.length], drive)
      nextBeat += 0.4
      beat++
    }
  }, 100)
}

function kick(time, out) {
  const osc = audio.createOscillator(), gain = audio.createGain()
  osc.frequency.setValueAtTime(180, time)
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.18)
  gain.gain.setValueAtTime(1.2, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38)
  osc.connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + 0.4)
}

function lead(time, frequency, out) {
  const osc = audio.createOscillator(), gain = audio.createGain(), filter = audio.createBiquadFilter()
  osc.type = 'sawtooth'
  osc.frequency.value = frequency
  filter.type = 'lowpass'
  filter.frequency.value = 1800
  gain.gain.setValueAtTime(0.18, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
  osc.connect(filter).connect(gain).connect(out)
  osc.start(time)
  osc.stop(time + 0.32)
}

let engine, engineGain, sfx
const CURSES = ['Godverdomme, kijk uit!', 'Hé, klootzak!', 'Mijn hond!', 'Wat doe je nou, eikel!', 'Ben je helemaal gek geworden!', 'Sjongejonge!']

function startSfx() {
  sfx = audio.createGain()
  sfx.gain.value = 0.6
  sfx.connect(audio.destination)
  engine = audio.createOscillator()
  engine.type = 'sawtooth'
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  engineGain = audio.createGain()
  engineGain.gain.value = 0
  engine.connect(filter).connect(engineGain).connect(sfx)
  engine.start()
}

function updateEngine() {
  if (!engine) return
  const speed = Math.abs(state.speed)
  const gear = Math.floor(speed / 9)
  const revs = (speed - gear * 9) / 9
  engine.frequency.setTargetAtTime(45 + revs * 70 + gear * 8, audio.currentTime, 0.05)
  engineGain.gain.setTargetAtTime(0.05 + revs * 0.07 + (keys.has('ArrowUp') || keys.has('KeyW') ? 0.04 : 0), audio.currentTime, 0.1)
}

function thud(strength = 1) {
  if (!sfx) return
  const time = audio.currentTime
  const buffer = audio.createBuffer(1, audio.sampleRate * 0.3, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  const noise = audio.createBufferSource(), gain = audio.createGain(), filter = audio.createBiquadFilter()
  noise.buffer = buffer
  filter.type = 'lowpass'
  filter.frequency.value = 600
  gain.gain.value = 0.9 * strength
  noise.connect(filter).connect(gain).connect(sfx)
  noise.start(time)
  const osc = audio.createOscillator(), og = audio.createGain()
  osc.frequency.setValueAtTime(90, time)
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.25)
  og.gain.setValueAtTime(0.8 * strength, time)
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
  osc.connect(og).connect(sfx)
  osc.start(time)
  osc.stop(time + 0.3)
}

function bark(distance) {
  if (!sfx) return
  const time = audio.currentTime, level = Math.max(0, 1 - distance / 60) * 0.5
  for (let k = 0; k < 2; k++) {
    const osc = audio.createOscillator(), gain = audio.createGain(), filter = audio.createBiquadFilter()
    osc.type = 'square'
    osc.frequency.setValueAtTime(420, time + k * 0.22)
    osc.frequency.exponentialRampToValueAtTime(260, time + k * 0.22 + 0.12)
    filter.type = 'bandpass'
    filter.frequency.value = 900
    gain.gain.setValueAtTime(level, time + k * 0.22)
    gain.gain.exponentialRampToValueAtTime(0.001, time + k * 0.22 + 0.14)
    osc.connect(filter).connect(gain).connect(sfx)
    osc.start(time + k * 0.22)
    osc.stop(time + k * 0.22 + 0.15)
  }
}

let barkTimer = 0
function updateBarks(dt) {
  barkTimer -= dt
  if (barkTimer > 0) return
  barkTimer = 1.5 + random() * 3
  let nearest = Infinity
  walkers.forEach(walker => { if (walker.kind === 'beagle' && !walker.dead) nearest = Math.min(nearest, Math.hypot(walker.x - state.x, walker.z - state.z)) })
  if (nearest < 60) bark(nearest)
}

function curse() {
  if (!('speechSynthesis' in window)) return
  const line = new SpeechSynthesisUtterance(CURSES[Math.floor(Math.random() * CURSES.length)])
  line.lang = 'nl-NL'
  line.rate = 1.15
  line.pitch = 0.8
  const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('nl'))
  if (voice) line.voice = voice
  speechSynthesis.speak(line)
}

function updateHardstyle() {
  if (!hardstyle) return
  let nearest = Infinity
  walkers.forEach(walker => { if (walker.kind === 'speakerboy' && !walker.dead) nearest = Math.min(nearest, Math.hypot(walker.x - state.x, walker.z - state.z)) })
  const level = Math.max(0, 1 - nearest / 80) ** 2 * 0.45
  hardstyle.gain.setTargetAtTime(level, audio.currentTime, 0.2)
}

addEventListener('keydown', startAudio, { once: true })

// FAST TRAVEL:

const travel = document.getElementById('travel')
const travelList = document.getElementById('travel-list')

function renderTravel() {
  const towns = new Map()
  ;(world.places || []).forEach(place => {
    const town = place.town || 'Overig'
    if (!towns.has(town)) towns.set(town, [])
    towns.get(town).push(place)
  })
  travelList.innerHTML = [...towns.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([town, places]) =>
    `<li class="town">${town}</li>` + places.map(place =>
      `<li data-name="${place.name.replace(/"/g, '&quot;')}"><span>${place.name}</span><small>${place.kind.replace(/_/g, ' ')}</small></li>`).join('')
  ).join('')
}

function toggleTravel(open = travel.hidden) {
  travel.hidden = !open
  keys.clear()
  if (open) renderTravel()
}

function travelTo(name) {
  const place = (world.places || []).find(place => place.name === name)
  if (!place) return
    const { segment, distance, t } = nearestSegment(place.x, place.z, 6)
    if (segment && distance < 250) {
    state.x = segment.a[0] + (segment.b[0] - segment.a[0]) * t
    state.z = segment.a[1] + (segment.b[1] - segment.a[1]) * t
    state.heading = Math.atan2(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1])
  } else {
    state.x = place.x
    state.z = place.z
  }
  state.speed = 0
  if (blocked(state.x - Math.sin(state.heading) * 9, state.z - Math.cos(state.heading) * 9)) state.heading += Math.PI
  camera.position.set(state.x - Math.sin(state.heading) * 9, groundHeight(state.x, state.z) + 4.5, state.z - Math.cos(state.heading) * 9)
  toggleTravel(false)
}


travelList.addEventListener('click', event => { const item = event.target.closest('li'); if (item) travelTo(item.dataset.name) })

const keys = new Set()
window.debug = { keys, walkers, travelTo, dropPoop, poops, SIGNS, signs, camera, scene, MATERIALS, get state() { return state } }
addEventListener('keydown', event => {
  if (event.code === 'Escape' && !travel.hidden) return toggleTravel(false)
  if (event.code === 'KeyT' && !/INPUT|TEXTAREA/.test(event.target.tagName)) return toggleTravel()
  if (!travel.hidden) return
  keys.add(event.code)
  if (event.code.startsWith('Arrow')) event.preventDefault()
})
addEventListener('keyup', event => keys.delete(event.code))
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const state = { x: world.start.x, z: world.start.z, heading: world.start.heading, speed: 0, steer: 0, shake: 0, drunk: 0 }
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
  if (explosion) {
    updateExplosion(dt)
    return
  }

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
  state.heading += Math.sin(now * 0.0021) * 0.5 * state.drunk * Math.min(1, speed / 5) * dt

  const x = state.x + Math.sin(state.heading) * state.speed * dt
  const z = state.z + Math.cos(state.heading) * state.speed * dt
  const hit = corners(x, z, state.heading).some(([cx, cz]) => blocked(cx, cz))

  if (hit) {
    if (Math.abs(state.speed) > 2) thud(Math.min(1, Math.abs(state.speed) / 15))
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
  camera.rotation.z += Math.sin(now * 0.0027) * 0.14 * state.drunk
  camera.fov = 60 + Math.sin(now * 0.0016) * 7 * state.drunk
  camera.updateProjectionMatrix()
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
  updateWalkers(dt, now)
  pickUpPoop()
  pooTrail(now)
  updateInfection(now)
  updatePuffs(dt, now)
  updateHardstyle()
  updateEngine()
  updateBarks(dt)
  bloodTrail()
      updateCoins(dt)
      updateTown(dt)
    drawMinimap(dt)
  }

camera.position.set(state.x - Math.sin(state.heading) * 9, groundHeight(state.x, state.z) + 4.5, state.z - Math.cos(state.heading) * 9)

let snapshotAt = performance.now() + 20000

function snapshot() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 400
  canvas.getContext('2d').drawImage(renderer.domElement, 0, 0, 640, 400)
  snapshots.push(canvas.toDataURL('image/jpeg', 0.6))
  while (snapshots.length > 8) snapshots.shift()
  try { localStorage.setItem('snapshots', JSON.stringify(snapshots)) } catch {}
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  step(dt, now)
  effect.render(scene, camera)
  if (now > snapshotAt && Math.abs(state.speed) > 5) { snapshotAt = now + 45000; snapshot() }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
