import polygonClipping from 'https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/+esm'

const snap = ring => ring.map(([x, z]) => [Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000])

function clip(rings, box) {
  const clipped = []
  for (const ring of rings) {
    try { clipped.push(...polygonClipping.intersection([snap(ring)], box).map(polygon => [polygon])) } catch { }
  }
  return clipped
}

function union(polygons) {
  if (!polygons.length) return []
  try { return polygonClipping.union(...polygons) } catch { }
  let result = []
  for (const polygon of polygons) {
    try { result = polygonClipping.union(result, polygon) } catch { }
  }
  return result
}

function difference(a, b) {
  try { return polygonClipping.difference(a, b) } catch { }
  const result = []
  for (const polygon of a) {
    try { result.push(...polygonClipping.difference([polygon], b)) } catch { }
  }
  return result
}

const area = ring => Math.abs(ring.reduce((sum, [x, z], i) => { const [nx, nz] = ring[(i + 1) % ring.length]; return sum + x * nz - nx * z }, 0)) / 2

function solid(polygons) {
  return polygons.map(rings => rings.filter(ring => area(ring) > 0.5)).filter(rings => rings.length && area(rings[0]) > 0.5)
}

onmessage = ({ data: { key, gen, asphalt, walkways, box } }) => {
  const roads = solid(union(clip(asphalt, box)))
  const walks = solid(union(clip(walkways, box)))
  postMessage({ key, gen, asphalt: roads, walkways: walks.length ? solid(difference(walks, roads)) : [] })
}
