import polygonClipping from 'https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/+esm'

onmessage = ({ data: { key, gen, asphalt, walkways, box } }) => {
  try {
    const clip = rings => rings.map(ring => polygonClipping.intersection([ring], box)).filter(result => result.length)
    let roads = polygonClipping.union(...clip(asphalt))
    const walks = clip(walkways)
    const sidewalks = walks.length ? polygonClipping.difference(polygonClipping.union(...walks), roads) : []
    postMessage({ key, gen, asphalt: roads, walkways: sidewalks })
  } catch (error) {
    postMessage({ key, gen, error: String(error) })
  }
}
