import * as THREE from 'three'
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'



// LOADING SCREEN:

const TIPS = [
  'Rij een niet poep oprapende labradoodle uitlater omver voor een coin.',
  'Binnen 5 seconden achteruit en weer vooruit over hem heen: twee halve coins extra.',
  'De labradoodle is onsterfelijk en rent weg. Raak een beagle en je Panda ontploft: al je coins weg.',
  'Elke kill is een coin, Speakerboy is er vijf waard, een drol oprapen een halve.',
  'E is turbo: vijf seconden vlammen en dubbele punten voor vijf coins. Nog eens E tijdens de turbo is nitro.',
  'Drie kills snel achter elkaar en de politie komt. Opgepakt worden kost je de helft van je coins.',
  'In Einighausen lopen alleen kale mannetjes rond.',
  'Druk op T om naar een supermarkt, skatebaan of station te springen.',
  'Bij het eet.nu-kantoor aan de Brugstraat staat iemand voor de deur.',
  'Shift is de handrem. De Panda haalt 150 op de A2.',
  'Het terrein is echt: AHN-hoogtedata, het Julianakanaal ligt hoger dan Urmond.'
]
let audio, hardstyle, nextBeat = 0, beat = 0, engine, engineGain, sfx, metal, metalTimer, metalBeat = 0, metalNext = 0, engineSample = null, hardstyleSampled = false
const RIFF = [[82.41, 1], [82.41, 1], [82.41, 0], [98, 1], [82.41, 1], [82.41, 0], [110, 1], [110, 1], [82.41, 1], [82.41, 0], [82.41, 1], [73.42, 1], [82.41, 1], [82.41, 0], [98, 1], [110, 1]]
const NOTES = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196]
addEventListener('keydown', () => startMetal(), { once: true })
const loadingEl = document.getElementById('loading')
const loadingBar = loadingEl.querySelector('#loading-bar i')
let loaded = false
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
  document.getElementById('player-name').value = localStorage.getItem('playerName') || `Panda-${Math.floor(Math.random() * 900 + 100)}`
const slideTimer = setInterval(nextSlide, 4000)
let progress = 0
const PHASES = { server: 2, fetch: 10, terrain: 10, ground: 8, roads: 8, buildings: 25, trees: 3, asphalt: 8, details: 3 }
const total = Object.values(PHASES).reduce((a, b) => a + b, 0)
const LABELS = { server: 'Verbinden met server', fetch: 'Tegels ophalen', terrain: 'Terrein boetseren', ground: 'Gras zaaien', roads: 'Wegen aanleggen', buildings: 'Huizen metselen', trees: 'Bomen planten', asphalt: 'Asfalt gieten', details: 'Kozijnen schilderen' }

async function phase(name, fn) {
  loadingPhase.textContent = LABELS[name] + '…'
  await new Promise(resolve => setTimeout(resolve, 20))
  const started = performance.now()
  try { await fn() } catch (error) { console.error(`phase ${name} failed: ${error.stack}`); loadingPhase.textContent = `Fout in ${LABELS[name]}: ${error.message}`; throw error }
  progress += PHASES[name]
  loadingBar.style.width = `${Math.round(progress / total * 100)}%`
  console.info(`${name}: ${Math.round(performance.now() - started)} ms`)
}


const COLORS = {
  walls:      [0x9c5a45, 0x6e4636, 0xc9b48a, 0xe8e4da, 0xb8b4ac, 0xa8705a, 0x7a3b2e, 0xd9cdb8, 0x5b4b45, 0xc2a27a, 0xf1ece0, 0x8d6a52].map(hex => new THREE.Color(hex)),
  roofs:      [0x4a3a36, 0x6b3b2f, 0x3e3e44, 0x5a4034, 0x4a4a52, 0x703a30, 0x2f2f33, 0x8a4a3a, 0x555049, 0x3a2e2a, 0x6a5a4a, 0x46403c].map(hex => new THREE.Color(hex)),
  glass:      new THREE.Color(0x26323f),
  hedge:      new THREE.Color(0x4f8a3a),
  frame:      new THREE.Color(0xf4f2ea),
  door:       new THREE.Color(0x3b2a1e),
  chimney:    new THREE.Color(0x6b4a3a),
  plaster:    [0xf3efe4, 0xe9e2d0, 0xd8d3c4, 0xf7f4ee, 0xe4d9c4, 0xcfd6cf].map(hex => new THREE.Color(hex)),
  plinth:     new THREE.Color(0x4f4a45),
  gutter:     new THREE.Color(0x50555c),
  road:       new THREE.Color(0x56575b),
  wear:       new THREE.Color(0x4f5054),
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
  rail:       new THREE.Color(0xa0a0a0),
  ballast:    new THREE.Color(0x6b6558),
  embankment: new THREE.Color(0x7c9a5a),
  bitumen:    new THREE.Color(0x3b3b3e),
  horizon:    new THREE.Color(0xdfeeff),
  zenith:     new THREE.Color(0x5aa9e8)
}

const CELL = 40
const CAR = { length: 3.4, width: 1.5 }
const PANDA = { topSpeed: 48, reverseSpeed: 5, acceleration: 7.5, braking: 11, wheelbase: 2.16, steeringLock: 0.7, grip: 15 }
const GRADE = 0.06

const scene = new THREE.Scene()
scene.background = COLORS.horizon
scene.fog = new THREE.Fog(COLORS.horizon, 250, 1300)

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 1900)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = 1.15
document.body.prepend(renderer.domElement)
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0016, defaultColor: [0.12, 0.08, 0.1] })

scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbf70, 0.65))
const sun = new THREE.DirectionalLight(0xfff4e0, 2.3)
sun.castShadow = true
sun.shadow.mapSize.set(3072, 3072)
sun.shadow.camera.left = sun.shadow.camera.bottom = -220
sun.shadow.camera.right = sun.shadow.camera.top = 220
sun.shadow.camera.near = 1
sun.shadow.camera.far = 900
sun.shadow.bias = -0.0006
scene.add(sun, sun.target)

function environment() {
  const world = new THREE.Scene()
  const dome = new THREE.SphereGeometry(50, 32, 16)
  const colors = new Float32Array(dome.attributes.position.count * 3), color = new THREE.Color()
  for (let i = 0; i < dome.attributes.position.count; i++) {
    const y = dome.attributes.position.getY(i) / 50
    color.copy(COLORS.horizon).lerp(COLORS.zenith, Math.sqrt(Math.max(0, y)))
    if (y < 0) color.set(0x6f8f55).lerp(new THREE.Color(0x4a5a3a), -y)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  dome.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  world.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
  const glare = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }))
  glare.position.set(18, 30, 12)
  world.add(glare)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const texture = pmrem.fromScene(world, 0.02).texture
  pmrem.dispose()
  return texture
}
scene.environment = environment()
scene.environmentIntensity = 0.75
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

const toon = infectable(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))
const solid = (color, map) => infectable(new THREE.MeshLambertMaterial({ color, ...(map && { map }) }))
const carPaint = color => infectable(new THREE.MeshPhysicalMaterial({ color, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 }))
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x1c2b3a, metalness: 0.6, roughness: 0.05, envMapIntensity: 1.8 })
const chrome = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 1, roughness: 0.14, envMapIntensity: 1.8 })

// TEXTURES:

let seed = 7
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const grey = (value, alpha = 1) => `rgba(${value | 0},${value | 0},${value | 0},${alpha})`

function texture(metresPerTile, draw, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d'), size)
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

function grain(ctx, size, base, spread, count, blob, alpha = 0.6) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = grey(base + (random() - 0.5) * spread, alpha)
    const radius = blob * (0.5 + random())
    ctx.fillRect(random() * size, random() * size, radius, radius)
  }
}

