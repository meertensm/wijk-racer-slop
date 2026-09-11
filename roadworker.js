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
  try { return polygonClipping.difference(a, b) } catch { return a }
}

onmessage = ({ data: { key, gen, asphalt, walkways, box } }) => {
  const roads = union(clip(asphalt, box))
  const walks = union(clip(walkways, box))
  postMessage({ key, gen, asphalt: roads, walkways: walks.length ? difference(walks, roads) : [] })
}