function cracks(ctx, size, count, shade) {
  ctx.strokeStyle = grey(shade, 0.7)
  for (let i = 0; i < count; i++) {
    let x = random() * size, y = random() * size, angle = random() * Math.PI * 2
    ctx.lineWidth = 1 + random() * 1.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 10; k++) {
      angle += (random() - 0.5) * 1.4
      x += Math.cos(angle) * 12
      y += Math.sin(angle) * 12
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function blades(ctx, size, count) {
  for (let i = 0; i < count; i++) {
    const x = random() * size, y = random() * size, height = 5 + random() * 12, lean = (random() - 0.5) * 6
    ctx.strokeStyle = grey(140 + random() * 115, 0.85)
    ctx.lineWidth = 1 + random() * 1.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + lean / 2, y - height / 2, x + lean, y - height)
    ctx.stroke()
  }
}

function bricks(ctx, size, mortar, palette) {
  ctx.fillStyle = mortar
  ctx.fillRect(0, 0, size, size)
  grain(ctx, size, 175, 50, 5000, 3, 0.35)
  const w = size / 10, h = size / 32
  for (let row = 0; row < 32; row++) for (let column = -1; column < 10; column++) {
    const x = column * w + (row % 2) * w / 2 + 1.5, y = row * h + 1.5
    ctx.fillStyle = palette[Math.floor(random() * palette.length)]
    ctx.fillRect(x, y, w - 3, h - 3)
    ctx.fillStyle = `rgba(255,255,255,${0.06 + random() * 0.12})`
    ctx.fillRect(x, y, w - 3, 2)
    ctx.fillStyle = `rgba(0,0,0,${0.15 + random() * 0.2})`
    ctx.fillRect(x, y + h - 5, w - 3, 2)
    for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(0,0,0,${random() * 0.25})`; ctx.fillRect(x + random() * (w - 6), y + random() * (h - 6), 2 + random() * 3, 2) }
  }
}

const TEXTURES = {
  grass: texture(6, (ctx, size) => {
    speckle(ctx, size, 195, 50, 500, 48)
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = grey(130 + random() * 50, 0.3)
      ctx.beginPath()
      ctx.ellipse(random() * size, random() * size, 12 + random() * 40, 8 + random() * 18, random() * 3, 0, 7)
      ctx.fill()
    }
    blades(ctx, size, 14000)
  }),
  asphalt: texture(3, (ctx, size) => {
    speckle(ctx, size, 200, 24, 200, 60)
    grain(ctx, size, 200, 120, 30000, 2, 0.7)
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = grey(170 + random() * 60, 0.18)
      ctx.beginPath()
      ctx.ellipse(random() * size, random() * size, 30 + random() * 60, 20 + random() * 40, random() * 3, 0, 7)
      ctx.fill()
    }
    cracks(ctx, size, 5, 90)
  }),
  foliage: texture(1, (ctx, size) => {
    ctx.fillStyle = grey(120)
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = grey(110 + random() * 150, 0.9)
      ctx.beginPath()
      ctx.ellipse(random() * size, random() * size, 5 + random() * 7, 3 + random() * 4, random() * Math.PI, 0, 7)
      ctx.fill()
    }
    grain(ctx, size, 60, 40, 500, 6, 0.35)
  }),
  plaster: texture(2, (ctx, size) => {
    speckle(ctx, size, 212, 16, 900, 30)
    grain(ctx, size, 212, 36, 8000, 2, 0.3)
  }),
  gravel: texture(1.5, (ctx, size) => {
    speckle(ctx, size, 190, 30, 300, 40)
    grain(ctx, size, 185, 130, 9000, 5, 0.8)
    grain(ctx, size, 200, 100, 20000, 2, 0.6)
  }),
  paving: texture(1.2, (ctx, size) => {
    ctx.fillStyle = grey(150)
    ctx.fillRect(0, 0, size, size)
    const tile = size / 4
    for (let x = 0; x < size; x += tile) for (let y = 0; y < size; y += tile) {
      const shade = 195 + (random() - 0.5) * 30
      ctx.fillStyle = grey(shade)
      ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6)
      ctx.fillStyle = grey(shade + 30, 0.7)
      ctx.fillRect(x + 3, y + 3, tile - 6, 3)
      ctx.fillRect(x + 3, y + 3, 3, tile - 6)
      ctx.fillStyle = grey(shade - 35, 0.7)
      ctx.fillRect(x + 3, y + tile - 6, tile - 6, 3)
      ctx.fillRect(x + tile - 6, y + 3, 3, tile - 6)
      if (random() < 0.12) { ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y + 3, tile - 6, tile - 6); ctx.clip(); cracks(ctx, size, 1, 110); ctx.restore() }
    }
    grain(ctx, size, 190, 60, 6000, 2, 0.35)
  }),
  brickRed:    texture(2.4, (ctx, size) => bricks(ctx, size, '#b4aca0', ['#9a4a3a', '#8b3f31', '#a85a46', '#7c3a2f', '#b06a52', '#5a2e26'])),
  brickBrown:  texture(2.4, (ctx, size) => bricks(ctx, size, '#a49b8e', ['#6e4636', '#5b3a2c', '#7a5040', '#4f3128', '#86604c'])),
  brickYellow: texture(2.4, (ctx, size) => bricks(ctx, size, '#c9c2b4', ['#c9b48a', '#b8a074', '#d3bf96', '#a88f66', '#dccaa4', '#8f7a58'])),
  tiles: texture(2, (ctx, size) => {
    ctx.fillStyle = grey(120)
    ctx.fillRect(0, 0, size, size)
    const columns = 6, rows = 10, w = size / columns, h = size / rows
    for (let row = 0; row < rows; row++) for (let column = -1; column <= columns; column++) {
      const x = column * w + (row % 2) * w / 2, y = row * h, shade = 175 + random() * 45
      const face = ctx.createLinearGradient(0, y, 0, y + h)
      face.addColorStop(0, grey(shade + 20))
      face.addColorStop(0.8, grey(shade - 10))
      face.addColorStop(1, grey(shade - 50))
      ctx.fillStyle = face
      ctx.beginPath()
      ctx.moveTo(x + 1, y)
      ctx.lineTo(x + w - 1, y)
      ctx.lineTo(x + w - 1, y + h - 8)
      ctx.quadraticCurveTo(x + w / 2, y + h + 6, x + 1, y + h - 8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = grey(90, 0.35)
      ctx.fillRect(x + 1, y, 2, h - 8)
    }
    grain(ctx, size, 180, 60, 4000, 2, 0.3)
  })
}

function windowAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d'), cell = 512
  const glass = (x, y, w, h) => {
    ctx.fillStyle = '#1b2129'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(232,223,207,0.9)'
    for (const side of [0, 1]) {
      const cx = side ? x + w - w * 0.22 : x
      ctx.fillRect(cx, y, w * 0.22, h)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let k = 1; k < 5; k++) ctx.fillRect(cx + k * w * 0.22 / 5, y, 3, h)
      ctx.fillStyle = 'rgba(232,223,207,0.9)'
    }
    ctx.fillStyle = 'rgba(255,214,120,0.35)'
    ctx.fillRect(x + w * 0.3, y + h * 0.35, w * 0.4, h * 0.65)
    const sky = ctx.createLinearGradient(0, y, 0, y + h)
    sky.addColorStop(0, 'rgba(170,205,235,0.65)')
    sky.addColorStop(0.55, 'rgba(90,120,150,0.45)')
    sky.addColorStop(1, 'rgba(30,45,60,0.35)')
    ctx.fillStyle = sky
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.1, y + h)
    ctx.lineTo(x + w * 0.55, y)
    ctx.lineTo(x + w * 0.75, y)
    ctx.lineTo(x + w * 0.3, y + h)
    ctx.fill()
    const shade = ctx.createLinearGradient(0, y, 0, y + 24)
    shade.addColorStop(0, 'rgba(0,0,0,0.45)')
    shade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shade
    ctx.fillRect(x, y, w, 24)
  }
  ctx.fillStyle = '#f4f2ea'
  ctx.fillRect(0, 0, cell, cell)
  glass(36, 36, cell - 72, cell - 72)
  ctx.fillStyle = '#f4f2ea'
  ctx.fillRect(cell / 2 - 9, 36, 18, cell - 72)
  ctx.fillRect(36, cell * 0.36 - 8, cell - 72, 16)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(36, 36, cell - 72, 6)
  ctx.fillRect(36, 36, 6, cell - 72)
  ctx.fillStyle = '#f4f2ea'
  ctx.fillRect(cell, 0, cell, cell)
  ctx.fillStyle = '#3b2a1e'
  ctx.fillRect(cell + 30, 30, cell - 60, cell - 30)
  for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
    const x = cell + 60 + column * 210, y = 150 + row * 170
    ctx.fillStyle = '#2a1c12'
    ctx.fillRect(x, y, 180, 140)
    ctx.fillStyle = '#4a3626'
    ctx.fillRect(x + 8, y + 8, 164, 124)
  }
  glass(cell + 60, 50, cell - 120, 70)
  ctx.fillStyle = '#d9c26a'
  ctx.beginPath()
  ctx.arc(cell + cell - 70, cell * 0.55, 12, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#c9b25a'
  ctx.fillRect(cell + cell / 2 - 50, cell * 0.62, 100, 14)
  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(cell + 40, 130, 46, 34)
  ctx.fillStyle = '#222'
  ctx.font = 'bold 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(String(1 + Math.floor(random() * 98)), cell + 63, 157)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return map
}
TEXTURES.window = windowAtlas()

const textured = map => infectable(new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide }))
const MATERIALS = { plain: toon, asphalt: textured(TEXTURES.asphalt), paving: textured(TEXTURES.paving), gravel: textured(TEXTURES.gravel), plaster: textured(TEXTURES.plaster), hedge: textured(TEXTURES.foliage), brickRed: textured(TEXTURES.brickRed), brickBrown: textured(TEXTURES.brickBrown), brickYellow: textured(TEXTURES.brickYellow), tiles: textured(TEXTURES.tiles), ground: textured(TEXTURES.grass), window: textured(TEXTURES.window) }
MATERIALS.window.map.wrapS = MATERIALS.window.map.wrapT = THREE.ClampToEdgeWrapping
MATERIALS.window.map.repeat.set(1, 1)
MATERIALS.window.userData.outlineParameters = { visible: false }
;['plain', 'asphalt', 'paving', 'gravel', 'ground'].forEach(name => { MATERIALS[name].userData.outlineParameters = { visible: false } })

const UPPER = ['hornbach', 'jumbo', 'aldi', 'lidl', 'hema', 'gamma', 'praxis', 'karwei', 'action', 'ikea', 'kfc', 'bp', 'plus', 'spar', 'coop', 'expert', 'wibra', 'intertoys', 'decathlon', 'primark', 'kwantum', 'shell', 'ing']
const BRANDS = [['hornbach', '#f58220'], ['jumbo', '#f9c400', '#000'], ['albert heijn', '#00a0e2'], ['action', '#0c4da2'], ['kruidvat', '#e30613'],
  ['lidl', '#0050aa'], ['aldi', '#001e5a'], ['hema', '#e2001a'], ['praxis', '#f07f00'], ['gamma', '#0072bc'], ['karwei', '#e2001a'],
  ['mcdonald', '#da291c'], ['kfc', '#a4141e'], ['shell', '#dd1d21'], ['bp', '#009639'], ['total', '#e2001a'], ['blokker', '#0093d0'],
  ['zeeman', '#ffd500', '#000'], ['primark', '#00a0e0'], ['plus', '#009b3a'], ['coop', '#f39200'], ['spar', '#009a44'], ['etos', '#009fe3'],
  ['bruna', '#e2001a'], ['mediamarkt', '#df0000'], ['media markt', '#df0000'], ['ikea', '#0058a3'], ['decathlon', '#0082c3'],
  ['burger king', '#d62300'], ['domino', '#006491'], ['subway', '#009b48'], ['rabobank', '#ff6600'], ['ing', '#ff6200'], ['abn', '#009286'],
  ['kwantum', '#e2001a'], ['leen bakker', '#e30613'], ['expert', '#f39200'], ['intertoys', '#e2001a'], ['big bazar', '#e30613'], ['wibra', '#d50032']]
const SIGN = { width: 256, height: 32, columns: 8, rows: 64 }
let signDirty = false, signUploaded = 0
const brandOf = sign => BRANDS.find(([name]) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(sign.toLowerCase()))
const signCanvas = document.createElement('canvas')
signCanvas.width = SIGN.width * SIGN.columns
signCanvas.height = SIGN.height * SIGN.rows
const signCtx = signCanvas.getContext('2d')
const signMap = new THREE.CanvasTexture(signCanvas)
signMap.colorSpace = THREE.SRGBColorSpace
signMap.anisotropy = renderer.capabilities.getMaxAnisotropy()
const signSlots = new Map()
const freeSignSlots = Array.from({ length: SIGN.columns * SIGN.rows }, (_, i) => i).reverse()

function drawSign(index, sign) {
  const ctx = signCtx, x = (index % SIGN.columns) * SIGN.width, y = Math.floor(index / SIGN.columns) * SIGN.height
  const brand = brandOf(sign)
  const text = brand && UPPER.includes(brand[0]) ? sign.toUpperCase() : sign
  ctx.fillStyle = brand ? brand[1] : '#1f3a5f'
  ctx.fillRect(x, y, SIGN.width, SIGN.height)
  ctx.fillStyle = brand && brand[2] ? brand[2] : '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 24
  ctx.font = `900 ${size}px system-ui, sans-serif`
  while (ctx.measureText(text).width > SIGN.width - 16 && size > 8) ctx.font = `900 ${size -= 1}px system-ui, sans-serif`
  ctx.fillText(text, x + SIGN.width / 2, y + SIGN.height / 2 + 1)
}

function allocateSign(sign, holder) {
  let slot = signSlots.get(sign)
  if (!slot) {
    let index = freeSignSlots.pop()
    if (index === undefined) {
      const victim = [...signSlots.entries()].find(([, other]) => !other.holders.size)
      if (!victim) return null
      signSlots.delete(victim[0])
      index = victim[1].index
    }
    slot = { index, holders: new Set() }
    signSlots.set(sign, slot)
    drawSign(index, sign)
    signDirty = true
  }
  slot.holders.add(holder)
  return slot.index
}

function uploadSigns(now) {
  if (!signDirty || now - signUploaded < 1500) return
  signMap.needsUpdate = true
  signDirty = false
  signUploaded = now
}

function releaseSigns(tile) {
  signSlots.forEach(slot => slot.holders.delete(tile.key))
}

MATERIALS.sign = infectable(new THREE.MeshLambertMaterial({ map: signMap, side: THREE.DoubleSide }))
MATERIALS.window = infectable(new THREE.MeshStandardMaterial({ map: TEXTURES.window, vertexColors: true, roughness: 0.18, metalness: 0.55, envMapIntensity: 1.4, side: THREE.DoubleSide }))
MATERIALS.sign.userData.outlineParameters = { visible: false }

function signQuad(sign, cx, cz, ux, uz, nx, nz, width, bottom, height) {
  const slot = signSlots.get(sign)
  if (!slot) return null
  const column = slot.index % SIGN.columns, row = Math.floor(slot.index / SIGN.columns)
  const u0 = column / SIGN.columns, u1 = (column + 1) / SIGN.columns
  if (ux * nz - uz * nx < 0) { ux = -ux; uz = -uz }
  const v1 = 1 - row / SIGN.rows, v0 = 1 - (row + 1) / SIGN.rows
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


const cubic = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))

let TILE = 1000, TILE_VERSION = 1, ORIGIN = [50.99, 5.825], START = { x: 0, z: 0, heading: 0 }, ZONES = [], lastHeight = 40
const tiles = new Map()
const roadsById = new Map()
const tileKeyOf = (x, z) => `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`
const tileAt = (x, z) => tiles.get(tileKeyOf(x, z))
const KINDS_BY_INDEX = ['ground', 'grass', 'forest', 'field', 'water', 'parking', 'lot']

function gridAt(tile, field, x, z) {
  const g = tile.grid
  const gx = clamp((x - g.x0) / g.step, 0, g.cols - 1.001), gz = clamp((z - g.z0) / g.step, 0, g.rows - 1.001)
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j
  const h = (c, r) => field[r * g.cols + c]
  if (fx + fz <= 1) return h(i, j) + (h(i + 1, j) - h(i, j)) * fx + (h(i, j + 1) - h(i, j)) * fz
  return h(i + 1, j + 1) + (h(i, j + 1) - h(i + 1, j + 1)) * (1 - fx) + (h(i + 1, j) - h(i + 1, j + 1)) * (1 - fz)
}

function terrainHeight(x, z) {
  const tile = tileAt(x, z)
  if (!tile || !tile.raw) return lastHeight
  return lastHeight = gridAt(tile, tile.heights || tile.smooth || tile.raw, x, z)
}

function smoothHeight(x, z) {
  const tile = tileAt(x, z)
  return tile && tile.raw ? gridAt(tile, tile.smooth || tile.raw, x, z) : lastHeight
}

function cellIndex(tile, x, z) {
  const g = tile.grid
  return clamp(Math.round((z - g.z0) / g.step), 0, g.rows - 1) * g.cols + clamp(Math.round((x - g.x0) / g.step), 0, g.cols - 1)
}

function kindAt(x, z) {
  const tile = tileAt(x, z)
  return tile && tile.kinds ? KINDS_BY_INDEX[tile.kinds[cellIndex(tile, x, z)]] : 'ground'
}

function wasteAt(x, z) {
  const tile = tileAt(x, z)
  return !!(tile && tile.waste && tile.waste[cellIndex(tile, x, z)])
}

function rasterize(tile, polygon, raster, value) {
  const g = tile.grid
  const zs = polygon.map(p => p[1])
  const r0 = clamp(Math.ceil((Math.min(...zs) - g.z0) / g.step), 0, g.rows - 1), r1 = clamp(Math.floor((Math.max(...zs) - g.z0) / g.step), 0, g.rows - 1)
  for (let r = r0; r <= r1; r++) {
    const z = g.z0 + r * g.step, crossings = []
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[i], [bx, bz] = polygon[j]
      if ((az > z) !== (bz > z)) crossings.push(ax + (z - az) / (bz - az) * (bx - ax))
    }
    crossings.sort((a, b) => a - b)
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const c0 = clamp(Math.ceil((crossings[k] - g.x0) / g.step), 0, g.cols - 1), c1 = clamp(Math.floor((crossings[k + 1] - g.x0) / g.step), 0, g.cols - 1)
      for (let c = c0; c <= c1; c++) raster[r * g.cols + c] = value
    }
  }
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

function neighbourTiles(tile) {
  const list = []
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) list.push(tiles.get(`${tile.tx + dx},${tile.tz + dz}`))
  return list
}

function roadsAround(tile) {
  const seen = new Set(), list = []
  ;[tile, ...neighbourTiles(tile)].forEach(other => other && other.roads && other.roads.forEach(road => { if (!seen.has(road.id)) { seen.add(road.id); list.push(road) } }))
  return list
}

function rawAt(tile, c, r) {
  const g = tile.grid
  const dx = c < 0 ? -1 : c >= g.cols ? 1 : 0, dz = r < 0 ? -1 : r >= g.rows ? 1 : 0
  if (dx || dz) {
    const other = tiles.get(`${tile.tx + dx},${tile.tz + dz}`)
    if (other && other.raw) return other.raw[(r - dz * (g.rows - 1)) * g.cols + (c - dx * (g.cols - 1))]
    c = clamp(c, 0, g.cols - 1)
    r = clamp(r, 0, g.rows - 1)
  }
  return tile.raw[r * g.cols + c]
}

function smoothTile(tile) {
  const g = tile.grid, out = new Float32Array(g.cols * g.rows)
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    let sum = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) sum += rawAt(tile, c + dc, r + dr)
    out[r * g.cols + c] = sum / 9
  }
  tile.smooth = out
}

function digTile(tile) {
  const g = tile.grid
  roadsAround(tile).filter(road => road.kind === 'water' && road.w >= 10).forEach(road => {
    if (road.level === undefined) {
      const samples = road.p.map(([x, z]) => smoothHeight(x, z)).sort((a, b) => a - b)
      road.level = samples[Math.floor(samples.length / 2)]
    }
    const reach = road.w / 2 + g.step * 0.6
    for (let i = 1; i < road.p.length; i++) {
      const a = road.p[i - 1], b = road.p[i]
      const c0 = clamp(Math.floor((Math.min(a[0], b[0]) - reach - g.x0) / g.step), 0, g.cols - 1), c1 = clamp(Math.ceil((Math.max(a[0], b[0]) + reach - g.x0) / g.step), 0, g.cols - 1)
      const r0 = clamp(Math.floor((Math.min(a[1], b[1]) - reach - g.z0) / g.step), 0, g.rows - 1), r1 = clamp(Math.ceil((Math.max(a[1], b[1]) + reach - g.z0) / g.step), 0, g.rows - 1)
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (pointToSegment(g.x0 + c * g.step, g.z0 + r * g.step, a, b).distance < reach) tile.smooth[r * g.cols + c] = Math.min(tile.smooth[r * g.cols + c], road.level - 3)
      }
    }
  })
}

function stampStep(tile) {
  const g = tile.grid, n = g.cols * g.rows, sum = new Float32Array(n), weight = new Float32Array(n)
  const x1 = g.x0 + (g.cols - 1) * g.step, z1 = g.z0 + (g.rows - 1) * g.step
  const queue = roadsAround(tile).filter(road => road.kind === 'road' && !road.bridge)
  return () => {
    for (let k = 0; k < 25 && queue.length; k++) {
      const road = queue.shift()
      if (!road.profile || road.profilePartial) {
        const curve = new THREE.CatmullRomCurve3(road.p.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
        const points = curve.getSpacedPoints(Math.max(2, Math.ceil(curve.getLength() / 10)))
        const heights = points.map(({ x, z }) => tileAt(x, z)?.raw ? smoothHeight(x, z) : null)
        road.profile = points.map(({ x, z }, i) => {
          if (heights[i] === null) return null
          let total = 0, count = 0
          for (let d = -3; d <= 3; d++) if (heights[i + d] !== undefined && heights[i + d] !== null) { total += heights[i + d]; count++ }
          return [x, z, total / count, heights[i]]
        }).filter(Boolean)
        road.profilePartial = heights.some(h => h === null)
      }
      const reach = road.w / 2 + 7.5
      road.profile.forEach(([x, z, level, height]) => {
        if (Math.abs(level - height) > 2.5 || x < g.x0 - reach || x > x1 + reach || z < g.z0 - reach || z > z1 + reach) return
        const c0 = clamp(Math.floor((x - reach - g.x0) / g.step), 0, g.cols - 1), c1 = clamp(Math.ceil((x + reach - g.x0) / g.step), 0, g.cols - 1)
        const r0 = clamp(Math.floor((z - reach - g.z0) / g.step), 0, g.rows - 1), r1 = clamp(Math.ceil((z + reach - g.z0) / g.step), 0, g.rows - 1)
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          const distance = Math.hypot(g.x0 + c * g.step - x, g.z0 + r * g.step - z)
          if (distance > reach) continue
          const w = distance < road.w / 2 + 2.5 ? 1 : 1 - (distance - road.w / 2 - 2.5) / 5
          sum[r * g.cols + c] += level * w
          weight[r * g.cols + c] += w
        }
      })
    }
    if (queue.length) return false
    tile.heights = tile.smooth.map((h, i) => weight[i] ? h + (sum[i] / weight[i] - h) * Math.min(1, weight[i]) : h)
    return true
  }
}

function adoptEdges(tile) {
  const g = tile.grid, n = g.cols
  const edges = { '1,0': i => [i * n + n - 1, i * n], '-1,0': i => [i * n, i * n + n - 1], '0,1': i => [(n - 1) * n + i, i], '0,-1': i => [i, (n - 1) * n + i] }
  Object.entries(edges).forEach(([offset, pair]) => {
    const [dx, dz] = offset.split(',').map(Number)
    const other = tiles.get(`${tile.tx + dx},${tile.tz + dz}`)
    if (!other || !other.heights) return
    for (let i = 0; i < n; i++) { const [mine, theirs] = pair(i); tile.heights[mine] = other.heights[theirs] }
  })
}

function rasterTile(tile) {
  const g = tile.grid
  tile.kinds = new Uint8Array(g.cols * g.rows)
  tile.waste = new Uint8Array(g.cols * g.rows)
  tile.data.areas.forEach(area => { const kind = KINDS_BY_INDEX.indexOf(area.kind); if (kind > 0) rasterize(tile, area.p, tile.kinds, kind) })
  ZONES.filter(zone => zone.kinds.includes('zombie')).forEach(zone => rasterize(tile, zone.p, tile.waste, 1))
}


const elevatedAt = new Map()

function markDual(road, candidates) {
  const [mx, mz] = road.p[Math.floor(road.p.length / 2)]
  road.dual = candidates.some(other => other !== road && other.name === road.name && other.w === road.w && !other.p.some(p => road.p.some(q => p[0] === q[0] && p[1] === q[1])) && polylineDistance(mx, mz, other.p) < (road.w >= 10 ? 32 : 20))
  if (road.dual) road.w = road.w >= 10 ? 9 : 5.5
}

function loadedHeights(points) {
  const loaded = points.map(([x, z]) => tileAt(x, z)?.raw ? terrainHeight(x, z) : null)
  const known = loaded.map((h, i) => h === null ? null : i).filter(i => i !== null)
  const fill = i => known.length ? loaded[known.reduce((best, k) => Math.abs(k - i) < Math.abs(best - i) ? k : best, known[0])] : lastHeight
  return { heights: loaded.map((h, i) => h === null ? fill(i) : h), partial: known.length < points.length }
}

function prepareRoad(road, bigWater) {
  const key = ([x, z]) => `${x},${z}`
  if (road.segments) road.segments.forEach(segment => segmentGrid.get(cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2))?.delete(segment))
  const known = loadedHeights(road.p)
  road.partial = known.partial
  road.hs = known.heights
  if (road.kind === 'water') {
    road.hs = road.p.map(([x, z], i) => road.level === undefined || Math.abs(road.level + 0.2 - road.hs[i]) > 3 ? road.hs[i] + 0.04 : road.level + 0.2)
  } else if (road.bridge) {
    const [mx, mz] = road.p[Math.floor(road.p.length / 2)]
    const ends = Math.max(road.hs[0], road.hs[road.hs.length - 1])
    const waterLevel = Math.min(ends + 8, Math.max(-Infinity, ...bigWater.filter(water => polylineDistance(mx, mz, water.p) < water.w).map(water => water.level + 7)))
    const along = road.p.map((p, i) => i ? Math.hypot(p[0] - road.p[i - 1][0], p[1] - road.p[i - 1][1]) : 0).map((d, i, all) => all.slice(0, i + 1).reduce((a, b) => a + b, 0))
    const total = along[along.length - 1] || 1, h0 = road.hs[0], h1 = road.hs[road.hs.length - 1]
    road.hs = road.p.map((p, i) => Math.max(h0 + (h1 - h0) * along[i] / total, waterLevel))
    road.p.forEach((p, i) => elevatedAt.set(key(p), road.hs[i]))
  } else {
    road.p.forEach((p, i) => { if (elevatedAt.has(key(p))) road.hs[i] = Math.max(road.hs[i], elevatedAt.get(key(p))) })
    const span = i => Math.hypot(road.p[i][0] - road.p[i - 1][0], road.p[i][1] - road.p[i - 1][1])
    for (let i = 1; i < road.p.length; i++) road.hs[i] = Math.max(road.hs[i], road.hs[i - 1] - GRADE * span(i))
    for (let i = road.p.length - 2; i >= 0; i--) road.hs[i] = Math.max(road.hs[i], road.hs[i + 1] - GRADE * span(i + 1))
    road.hs = road.hs.map((h, i) => Math.min(h, known.heights[i] + 9))
  }
  road.ground = loadedHeights(road.p).heights
  road.elevated = (road.kind === 'road' || road.kind === 'rail') && road.hs.some((h, i) => h > road.ground[i] + 1.0)
  const lifted = (y, ground) => road.kind === 'water' || road.bridge || (road.elevated && y > ground + 0.4)
  road.nodes = road.p.map(([x, z], i) => [x, z, lifted(road.hs[i], road.ground[i]) ? road.hs[i] : road.ground[i], lifted(road.hs[i], road.ground[i])])
  const curve = new THREE.CatmullRomCurve3(road.p.map(([x, z], i) => new THREE.Vector3(x, road.hs[i], z)), false, 'centripetal')
  road.samples = curve.getSpacedPoints(Math.max(1, Math.ceil(curve.getLength() / 4))).map(({ x, y, z }) => {
    const ground = tileAt(x, z)?.raw ? terrainHeight(x, z) : y
    if (road.kind === 'water' || road.bridge) return [x, z, y, true]
    const level = Math.max(y, ground)
    return lifted(level, ground) ? [x, z, level, true] : [x, z, ground, false]
  })
  road.prepared = true
  if (road.kind !== 'road') return
  road.segments = road.samples.slice(1).map((b, i) => ({ road, a: road.samples[i], b }))
  road.segments.forEach(segment => {
    const key = cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2)
    if (!segmentGrid.has(key)) segmentGrid.set(key, new Set())
    segmentGrid.get(key).add(segment)
  })
  if (road.elevated || road.bridge) return
  const coarse = road.samples.filter((_, i) => i % 3 === 0 || i === road.samples.length - 1)
  road.asphalt = bufferPieces(coarse, road.w)
  road.walkway = (road.w >= 5 && road.w <= 8) || road.dual ? bufferPieces(coarse, road.w + 3.1) : null
  const xs = road.samples.map(p => p[0]), zs = road.samples.map(p => p[1]), margin = road.w / 2 + 3
  road.cells = []
  for (let cx = Math.floor((Math.min(...xs) - margin) / SUB); cx <= Math.floor((Math.max(...xs) + margin) / SUB); cx++)
    for (let cz = Math.floor((Math.min(...zs) - margin) / SUB); cz <= Math.floor((Math.max(...zs) + margin) / SUB); cz++) {
      const key = `${cx},${cz}`
      if (!roadCells.has(key)) roadCells.set(key, new Set())
      roadCells.get(key).add(road)
      road.cells.push(key)
    }
}

function unregisterRoad(road) {
  roadsById.delete(road.id)
  ;(road.segments || []).forEach(segment => {
    const key = cellKey((segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2)
    segmentGrid.get(key)?.delete(segment)
  })
  ;(road.cells || []).forEach(key => roadCells.get(key)?.delete(road))
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
    for (const segment of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
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
  points = alongGround(points)
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

function strip(points, nodes, width, lift, color, parts) {
  if (points.length > 1) parts.push(paint(ribbon(points, width, lift), color))
  if (width >= 3) nodes.forEach(node => parts.push(paint(disc(node, width / 2, lift), color)))
}

function dashes(points, parts) {
  const total = points.slice(1).reduce((sum, [x, z], i) => sum + Math.hypot(x - points[i][0], z - points[i][1]), 0)
  for (let d = 2; d + 3 <= total; d += 9) parts.push(paint(ribbon([pointAt(points, d), pointAt(points, d + 3)], 0.15, LIFT.paint), COLORS.dash))
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

function insideBox([x, z], [x0, z0, x1, z1]) {
  return x >= x0 && x < x1 && z >= z0 && z < z1
}

function piecesIn(samples, box) {
  const pieces = []
  let piece = []
  samples.forEach(sample => {
    if (insideBox(sample, box)) piece.push(sample)
    else { if (piece.length > 1) pieces.push(piece); piece = [] }
  })
  if (piece.length > 1) pieces.push(piece)
  return pieces
}

function buildRoadLinework(tile, road, groups) {
  const box = tileBounds(tile)
  const pieces = piecesIn(road.samples, box), nodes = road.nodes.filter(node => insideBox(node, box))
  if (!pieces.length && !nodes.length) return
  if (road.kind === 'rail') {
    pieces.forEach(points => { strip(points, [], 3.4, 0.12, COLORS.ballast, groups.plain); for (const side of [-1, 1]) band(points, side * 0.72, 0.1, 0.3, COLORS.rail, groups.plain) })
    strip([], nodes, 3.4, 0.12, COLORS.ballast, groups.plain)
  } else if (road.kind === 'water') {
    const lift = road.level === undefined ? 0.12 : 0
    pieces.forEach(points => splitWhere(points, ([x, z]) => onOtherAsphalt(x, z, null, 1)).forEach(open => strip(open, [], road.w, lift, COLORS.water, groups.plain)))
    strip([], nodes, road.w, lift, COLORS.water, groups.plain)
  } else if (road.kind === 'path') {
    pieces.forEach(points => splitWhere(points, ([x, z]) => onOtherAsphalt(x, z, null, 0.6)).forEach(open => strip(open, [], Math.min(road.w, 1.5), 0.12, COLORS.path, groups.gravel)))
    strip([], nodes.filter(([x, z]) => !onOtherAsphalt(x, z, null, 0.6)), Math.min(road.w, 1.5), 0.12, COLORS.path, groups.gravel)
  } else if (road.elevated || road.bridge) {
    pieces.forEach(points => strip(points, [], road.w, 0.22, COLORS.road, groups.asphalt))
    strip([], nodes, road.w, 0.22, COLORS.road, groups.asphalt)
    pieces.forEach(points => {
      roadMarkings(road, points, groups)
      if (road.bridge) bridge(points, road.w, groups.plain, road, groups.plaster)
      else embankment(points, road.w, groups.ground)
    })
  }
}

function roadMarkings(road, points, groups) {
  if (road.w < 8 && !road.dual) return
  const long = piece => piece.length > 1 && piece.slice(1).reduce((sum, [x, z], i) => sum + Math.hypot(x - piece[i][0], z - piece[i][1]), 0) >= 2
  splitWhere(points, ([x, z]) => onOtherAsphalt(x, z, road, 2.5)).filter(long).forEach(marks => {
    if (!road.dual || road.w >= 9) dashes(marks, groups.plain)
    for (const side of [-1, 1]) {
      const edge = offsetLine(marks, side * (road.w / 2 - 0.35)).map(([x, y, z], i) => [x, z, y, marks[i][3]])
      splitWhere(edge, ([x, z]) => onOtherAsphalt(x, z, road, 0.4)).filter(long).forEach(piece => band(piece, side * 0.01, 0.12, LIFT.paint, COLORS.dash, groups.plain))
    }
  })
}

function bufferPieces(points, width) {
  const r = width / 2, pieces = []
  const circle = ([x, z]) => Array.from({ length: 17 }, (_, k) => [x + Math.cos(k / 16 * Math.PI * 2) * r, z + Math.sin(k / 16 * Math.PI * 2) * r])
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i]
    const length = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / length * r, nz = (bx - ax) / length * r
    pieces.push([[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz], [ax + nx, az + nz]])
  }
  points.forEach((point, i) => {
    if (i === 0 || i === points.length - 1) return pieces.push(circle(point))
    const [px, pz] = points[i - 1], [nx, nz] = points[i + 1]
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(nz - point[1], nx - point[0]) - Math.atan2(point[1] - pz, point[0] - px)), Math.cos(Math.atan2(nz - point[1], nx - point[0]) - Math.atan2(point[1] - pz, point[0] - px))))
    if (turn > 0.005) pieces.push(circle(point))
  })
  return pieces
}

function bufferRing(points, width) {
  const sides = edges(points, width)
  const left = sides.map(([l]) => [l[0], l[2]]), right = sides.map(([, r]) => [r[0], r[2]])
  const cap = (center, from) => {
    const start = Math.atan2(from[1] - center[1], from[0] - center[0]), radius = width / 2, arc = []
    for (let k = 1; k < 5; k++) arc.push([center[0] + Math.cos(start - k / 5 * Math.PI) * radius, center[1] + Math.sin(start - k / 5 * Math.PI) * radius])
    return arc
  }
  const last = points.length - 1
  const ring = [...left, ...cap([points[last][0], points[last][1]], left[last]), ...right.reverse(), ...cap([points[0][0], points[0][1]], right[right.length - 1])]
  ring.push(ring[0])
  return ring
}

function cutAlong(polygon, f, spacing) {
  const values = polygon.map(f)
  let pieces = [polygon]
  for (let k = Math.ceil(Math.min(...values) / spacing); k <= Math.floor(Math.max(...values) / spacing); k++) {
    const level = k * spacing, next = []
    for (const piece of pieces) {
      const below = [], above = []
      piece.forEach((p, i) => {
        const q = piece[(i + 1) % piece.length], fp = f(p) - level, fq = f(q) - level
        if (fp <= 0) below.push(p)
        if (fp >= 0) above.push(p)
        if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
          const t = fp / (fp - fq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
          below.push(m)
          above.push(m)
        }
      })
      if (below.length > 2) next.push(below)
      if (above.length > 2) next.push(above)
    }
    pieces = next
  }
  return pieces
}

const GRID_LINES = [p => p[0], p => p[1], p => p[0] + p[1]]

function groundPieces(triangle) {
  const step = tileAt(triangle[0][0], triangle[0][1])?.grid.step || 10
  let pieces = [triangle]
  for (const f of GRID_LINES) pieces = pieces.flatMap(piece => cutAlong(piece, f, step))
  return pieces
}

function alongGround(points) {
  const step = tileAt(points[0][0], points[0][1])?.grid.step || 10, dense = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1], q = points[i], cuts = []
    for (const f of GRID_LINES) {
      const fp = f(p), fq = f(q)
      if (fp === fq) continue
      for (let k = Math.ceil(Math.min(fp, fq) / step); k <= Math.floor(Math.max(fp, fq) / step); k++) {
        const t = (k * step - fp) / (fq - fp)
        if (t > 0.001 && t < 0.999) cuts.push(t)
      }
    }
    cuts.sort((a, b) => a - b).forEach(t => dense.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] === undefined ? undefined : p[2] + (q[2] - p[2]) * t, p[3] || q[3]]))
    dense.push(q)
  }
  return dense
}

function cleanRing(ring) {
  const out = []
  ring.forEach(p => { const last = out[out.length - 1]; if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.01) out.push(p) })
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 0.01) out.pop()
  return out
}

function* polygonGeometry(rings, lift, color, aligned = false) {
  rings = rings.map(cleanRing).filter(ring => ring.length >= 3)
  if (!rings.length) return new THREE.BufferGeometry()
  const shape = new THREE.Shape(rings[0].map(([x, z]) => new THREE.Vector2(x, -z)))
  rings.slice(1).forEach(hole => shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z)))))
  const base = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2)
  const source = base.attributes.position.array, index = base.index.array
  const stack = []
  for (let i = 0; i < index.length; i += 3) stack.push([0, 1, 2].map(k => [source[index[i + k] * 3], source[index[i + k] * 3 + 2]]))
  const positions = [], normals = [], colors = []
  let work = 0
  while (stack.length) {
    if (++work % 300 === 0) yield
    const [a, b, c] = stack.pop()
    const lengths = [Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(a[0] - c[0], a[1] - c[1])]
    const longest = lengths.indexOf(Math.max(...lengths))
    if (lengths[longest] > 7) {
      const [p, q, r] = [[a, b, c], [b, c, a], [c, a, b]][longest]
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      stack.push([p, m, r], [m, q, r])
      continue
    }
    for (const piece of groundPieces([a, b, c])) {
      for (let k = 1; k + 1 < piece.length; k++) {
        const tri = upward([piece[0][0], 0, piece[0][1]], [piece[k][0], 0, piece[k][1]], [piece[k + 1][0], 0, piece[k + 1][1]])
        tri.forEach(([x, , z]) => { positions.push(x, terrainHeight(x, z) + lift, z); normals.push(0, 1, 0); colors.push(color.r, color.g, color.b) })
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  if (aligned) {
    const ring = rings[0], cx = ring.reduce((sum, p) => sum + p[0], 0) / ring.length, cz = ring.reduce((sum, p) => sum + p[1], 0) / ring.length
    const { segment } = nearestSegment(cx, cz, 3)
    const length = segment ? Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]) || 1 : 1
    const dx = segment ? (segment.b[0] - segment.a[0]) / length : 1, dz = segment ? (segment.b[1] - segment.a[1]) / length : 0
    const uvs = new Float32Array(positions.length / 3 * 2)
    for (let i = 0; i < positions.length; i += 3) uvs.set([positions[i] * dx + positions[i + 2] * dz, -positions[i] * dz + positions[i + 2] * dx], i / 3 * 2)
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  }
  return geometry
}

function curb(ring, top, bottom, parts) {
  const dense = alongGround(ring)
  const lift = ([x, z], amount) => [x, terrainHeight(x, z) + amount, z]
  for (let i = 1; i < dense.length; i++) {
    const [ax, az] = dense[i - 1], [bx, bz] = dense[i]
    if (onOtherAsphalt((ax + bx) / 2, (az + bz) / 2, null, -0.3)) continue
    parts.push(paint(skirt([lift(dense[i - 1], top), lift(dense[i], top)], [lift(dense[i - 1], bottom), lift(dense[i], bottom)]), COLORS.curb))
  }
}

const LIFT = { asphalt: 0.06, sidewalk: 0.18, wear: 0.08, paint: 0.09 }
const roadCells = new Map(), asphaltCells = new Map(), pendingCells = new Map()
const roadWorkers = [0, 1].map(() => new Worker('roadworker.js', { type: 'module' }))
let workerTurn = 0

roadWorkers.forEach(worker => { worker.onmessage = ({ data }) => {
  const cell = asphaltCells.get(data.key), pending = pendingCells.get(data.key)
  pendingCells.delete(data.key)
  if (cell && cell.gen === data.gen && cell.tile && cell.tile.status !== 'evicted') schedule(`asphalt:${data.key}`, cell.tile, 3, placeAsphaltStep(cell, data))
  if (pending) pending.resolve()
} })

function cellBox(kx, kz, margin) {
  return [kx * SUB - margin, kz * SUB - margin, (kx + 1) * SUB + margin, (kz + 1) * SUB + margin]
}

function cellReady(kx, kz) {
  const centre = tileAt((kx + 0.5) * SUB, (kz + 0.5) * SUB)
  if (!centre || centre.status !== 'ready' || !centre.built.prepare) return false
  const [x0, z0, x1, z1] = cellBox(kx, kz, 9)
  for (const x of [x0, x1]) for (const z of [z0, z1]) {
    const tile = tileAt(x, z)
    if (!tile || !(tile.raw || tile.status === 'empty')) return false
  }
  return true
}

function buildAsphaltCell(kx, kz) {
  const key = `${kx},${kz}`, roads = [...(roadCells.get(key) || [])].filter(road => road.asphalt)
  const tile = tileAt((kx + 0.5) * SUB, (kz + 0.5) * SUB)
  const cell = { key, kx, kz, tile, gen: (tile && tile.gen) || 0, meshes: [], roads }
  asphaltCells.set(key, cell)
  if (!roads.length || !tile) return Promise.resolve()
  const [x0, z0, x1, z1] = cellBox(kx, kz, 1)
  const box = [[[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]]
  return new Promise(resolve => {
    pendingCells.set(key, { resolve })
    roadWorkers[workerTurn++ % roadWorkers.length].postMessage({ key, gen: cell.gen, box, asphalt: roads.flatMap(road => road.asphalt), walkways: roads.filter(road => road.walkway).flatMap(road => road.walkway) })
  })
}

function placeAsphaltStep(cell, data) {
  const groups = newGroups(), box = cellBox(cell.kx, cell.kz, 0)
  const tasks = [
    ...data.asphalt.map(polygon => function* () { groups.asphalt.push(yield* polygonGeometry(polygon, LIFT.asphalt, COLORS.road)) }),
    ...data.walkways.map(polygon => function* () { groups.paving.push(yield* polygonGeometry(polygon, LIFT.sidewalk, COLORS.sidewalk, true)); polygon.forEach(ring => curb(ring, LIFT.sidewalk, 0, groups.plain)) }),
    ...cell.roads.map(road => function* () { piecesIn(road.samples, box).forEach(points => roadMarkings(road, points, groups)) })
  ].map(task => task())
  return () => {
    const start = performance.now()
    while (tasks.length && performance.now() - start < 3) { if (tasks[0].next().done) tasks.shift() }
    if (tasks.length) return false
    const meshes = mergeGroups(groups)
    meshes.forEach(mesh => { mesh.castShadow = false })
    cell.meshes = meshes
    cell.tile.meshes.push(...meshes)
    return true
  }
}

function streamAsphalt(reach = 4) {
  if (pendingCells.size >= roadWorkers.length) return null
  const cx = Math.floor(state.x / SUB), cz = Math.floor(state.z / SUB)
  const wanted = []
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    const key = `${cx + dx},${cz + dz}`
    if (roadCells.has(key) && !asphaltCells.has(key) && cellReady(cx + dx, cz + dz)) wanted.push([dx * dx + dz * dz, cx + dx, cz + dz])
  }
  if (!wanted.length) return null
  const [, kx, kz] = wanted.sort((a, b) => a[0] - b[0])[0]
  return buildAsphaltCell(kx, kz)
}

async function awaitAsphalt(reach) {
  for (let i = 0; i < 80; i++) {
    const job = streamAsphalt(reach)
    if (!job) break
    await job
  }
  await pumpFor(['asphalt'], 9)
}

function neighbourRoad(x, z, road, reach) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const segment of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      if (segment.road !== road && pointToSegment(x, z, segment.a, segment.b).distance < reach) return true
    }
  }
  return false
}

function bridge(points, width, parts, road, concrete) {
  const sides = edges(points, width + 1.2), inner = edges(points, width + 0.3)
  const dark = COLORS.concrete.clone().multiplyScalar(0.72), steel = COLORS.rail
  const shift = (line, dy) => line.map(([x, y, z]) => [x, y + dy, z])
  const open = [0, 1].map(side => { const [x, , z] = sides[Math.floor(sides.length / 2)][side]; return neighbourRoad(x, z, road, width / 2 + 5) })
  for (const side of [0, 1]) {
    const top = sides.map(pair => pair[side]), lip = inner.map(pair => pair[side])
    concrete.push(paint(skirt(shift(top, 0.05), shift(top, -1.1)), COLORS.concrete))
    concrete.push(paint(skirt(shift(top, 0.32), shift(top, 0.05)), COLORS.concrete))
    concrete.push(paint(skirt(shift(lip, 0.32), shift(lip, 0.06)), COLORS.concrete))
    concrete.push(paint(skirt(shift(top, 0.32), shift(lip, 0.32)), dark))
    if (open[side]) continue
    parts.push(paint(skirt(shift(top, 1.12), shift(top, 1.06)), steel))
    parts.push(paint(skirt(shift(top, 0.74), shift(top, 0.7)), steel))
    let along = 2
    top.forEach(([x, y, z], i) => {
      if (i) along += Math.hypot(x - top[i - 1][0], z - top[i - 1][2])
      if (along < 2) return
      along = 0
      parts.push(paint(new THREE.BoxGeometry(0.06, 0.8, 0.06).translate(x, y + 0.72, z), steel))
    })
  }
  concrete.push(paint(skirt(shift(sides.map(pair => pair[0]), -1.1), shift(sides.map(pair => pair[1]), -1.1)), dark))
  const heading = i => Math.atan2(points[Math.min(i + 1, points.length - 1)][0] - points[Math.max(i - 1, 0)][0], points[Math.min(i + 1, points.length - 1)][1] - points[Math.max(i - 1, 0)][1])
  const placed = (geometry, angle, x, y, z) => concrete.push(paint(geometry.rotateY(angle).translate(x, y, z), COLORS.concrete))
  let travelled = 12, lit = 14
  points.forEach(([x, z, y], i) => {
    if (i) { const step = Math.hypot(x - points[i - 1][0], z - points[i - 1][1]); travelled += step; lit += step }
    const angle = heading(i), nx = Math.cos(angle), nz = -Math.sin(angle), ground = terrainHeight(x, z)
    if ((i === 0 || i === points.length - 1) && y - 1.1 - ground > 0.6) {
      const height = y - 1.1 - ground + 0.6
      placed(new THREE.BoxGeometry(width + 1.6, height, 2.4), angle, x, ground - 0.6 + height / 2, z)
    }
    if (travelled >= 22 && i && i < points.length - 1 && y - 1.1 - ground > 1) {
      travelled = 0
      const depth = y - 1.1 - ground + 1.5
      placed(new THREE.BoxGeometry(width + 0.8, 0.9, 1.6), angle, x, y - 1.55, z)
      for (const side of [-1, 1]) placed(new THREE.BoxGeometry(1.0, depth, 1.3), angle, x + nx * side * (width / 2 - 0.5), y - 1.1 - depth / 2, z + nz * side * (width / 2 - 0.5))
    }
    const lampSide = open[1] ? -1 : 1
    if (lit >= 30 && !open[lampSide === 1 ? 1 : 0] && !road.dual) {
      lit = 0
      const off = lampSide * (width / 2 + 0.45), px = x + nx * off, pz = z + nz * off
      parts.push(paint(new THREE.BoxGeometry(0.12, 5, 0.12).translate(px, y + 3, pz), steel))
      parts.push(paint(new THREE.BoxGeometry(1.4, 0.08, 0.08).rotateY(angle).translate(px - nx * lampSide * 0.6, y + 5.4, pz - nz * lampSide * 0.6), steel))
      parts.push(paint(new THREE.BoxGeometry(0.55, 0.16, 0.3).rotateY(angle).translate(px - nx * lampSide * 1.3, y + 5.32, pz - nz * lampSide * 1.3), new THREE.Color(0xf4f1dc)))
    }
  })
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

function boxes(groups, name) {
  groups.acc ||= {}
  return groups.acc[name] ||= { positions: [], normals: [], colors: [] }
}

function boxInto(acc, w, h, d, rotation, x, y, z, color) {
  const cos = Math.cos(rotation), sin = Math.sin(rotation)
  const corner = (sx, sy, sz) => { const lx = sx * w / 2, lz = sz * d / 2; return [x + lx * cos + lz * sin, y + sy * h / 2, z - lx * sin + lz * cos] }
  const turn = (nx, nz) => [nx * cos + nz * sin, 0, -nx * sin + nz * cos]
  const faces = [
    [[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1], turn(1, 0)],
    [[-1, 1, -1], [-1, 1, 1], [-1, -1, 1], [-1, -1, -1], turn(-1, 0)],
    [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], [0, 1, 0]],
    [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, -1, 0]],
    [[-1, 1, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], turn(0, 1)],
    [[1, 1, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], turn(0, -1)]
  ]
  faces.forEach(([a, b, c, d, normal]) => {
    const [pa, pb, pc, pd] = [a, b, c, d].map(k => corner(...k))
    const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2]
    const dot = (uy * vz - uz * vy) * normal[0] + (uz * vx - ux * vz) * normal[1] + (ux * vy - uy * vx) * normal[2]
    const order = dot >= 0 ? [pa, pb, pc, pa, pc, pd] : [pa, pd, pc, pa, pc, pb]
    order.forEach(point => { acc.positions.push(...point); acc.normals.push(...normal); acc.colors.push(color.r, color.g, color.b) })
  })
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
  const inset = Math.abs(Math.floor(minZ * 11)) % 3 === 0 ? 0 : Math.min((maxZ - minZ) / 2, (maxX - minX) / 2)
  const rise = Math.min((maxZ - minZ) * (0.35 + (Math.abs(minX * 3) % 10) / 40), 4)
  const midZ = (minZ + maxZ) / 2
  const top = building.base + building.h
  const back = ([lx, lz, y]) => [lx * cos - lz * sin, y + top, lx * sin + lz * cos]
  const A = back([minX, minZ, 0]), B = back([maxX, minZ, 0]), C = back([maxX, maxZ, 0]), D = back([minX, maxZ, 0])
  const R1 = back([minX + inset, midZ, rise]), R2 = back([maxX - inset, midZ, rise])
  building.roofFrame = { angle, cos, sin, minX, maxX, minZ, maxZ, inset, rise, midZ, top, back, A, B, C, D, R1, R2 }
  const uv = ([lx, lz, y]) => [lx, lz + y * 1.3]
  const a = [minX, minZ, 0], b = [maxX, minZ, 0], c = [maxX, maxZ, 0], d = [minX, maxZ, 0], r1 = [minX + inset, midZ, rise], r2 = [maxX - inset, midZ, rise]
  const slopes = new THREE.BufferGeometry()
  slopes.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...B, ...R2, ...A, ...R2, ...R1, ...C, ...D, ...R1, ...C, ...R1, ...R2], 3))
  slopes.setAttribute('uv', new THREE.Float32BufferAttribute([a, b, r2, a, r2, r1, c, d, r1, c, r1, r2].flatMap(uv), 2))
  slopes.computeVertexNormals()
  groups.tiles.push(paint(slopes, COLORS.roofs[building.c]))
  const ends = new THREE.BufferGeometry()
  ends.setAttribute('position', new THREE.Float32BufferAttribute([...B, ...C, ...R2, ...D, ...A, ...R1], 3))
  ends.setAttribute('uv', new THREE.Float32BufferAttribute([b, c, r2, d, a, r1].flatMap(([lx, lz, y]) => [lz, y]), 2))
  ends.computeVertexNormals()
  if (inset) groups.tiles.push(paint(ends, COLORS.roofs[building.c]))
  else groups[building.group].push(paint(ends, building.wall))
  const [chimneyX, , chimneyZ] = back([minX + inset + (maxX - minX - 2 * inset) * 0.3, midZ, 0])
  groups.plain.push(paint(new THREE.BoxGeometry(0.6, rise + 0.8, 0.6).translate(chimneyX, top + (rise + 0.8) / 2, chimneyZ), COLORS.chimney))
}

function roofExtras(building, groups) {
  const { angle, cos, sin, minX, maxX, minZ, maxZ, inset, rise, midZ, top, back, A, B, C, D, R1, R2 } = building.roofFrame
  const ridge = Math.hypot(R2[0] - R1[0], R2[2] - R1[2])
  boxInto(boxes(groups, 'plain'), ridge + 0.3, 0.16, 0.34, -angle, (R1[0] + R2[0]) / 2, top + rise + 0.04, (R1[2] + R2[2]) / 2, COLORS.roofs[building.c].clone().multiplyScalar(0.7))
  for (const [P, Q] of [[A, B], [C, D]]) boxInto(boxes(groups, 'plain'), Math.hypot(Q[0] - P[0], Q[2] - P[2]), 0.2, 0.08, -angle, (P[0] + Q[0]) / 2, top - 0.1, (P[2] + Q[2]) / 2, COLORS.frame)
  if (maxX - minX > 9 && rise > 1.8 && Math.abs(Math.floor(minX * 7)) % 2 === 0) {
    const [dx, , dz] = back([(minX + maxX) / 2, minZ + (maxZ - minZ) * 0.24, 0]), dy = top + rise * 0.32
    boxInto(boxes(groups, 'plain'), 1.5, 1.1, 1.3, -angle, dx, dy + 0.55, dz, COLORS.plaster[0])
    boxInto(boxes(groups, 'plain'), 1.7, 0.12, 1.5, -angle, dx, dy + 1.12, dz, COLORS.roofs[building.c])
    boxInto(boxes(groups, 'plain'), 0.9, 0.7, 0.06, -angle, dx + 0.67 * sin, dy + 0.55, dz - 0.67 * cos, COLORS.glass)
  }
  if (maxX - minX > 12 && Math.abs(Math.floor(maxZ * 5)) % 3 === 0) {
    const [x2, , z2] = back([maxX - inset - (maxX - minX - 2 * inset) * 0.2, midZ, 0])
    boxInto(boxes(groups, 'plain'), 0.5, rise + 0.6, 0.5, 0, x2, top + (rise + 0.6) / 2, z2, COLORS.chimney)
  }
}

function facadeDetails(building, groups, detail) {
  const points = building.p
  const acc = { positions: [], normals: [], colors: [], uvs: [] }
  const white = new THREE.Color(0xffffff)
  const floors = Math.max(1, Math.floor((building.h - 2.3) / 3) + 1)
  const front = frontEdge(building)
  const opening = (cx, cz, ux, uz, nx, nz, width, bottom, height, cell) => {
    if (!detail) return quadInto(acc, cx, cz, ux, uz, nx, nz, width, bottom, height, white, cell)
    const rotation = Math.atan2(-uz, ux), ox = cx + nx * 0.07, oz = cz + nz * 0.07
    const bar = (w, h, along, up, color = COLORS.frame) => boxInto(boxes(groups, 'plain'), w, h, 0.1, rotation, ox + ux * along, bottom + up, oz + uz * along, color)
    bar(width + 0.16, 0.08, 0, height + 0.04)
    bar(0.08, height + 0.16, -(width / 2 + 0.04), height / 2)
    bar(0.08, height + 0.16, width / 2 + 0.04, height / 2)
    if (cell === 0) {
      bar(width + 0.16, 0.08, 0, -0.04)
      boxInto(boxes(groups, 'plain'), width + 0.24, 0.07, 0.22, rotation, cx + nx * 0.11, bottom - 0.1, cz + nz * 0.11, COLORS.curb)
    } else {
      boxInto(boxes(groups, 'plain'), width + 0.5, 0.14, 0.7, rotation, cx + nx * 0.35, bottom - 0.07, cz + nz * 0.35, COLORS.curb)
      boxInto(boxes(groups, 'plain'), width + 0.6, 0.08, 0.7, rotation, cx + nx * 0.35, bottom + height + 0.1, cz + nz * 0.35, COLORS.gutter)
    }
  }
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length]
    const length = Math.hypot(bx - ax, bz - az)
    if (length < 3) return
    const ux = (bx - ax) / length, uz = (bz - az) / length
    let nx = uz, nz = -ux
    const mx = (ax + bx) / 2, mz = (az + bz) / 2
    if (inside(points, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz }
    const at = distance => [ax + ux * distance, az + uz * distance]

    const brand = building.sign && brandOf(building.sign)
    if (detail) {
    } else if (brand && building.h >= 3 && length >= 6) {
      const slots = Math.max(1, Math.floor(length / 10)), step = length / slots
      for (let k = 0; k < slots; k++) {
        const sign = signQuad(building.sign, ...at(step * (k + 0.5)), ux, uz, nx, nz, Math.min(8, step - 1), building.base + building.h - 2.5, 2.2)
        if (sign) signParts(groups).push(sign)
      }
    } else if (building.sign && building.h >= 3 && length >= 4 && i === front) {
      const sign = signQuad(building.sign, mx, mz, ux, uz, nx, nz, Math.min(length - 0.8, 14), building.base + building.h - 1.9, 1.6)
      if (sign) signParts(groups).push(sign)
    }

    const count = Math.floor((length - 1.2) / 2.6), spacing = length / (count + 1)
    const upper = brand ? 1 : floors
    for (let floor = 1; floor < upper; floor++) for (let k = 1; k <= count; k++) opening(...at(spacing * k), ux, uz, nx, nz, 1.2, building.base + floor * 3 + 1, 1.4, 0)
    if (i === front && building.h >= 3 && length >= 4.5 && !brand) {
      const [dx, dz] = at(1.1), ground = terrainHeight(dx, dz)
      opening(dx, dz, ux, uz, nx, nz, 1.0, ground, 2.2 + building.base - ground, 1)
      if (detail) for (const along of [0.25, length - 0.25]) boxInto(boxes(groups, 'plain'), 0.1, building.h - 0.3, 0.1, 0, ax + ux * along + nx * 0.12, building.base + building.h / 2 - 0.15, az + uz * along + nz * 0.12, COLORS.gutter)
      if (detail) {
        const setback = [4.5, 3.5, 2.5].find(dist => { const hx = mx + nx * dist, hz = mz + nz * dist; return !blocked(hx, hz) && roadDistance(hx, hz) > 2.8 && ['grass', 'ground', 'forest'].includes(kindAt(hx, hz)) })
        if (setback) {
          const rotation = Math.atan2(-uz, ux), hy = terrainHeight(mx + nx * setback, mz + nz * setback)
          const hedge = (from, to) => to - from > 0.6 && boxInto(boxes(groups, 'hedge'), to - from, 0.9, 0.6, rotation, ax + ux * (from + to) / 2 + nx * setback, hy + 0.45, az + uz * (from + to) / 2 + nz * setback, COLORS.hedge)
          hedge(0.2, 0.5)
          hedge(1.7, length - 0.2)
          boxInto(boxes(groups, 'paving'), 1.0, 0.06, setback, rotation, dx + nx * setback / 2, building.base + 0.03, dz + nz * setback / 2, COLORS.sidewalk)
        }
      }
      const start = 2.1, end = length - 0.7
      if (end - start >= 2.7) for (const shift of [-0.68, 0.68]) opening(...at((start + end) / 2 + shift), ux, uz, nx, nz, 1.2, building.base + 0.9, 1.5, 0)
      else if (end - start >= 1.4) opening(...at((start + end) / 2), ux, uz, nx, nz, 1.2, building.base + 0.9, 1.5, 0)
    } else {
      for (let k = 1; k <= count; k++) opening(...at(spacing * k), ux, uz, nx, nz, 1.2, building.base + 1, 1.4, 0)
    }
  })
  if (acc.positions.length) groups.window.push(flush(acc))
}

const signParts = groups => groups.sign

function frontEdge(building) {
  let best = -1, bestDistance = 60
  building.p.forEach(([ax, az], i) => {
    const [bx, bz] = building.p[(i + 1) % building.p.length]
    const { distance } = nearestSegment((ax + bx) / 2, (az + bz) / 2)
    if (distance < bestDistance) { bestDistance = distance; best = i }
  })
  return best
}

function boxy(points) {
  let angle = 0, longest = 0
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length]
    const length = (nx - x) ** 2 + (nz - z) ** 2
    if (length > longest) { longest = length; angle = Math.atan2(nz - z, nx - x) }
  })
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const xs = points.map(([x, z]) => x * cos + z * sin), zs = points.map(([x, z]) => -x * sin + z * cos)
  const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zs) - Math.min(...zs)
  return Math.max(w, d) < 32 && footprintArea(points) > 0.72 * w * d
}

function prepareBuilding(building) {
  const heights = building.p.map(([x, z]) => terrainHeight(x, z))
  building.base = Math.max(...heights)
  const seed = building.p[0][0] * 13 + building.p[0][1] * 7
  building.c = Math.abs(Math.floor(seed)) % COLORS.walls.length
  building.h = +Math.max(3.2, building.h + ((seed % 1) - 0.5) * 1.2).toFixed(1)
  if (building.roof === 'hip' && Math.abs(seed) % 5 === 0) building.roof = 'flat'
  else if (building.roof === 'flat' && building.h <= 8 && Math.abs(seed) % 7 === 0) building.roof = 'hip'
  if (building.roof === 'hip' && !building.faces && !boxy(building.p)) building.roof = 'flat'
  building.bottom = Math.min(...heights) - 0.5
  building.plaster = Math.abs(Math.floor(seed / 3)) % 4 === 0
  building.group = building.plaster ? 'plaster' : ['brickRed', 'brickRed', 'brickBrown', 'brickYellow'][Math.abs(Math.floor(seed / 5)) % 4]
  building.wall = building.plaster ? COLORS.plaster[building.c % COLORS.plaster.length] : new THREE.Color(0xffffff).lerp(COLORS.walls[building.c], 0.2)
}

function buildBuilding(building, groups) {
  const shape = new THREE.Shape(building.p.map(([x, z]) => new THREE.Vector2(x, -z)))
  if (building.faces) {
    bagBuilding(building, groups)
    groups[building.group].push(paint(new THREE.ExtrudeGeometry(shape, { depth: building.base - building.bottom + 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, building.bottom, 0), building.wall))
    return facadeDetails(building, groups, false)
  }
  const walls = new THREE.ExtrudeGeometry(shape, { depth: building.base + building.h - building.bottom, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, building.bottom, 0)
  groups[building.group].push(paint(walls, building.wall))
  if (building.roof === 'hip') hipRoof(building, groups)
  else groups.plain.push(paint(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, building.base + building.h + 0.03, 0), COLORS.bitumen))
  facadeDetails(building, groups, false)
}

function bagBuilding(building, groups) {
  const lift = building.base - (building.ground ?? building.base)
  const roofColor = building.roof === 'hip' ? COLORS.roofs[building.c] : COLORS.bitumen
  building.faces.forEach(([type, outer, ...holes]) => {
    const rings = [outer, ...holes].map(ring => ring.map(([x, z, y]) => new THREE.Vector3(x, y + lift, z)))
    const normal = new THREE.Vector3()
    for (let i = 0; i < rings[0].length; i++) { const a = rings[0][i], b = rings[0][(i + 1) % rings[0].length]; normal.x += (a.y - b.y) * (a.z + b.z); normal.y += (a.z - b.z) * (a.x + b.x); normal.z += (a.x - b.x) * (a.y + b.y) }
    if (normal.lengthSq() < 1e-6) return
    normal.normalize()
    const u = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(normal).normalize()
    const v = new THREE.Vector3().crossVectors(normal, u)
    const flat = rings.map(ring => ring.map(p => new THREE.Vector2(p.dot(u), p.dot(v))))
    if (THREE.ShapeUtils.isClockWise(flat[0])) { flat.forEach(ring => ring.reverse()); rings.forEach(ring => ring.reverse()) }
    const triangles = THREE.ShapeUtils.triangulateShape(flat[0], flat.slice(1))
    const points = rings.flat()
    const positions = [], uvs = []
    triangles.forEach(([a, b, c]) => {
      const tri = [points[a], points[b], points[c]]
      const facing = new THREE.Vector3().crossVectors(tri[1].clone().sub(tri[0]), tri[2].clone().sub(tri[0]))
      if (facing.dot(normal) < 0) tri.reverse()
      tri.forEach(p => { positions.push(p.x, p.y, p.z); uvs.push(type === 'wall' ? p.dot(u) : p.x, type === 'wall' ? p.y : p.z) })
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.computeVertexNormals()
    if (type === 'wall') groups[building.group].push(paint(geometry, building.wall))
    else groups[building.roof === 'hip' ? 'tiles' : 'plain'].push(paint(geometry, roofColor))
  })
}

function buildingExtras(building, groups) {
  const plinth = new THREE.Shape(offsetRing(building.p, 0.06).map(([x, z]) => new THREE.Vector2(x, -z)))
  groups.plain.push(paint(new THREE.ExtrudeGeometry(plinth, { depth: building.base - building.bottom + 0.45, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, building.bottom, 0), COLORS.plinth))
  gutters(building, boxes(groups, 'plain'))
  if (building.roofFrame) roofExtras(building, groups)
  else if (!building.faces && footprintArea(building.p) > 60) {
    const [cx, cz] = centroid(building.p)
    boxInto(boxes(groups, 'plain'), 1.4, 0.9, 1.1, 0, cx, building.base + building.h + 0.45, cz, COLORS.concrete)
  }
  facadeDetails(building, groups, true)
}

// DETAIL TILES (kozijnen, goten, heggen, gras en bloemen rond de speler):

const buildingTiles = new Map(), detailTiles = new Map()
const DETAIL_REACH = 1, DETAIL_KEEP = 2, DETAIL_BATCH = 12
let detailJob = null, natureShapes = null

function newGroups() {
  return { plain: [], asphalt: [], paving: [], gravel: [], brickRed: [], brickBrown: [], brickYellow: [], plaster: [], hedge: [], tiles: [], ground: [], sign: [], window: [] }
}

function mergeGroups(groups) {
  const meshes = []
  if (groups.acc) { Object.entries(groups.acc).forEach(([name, acc]) => { if (acc.positions.length) groups[name].push(flush(acc)) }); delete groups.acc }
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
    meshes.push(mesh)
  }
  return meshes
}

function seeded(seed) {
  let value = (seed >>> 0) || 1
  return () => (value = (value * 1664525 + 1013904223) >>> 0) / 4294967296
}

function natureSampler(tx, tz) {
  if (!natureShapes) natureShapes = {
    tuft: mergeGeometries([[0, 0], [0.12, 0.05], [-0.1, 0.08], [0.04, -0.12], [-0.06, -0.06]].map(([dx, dz], i) => new THREE.ConeGeometry(0.07, 0.3 + (i % 2) * 0.15, 3).translate(dx, 0.15, dz))),
    bush: blobs([[0, 0.5, 0, 0.6], [0.4, 0.42, 0.2, 0.45], [-0.35, 0.45, -0.25, 0.48], [0.1, 0.8, -0.1, 0.4]]),
    flower: mergeGeometries([[0, 0], [0.12, 0.08], [-0.1, 0.1]].flatMap(([dx, dz]) => [
      new THREE.CylinderGeometry(0.012, 0.012, 0.3, 3).translate(dx, 0.15, dz).toNonIndexed(),
      new THREE.IcosahedronGeometry(0.06, 0).translate(dx, 0.32, dz)
    ]))
  }
  const rand = seeded(Math.round(tx / SUB) * 73856093 ^ Math.round(tz / SUB) * 19349663)
  const tufts = [], bushes = [], flowers = [[], [], []]
  const count = SUB * SUB / 40
  let sampled = 0
  return {
    step(limit) {
      const end = Math.min(count, sampled + limit)
      for (; sampled < end; sampled++) {
        const x = tx + rand() * SUB, z = tz + rand() * SUB
        const kind = kindAt(x, z)
        if (!['grass', 'forest', 'ground'].includes(kind) || wasteAt(x, z) || !treeFits(x, z)) continue
        const place = [x, terrainHeight(x, z) - 0.03, z, 0.7 + rand() * 0.8, rand() * 6.28], roll = rand()
        if (kind === 'forest' ? roll < 0.2 : roll < 0.04) bushes.push(place)
        else if (roll < 0.1) flowers[Math.floor(rand() * 3)].push(place)
        else tufts.push(place)
      }
      return sampled >= count
    },
    meshes() {
      const meshes = [
        instances(natureShapes.tuft, 0xffffff, tufts, TEXTURES.foliage, 0.16, false, false),
        instances(natureShapes.bush, 0xffffff, bushes, TEXTURES.foliage, 0.1, false),
        ...[0xf2d24b, 0xe86aa5, 0xf6f6f2].map((color, i) => instances(natureShapes.flower, color, flowers[i], null, 0, false, false))
      ].filter(Boolean)
      meshes.forEach(mesh => { mesh.userData.instanced = true })
      return meshes
    }
  }
}

function startDetailTile(kx, kz) {
  const key = `${kx},${kz}`
  detailTiles.set(key, [])
  detailJob = { key, tx: kx * SUB, tz: kz * SUB, buildings: buildingTiles.get(key) || [], index: 0, groups: newGroups(), meshes: null, nature: null }
}

function advanceDetailJob(batch = DETAIL_BATCH) {
  const job = detailJob
  if (job.index < job.buildings.length) {
    const end = Math.min(job.buildings.length, job.index + batch)
    for (; job.index < end; job.index++) buildingExtras(job.buildings[job.index], job.groups)
    if (batch !== Infinity) return
  }
  if (!job.meshes) { job.meshes = mergeGroups(job.groups); if (batch !== Infinity) return }
  job.nature ||= natureSampler(job.tx, job.tz)
  if (!job.nature.step(batch === Infinity ? Infinity : 400)) return
  detailTiles.set(job.key, [...job.meshes, ...job.nature.meshes()])
  detailJob = null
}

function streamDetails() {
  if (detailJob) return advanceDetailJob()
  const cx = Math.floor(state.x / SUB), cz = Math.floor(state.z / SUB)
  const wanted = []
  for (let dx = -DETAIL_REACH; dx <= DETAIL_REACH; dx++) for (let dz = -DETAIL_REACH; dz <= DETAIL_REACH; dz++) {
    const key = `${cx + dx},${cz + dz}`
    const owner = tileAt((cx + dx + 0.5) * SUB, (cz + dz + 0.5) * SUB)
    if (!detailTiles.has(key) && owner && owner.built.buildings) wanted.push([Math.hypot((cx + dx + 0.5) * SUB - state.x, (cz + dz + 0.5) * SUB - state.z), cx + dx, cz + dz])
  }
  if (wanted.length) return startDetailTile(...wanted.sort((a, b) => a[0] - b[0])[0].slice(1))
  detailTiles.forEach((meshes, key) => {
    const [kx, kz] = key.split(',').map(Number)
    if (Math.abs(kx - cx) <= DETAIL_KEEP && Math.abs(kz - cz) <= DETAIL_KEEP) return
    meshes.forEach(mesh => { scene.remove(mesh); if (mesh.userData.instanced) mesh.dispose(); else mesh.geometry.dispose() })
    detailTiles.delete(key)
  })
}

function buildDetailsHere() {
  const owner = tileAt(state.x, state.z)
  if (!owner || !owner.built.buildings) return
  startDetailTile(Math.floor(state.x / SUB), Math.floor(state.z / SUB))
  while (detailJob) advanceDetailJob(Infinity)
}

function offsetRing(points, amount) {
  const [cx, cz] = centroid(points)
  return points.map(([x, z], i) => {
    const [px, pz] = points[(i + points.length - 1) % points.length], [nx, nz] = points[(i + 1) % points.length]
    const a = [pz - z, x - px], b = [z - nz, nx - x]
    const la = Math.hypot(...a) || 1, lb = Math.hypot(...b) || 1
    let ox = a[0] / la + b[0] / lb, oz = a[1] / la + b[1] / lb
    const length = Math.hypot(ox, oz) || 1
    ox /= length; oz /= length
    if ((x + ox - cx) ** 2 + (z + oz - cz) ** 2 < (x - cx) ** 2 + (z - cz) ** 2) { ox = -ox; oz = -oz }
    return [x + ox * amount, z + oz * amount]
  })
}

function centroid(points) {
  return [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length]
}

function footprintArea(points) {
  let area = 0
  points.forEach(([x, z], i) => { const [nx, nz] = points[(i + 1) % points.length]; area += x * nz - nx * z })
  return Math.abs(area) / 2
}

function gutters(building, acc) {
  const top = building.base + building.h
  building.p.forEach(([ax, az], i) => {
    const [bx, bz] = building.p[(i + 1) % building.p.length]
    const length = Math.hypot(bx - ax, bz - az)
    if (length < 1.5) return
    const ux = (bx - ax) / length, uz = (bz - az) / length
    let nx = uz, nz = -ux
    if (inside(building.p, (ax + bx) / 2 + nx * 0.3, (az + bz) / 2 + nz * 0.3)) { nx = -nx; nz = -nz }
    boxInto(acc, length, 0.14, 0.14, Math.atan2(-uz, ux), (ax + bx) / 2 + nx * 0.09, top - 0.07, (az + bz) / 2 + nz * 0.09, COLORS.gutter)
  })
}


function buildGround(tile) {
  const g = tile.grid
  const geometry = new THREE.PlaneGeometry(TILE, TILE, g.cols - 1, g.rows - 1).rotateX(-Math.PI / 2).translate(g.x0 + TILE / 2, 0, g.z0 + TILE / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3), normals = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i)
    position.setY(i, terrainHeight(x, z))
    const dx = (terrainHeight(x + g.step, z) - terrainHeight(x - g.step, z)) / (2 * g.step), dz = (terrainHeight(x, z + g.step) - terrainHeight(x, z - g.step)) / (2 * g.step)
    const length = Math.hypot(dx, 1, dz)
    normals.set([-dx / length, 1 / length, -dz / length], i * 3)
    const kind = kindAt(x, z)
    const color = wasteAt(x, z) && kind !== 'water' && kind !== 'parking' ? COLORS[kind].clone().lerp(DEAD, 0.75) : COLORS[kind]
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  uvWorld(geometry)
  const ground = new THREE.Mesh(geometry, MATERIALS.ground)
  ground.receiveShadow = true
  scene.add(ground)
  tile.meshes.push(ground)
  const [x0, z0, x1, z1] = tileBounds(tile)
  const rim = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => [x, gridAt(tile, tile.heights || tile.smooth || tile.raw, x, z), z])
  const apron = new THREE.Mesh(paint(skirt(rim, rim.map(([x, y, z]) => [x, y - 1.5, z])), COLORS.ground), MATERIALS.plain)
  scene.add(apron)
  tile.meshes.push(apron)
}

// TILE STREAMING (de wereld komt per kilometer van de server):

const REACH = { fetch: 2, keep: 3, ground: 2, roads: 2, buildings: 1 }
const jobs = []
let streamTimer = 0, pendingPoops = [], loadingHint = false

const tileBounds = tile => [tile.tx * TILE, tile.tz * TILE, (tile.tx + 1) * TILE, (tile.tz + 1) * TILE]
const tileDistance = tile => Math.max(Math.abs(tile.tx - Math.floor(state.x / TILE)), Math.abs(tile.tz - Math.floor(state.z / TILE)))
const present = tile => tile && tile.status !== 'fetching'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function fetchTile(tx, tz) {
  const key = `${tx},${tz}`
  const tile = { tx, tz, key, status: 'fetching', gen: 0, meshes: [], built: {}, scheduled: {}, roads: [], buildings: [] }
  tiles.set(key, tile)
  for (let attempt = 0; tiles.get(key) === tile; attempt++) {
    try {
      const response = await fetch(`tiles/${TILE_VERSION}/${tx}_${tz}.json`)
      if (response.ok) {
        const text = await response.text(), started = performance.now(), data = JSON.parse(text)
        if (performance.now() - started > 12) slowSteps.push(['parse', Math.round(performance.now() - started), key])
        const before = performance.now()
        receiveTile(tile, data)
        if (performance.now() - before > 12) slowSteps.push(['receive', Math.round(performance.now() - before), key])
        return
      }
      if (response.status === 404) return receiveTile(tile, { outside: true })
      await sleep(response.status === 202 ? 2000 : Math.min(30000, 2000 * 2 ** attempt))
    } catch {
      await sleep(Math.min(30000, 2000 * 2 ** attempt))
    }
  }
}

function receiveTile(tile, data) {
  if (tiles.get(tile.key) !== tile) return
  tile.data = { roads: [], buildings: [], areas: [], trees: [], places: [], towns: [], ...data }
  if (data.outside || !data.terrain) { tile.status = 'empty'; return }
  tile.grid = { x0: data.terrain.x0, z0: data.terrain.z0, step: data.terrain.step, cols: data.terrain.cols, rows: data.terrain.rows }
  tile.raw = Float32Array.from(data.terrain.heights)
  tile.dataAt = performance.now()
  tile.data.roads.forEach(source => {
    let road = roadsById.get(source.id)
    if (!road) { road = { ...source, owners: new Set() }; roadsById.set(source.id, road) }
    road.owners.add(tile.key)
    tile.roads.push(road)
  })
  tile.buildings = tile.data.buildings
  tile.buildings.forEach(building => {
    const xs = building.p.map(p => p[0]), zs = building.p.map(p => p[1])
    building.cells = []
    for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++) for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++) {
      const key = `${x},${z}`
      if (!grid.has(key)) grid.set(key, new Set())
      grid.get(key).add(building)
      building.cells.push(key)
    }
  })
  tile.status = 'data'
}

function evictTile(tile) {
  tile.status = 'evicted'
  tile.gen++
  tiles.delete(tile.key)
  garbage.push(...tile.meshes)
  tile.meshes = []
  tile.buildings.forEach(building => building.cells.forEach(key => grid.get(key)?.delete(building)))
  tile.roads.forEach(road => { road.owners.delete(tile.key); if (!road.owners.size) unregisterRoad(road) })
  releaseSigns(tile)
  const [x0, z0, x1, z1] = tileBounds(tile)
  const within = key => { const [kx, kz] = key.split(',').map(Number); return insideBox([(kx + 0.5) * SUB, (kz + 0.5) * SUB], [x0, z0, x1, z1]) }
  ;[...asphaltCells.keys()].filter(within).forEach(key => asphaltCells.delete(key))
  ;[...buildingTiles.keys()].filter(within).forEach(key => buildingTiles.delete(key))
  ;[...detailTiles.entries()].filter(([key]) => within(key)).forEach(([key, meshes]) => { garbage.push(...meshes); detailTiles.delete(key) })
}

const garbage = []

function collectGarbage(count) {
  for (let k = 0; k < count && garbage.length; k++) {
    const mesh = garbage.pop()
    scene.remove(mesh)
    if (mesh.isInstancedMesh || mesh.userData.instanced) mesh.dispose()
    else if (mesh.isGroup) mesh.traverse(child => child.geometry && child.geometry.dispose())
    else mesh.geometry.dispose()
  }
}

function schedule(kind, tile, order, step) {
  if (tile.scheduled[kind]) return
  tile.scheduled[kind] = true
  jobs.push({ kind, tile, order, step, gen: tile.gen })
}

function planTile(tile) {
  const distance = tileDistance(tile)
  if (tile.status === 'data' && (neighbourTiles(tile).every(present) || performance.now() - tile.dataAt > 4000)) schedule('terrain', tile, 0, finalizeStep(tile))
  if (tile.status !== 'ready') return
  if (!tile.built.prepare) return schedule('prepare', tile, 1, prepareStep(tile))
  if (distance <= REACH.ground && !tile.built.ground) schedule('ground', tile, 2, () => { buildGround(tile); tile.built.ground = true; return true })
  if (distance <= REACH.roads && !tile.built.roads) schedule('roads', tile, 3, lineworkStep(tile))
  if (distance <= REACH.buildings && !tile.built.buildings) schedule('buildings', tile, 4, buildingsStep(tile))
  if (distance <= REACH.buildings && !tile.built.trees) schedule('trees', tile, 5, () => { buildTrees(tile); tile.built.trees = true; return true })
  if (distance <= REACH.buildings && !tile.built.trains) schedule('trains', tile, 6, () => { buildTrains(tile); tile.built.trains = true; return true })
}

function finalizeStep(tile) {
  let stamp = null
  const steps = [() => smoothTile(tile), () => digTile(tile), () => (stamp ||= stampStep(tile))() || 'again', () => { adoptEdges(tile); rasterTile(tile); tile.status = 'ready' }]
  return () => {
    if (steps[0]() !== 'again') steps.shift()
    return !steps.length
  }
}

function prepareStep(tile) {
  let queue = null
  return () => {
    if (!queue) {
      const wide = roadsAround(tile).filter(road => road.kind === 'road' && road.w >= 7)
      tile.roads.filter(road => wide.includes(road) && !road.prepared).forEach(road => markDual(road, wide))
      queue = tile.roads.filter(road => !road.prepared || road.partial).sort((a, b) => (b.bridge ? 1 : 0) - (a.bridge ? 1 : 0))
    }
    const bigWater = [...roadsById.values()].filter(road => road.level !== undefined)
    for (let n = 0; n < 40 && queue.length; n++) prepareRoad(queue.shift(), bigWater)
    if (queue.length) return false
    tile.built.prepare = true
    return true
  }
}

function lineworkStep(tile) {
  const queue = [...tile.roads], groups = newGroups()
  return () => {
    for (let n = 0; n < 30 && queue.length; n++) { const road = queue.shift(); if (road.prepared) buildRoadLinework(tile, road, groups) }
    if (queue.length) return false
    tile.meshes.push(...mergeGroups(groups))
    tile.built.roads = true
    return true
  }
}

function buildingsStep(tile) {
  const cells = new Map()
  tile.buildings.forEach(building => { const key = subKey(building.p[0][0], building.p[0][1]); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(building) })
  const queue = [...cells.entries()]
  let current = null
  return () => {
    if (!current) {
      if (!queue.length) { tile.built.buildings = true; return true }
      const [key, list] = queue.shift()
      current = { key, list, index: 0, groups: newGroups() }
    }
    const end = Math.min(current.list.length, current.index + 20)
    for (; current.index < end; current.index++) {
      const building = current.list[current.index]
      if (building.sign) allocateSign(building.sign, tile.key)
      prepareBuilding(building)
      buildBuilding(building, current.groups)
    }
    if (current.index < current.list.length) return false
    tile.meshes.push(...mergeGroups(current.groups))
    buildingTiles.set(current.key, current.list)
    current = null
    return false
  }
}

function pump(budget, filter) {
  const end = performance.now() + budget
  while (jobs.length && performance.now() < end) {
    let best = null, bestScore = Infinity
    for (let i = jobs.length - 1; i >= 0; i--) {
      const job = jobs[i]
      if (job.gen !== job.tile.gen) { jobs.splice(i, 1); continue }
      if (filter && !filter(job)) continue
      const score = job.order * 500 + Math.hypot((job.tile.tx + 0.5) * TILE - state.x, (job.tile.tz + 0.5) * TILE - state.z)
      if (score < bestScore) { bestScore = score; best = job }
    }
    if (!best) return
    const started = performance.now()
    const done = best.step()
    const took = performance.now() - started
    if (took > 12) slowSteps.push([best.kind, Math.round(took), best.tile.key])
    if (done) { jobs.splice(jobs.indexOf(best), 1); best.tile.scheduled[best.kind] = false; planTile(best.tile) }
  }
}

const slowSteps = [], slowFrames = []
let lastStepNote = ''

function streamTiles() {
  const cx = Math.floor(state.x / TILE), cz = Math.floor(state.z / TILE)
  const ahead = Math.abs(state.speed) > 5 ? [Math.round(Math.sin(state.heading)), Math.round(Math.cos(state.heading))] : [0, 0]
  const wanted = []
  for (let dx = -REACH.fetch; dx <= REACH.fetch; dx++) for (let dz = -REACH.fetch; dz <= REACH.fetch; dz++) if (!tiles.has(`${cx + dx},${cz + dz}`)) wanted.push([dx * dx + dz * dz, cx + dx, cz + dz])
  wanted.sort((a, b) => a[0] - b[0]).forEach(([, tx, tz]) => fetchTile(tx, tz))
  if (ahead[0] || ahead[1]) for (let side = -1; side <= 1; side++) {
    const tx = cx + ahead[0] * (REACH.fetch + 1) + (ahead[0] ? 0 : side), tz = cz + ahead[1] * (REACH.fetch + 1) + (ahead[1] ? 0 : side)
    if (!tiles.has(`${tx},${tz}`)) fetchTile(tx, tz)
  }
  tiles.forEach(tile => { if (tileDistance(tile) > REACH.keep) evictTile(tile); else planTile(tile) })
}

async function loadTilesAround(x, z) {
  ZONES = (await fetch('tiles/world.json', { cache: 'no-store' }).then(response => response.json())).zones || []
  const cx = Math.floor(x / TILE), cz = Math.floor(z / TILE)
  const pending = []
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (!tiles.has(`${cx + dx},${cz + dz}`)) pending.push(fetchTile(cx + dx, cz + dz))
  await Promise.all(pending)
}

async function pumpFor(kinds, reach) {
  for (;;) {
    tiles.forEach(planTile)
    const filter = job => kinds.some(kind => job.kind.startsWith(kind)) && tileDistance(job.tile) <= reach
    if (!jobs.some(job => job.gen === job.tile.gen && filter(job))) return
    pump(40, filter)
    await sleep(0)
  }
}

function tilesNear(reach) {
  return [...tiles.values()].filter(tile => tile.data && tileDistance(tile) <= reach)
}

function seams() {
  let worst = 0
  tiles.forEach(tile => {
    const east = tiles.get(`${tile.tx + 1},${tile.tz}`), south = tiles.get(`${tile.tx},${tile.tz + 1}`), g = tile.grid
    if (!tile.heights || !g) return
    if (east && east.heights) for (let r = 0; r < g.rows; r++) worst = Math.max(worst, Math.abs(tile.heights[r * g.cols + g.cols - 1] - east.heights[r * g.cols]))
    if (south && south.heights) for (let c = 0; c < g.cols; c++) worst = Math.max(worst, Math.abs(tile.heights[(g.rows - 1) * g.cols + c] - south.heights[c]))
  })
  return worst
}

const SUB = 250
const subKey = (x, z) => `${Math.floor(x / SUB)},${Math.floor(z / SUB)}`

const solidCache = new Map()

function instances(geometry, color, placements, map, variation = 0, tiled = false, shadows = true) {
  const cacheKey = `${color}|${map ? map.uuid : ''}`
  if (!solidCache.has(cacheKey)) solidCache.set(cacheKey, solid(color, map))
  const material = solidCache.get(cacheKey)
  const buckets = new Map()
  placements.forEach(placement => {
    const key = tiled ? subKey(placement[0], placement[2]) : 'all'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(placement)
  })
  const matrix = new THREE.Matrix4()
  const tint = new THREE.Color()
  let mesh
  buckets.forEach(list => {
    mesh = new THREE.InstancedMesh(geometry, material, list.length)
    list.forEach(([x, y, z, scale, rotation], i) => {
      matrix.makeRotationY(rotation || 0).scale(new THREE.Vector3(scale, scale, scale)).setPosition(x, y, z)
      mesh.setMatrixAt(i, matrix)
      if (variation) mesh.setColorAt(i, tint.setHSL(0.28 + (random() - 0.5) * variation, 0.5 + random() * 0.2, 0.35 + random() * 0.15))
    })
    mesh.computeBoundingSphere()
    mesh.castShadow = shadows
    scene.add(mesh)
  })
  return mesh
}

function blobs(list) {
  return mergeGeometries(list.map(([x, y, z, radius, sx = 1, sy = 1, sz = 1]) => new THREE.IcosahedronGeometry(radius, 1).scale(sx, sy, sz).translate(x, y, z)))
}

function branch(x, y, z, length, tiltX, tiltZ) {
  return new THREE.CylinderGeometry(0.05, 0.11, length, 5).translate(0, length / 2, 0).rotateX(tiltX).rotateZ(tiltZ).translate(x, y, z)
}

function treeScale(x, z) {
  const r = Math.abs((x * 7 + z * 13) % 10) / 10, giant = (Math.abs(x * 11 + z * 3) | 0) % 7 === 0
  return 0.7 + r * 0.9 + (giant ? 1.0 + r * 0.5 : 0)
}

function treeFits(x, z) {
  if (blocked(x, z)) return false
  const { segment, distance } = nearestSegment(x, z)
  return !segment || distance > segment.road.w / 2 + 1.5
}

const TREE_SHAPES = {}

function treeShapes() {
  if (TREE_SHAPES.trunk) return TREE_SHAPES
  TREE_SHAPES.deadTrunk = new THREE.CylinderGeometry(0.12, 0.3, 3.2, 5).translate(0, 1.6, 0)
  TREE_SHAPES.deadBranch = new THREE.CylinderGeometry(0.05, 0.1, 1.6, 4).rotateZ(0.7).translate(0.4, 3.1, 0)
  TREE_SHAPES.trunk = mergeGeometries([
    new THREE.CylinderGeometry(0.2, 0.36, 2.6, 7).translate(0, 1.3, 0),
    branch(0.1, 2.3, 0, 1.5, 0.2, -0.7), branch(-0.1, 2.5, 0.1, 1.3, -0.5, 0.6), branch(0, 2.7, -0.1, 1.2, 0.8, 0.1)
  ])
  TREE_SHAPES.round = blobs([[0, 3.7, 0, 1.7], [1.0, 3.3, 0.3, 1.1], [-0.9, 3.4, -0.4, 1.2], [0.2, 4.6, -0.5, 1.0], [-0.3, 3.1, 1.0, 0.9], [0.6, 4.2, 0.9, 0.8]])
  TREE_SHAPES.tall = blobs([[0, 4.2, 0, 1.3, 1, 1.6, 1], [0.7, 3.6, 0.4, 0.9, 1, 1.3, 1], [-0.7, 3.9, -0.3, 0.9, 1, 1.4, 1], [0.1, 5.6, 0.2, 0.8]])
  TREE_SHAPES.coniferTrunk = new THREE.CylinderGeometry(0.18, 0.3, 1.8, 6).translate(0, 0.9, 0)
  TREE_SHAPES.conifer = mergeGeometries([
    new THREE.ConeGeometry(1.8, 2.6, 8).translate(0, 2.6, 0),
    new THREE.ConeGeometry(1.35, 2.4, 8).translate(0, 4.0, 0),
    new THREE.ConeGeometry(0.85, 2.2, 8).translate(0, 5.3, 0)
  ])
  return TREE_SHAPES
}

function buildTrees(tile) {
  const shapes = treeShapes()
  const placements = tile.data.trees.filter(([x, z]) => treeFits(x, z)).map(([x, z]) => [x, terrainHeight(x, z) - 0.1, z, treeScale(x, z), (x * 3.1 + z * 1.7) % 6.28])
  const dead = placements.filter(([x, , z]) => wasteAt(x, z))
  const alive = placements.filter(p => !dead.includes(p))
  const conifers = alive.filter(([x, , z]) => (Math.abs(x * 3 + z * 5) | 0) % 4 === 0)
  const broad = alive.filter(p => !conifers.includes(p))
  const tall = broad.filter(([x, , z]) => (Math.abs(x * 5 + z * 3) | 0) % 3 === 0)
  const round = broad.filter(p => !tall.includes(p))
  const meshes = [
    instances(shapes.deadTrunk, 0x4a4038, dead), instances(shapes.deadBranch, 0x4a4038, dead),
    instances(shapes.trunk, 0x6b4a2c, round), instances(shapes.round, 0xffffff, round, TEXTURES.foliage, 0.14),
    instances(shapes.trunk, 0x5c4a3a, tall), instances(shapes.tall, 0xffffff, tall, TEXTURES.foliage, 0.12),
    instances(shapes.coniferTrunk, 0x5a3d25, conifers), instances(shapes.conifer, 0xffffff, conifers, TEXTURES.foliage, 0.08)
  ].filter(Boolean)
  tile.meshes.push(...meshes)
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

const bodyParts = [], brakeLights = [], wheels = []
let wheelSpin = 0
let flame = null
const CLEAN = new THREE.Color(0xefe6cf), FILTHY = new THREE.Color(0x4a3a24)

function dirty(amount) {
  state.dirt = Math.min(1, (state.dirt || 0) + amount)
  bodyParts.forEach((mesh, i) => mesh.material.color.copy(CLEAN).lerp(FILTHY, state.dirt * (i ? 0.8 : 1)))
}

function buildTrains(tile) {
  const rails = roadsAround(tile).filter(road => road.kind === 'rail' && road.prepared)
  if (!rails.length) return
  tile.data.places.filter(place => place.kind === 'station').forEach(place => {
    let best = null
    rails.forEach(road => {
      for (let i = 1; i < road.samples.length; i++) {
        const { t, distance } = pointToSegment(place.x, place.z, road.samples[i - 1], road.samples[i])
        if (!best || distance < best.distance) best = { distance, a: road.samples[i - 1], b: road.samples[i], t }
      }
    })
    if (!best || best.distance > 300) return
    const heading = Math.atan2(best.b[0] - best.a[0], best.b[1] - best.a[1])
    const x = best.a[0] + (best.b[0] - best.a[0]) * best.t, z = best.a[1] + (best.b[1] - best.a[1]) * best.t
    const train = new THREE.Group()
    for (let k = -1; k <= 1; k++) {
      const wagon = new THREE.Group()
      const add = (w, h, d, color, y, dz = 0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid(color)); mesh.position.set(0, y, dz); mesh.castShadow = true; wagon.add(mesh) }
      add(2.8, 1.5, 26, 0x003082, 1.45)
      add(2.85, 1.3, 26, 0xffc917, 2.85)
      add(2.9, 0.55, 25, 0x1b2733, 2.85)
      add(1.6, 0.7, 26, 0x1c1c1c, 0.35)
      wagon.position.z = k * 27
      train.add(wagon)
    }
    train.position.set(x, terrainHeight(x, z) + 0.15, z)
    train.rotation.y = heading
    scene.add(train)
    tile.meshes.push(train)
  })
}

function pandaParts(part, body, glass = 0x1f2a36, plastic = 0x2e2e2e, lights = null) {
  const roof = new THREE.Color(body).offsetHSL(0, 0, -0.03).getHex(), frame = 0x1a1a1a, chromeColor = 0xd8d8d8
  const finish = (mesh, material) => { mesh.material = material; return mesh }
  const paintPart = (...args) => finish(part(...args), carPaint(args[3]))
  const shell = [paintPart(1.46, 0.46, 3.3, body, 0, 0.63, 0), paintPart(1.38, 0.54, 2.2, body, 0, 1.13, -0.42)]
  paintPart(1.42, 0.03, 1.55, roof, 0, 1.415, -0.4)
  paintPart(1.44, 0.22, 0.98, body, 0, 0.79, 1.14)
  paintPart(1.42, 0.02, 0.9, roof, 0, 0.905, 1.16)
  part(1.5, 0.18, 3.44, plastic, 0, 0.4, 0)
  part(1.52, 0.16, 0.16, plastic, 0, 0.47, 1.72)
  part(1.52, 0.16, 0.16, plastic, 0, 0.47, -1.72)
  part(1.54, 0.03, 0.17, 0x111111, 0, 0.5, 1.73)
  part(1.54, 0.03, 0.17, 0x111111, 0, 0.5, -1.73)
  part(0.76, 0.2, 0.04, frame, 0, 0.78, 1.665)
  for (let k = 0; k < 4; k++) finish(part(0.7, 0.012, 0.045, chromeColor, 0, 0.7 + k * 0.045, 1.67), chrome)
  finish(part(0.16, 0.05, 0.05, chromeColor, 0, 0.9, 1.68), chrome)
  part(0.36, 0.09, 0.02, 0xfafafa, 0, 0.58, 1.81)
  part(0.05, 0.09, 0.022, 0x2050c0, -0.155, 0.58, 1.811)
  part(0.36, 0.09, 0.02, 0xfafafa, 0, 0.6, -1.81)
  part(0.05, 0.09, 0.022, 0x2050c0, -0.155, 0.6, -1.811)
  part(0.9, 0.012, 0.012, frame, 0, 1.44, 0.36)
  part(0.9, 0.012, 0.012, frame, 0, 1.44, -1.17)
  part(0.06, 0.04, 0.16, 0x444444, -0.42, 0.33, -1.74)
  for (const side of [-1, 1]) {
    part(0.32, 0.16, 0.04, frame, side * 0.5, 0.78, 1.665)
    part(0.28, 0.12, 0.03, 0xf7f0c8, side * 0.5, 0.78, 1.675)
    part(0.1, 0.1, 0.03, 0xff9a1a, side * 0.7, 0.78, 1.675)
    part(0.3, 0.16, 0.03, frame, side * 0.52, 0.74, -1.665)
    const light = part(0.26, 0.12, 0.03, 0xc8281e, side * 0.52, 0.76, -1.675)
    if (lights) lights.push(light)
    part(0.1, 0.05, 0.03, 0xf4f4f4, side * 0.52, 0.7, -1.675)
    part(0.02, 0.44, 0.94, frame, side * 0.705, 1.2, 0.18)
    part(0.02, 0.44, 0.98, frame, side * 0.705, 1.2, -0.92)
    finish(part(0.02, 0.38, 0.86, glass, side * 0.715, 1.2, 0.18), carGlass)
    finish(part(0.02, 0.38, 0.9, glass, side * 0.715, 1.2, -0.92), carGlass)
    part(0.02, 0.9, 0.012, frame, side * 0.735, 0.85, -0.42)
    part(0.02, 0.9, 0.012, frame, side * 0.735, 0.85, 0.72)
    part(0.02, 0.9, 0.012, frame, side * 0.735, 0.85, -1.42)
    part(0.03, 0.04, 0.14, 0x111111, side * 0.745, 0.92, 0.2)
    part(0.03, 0.04, 0.14, 0x111111, side * 0.745, 0.92, -0.9)
    part(0.02, 0.05, 2.9, plastic, side * 0.74, 0.7, -0.1)
    part(0.06, 0.14, 0.1, plastic, side * 0.8, 1.06, 0.62)
    finish(part(0.02, 0.1, 0.08, 0xbfd6ea, side * 0.83, 1.07, 0.6), chrome)
    part(0.06, 0.32, 0.76, plastic, side * 0.72, 0.36, 1.08)
    part(0.06, 0.32, 0.76, plastic, side * 0.72, 0.36, -1.08)
    part(0.02, 0.28, 0.02, frame, side * 0.62, 1.2, 0.72)
    part(0.02, 0.32, 0.02, frame, side * 0.62, 1.2, -1.42)
  }
  part(1.32, 0.48, 0.02, frame, 0, 1.2, -1.545)
  finish(part(1.24, 0.4, 0.02, glass, 0, 1.2, -1.555), carGlass)
  part(0.36, 0.012, 0.03, 0x111111, 0.3, 0.955, 0.98)
  part(0.36, 0.012, 0.03, 0x111111, -0.3, 0.955, 0.98)
  part(1.34, 0.54, 0.02, frame, 0, 1.17, 0.735).rotation.x = -0.4
  finish(part(1.26, 0.46, 0.02, glass, 0, 1.17, 0.745), carGlass).rotation.x = -0.4
  return shell
}

function pandaModel(bodyColor) {
  const group = new THREE.Group()
  group.rotation.order = 'YXZ'
  const part = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid(color))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    group.add(mesh)
    return mesh
  }
  pandaParts(part, bodyColor)
  const tyre = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12).rotateZ(Math.PI / 2)
  for (const [x, z] of [[-0.66, 1.08], [0.66, 1.08], [-0.66, -1.08], [0.66, -1.08]]) {
    const wheel = new THREE.Mesh(tyre, solid(0x111111))
    wheel.position.set(x, 0.28, z)
    group.add(wheel)
  }
  return group
}

function buildCar() {
  const car = new THREE.Group()
  car.rotation.order = 'YXZ'
  const part = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid(color))
      mesh.position.set(x, y, z)
      mesh.castShadow = true
        car.add(mesh)
        mesh.userData.position = mesh.position.clone()
        mesh.userData.rotation = mesh.rotation.clone()
        return mesh
      }
  bodyParts.push(...pandaParts(part, 0xefe6cf, undefined, undefined, brakeLights))
  car.children.forEach(mesh => { mesh.userData.rotation = mesh.rotation.clone() })

  for (const x of [-0.5, 0.5]) {
    part(0.34, 0.16, 0.04, 0xfff3c4, x, 0.72, 1.7)
    part(0.12, 0.3, 0.04, 0xd32f2f, x * 1.3, 0.68, -1.7)
  }
  part(0.5, 0.14, 0.04, 0x222222, 0, 0.72, 1.7)

  const tyre = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16).rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.17, 0.17, 0.19, 12).rotateZ(Math.PI / 2)
  const hub = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8).rotateZ(Math.PI / 2)
  for (const [x, z] of [[-0.66, 1.08], [0.66, 1.08], [-0.66, -1.08], [0.66, -1.08]]) {
    const wheel = new THREE.Group()
    wheel.rotation.order = 'YXZ'
    for (const [geometry, color] of [[tyre, 0x151515], [rim, 0xc9c9c9], [hub, 0x555555]]) {
      const mesh = new THREE.Mesh(geometry, color === 0xc9c9c9 ? chrome : solid(color))
      mesh.castShadow = true
      wheel.add(mesh)
    }
    for (let k = 0; k < 4; k++) { const slot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.05), solid(0x333333)); slot.position.set(0, Math.sin(k * Math.PI / 2) * 0.1, Math.cos(k * Math.PI / 2) * 0.1); wheel.add(slot) }
    wheel.position.set(x, 0.28, z)
    car.add(wheel)
    wheel.userData.position = wheel.position.clone()
    wheel.userData.rotation = wheel.rotation.clone()
    wheels.push({ wheel, front: z > 0 })
  }
  flame = turboFlame(car)
  scene.add(car)
  return car
}

function turboFlame(group) {
  const flames = new THREE.Group()
  for (const x of [-0.45, 0.45]) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.85 }))
    mesh.material.userData.outlineParameters = { visible: false }
    mesh.position.set(x, 0.4, -2.25)
    flames.add(mesh)
  }
  flames.visible = false
  flames.userData.position = flames.position.clone()
  flames.userData.rotation = flames.rotation.clone()
  group.add(flames)
  return flames
}

// WALKERS:

const NPC_CAP = 512
const npcs = new Map()
const npcMeshes = {}
const nearest = {}
let explosion = null

function box(parts, w, h, d, color, x, y, z, tilt = 0) {
  parts.push(paint(new THREE.BoxGeometry(w, h, d).rotateX(tilt).translate(x, y, z), new THREE.Color(color)))
}

function merged(parts) {
  return mergeGeometries(parts.map(part => { part.deleteAttribute('uv'); return part }))
}

function beagleGeometry() {
  const parts = [], white = 0xf2ede4, brown = 0xa5683a, black = 0x2b2118
  box(parts, 0.3, 0.28, 0.72, white, 0, 0.4, 0)
  box(parts, 0.31, 0.14, 0.44, black, 0, 0.53, -0.1)
  box(parts, 0.31, 0.1, 0.16, brown, 0, 0.5, 0.2)
  box(parts, 0.26, 0.26, 0.28, brown, 0, 0.56, 0.44)
  box(parts, 0.18, 0.14, 0.2, white, 0, 0.5, 0.6)
  box(parts, 0.05, 0.05, 0.05, black, 0, 0.53, 0.71)
  box(parts, 0.05, 0.06, 0.05, 0x2a1a12, 0, 0.47, 0.7, 0.4)
  box(parts, 0.24, 0.05, 0.05, 0xc0392b, 0, 0.44, 0.31)
  for (const side of [-1, 1]) {
    box(parts, 0.07, 0.22, 0.14, 0x6b3f22, side * 0.15, 0.48, 0.42)
    box(parts, 0.035, 0.035, 0.02, 0x111111, side * 0.06, 0.61, 0.58)
    box(parts, 0.045, 0.045, 0.01, 0xffffff, side * 0.06, 0.61, 0.575)
  }
  for (const [x, z] of [[-0.11, 0.26], [0.11, 0.26], [-0.11, -0.26], [0.11, -0.26]]) {
    box(parts, 0.09, 0.26, 0.09, white, x, 0.13, z)
    box(parts, 0.1, 0.05, 0.11, 0x3b2a1e, x, 0.025, z + 0.01)
  }
  box(parts, 0.06, 0.06, 0.32, white, 0, 0.6, -0.44, -0.9)
  box(parts, 0.07, 0.07, 0.08, black, 0, 0.5, -0.36)
  return merged(parts)
}

function face(parts, skin, y, dz = 0) {
  const shade = new THREE.Color(skin).offsetHSL(0, 0, -0.08).getHex()
  box(parts, 0.22, 0.26, 0.24, skin, 0, y, dz)
  for (const side of [-1, 1]) {
    box(parts, 0.03, 0.06, 0.05, skin, side * 0.125, y + 0.01, dz)
    box(parts, 0.04, 0.035, 0.02, 0xf4f4f4, side * 0.05, y + 0.03, dz + 0.12)
    box(parts, 0.02, 0.025, 0.022, 0x1a1a1a, side * 0.05, y + 0.03, dz + 0.121)
    box(parts, 0.06, 0.014, 0.02, 0x2a1d12, side * 0.05, y + 0.075, dz + 0.12)
  }
  box(parts, 0.03, 0.05, 0.04, shade, 0, y - 0.01, dz + 0.13)
  box(parts, 0.07, 0.012, 0.02, 0x7a3b30, 0, y - 0.07, dz + 0.12)
}

function man(parts, hair, shirt, skin = 0xe8b894, trousers = 0x2f3a4a, shoes = 0x1e1a18) {
  const dark = new THREE.Color(shirt).offsetHSL(0, 0, -0.1).getHex()
  for (const side of [-1, 1]) {
    box(parts, 0.12, 0.07, 0.27, shoes, side * 0.1, 0.035, 0.03)
    box(parts, 0.15, 0.72, 0.19, trousers, side * 0.1, 0.44, 0)
    box(parts, 0.12, 0.32, 0.15, shirt, side * 0.28, 1.2, 0)
    box(parts, 0.1, 0.3, 0.13, shirt, side * 0.29, 0.92, 0.04, 0.22)
    box(parts, 0.09, 0.1, 0.1, skin, side * 0.29, 0.76, 0.09)
  }
  box(parts, 0.42, 0.05, 0.26, 0x1e1a18, 0, 0.82, 0)
  box(parts, 0.4, 0.58, 0.24, shirt, 0, 1.11, 0)
  box(parts, 0.5, 0.1, 0.24, shirt, 0, 1.36, 0)
  box(parts, 0.14, 0.14, 0.02, dark, 0, 1.31, 0.121)
  box(parts, 0.1, 0.08, 0.1, skin, 0, 1.42, 0)
  face(parts, skin, 1.57)
  if (hair) {
    box(parts, 0.23, 0.06, 0.25, 0x3a2a1a, 0, 1.72, 0)
    box(parts, 0.23, 0.14, 0.05, 0x3a2a1a, 0, 1.63, -0.11)
    box(parts, 0.22, 0.03, 0.06, 0x3a2a1a, 0, 1.685, 0.1)
  }
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
  const parts = [], skin = 0x7a9a5a, rag = 0x4a5a4a, pants = 0x3a3f3a
  box(parts, 0.13, 0.07, 0.27, 0x2a2622, -0.1, 0.035, 0.03)
  box(parts, 0.1, 0.06, 0.2, skin, 0.1, 0.03, 0.03)
  box(parts, 0.15, 0.72, 0.19, pants, -0.1, 0.44, 0)
  box(parts, 0.15, 0.5, 0.19, pants, 0.1, 0.55, 0)
  box(parts, 0.13, 0.22, 0.17, skin, 0.1, 0.19, 0)
  box(parts, 0.4, 0.58, 0.24, rag, 0, 1.11, 0)
  box(parts, 0.2, 0.2, 0.25, skin, 0.1, 1.0, 0)
  box(parts, 0.14, 0.14, 0.02, 0x6a1a1a, -0.08, 1.2, 0.125)
  box(parts, 0.5, 0.1, 0.24, rag, 0, 1.36, 0)
  for (const side of [-1, 1]) {
    box(parts, 0.12, 0.14, 0.62, skin, side * 0.28, 1.3, 0.3)
    box(parts, 0.13, 0.15, 0.18, rag, side * 0.28, 1.3, 0.05)
    box(parts, 0.1, 0.12, 0.12, skin, side * 0.28, 1.3, 0.64)
  }
  box(parts, 0.1, 0.08, 0.1, skin, 0.02, 1.42, 0)
  box(parts, 0.22, 0.26, 0.24, skin, 0, 1.54, 0.05, 0.25)
  box(parts, 0.05, 0.05, 0.03, 0xff2a2a, -0.06, 1.58, 0.17)
  box(parts, 0.05, 0.05, 0.03, 0xff2a2a, 0.06, 1.58, 0.17)
  box(parts, 0.1, 0.03, 0.03, 0x3a0c0c, 0, 1.47, 0.17)
  box(parts, 0.1, 0.08, 0.1, 0x3a5a3a, -0.08, 1.7, 0.02)
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

function baldFlagGeometry() {
  const parts = []
  man(parts, false, 0x6b8fb5)
  box(parts, 0.03, 1.7, 0.03, 0x8a6a3a, 0.42, 1.35, 0)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(parts, 0.12, 0.12, 0.02, (i + j) % 2 ? 0xd42a2a : 0xffffff, 0.5 + i * 0.12, 1.86 + j * 0.12, 0)
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
  man(parts, false, 0x9a4a3a, 0xe8b894, 0x3a5a8a)
  box(parts, 0.44, 0.5, 0.28, 0x3b5b3b, 0, 1.12, 0)
  box(parts, 0.24, 0.07, 0.26, 0x9a9a9a, 0, 1.72, 0)
  box(parts, 0.24, 0.12, 0.05, 0x9a9a9a, 0, 1.64, -0.11)
  for (const side of [-1, 1]) {
    box(parts, 0.09, 0.06, 0.02, 0x222222, side * 0.06, 1.58, 0.13)
    box(parts, 0.17, 0.08, 0.28, 0xf2f2f2, side * 0.1, 0.04, 0.03)
  }
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
  for (const side of [-1, 1]) box(parts, 0.03, 0.03, 0.02, 0x111111, side * 0.06, 0.68, dz + 0.5)
  box(parts, 0.24, 0.04, 0.05, 0x1f5fbf, 0, 0.5, dz + 0.3)
  box(parts, 0.05, 0.05, 0.25, fur, 0, 0.5, dz - 0.4, -0.6)
  box(parts, 0.09, 0.07, 0.09, 0x4a2e12, 0.02, 0.035, dz - 0.42)
  box(parts, 0.07, 0.06, 0.07, 0x4a2e12, -0.02, 0.09, dz - 0.42)
  return merged(parts)
}

function politieGeometry() {
  const parts = []
  const wheel = (x, z) => parts.push(paint(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 14).rotateZ(Math.PI / 2).translate(x, 0.31, z), new THREE.Color(0x111111)))
  for (const side of [-1, 1]) { wheel(side * 0.78, 1.15); wheel(side * 0.78, -1.15) }
  box(parts, 1.5, 0.55, 3.4, 0xf4f4f4, 0, 0.62, 0)
  box(parts, 1.5, 0.12, 3.4, 0x1f4fd1, 0, 0.95, 0)
  box(parts, 1.52, 0.1, 0.5, 0xff7a00, 0, 0.62, -1.46)
  box(parts, 1.36, 0.5, 1.9, 0xf4f4f4, 0, 1.25, -0.15)
  box(parts, 1.38, 0.34, 1.7, 0x9fc4e6, 0, 1.28, -0.15)
  box(parts, 1.0, 0.16, 0.34, 0x151515, 0, 1.58, -0.1)
  box(parts, 0.4, 0.14, 0.3, 0xff2b2b, -0.28, 1.65, -0.1)
  box(parts, 0.4, 0.14, 0.3, 0x2b6bff, 0.28, 1.65, -0.1)
  for (const side of [-1, 1]) { box(parts, 0.22, 0.14, 0.05, 0xfff3b0, side * 0.5, 0.7, 1.71); box(parts, 0.22, 0.12, 0.05, 0xff3b30, side * 0.5, 0.7, -1.71) }
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
      box(parts, 0.12, 0.5, 0.14, 0x111111, side * 0.12, 0.75, 0.05)
      box(parts, 0.1, 0.42, 0.1, 0x151515, side * 0.22, 1.2, 0.25, -0.9)
    }
    box(parts, 0.34, 0.5, 0.22, 0x151515, 0, 1.3, -0.08)
    box(parts, 0.2, 0.22, 0.2, 0xe8b894, 0, 1.68, -0.05)
    box(parts, 0.26, 0.13, 0.28, 0x1a1a1a, 0, 1.84, -0.04)
    box(parts, 0.28, 0.1, 0.05, 0x1a1a1a, 0, 1.7, 0.06)
    for (const side of [-1, 1]) box(parts, 0.1, 0.07, 0.06, 0x9fb7cc, side * 0.07, 1.7, 0.07)
  box(parts, 0.5, 0.3, 0.25, 0x111111, 0, 0.82, -0.65)
  box(parts, 0.42, 0.22, 0.03, 0x555555, 0, 0.82, -0.79)
  box(parts, 0.06, 0.06, 0.06, 0x2299ff, 0.18, 0.95, -0.78)
  return merged(parts)
}

const KINDS = {
  beagle:    { geometry: beagleGeometry,    label: 'Beagle',              bob: 0.05 },
  baldman:   { geometry: baldManGeometry,   label: 'Kale man',            bob: 0.03 },
  baldflag:  { geometry: baldFlagGeometry,  label: 'Kale man met Brabantse vlag', bob: 0.03 },
  dogwalker:   { geometry: dogWalkerGeometry,   label: 'Niet poep oprapende labradoodle uitlater', bob: 0.03 },
  labradoodle: { geometry: labradoodleGeometry, label: 'Labradoodle',         bob: 0.08 },
  tattooman:   { geometry: tattooManGeometry,   label: 'Getatoeëerde kale man', bob: 0 },
  speakerboy:  { geometry: speakerboyGeometry,  label: 'Speakerboy',            bob: 0.02 },
  zwerver:     { geometry: zwerverGeometry,     label: 'Zwerver',               bob: 0.02 },
  zombie:      { geometry: zombieGeometry,      label: 'Zombie',                bob: 0.06 },
  junkie:      { geometry: junkieGeometry,      label: 'Junk',                  bob: 0.05 },
  politie:     { geometry: politieGeometry,     label: 'Politie',               bob: 0 }
}

let NPC_INFO = {}
const describe = kind => NPC_INFO[kind] || { label: KINDS[kind]?.label || kind, reward: null, range: 60, lines: {} }
const dummy = new THREE.Object3D()

function buildNpcMeshes() {
  Object.entries(KINDS).forEach(([kind, { geometry }]) => {
    const mesh = new THREE.InstancedMesh(geometry(), toon, NPC_CAP)
    mesh.count = 0
    mesh.castShadow = true
    mesh.frustumCulled = false
    scene.add(mesh)
    npcMeshes[kind] = { mesh, free: [], used: 0 }
    nearest[kind] = Infinity
  })
}

function allocSlot(kind) {
  const slots = npcMeshes[kind]
  if (slots.free.length) return slots.free.pop()
  if (slots.used >= NPC_CAP) return -1
  slots.mesh.count = ++slots.used
  return slots.used - 1
}

function freeSlot(kind, index) {
  if (index < 0) return
  dummy.position.set(0, -100, 0)
  dummy.rotation.set(0, 0, 0)
  dummy.scale.set(0, 0, 0)
  dummy.updateMatrix()
  npcMeshes[kind].mesh.setMatrixAt(index, dummy.matrix)
  npcMeshes[kind].mesh.instanceMatrix.needsUpdate = true
  npcMeshes[kind].free.push(index)
}

function placeNpc(npc, bob) {
  if (npc.index < 0) return
  dummy.position.set(npc.x, groundHeight(npc.x, npc.z) + bob, npc.z)
  dummy.rotation.set(0, npc.heading, 0)
  dummy.scale.set(1, 1, 1)
  if (npc.dead) {
    dummy.position.y += 0.15
    dummy.rotation.set(Math.PI / 2, npc.heading, 0)
    dummy.scale.y = 0.4
  }
  dummy.updateMatrix()
  npcMeshes[npc.kind].mesh.setMatrixAt(npc.index, dummy.matrix)
  npcMeshes[npc.kind].mesh.instanceMatrix.needsUpdate = true
}

function applySnapshot({ npcs: rows = [], gone = [] }) {
  gone.forEach(removeNpc)
  const at = performance.now()
  rows.forEach(([id, kindIndex, x, z, heading, speed, dead, voice]) => {
    const kind = KIND_NAMES[kindIndex]
    let npc = npcs.get(id)
    if (!npc) {
      npc = { id, kind, x, z, heading, speed, dead: false, voice, index: allocSlot(kind), splat: null }
      npcs.set(id, npc)
    }
    if (Math.hypot(npc.x - x, npc.z - z) > 20) { npc.x = x; npc.z = z; npc.heading = heading }
    Object.assign(npc, { tx: x, tz: z, th: heading, speed, at })
    if (npc.predictedAt) return
    if (dead) markDead(npc)
    else if (npc.dead) revive(npc)
  })
}

function removeNpc(id) {
  const npc = npcs.get(id)
  if (!npc) return
  freeSlot(npc.kind, npc.index)
  if (npc.splat) scene.remove(npc.splat)
  npcs.delete(id)
}

function updateNpcs(dt, now) {
  Object.keys(KINDS).forEach(kind => nearest[kind] = Infinity)
  const perf = performance.now()
  npcs.forEach(npc => {
    if (npc.predictedAt && perf - npc.predictedAt > 500) unpredict(npc)
    if (!npc.dead) {
      const ahead = Math.min((perf - npc.at) / 1000, 8) * npc.speed
      const gx = npc.tx + Math.sin(npc.th) * ahead, gz = npc.tz + Math.cos(npc.th) * ahead
      const k = Math.min(1, dt * 10)
      npc.x += (gx - npc.x) * k
      npc.z += (gz - npc.z) * k
      npc.heading += Math.atan2(Math.sin(npc.th - npc.heading), Math.cos(npc.th - npc.heading)) * k
      placeNpc(npc, npc.speed ? Math.abs(Math.sin(now / 1000 * 12)) * KINDS[npc.kind].bob : 0)
      if (npc.talking && npc.talking.gain) npc.talking.gain.gain.setTargetAtTime(voiceLevel(npc), audio.currentTime, 0.1)
    }
    if (npc.dead) return
    const distance = Math.hypot(npc.x - state.x, npc.z - state.z)
    nearest[npc.kind] = Math.min(nearest[npc.kind], distance)
    if (!explosion && distance < 1.6) contact(npc, perf)
  })
  sirenLevel(nearest.politie)
}

function contact(npc, perf) {
  sendPos(perf, true)
  if (npc.kind === 'labradoodle' || npc.kind === 'politie') return
  if (describe(npc.kind).reward !== null) { npc.predictedAt = perf; killEffects(npc, describe(npc.kind).reward * (perf < (state.turboUntil || 0) ? 2 : 1)) }
  else explode(describe(npc.kind).label)
}

function unpredict(npc) {
  delete npc.predictedAt
  revive(npc)
}

function revive(npc) {
  npc.dead = false
  if (npc.splat) scene.remove(npc.splat)
  npc.splat = null
  placeNpc(npc, 0)
}
const blood = new THREE.MeshBasicMaterial({ color: 0x7a0c0c, transparent: true, opacity: 0.9 })
blood.userData.outlineParameters = { visible: false }

const slime = new THREE.MeshBasicMaterial({ color: 0x4f8a2a, transparent: true, opacity: 0.85 })
slime.userData.outlineParameters = { visible: false }

function markDead(npc) {
  npc.dead = true
  hush(npc)
  placeNpc(npc, 0)
  if (npc.splat) return
  npc.splat = new THREE.Mesh(new THREE.CircleGeometry(npc.kind === 'dogwalker' ? 1.4 : 1.2, 12).rotateX(-Math.PI / 2), npc.kind === 'zombie' ? slime : blood)
  npc.splat.position.set(npc.x, groundHeight(npc.x, npc.z) + 0.01, npc.z)
  scene.add(npc.splat)
}

function killEffects(npc, reward = describe(npc.kind).reward) {
  markDead(npc)
  const gerard = npc.kind === 'dogwalker', { label } = describe(npc.kind)
  streetEl.textContent = `${label} ${gerard ? 'overreden' : 'geplet'}: +${reward.toLocaleString('nl-NL')} coin`
  thud(gerard ? 1 : 0.8)
  scream(gerard ? 'man' : npc.kind)
  if (gerard) { state.blood = 45; state.bloodAt = [state.x, state.z] }
  dirty(gerard ? 0.2 : 0.12)
  spawnCoin(npc.x, npc.z)
}

const coinsEl = document.getElementById('coins')
const coinFace = new THREE.TextureLoader().load('assets/gcoin.jpg')
coinFace.colorSpace = THREE.SRGBColorSpace
const coinMaterial = [new THREE.MeshStandardMaterial({ color: 0xffc233, metalness: 1, roughness: 0.28 }), new THREE.MeshStandardMaterial({ map: coinFace, color: 0xffd35c, metalness: 0.9, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: coinFace, color: 0xffd35c, metalness: 0.9, roughness: 0.3 })]
const coinGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24).rotateX(Math.PI / 2)
const coins = []
let score = 0

function showScore(value) {
  const bump = value > score
  score = value
  coinsEl.querySelector('span').textContent = score.toLocaleString('nl-NL')
  coinsEl.hidden = score === 0
  if (bump) { coinsEl.classList.remove('bump'); requestAnimationFrame(() => coinsEl.classList.add('bump')) }
  renderPlayers()
}

function spawnCoin(x, z) {
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
  if (townTimer > 0) return
  townTimer = 0.5
  const town = tilesNear(3).flatMap(tile => tile.data.towns).reduce((best, town) => {
    const score = Math.hypot(town.x - state.x, town.z - state.z) / (town.town ? 3 : 1)
    return score < best.score ? { town, score } : best
  }, { town: null, score: 900 }).town
  if (!town || town.name === currentTown) return
  currentTown = town.name
  townSign.textContent = town.name
  townSign.classList.remove('show')
  requestAnimationFrame(() => townSign.classList.add('show'))
}

const rubber = new THREE.MeshBasicMaterial({ color: 0x1c1c1c, transparent: true, opacity: 0.55 })
rubber.userData.outlineParameters = { visible: false }
const skids = []

function skidMarks(now) {
  const braking = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && Math.abs(state.speed) > 3
  while (skids.length && now - skids[0].born > 90000) scene.remove(skids.shift().mesh)
  if (!braking) { state.skidAt = null; return }
  if (state.skidAt && Math.hypot(state.x - state.skidAt[0], state.z - state.skidAt[1]) < 1) return
  state.skidAt = [state.x, state.z]
  for (const side of [-1, 1]) {
    const x = state.x + Math.cos(state.heading) * side * 0.66 - Math.sin(state.heading) * 1.1
    const z = state.z - Math.sin(state.heading) * side * 0.66 - Math.cos(state.heading) * 1.1
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.3).rotateX(-Math.PI / 2), rubber)
    mark.position.set(x, groundHeight(x, z) + 0.02, z)
    mark.rotation.y = state.heading
    scene.add(mark)
    skids.push({ mesh: mark, born: now })
  }
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
    smear.position.set(x, groundHeight(x, z) + 0.012, z)
    smear.rotation.y = state.heading
    scene.add(smear)
  }
}

const poops = new Map()
const poopGeometry = mergeGeometries([
  new THREE.BoxGeometry(0.16, 0.12, 0.16).translate(0.02, 0.06, 0),
  new THREE.BoxGeometry(0.11, 0.1, 0.11).translate(-0.02, 0.16, 0.01)
])
const poopMaterial = solid(0x4a2e12)

function addPoop([id, x, z, born]) {
  if (poops.has(id)) return
  const mesh = new THREE.Mesh(poopGeometry, poopMaterial)
  mesh.position.set(x, groundHeight(x, z), z)
  scene.add(mesh)
  poops.set(id, { x, z, y: mesh.position.y, born: localTime(born), mesh })
}

function removePoop(id) {
  const poop = poops.get(id)
  if (!poop) return
  scene.remove(poop.mesh)
  poops.delete(id)
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
  const hit = [...poops].find(([, poop]) => Math.hypot(poop.x - state.x, poop.z - state.z) < 1.4)
  if (!hit) return
  removePoop(hit[0])
  stepInPoop()
}

function stepInPoop() {
  state.poo = 45
  state.pooAt = [state.x, state.z]
  streetEl.textContent = 'Door de drol gereden: +½ coin'
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
    smear.position.set(x, groundHeight(x, z) + 0.015, z)
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
    ...[...poops.values()].map(poop => ({ x: poop.x, y: poop.y, z: poop.z, radius: Math.min(30, (now - poop.born) / 1000 * 0.4) }))
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
  if (explosion) return
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
  explosion.fallback = setTimeout(respawn, 3500)
}

function respawn() {
  if (!explosion) return
  clearTimeout(explosion.fallback)
  scene.remove(explosion.fireball)
  explosion.debris.forEach(({ mesh }) => {
    car.add(mesh)
    mesh.position.copy(mesh.userData.position)
    mesh.rotation.copy(mesh.userData.rotation)
  })
  explosion = null
  state.speed = 0
  state.shake = 0
  state.dirt = 0
  dirty(0)
  streetEl.textContent = 'Nieuwe Panda'
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

function inside(polygon, x, z) {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j]
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) hit = !hit
  }
  return hit
}

function blocked(x, z) {
  for (const building of grid.get(cellKey(x, z)) || []) if (inside(building.p, x, z)) return true
  return false
}

const segmentGrid = new Map()


function nearestSegment(x, z, reach = 1) {
  let best = null, bestDistance = Infinity, bestT = 0
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    for (const segment of segmentGrid.get(`${cx + dx},${cz + dz}`) || []) {
      const { t, distance } = pointToSegment(x, z, segment.a, segment.b)
      if (distance < bestDistance) { bestDistance = distance; best = segment; bestT = t }
    }
  }
  return { segment: best, distance: bestDistance, t: bestT }
}

function groundHeight(x, z) {
  const { segment, distance, t } = nearestSegment(x, z)
  if (segment && segment.road.elevated && distance < segment.road.w / 2 + 1.5) return segment.a[2] + (segment.b[2] - segment.a[2]) * t
  return terrainHeight(x, z) + surfaceLift(segment && segment.road, distance)
}

function surfaceLift(road, distance) {
  if (!road || !road.asphalt) return 0
  if (distance < road.w / 2) return LIFT.asphalt
  if (road.walkway && distance < road.w / 2 + 1.55) return LIFT.sidewalk
  return 0
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
  const drawnRoads = new Set()
  tilesNear(1).forEach(tile => tile.roads.forEach(road => {
    if (drawnRoads.has(road) || !near(road)) return
    drawnRoads.add(road)
        if (road.kind === 'water') stroke(road, '#4f9fd6', Math.max(road.w, 4))
        else if (road.kind === 'road' && road.w < 5) stroke(road, '#8d9096', 4)
    else if (road.kind === 'road') stroke(road, road.elevated ? '#8a8d90' : '#5a5d63', Math.max(road.w + 2, 6))
  }))
  map.fillStyle = '#6b6259'
  const cx = Math.floor(state.x / CELL), cz = Math.floor(state.z / CELL), reach = Math.ceil(MAP_RADIUS / CELL)
  const drawn = new Set()
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    for (const building of grid.get(`${cx + dx},${cz + dz}`) || []) {
      if (drawn.has(building)) continue
      drawn.add(building)
      map.beginPath()
      building.p.forEach(([x, z], k) => k ? map.lineTo(x, z) : map.moveTo(x, z))
      map.fill()
    }
  }
  npcs.forEach(npc => {
    if (npc.dead || Math.abs(npc.x - state.x) > MAP_RADIUS || Math.abs(npc.z - state.z) > MAP_RADIUS) return
    map.fillStyle = npc.kind === 'beagle' ? '#ff9f1a' : npc.kind === 'labradoodle' ? '#ffe28a' : npc.kind.startsWith('bald') ? '#ff4fd8' : npc.kind === 'speakerboy' ? '#ff2bd6' : npc.kind === 'zombie' ? '#39ff14' : '#4fd2ff'
    map.beginPath()
    map.arc(npc.x, npc.z, 4, 0, Math.PI * 2)
    map.fill()
  })
  map.restore()

  map.save()
  map.translate(size / 2, size / 2)
  map.save()
  map.rotate(mapHeading + Math.PI)
  map.fillStyle = '#e53935'
  map.beginPath()
  map.moveTo(0, -12)
  map.lineTo(8, 10)
  map.lineTo(-8, 10)
  map.closePath()
  map.fill()
  map.restore()
  map.fillStyle = '#fff'
  map.font = 'bold 22px system-ui'
  map.textAlign = 'center'
  map.fillText('N', 0, -size / 2 + 34)
  map.restore()
}

// GAME:

const DEAD = new THREE.Color(0x8a7f66)
const car = buildCar()
buildNpcMeshes()
buildSky()

// SAMPLES (drop mp3/wav files in assets/sounds to replace the synthesized sounds):

const samples = new Map()
const SAMPLE_SETS = { scream: 8, zombie: 5, bark: 2 }
const SAMPLE_OK = {}

function loadSample(name) {
  if (samples.has(name)) return samples.get(name)
  const promise = fetch(`assets/sounds/${name}.mp3`).then(response => response.ok ? response.arrayBuffer() : null)
    .then(data => data && audio ? audio.decodeAudioData(data) : null).then(normalize).catch(() => null)
    .then(buffer => { if (buffer) (SAMPLE_OK[name.replace(/\d+$/, '')] ||= []).push(name); return buffer })
  samples.set(name, promise)
  return promise
}

function normalize(buffer) {
  if (!buffer) return null
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) buffer.getChannelData(c).forEach(v => { peak = Math.max(peak, Math.abs(v)) })
  if (peak > 0 && peak < 0.8) for (let c = 0; c < buffer.numberOfChannels; c++) { const data = buffer.getChannelData(c); for (let i = 0; i < data.length; i++) data[i] *= 0.8 / peak }
  return buffer
}

async function playSample(name, { level = 1, loop = false, out, from = 0, to = 0, rate = 1 } = {}) {
  if (!audio) return null
  const buffer = await loadSample(name)
  if (!buffer) return null
  const source = audio.createBufferSource(), gain = audio.createGain()
  source.buffer = buffer
  source.loop = loop
  source.playbackRate.value = rate
  if (to) { source.loopStart = from; source.loopEnd = to }
  gain.gain.value = level
  source.connect(gain).connect(out || sfx || audio.destination)
  source.start(0, from)
  return { source, gain }
}

const pickSample = set => { const ok = SAMPLE_OK[set]; return ok && ok.length ? ok[Math.floor(random() * ok.length)] : `${set}${1 + Math.floor(random() * SAMPLE_SETS[set])}` }
let introTrack

// METAL INTRO:



async function startMetal() {
  if (metal || loaded) return
  startAudio()
  if (await loadSample('intro')) { metal = audio.createGain(); metal.gain.value = 0.7; metal.connect(audio.destination); introTrack = await playSample('intro', { loop: true, out: metal }); return }
  metal = audio.createGain()
  metal.gain.value = 0.5
  const drive = audio.createWaveShaper()
  const curve = new Float32Array(2048)
  for (let i = 0; i < 2048; i++) curve[i] = Math.tanh((i / 1024 - 1) * 9)
  drive.curve = curve
  const tone = audio.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 2800
  drive.connect(tone).connect(metal).connect(audio.destination)
  metalNext = audio.currentTime + 0.1
  metalTimer = setInterval(() => {
    while (metalNext < audio.currentTime + 0.3) {
      const step = 60 / 140 / 4
      const [note, hit] = RIFF[metalBeat % RIFF.length]
      if (hit) chord(metalNext, note, step * 0.9, drive)
      if (metalBeat % 8 === 0) kick(metalNext, drive)
      if (metalBeat % 8 === 4) snare(metalNext, metal)
      if (metalBeat % 2 === 0) hihat(metalNext, metal)
      metalNext += step
      metalBeat++
    }
  }, 80)
}

function chord(time, frequency, length, out) {
  for (const ratio of [1, 1.5, 2.003]) {
    const osc = audio.createOscillator(), gain = audio.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = frequency * ratio
    gain.gain.setValueAtTime(0.5, time)
    gain.gain.setValueAtTime(0.5, time + length * 0.6)
    gain.gain.exponentialRampToValueAtTime(0.001, time + length)
    osc.connect(gain).connect(out)
    osc.start(time)
    osc.stop(time + length + 0.02)
  }
}

function noiseBurst(time, length, filterType, frequency, level, out) {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain()
  source.buffer = buffer
  filter.type = filterType
  filter.frequency.value = frequency
  gain.gain.value = level
  source.connect(filter).connect(gain).connect(out)
  source.start(time)
}

function snare(time, out) { noiseBurst(time, 0.18, 'bandpass', 1800, 0.7, out) }
function hihat(time, out) { noiseBurst(time, 0.05, 'highpass', 7000, 0.25, out) }

function stopMetal() {
  if (!metal) return
  if (metalTimer) clearInterval(metalTimer)
  if (introTrack) setTimeout(() => introTrack.source.stop(), 2000)
  metal.gain.setTargetAtTime(0, audio.currentTime, 0.4)
  setTimeout(() => metal.disconnect(), 2000)
}



// HARDSTYLE:



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
  playSample('hardstyle', { loop: true, out: hardstyle }).then(track => { hardstyleSampled = !!track })
  nextBeat = audio.currentTime + 0.1
  startSfx()
  setInterval(() => {
    while (!hardstyleSampled && nextBeat < audio.currentTime + 0.3) {
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
  playSample('engine', { loop: true, level: 0 }).then(track => { engineSample = track })
  ;['brake', 'crash', ...Object.entries(SAMPLE_SETS).flatMap(([set, count]) => Array.from({ length: count }, (_, i) => `${set}${i + 1}`))].forEach(loadSample)
}

let wasGas = false, blipUntil = 0, screech = null

function updateEngine() {
  if (!engine) return
  const speed = Math.abs(state.speed)
  const gear = Math.floor(speed / 9)
  const revs = (speed - gear * 9) / 9
  const gas = keys.has('ArrowUp') || keys.has('KeyW')
  if (wasGas && !gas && speed > 6 && random() < 0.35) blipUntil = audio.currentTime + 0.35
  wasGas = gas
  const blip = audio.currentTime < blipUntil ? 60 : 0
  if (engineSample) {
    engineSample.source.playbackRate.setTargetAtTime(0.75 + revs * 1.1 + gear * 0.08 + (blip ? 0.45 : 0) + (performance.now() < (state.turboUntil || 0) ? 0.5 : 0), audio.currentTime, 0.08)
    engineSample.gain.gain.setTargetAtTime(0.3 + revs * 0.4 + (gas || blip ? 0.2 : 0), audio.currentTime, 0.1)
    engineGain.gain.value = 0
  } else {
    engine.frequency.setTargetAtTime(45 + revs * 70 + gear * 8 + blip, audio.currentTime, 0.05)
    engineGain.gain.setTargetAtTime(0.05 + revs * 0.07 + (gas || blip ? 0.04 : 0), audio.currentTime, 0.1)
  }
  const braking = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && speed > 3
  if (braking && !screech) {
    const current = screech = { gain: audio.createGain(), voices: [], stop: () => {} }
    playSample('brake', { loop: true, level: 0.2, from: 3, to: 14 }).then(track => {
      if (!track) { if (screech === current) { screech = null; synthSqueal() }; return }
      current.sampled = track
      current.stop = () => track.source.stop()
      if (screech !== current) current.stop()
    })
    return
  }
  function synthSqueal() {
    const time = audio.currentTime
    const gain = audio.createGain(), tone = audio.createBiquadFilter(), wobble = audio.createOscillator(), depth = audio.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    tone.type = 'lowpass'
    tone.frequency.value = 4200
    tone.Q.value = 1.5
    wobble.frequency.value = 9
    depth.gain.value = 110
    wobble.connect(depth)
    const voices = [1850, 2790].map(frequency => {
      const osc = audio.createOscillator(), level = audio.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = frequency
      depth.connect(osc.frequency)
      level.gain.value = frequency > 2000 ? 0.35 : 0.6
      osc.connect(level).connect(tone)
      osc.start(time)
      return osc
    })
    const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = audio.createBufferSource(), hiss = audio.createBiquadFilter(), hissLevel = audio.createGain()
    noise.buffer = buffer
    noise.loop = true
    hiss.type = 'bandpass'
    hiss.frequency.value = 3200
    hiss.Q.value = 3
    hissLevel.gain.value = 0.12
    noise.connect(hiss).connect(hissLevel).connect(tone)
    noise.start(time)
    wobble.start(time)
    tone.connect(gain).connect(sfx)
    screech = { stop: () => { voices.forEach(v => v.stop()); noise.stop(); wobble.stop() }, gain, voices }
  }
  if (screech) {
    const level = braking ? Math.min(0.4, 0.12 + speed / 60) : 0
    ;(screech.sampled ? screech.sampled.gain : screech.gain).gain.setTargetAtTime(level, audio.currentTime, braking ? 0.06 : 0.1)
    screech.voices.forEach((osc, i) => osc.frequency.setTargetAtTime((i ? 2790 : 1850) * (1 + (30 - Math.min(speed, 30)) / 120), audio.currentTime, 0.1))
    if (!braking) {
      const old = screech
      setTimeout(() => old.stop(), 500)
      screech = null
    }
  }
}

function scream(kind) {
  if (!sfx) return
  playSample(pickSample(kind === 'zombie' ? 'zombie' : 'scream'), { level: 0.65 + random() * 0.45, rate: 0.82 + random() * 0.36 }).then(track => { if (!track) synthScream(kind) })
}

function synthScream(kind) {
  const time = audio.currentTime
  const variants = [[520, 260, 0.7], [680, 300, 0.55], [430, 180, 0.9], [760, 420, 0.4]]
  const [start, end, length] = variants[Math.floor(random() * variants.length)]
  const pitch = kind === 'zombie' ? 0.5 : 1
  const osc = audio.createOscillator(), vibrato = audio.createOscillator(), depth = audio.createGain(), formant = audio.createBiquadFilter(), gain = audio.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(start * pitch, time)
  osc.frequency.exponentialRampToValueAtTime(end * pitch, time + length)
  vibrato.frequency.value = 7
  depth.gain.value = 25
  vibrato.connect(depth).connect(osc.frequency)
  formant.type = 'bandpass'
  formant.frequency.setValueAtTime(1100 * pitch, time)
  formant.frequency.linearRampToValueAtTime(700 * pitch, time + length)
  formant.Q.value = 2
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.7, time + 0.05)
  gain.gain.setValueAtTime(0.7, time + length * 0.6)
  gain.gain.exponentialRampToValueAtTime(0.001, time + length)
  osc.connect(formant).connect(gain).connect(sfx)
  osc.start(time)
  vibrato.start(time)
  osc.stop(time + length + 0.05)
  vibrato.stop(time + length + 0.05)
}

let groanTimer = 0
function updateGroans(dt) {
  if (!sfx) return
  groanTimer -= dt
  if (groanTimer > 0) return
  groanTimer = 1.2 + random() * 2
  if (nearest.zombie > 45) return
  const level = Math.max(0, 1 - nearest.zombie / 45) * 0.5
  const time = audio.currentTime, osc = audio.createOscillator(), wobble = audio.createOscillator(), depth = audio.createGain(), filter = audio.createBiquadFilter(), gain = audio.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(70 + random() * 30, time)
  osc.frequency.linearRampToValueAtTime(55, time + 1.4)
  wobble.frequency.value = 5
  depth.gain.value = 8
  wobble.connect(depth).connect(osc.frequency)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(400, time)
  filter.frequency.linearRampToValueAtTime(900, time + 0.7)
  filter.frequency.linearRampToValueAtTime(300, time + 1.4)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(level, time + 0.3)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5)
  osc.connect(filter).connect(gain).connect(sfx)
  osc.start(time)
  wobble.start(time)
  osc.stop(time + 1.6)
  wobble.stop(time + 1.6)
}

function thud(strength = 1) {
  if (!sfx) return
  playSample('crash', { level: strength * 0.7 }).then(track => { if (!track) synthThud(strength) })
}

function synthThud(strength = 1) {
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
  playSample(pickSample('bark'), { level: Math.max(0, 1 - distance / 60) }).then(track => { if (!track) synthBark(distance) })
}

function synthBark(distance) {
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


async function speak(npc, index) {
  const gender = npc.voice & 2 ? 'female' : 'male', mood = npc.voice & 1 ? 'happy' : 'angry'
  const lines = describe(npc.kind).lines[mood] || []
  if (!lines[index]) return
  hush(npc)
  const track = await playSample(`voice-${npc.kind}-${gender}-${mood}-${index + 1}`, { level: voiceLevel(npc) })
  if (npc.dead) return track && track.source.stop()
  if (track) {
    npc.talking = track
    track.source.onended = () => { if (npc.talking === track) npc.talking = null }
    return
  }
  if (!('speechSynthesis' in window)) return
  const line = new SpeechSynthesisUtterance(lines[index])
  npc.talking = line
  line.onend = () => { if (npc.talking === line) npc.talking = null }
  line.lang = 'nl-NL'
  line.rate = mood === 'angry' ? 1.2 + Math.random() * 0.15 : 1
  line.pitch = (gender === 'female' ? 1.3 : npc.kind === 'speakerboy' ? 1.6 : 0.7) + (mood === 'happy' ? 0.2 : 0)
  line.volume = Math.min(1, voiceLevel(npc))
  const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('nl'))
  if (voice) line.voice = voice
  speechSynthesis.speak(line)
}

const voiceLevel = npc => Math.max(0, 1 - Math.hypot(npc.x - state.x, npc.z - state.z) / describe(npc.kind).range) ** 2 * 1.4

function hush(npc) {
  const talking = npc.talking
  npc.talking = null
  if (!talking) return
  if (talking.source) talking.source.stop()
  else speechSynthesis.cancel()
}

function updateHardstyle() {
  if (!hardstyle) return
  const level = Math.max(0, 1 - nearest.speakerboy / 80) ** 2 * 0.45
  hardstyle.gain.setTargetAtTime(level, audio.currentTime, 0.2)
}

addEventListener('keydown', startAudio, { once: true })

// BIG MAP:

const bigmap = document.getElementById('bigmap')

function tileImage(tile) {
  if (tile.mapImage) return tile.mapImage
  const size = 256, scale = size / TILE
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = tile.status === 'empty' ? '#c9d3e6' : '#dfe9cf'
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(-tile.tx * TILE, -tile.tz * TILE)
  ctx.lineCap = ctx.lineJoin = 'round'
  const stroke = (road, color, width) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    road.p.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z))
    ctx.stroke()
  }
  tile.data.areas.forEach(area => {
    if (area.kind !== 'water' && area.kind !== 'forest') return
    ctx.fillStyle = area.kind === 'water' ? '#6fb3e0' : '#b9d3a0'
    ctx.beginPath()
    area.p.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z))
    ctx.fill()
  })
  ctx.fillStyle = '#8a8378'
  tile.buildings.forEach(building => { const [x, z] = building.p[0]; ctx.fillRect(x - 4, z - 4, 8, 8) })
  tile.roads.forEach(road => {
    if (road.kind === 'water') stroke(road, '#6fb3e0', Math.max(road.w, 8))
    else if (road.kind === 'rail') stroke(road, '#3a3a3a', 5)
    else if (road.kind === 'road') stroke(road, road.w >= 9 ? '#4a4d55' : '#6b6e75', Math.max(road.w, 8))
  })
  ctx.restore()
  tile.mapImage = canvas
  return canvas
}

function drawBigMap() {
  if (bigmap.hidden) return
  const ctx = bigmap.getContext('2d')
  const size = Math.min(innerWidth, innerHeight) - 40
  bigmap.width = bigmap.height = size
  const span = 5 * TILE, factor = size / span, ox = state.x - span / 2, oz = state.z - span / 2
  ctx.fillStyle = '#c9d3e6'
  ctx.fillRect(0, 0, size, size)
  tiles.forEach(tile => {
    if (!tile.data) return
    const px = (tile.tx * TILE - ox) * factor, pz = (tile.tz * TILE - oz) * factor
    if (px > size || pz > size || px + TILE * factor < 0 || pz + TILE * factor < 0) return
    ctx.drawImage(tileImage(tile), px, pz, TILE * factor, TILE * factor)
  })
  const dot = (x, z, color, radius, label) => {
    const px = (x - ox) * factor, pz = (z - oz) * factor
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, pz, radius, 0, Math.PI * 2)
    ctx.fill()
    if (label) { ctx.fillStyle = '#111'; ctx.font = 'bold 13px system-ui'; ctx.fillText(label, px + 8, pz + 4) }
  }
  tilesNear(3).flatMap(tile => tile.data.places).forEach(place => dot(place.x, place.z, '#ffffffaa', 3))
  others.forEach(other => dot(other.group.position.x, other.group.position.z, '#2f7cff', 6, other.name))
  dot(state.x, state.z, '#e53935', 7, myName())
}

function toggleBigMap(open = bigmap.hidden) {
  bigmap.hidden = !open
  keys.clear()
  drawBigMap()
}

// MULTIPLAYER:

const nameInput = document.getElementById('player-name')
const playersEl = document.getElementById('players')
const others = new Map()
const hintEl = document.getElementById('hint'), HINT = hintEl.textContent
let socket, lastSent = 0, myId = null, serverOffset = 0, KIND_NAMES = Object.keys(KINDS)
const myName = () => (nameInput.value || '').trim().slice(0, 16) || 'Panda'
const localTime = serverTime => (serverTime - serverOffset) * 1000
nameInput.addEventListener('keydown', event => { if (event.code === 'Enter' || event.code === 'Escape') nameInput.blur(); event.stopPropagation() })
nameInput.addEventListener('change', () => { localStorage.setItem('playerName', myName()); send({ name: myName() }); renderPlayers() })

function nameLabel(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 8, 256, 48)
  ctx.fillStyle = '#fff'
  ctx.fillText(text, 128, 44)
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.material.userData.outlineParameters = { visible: false }
  sprite.scale.set(4, 1, 1)
  sprite.position.y = 2.6
  return sprite
}

function send(message) {
  if (socket && socket.readyState === 1) socket.send(JSON.stringify(message))
}

function connect() {
  return new Promise(resolve => {
    const attempt = () => {
      socket = new WebSocket(`ws://${location.host}`)
      socket.onopen = () => send({ join: { name: myName(), world: 'limburg' } })
      socket.onmessage = ({ data }) => {
        const message = JSON.parse(data)
        if (message.welcome) { welcome(message.welcome); resolve() }
        else if (message.error) console.error(`server: ${message.error}`)
        else applyFrame(message)
      }
      socket.onclose = () => { socket = null; resetWorld(); hintEl.textContent = 'Verbinding met server verbroken, opnieuw verbinden…'; setTimeout(attempt, 2000) }
      socket.onerror = () => socket && socket.close()
    }
    attempt()
  })
}

function welcome(data) {
  myId = data.id
  serverOffset = data.t - performance.now() / 1000
  KIND_NAMES = data.kinds
  NPC_INFO = data.npcs
  if (data.tileSize) { TILE = data.tileSize; TILE_VERSION = data.tileVersion; ORIGIN = data.origin; START = { x: data.start.x, z: data.start.z, heading: data.start.heading } }
  showScore(data.score)
  if (!loaded) pendingPoops = data.poops
  else data.poops.forEach(addPoop)
  hintEl.textContent = HINT
}

function resetWorld() {
  ;[...npcs.keys()].forEach(removeNpc)
  ;[...poops.keys()].forEach(removePoop)
  others.forEach(other => scene.remove(other.group))
  others.clear()
  renderPlayers()
}

function applyFrame(frame) {
  if (frame.npcs || frame.gone) applySnapshot(frame)
  if (frame.players) applyPlayers(frame.players)
  ;(frame.events || []).forEach(([type, ...args]) => EVENTS[type]?.(...args))
}

function applyPlayers(rows) {
  const seen = new Set()
  let changed = false
  rows.forEach(([id, name, x, z, heading, speed, playerScore]) => {
    seen.add(id)
    if (id === myId) { if (playerScore !== score) showScore(playerScore); return }
    let other = others.get(id)
    if (!other) {
      const hue = [...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360
      const group = pandaModel(new THREE.Color().setHSL(hue / 360, 0.6, 0.55).getHex())
      const label = nameLabel(name)
      group.add(label)
      group.position.set(x, groundHeight(x, z), z)
      scene.add(group)
      other = { group, label, name, score: playerScore, target: { x, z, heading }, flame: turboFlame(group) }
      others.set(id, other)
      changed = true
    }
    if (other.name !== name) { other.group.remove(other.label); other.label = nameLabel(name); other.group.add(other.label) }
    if (other.name !== name || other.score !== playerScore) { other.name = name; other.score = playerScore; changed = true }
    other.target = { x, z, heading }
    other.speed = speed
  })
  others.forEach((other, id) => { if (!seen.has(id)) { scene.remove(other.group); others.delete(id); changed = true } })
  if (changed) renderPlayers()
}

const EVENTS = {
  kill(id, by, reward) {
    const npc = npcs.get(id)
    if (!npc) return
    if (by !== myId) markDead(npc)
    else if (npc.predictedAt) delete npc.predictedAt
    else killEffects(npc, reward)
  },
  combo(id, by, stage, amount) {
    if (by !== myId) return
    state.blood = 45
    state.bloodAt = [state.x, state.z]
    streetEl.textContent = `${stage === 1 ? 'Achteruit over de uitlater' : 'En nog eens vooruit'}: +${amount.toLocaleString('nl-NL')} coin`
  },
  boom(player, id) {
    if (player !== myId) return
    explode(describe(npcs.get(id)?.kind).label)
    explosion.confirmed = true
  },
  respawn(player) { if (player === myId) respawn() },
  turbo(player, level) { const other = others.get(player); if (other) { other.turboUntil = performance.now() + 5000; other.nitro = level === 2 } },
  gone(id) { removeNpc(id) },
  wanted(player, level) {
    if (player === myId) { wanted = level; wantedEl.hidden = !level; wantedEl.textContent = level ? '★ GEZOCHT' : '' }
    else { const other = others.get(player); if (other) other.wanted = level }
    renderPlayers()
  },
  arrest(player) { if (player === myId) arrested() },
  attack(player) { if (player === myId) attacked() },
  score(player, value) { if (player === myId) showScore(value) },
  poop(...row) { addPoop(row) },
  unpoop(id, by) {
    if (by === myId && poops.has(id)) stepInPoop()
    removePoop(id)
  },
  say(id, index) {
    const npc = npcs.get(id)
    if (!npc || npc.dead || Math.hypot(npc.x - state.x, npc.z - state.z) > describe(npc.kind).range) return
    speak(npc, index)
  },
  bark(id) {
    const npc = npcs.get(id)
    if (npc) bark(Math.hypot(npc.x - state.x, npc.z - state.z))
  }
}

function renderPlayers() {
  const row = (name, score, me, hot) => `<div${me ? ' class="me" title="Klik om je naam te wijzigen"' : ''}>${hot ? '<b class="star">★</b> ' : ''}${name}${score ? ` <small>${score.toLocaleString('nl-NL')} coins</small>` : ''}</div>`
  playersEl.innerHTML = row(myName(), score, true, wanted) + [...others.values()].sort((a, b) => b.score - a.score).map(other => row(other.name, other.score, false, other.wanted)).join('')
}

const wantedEl = document.getElementById('wanted')
let wanted = 0, siren = null

function attacked() {
  state.shake = 2.2
  streetEl.textContent = 'Gerard slaat op je Panda: -1 coin'
  thud(0.9)
  dirty(0.08)
}

function arrested() {
  state.heldUntil = performance.now() + 2500
  state.speed = 0
  state.shake = 1.5
  streetEl.textContent = 'OPGEPAKT: de helft van je coins kwijt'
  thud(0.6)
}

function sirenLevel(distance) {
  if (!sfx) return
  const level = distance < Infinity ? Math.max(0, 1 - distance / 260) ** 2 * 0.3 : 0
  if (!siren) {
    if (!level) return
    const osc = audio.createOscillator(), gain = audio.createGain()
    osc.type = 'triangle'
    gain.gain.value = 0
    osc.connect(gain).connect(sfx)
    osc.start()
    siren = { osc, gain, phase: 0 }
  }
  const phase = Math.floor(performance.now() / 450) % 2
  if (phase !== siren.phase) { siren.phase = phase; siren.osc.frequency.setTargetAtTime(phase ? 930 : 690, audio.currentTime, 0.04) }
  siren.gain.gain.setTargetAtTime(level, audio.currentTime, 0.15)
}

playersEl.addEventListener('click', event => {
  if (!event.target.closest('.me')) return
  const name = prompt('Je naam', myName())
  if (name === null) return
  nameInput.value = name.trim().slice(0, 16) || 'Panda'
  localStorage.setItem('playerName', myName())
  send({ name: myName() })
  renderPlayers()
})

function sendPos(now, force = false) {
  if (!force && now - lastSent < 100) return
  lastSent = now
  send({ pos: [+state.x.toFixed(2), +state.z.toFixed(2), +state.heading.toFixed(3), +state.speed.toFixed(1)] })
}

function updateMultiplayer(dt, now) {
  sendPos(now)
  others.forEach(other => {
    const { group, target } = other
    group.position.x += (target.x - group.position.x) * Math.min(1, dt * 8)
    group.position.z += (target.z - group.position.z) * Math.min(1, dt * 8)
    group.position.y = groundHeight(group.position.x, group.position.z)
      const turn = Math.atan2(Math.sin(target.heading - group.rotation.y), Math.cos(target.heading - group.rotation.y))
      group.rotation.y += turn * Math.min(1, dt * 8)
      const size = Math.max(1, Math.hypot(group.position.x - state.x, group.position.z - state.z) / 30)
      other.label.scale.set(4 * size, size, 1)
      other.label.position.y = 2.6 + (size - 1) * 1.2
      setFlame(other.flame, now < (other.turboUntil || 0), other.nitro)
    })
}

// FAST TRAVEL:

const travel = document.getElementById('travel')
const travelList = document.getElementById('travel-list')

let farPlaces = []

function renderTravel() {
  const towns = new Map(), seen = new Set()
  ;[...tilesNear(3).flatMap(tile => tile.data.places), ...farPlaces].filter(place => !seen.has(place.name) && seen.add(place.name)).forEach(place => {
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
  if (!open) return
  renderTravel()
  fetch('places.json', { cache: 'no-store' }).then(response => response.json()).then(places => { farPlaces = places; if (!travel.hidden) renderTravel() }).catch(() => {})
}

async function travelTo(name) {
  if (!farPlaces.length) farPlaces = await fetch('places.json', { cache: 'no-store' }).then(response => response.json()).catch(() => [])
  const place = [...tilesNear(3).flatMap(tile => tile.data.places), ...farPlaces].find(place => place.name === name)
  if (!place) return
  state.x = place.x
  state.z = place.z
  state.speed = 0
  state.travel = { ...place, since: performance.now() }
  loadingPhase.textContent = `Reizen naar ${place.name}…`
  loadingBar.style.width = '10%'
  document.getElementById('loading-name').hidden = true
  loadingEl.classList.remove('done')
  sendPos(performance.now(), true)
  streamTiles()
  toggleTravel(false)
}

function arrive() {
  const here = tileAt(state.x, state.z)
  loadingBar.style.width = `${!here ? 15 : here.status === 'fetching' ? 25 : here.status === 'data' ? 45 : here.built.prepare ? 90 : 70}%`
  if (!here || here.status !== 'ready' || !here.built.prepare || performance.now() - state.travel.since < 1500) return
  const cellKeyHere = subKey(state.x, state.z), asphalt = asphaltCells.get(cellKeyHere)
  if (roadCells.has(cellKeyHere) && !(asphalt && asphalt.meshes.length) && performance.now() - state.travel.since < 20000) return
  const { segment, distance, t } = nearestSegment(state.x, state.z, 6)
  if (segment && distance < 250) {
    state.x = segment.a[0] + (segment.b[0] - segment.a[0]) * t
    state.z = segment.a[1] + (segment.b[1] - segment.a[1]) * t
    state.heading = Math.atan2(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1])
  }
  if (blocked(state.x, state.z)) {
    const spot = [4, 8, 12, 18, 26, 36].flatMap(radius => Array.from({ length: 12 }, (_, k) => [state.x + Math.cos(k / 12 * Math.PI * 2) * radius, state.z + Math.sin(k / 12 * Math.PI * 2) * radius])).find(([x, z]) => !blocked(x, z))
    if (spot) [state.x, state.z] = spot
  }
  if (blocked(state.x - Math.sin(state.heading) * 9, state.z - Math.cos(state.heading) * 9)) state.heading += Math.PI
  camera.position.set(state.x - Math.sin(state.heading) * 9, groundHeight(state.x, state.z) + 4.5, state.z - Math.cos(state.heading) * 9)
  state.travel = null
  loadingBar.style.width = '100%'
  loadingEl.classList.add('done')
  hintEl.textContent = HINT
  loadingHint = false
  streetEl.textContent = 'Aangekomen'
}


travelList.addEventListener('click', event => { const item = event.target.closest('li'); if (item) travelTo(item.dataset.name) })

const keys = new Set()
window.debug = { keys, npcs, poops, others, detailTiles, tiles, jobs, slowSteps, slowFrames, asphaltCells, roadsById, signSlots, seams, tileAt, evictTile, streamTiles, travelTo, camera, scene, MATERIALS, respawn, unstick, applySnapshot, applyFrame, EVENTS, get socket() { return socket }, get myId() { return myId }, get engineSample() { return engineSample }, get screech() { return screech }, get hardstyleSampled() { return hardstyleSampled }, get explosion() { return explosion }, get audio() { return audio }, get metal() { return metal }, get state() { return state } }
addEventListener('keydown', event => {
  if (event.code === 'Escape' && !travel.hidden) return toggleTravel(false)
  if (event.code === 'Escape' && !/INPUT|TEXTAREA/.test(event.target.tagName)) return toggleBigMap()
  if (!bigmap.hidden) return
  if (event.code === 'KeyT' && !/INPUT|TEXTAREA/.test(event.target.tagName)) return toggleTravel()
  if (!travel.hidden) return
  if (event.code === 'KeyE' && !event.repeat && !/INPUT|TEXTAREA/.test(event.target.tagName)) return startTurbo()
  keys.add(event.code)
  if (event.code.startsWith('Arrow')) event.preventDefault()
})
addEventListener('keyup', event => keys.delete(event.code))

function startTurbo() {
  const now = performance.now(), turbo = now < (state.turboUntil || 0)
  if (explosion || (turbo && state.nitro) || (!turbo && now < (state.turboReadyAt || 0))) return
  if (score < 5) { streetEl.textContent = `${turbo ? 'Nitro' : 'Turbo'} kost 5 coins`; return }
  state.nitro = turbo
  state.turboUntil = now + 5000
  state.turboReadyAt = now + 15000
  shout(turbo ? 'Nitro!' : 'Turbo!')
  streetEl.textContent = `${turbo ? 'NITRO' : 'TURBO'}! Dubbele punten (-5 coins)`
  thud(turbo ? 0.7 : 0.4)
  send({ turbo: true })
}

const shoutEl = document.getElementById('shout')

function shout(text) {
  shoutEl.textContent = text
  shoutEl.classList.remove('show')
  requestAnimationFrame(() => shoutEl.classList.add('show'))
}

function setFlame(group, on, nitro) {
  group.visible = on
  if (!on) return
  group.children.forEach((cone, i) => {
    cone.visible = nitro || i === 0
    cone.material.color.setHex(nitro ? 0x47b6ff : 0xff8a1a)
    cone.scale.set(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6, (nitro ? 1.1 : 0.6) + Math.random() * 0.9)
  })
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const state = { x: 0, z: 0, heading: 0, speed: 0, steer: 0, shake: 0, drunk: 0 }
const speedEl = document.getElementById('speed')
const streetEl = document.getElementById('street')
let last = performance.now()
let streetTimer = 0

function unstick() {
  const { segment, distance, t } = nearestSegment(state.x, state.z, 3)
  if (!segment || distance > 150) return
  state.x = segment.a[0] + (segment.b[0] - segment.a[0]) * t
  state.z = segment.a[1] + (segment.b[1] - segment.a[1]) * t
  state.heading = Math.atan2(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1])
  state.speed = 0
  state.stuck = 0
  streetEl.textContent = 'Losgetrokken'
}

function carDiscs(x, z, heading) {
  return [-0.95, 0.95].map(offset => [x + Math.sin(heading) * offset, z + Math.cos(heading) * offset])
}

function bumpCars() {
  const mine = carDiscs(state.x, state.z, state.heading)
  others.forEach(other => {
    if (Math.hypot(state.x - other.group.position.x, state.z - other.group.position.z) > 6) return
    const theirs = carDiscs(other.group.position.x, other.group.position.z, other.group.rotation.y)
    let hit = null
    for (const a of mine) for (const b of theirs) {
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (distance < 2.1 && distance > 0 && (!hit || distance < hit.distance)) hit = { distance, dx: (a[0] - b[0]) / distance, dz: (a[1] - b[1]) / distance }
    }
    if (!hit) return
    const push = (2.1 - hit.distance) / 2 + 0.05
    state.x += hit.dx * push
    state.z += hit.dz * push
    if (Math.abs(state.speed) > 2) { thud(Math.min(1, Math.abs(state.speed) / 15)); state.shake = 0.6 }
    state.speed = state.speed * 0.5 + (other.speed || 0) * 0.3
  })
}

function suspend(current, target, dt, snap = Infinity) {
  const k = Math.min(1, dt * 6)
  if (Array.isArray(target)) return current ? target.map((value, i) => current[i] + (value - current[i]) * k) : target
  if (current === undefined || Math.abs(target - current) > snap) return target
  return current + (target - current) * k
}

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
  if (now < (state.heldUntil || 0)) {
    state.speed = 0
    updateNpcs(dt, now)
    updateMultiplayer(dt, now)
    return
  }

  const gas = keys.has('ArrowUp') || keys.has('KeyW')
  const brake = keys.has('ArrowDown') || keys.has('KeyS')
  const handbrake = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const wanted = (keys.has('ArrowRight') || keys.has('KeyD')) - (keys.has('ArrowLeft') || keys.has('KeyA'))
  state.steer += (wanted - state.steer) * Math.min(1, dt * (wanted ? 4 : 8))

  const speed = Math.abs(state.speed)
  const turbo = now < (state.turboUntil || 0), top = PANDA.topSpeed * (turbo ? (state.nitro ? 1.7 : 1.35) : 1)
  if (gas && state.speed >= 0) state.speed = Math.min(state.speed + PANDA.acceleration * (turbo ? (state.nitro ? 3.6 : 2.6) : 1) * (1 - speed / top) * dt, top)
  else if (gas) state.speed = Math.min(state.speed + PANDA.braking * dt, 0)
  else if (brake && state.speed > 0) state.speed = Math.max(state.speed - PANDA.braking * dt, 0)
  else if (brake) state.speed = Math.max(state.speed - PANDA.acceleration * 0.5 * dt, -PANDA.reverseSpeed)
  else state.speed -= Math.sign(state.speed) * Math.min(speed, (0.6 + speed * 0.04) * dt)
  if (handbrake) state.speed -= Math.sign(state.speed) * Math.min(speed, 16 * dt)
  const lit = brake || handbrake || state.speed < -0.5
  if (lit !== state.lit) { state.lit = lit; brakeLights.forEach(mesh => { mesh.material.color.setHex(lit ? 0xff3b30 : 0xc8281e); mesh.material.emissive.setHex(lit ? 0xc81a10 : 0x000000) }) }
  if (flame) setFlame(flame, turbo && gas, state.nitro)
  if (turbo && !state.turboNoted) { state.turboNoted = true } else if (!turbo && state.turboNoted) { state.turboNoted = false; state.nitro = false; streetEl.textContent = 'Turbo op' }

  const yawRate = Math.min(speed * Math.tan(PANDA.steeringLock) / PANDA.wheelbase, PANDA.grip / Math.max(speed, 0.1))
  state.heading -= state.steer * yawRate * Math.sign(state.speed) * dt
  state.heading += Math.sin(now * 0.0021) * 0.5 * state.drunk * Math.min(1, speed / 5) * dt

  const x = state.x + Math.sin(state.heading) * state.speed * dt
  const z = state.z + Math.cos(state.heading) * state.speed * dt
  const free = (px, pz) => !corners(px, pz, state.heading).some(([cx, cz]) => blocked(cx, cz) || tileAt(cx, cz)?.status === 'empty')

  if (free(x, z)) {
    state.x = x
    state.z = z
    state.stuck = 0
  } else if ([0.35, -0.35, 0.7, -0.7, 1.05, -1.05].some(turn => {
    const angle = state.heading + turn, move = state.speed * dt * Math.cos(turn)
    const sx = state.x + Math.sin(angle) * move, sz = state.z + Math.cos(angle) * move
    if (!free(sx, sz)) return false
    state.x = sx
    state.z = sz
    return true
  })) {
    state.speed *= 1 - Math.min(1, 1.5 * dt)
    state.stuck = 0
  } else {
    if (Math.abs(state.speed) > 2) thud(Math.min(1, Math.abs(state.speed) / 15))
    state.shake = Math.min(Math.abs(state.speed) / 10, 1)
    const back = -Math.sign(state.speed || 1) * 0.25
    if (free(state.x + Math.sin(state.heading) * back, state.z + Math.cos(state.heading) * back)) {
      state.x += Math.sin(state.heading) * back
      state.z += Math.cos(state.heading) * back
    }
    state.speed *= -0.35
    state.stuck = (state.stuck || 0) + dt
    if (state.stuck > 2) unstick()
  }
  bumpCars()

  const fx = Math.sin(state.heading), fz = Math.cos(state.heading)
  const y = groundHeight(state.x, state.z)
  const pitch = Math.atan2(groundHeight(state.x + fx * 1.7, state.z + fz * 1.7) - groundHeight(state.x - fx * 1.7, state.z - fz * 1.7), 3.4)
  const roll = Math.atan2(groundHeight(state.x - fz * 0.75, state.z + fx * 0.75) - groundHeight(state.x + fz * 0.75, state.z - fx * 0.75), 1.5)
  const ride = suspend(state.ride, y, dt, 2), lean = suspend(state.lean, [pitch, roll], dt)
  state.ride = ride
  state.lean = lean
  car.position.set(state.x, ride, state.z)
  wheelSpin += state.speed * dt / 0.28
  wheels.forEach(({ wheel, front }) => wheel.rotation.set(wheelSpin, front ? -state.steer * 0.45 : 0, 0))
  car.rotation.set(-lean[0], state.heading, -lean[1] + state.steer * -0.04 * Math.tanh(state.speed / 10))

  let distance = 9 + Math.abs(state.speed) * 0.15, pull = 1
  while (pull > 0.3 && blocked(state.x - fx * distance * pull, state.z - fz * distance * pull)) pull -= 0.1
  distance *= pull
  state.camY = suspend(state.camY, ride, dt * 0.4, 3)
  const target = new THREE.Vector3(state.x - fx * distance, state.camY + 4.5 + (1 - pull) * 4, state.z - fz * distance)
  camera.position.lerp(target, 1 - Math.exp(-dt * 4))
  camera.position.y = Math.max(camera.position.y, terrainHeight(camera.position.x, camera.position.z) + 1.5) + (Math.random() - 0.5) * state.shake
  camera.lookAt(state.x, state.camY + 1.2, state.z)
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
  streamTimer -= dt
  if (streamTimer <= 0) { streamTimer = 0.25; const t = performance.now(); streamTiles(); if (performance.now() - t > 12) slowSteps.push(['stream', Math.round(performance.now() - t), '']) }
  const marks = [performance.now()]
  pump(5)
  marks.push(performance.now())
  collectGarbage(12)
  marks.push(performance.now())
  uploadSigns(now)
  marks.push(performance.now())
  streamAsphalt()
  streamDetails()
  marks.push(performance.now())
  lastStepNote = marks.slice(1).map((m, i) => Math.round(m - marks[i])).join('/')
  if (state.travel) arrive()
  const here = tileAt(state.x, state.z)
  const waiting = !here || here.status === 'fetching' || here.status === 'data' || here.status === 'failed' || state.travel
  if (waiting) state.speed *= Math.max(0, 1 - 4 * dt)
  if (waiting || (here && here.status === 'empty' && state.stuck > 0.3)) { hintEl.textContent = waiting ? 'Wereld laden…' : 'Hier eindigt Limburg'; loadingHint = true }
  else if (loadingHint) { hintEl.textContent = HINT; loadingHint = false }
  updateNpcs(dt, now)
  pickUpPoop()
  pooTrail(now)
  updateInfection(now)
  updatePuffs(dt, now)
  updateHardstyle()
  updateMultiplayer(dt, now)
  if (!bigmap.hidden && Math.floor(now / 250) !== Math.floor((now - dt * 1000) / 250)) drawBigMap()
  updateEngine()
  updateGroans(dt)
  bloodTrail()
  skidMarks(now)
  updateCoins(dt)
      updateTown(dt)
    drawMinimap(dt)
  }

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
  const t0 = performance.now()
  step(dt, now)
  const t1 = performance.now()
  effect.render(scene, camera)
  const t2 = performance.now()
  if (t2 - t0 > 30) slowFrames.push([Math.round(t1 - t0), Math.round(t2 - t1), lastStepNote])
  if (now > snapshotAt && Math.abs(state.speed) > 5) { snapshotAt = now + 45000; snapshot() }
  requestAnimationFrame(frame)
}

await phase('server', connect)
Object.assign(state, START)
await phase('fetch', () => loadTilesAround(state.x, state.z))
await phase('terrain', () => pumpFor(['terrain', 'prepare'], 1))
await phase('ground', () => pumpFor(['ground'], 1))
await phase('roads', () => pumpFor(['roads'], 0))
await phase('buildings', () => pumpFor(['buildings'], 0))
await phase('trees', () => pumpFor(['trees', 'trains'], 0))
await phase('asphalt', () => awaitAsphalt(1))
await phase('details', buildDetailsHere)
if (corners(state.x, state.z, state.heading).some(([cx, cz]) => blocked(cx, cz))) unstick()
pendingPoops.forEach(addPoop)
pendingPoops = []
camera.position.set(state.x - Math.sin(state.heading) * 9, groundHeight(state.x, state.z) + 4.5, state.z - Math.cos(state.heading) * 9)
console.info(`ready: ${Math.round(performance.now())} ms, seams ${seams().toFixed(3)} m`)
clearInterval(slideTimer)
stopMetal()
nameInput.blur()
renderPlayers()
loaded = true
loadingEl.classList.add('done')
requestAnimationFrame(frame)
