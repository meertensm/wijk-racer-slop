class TileBuilder
  HEIGHTS = { 'house' => 6, 'detached' => 6, 'semidetached_house' => 6, 'terrace' => 6, 'residential' => 7,
              'apartments' => 12, 'retail' => 5, 'commercial' => 6, 'industrial' => 8, 'warehouse' => 8,
              'shed' => 2.5, 'garage' => 2.8, 'garages' => 2.8, 'church' => 15, 'school' => 5, 'static_caravan' => 3 }
  ROOFED  = %w[house detached semidetached_house terrace residential yes farm]
  WIDTHS  = { 'motorway' => 12, 'motorway_link' => 6, 'trunk' => 10, 'trunk_link' => 6, 'primary' => 9, 'primary_link' => 6,
              'secondary' => 8, 'secondary_link' => 6, 'tertiary' => 7, 'residential' => 6, 'unclassified' => 6,
              'living_street' => 5, 'pedestrian' => 5, 'service' => 4, 'track' => 3, 'cycleway' => 2.5, 'footway' => 2, 'path' => 1.5 }
  PATHS   = %w[track cycleway footway path]
  WATER   = { 'river' => 100, 'canal' => 50, 'stream' => 2.5, 'ditch' => 1.5, 'drain' => 1.5 }

  def initialize(projection, tile)
    @projection = projection
    @tile       = tile
    @landmarks  = Landmarks.new(projection, tile)
  end

  def build(elements, pands = [])
    buildings, roads, areas, trees, pois = [], [], [], [], []
    elements.each do |element|
      tags = element['tags'] || {}
      if element['type'] == 'node'
        next unless element['lat']
        x, z = projection.project(element['lat'], element['lon'])
        trees << [x, z] if tags['natural'] == 'tree' && tile.contains?(x, z)
        pois << [x, z, tags['brand'] || tags['name']] if (tags['shop'] || tags['amenity']) && (tags['brand'] || tags['name'])
        next
      end
      next unless element['geometry']
      points = element['geometry'].map { |pt| projection.project(pt['lat'], pt['lon']) }
      closed = points.first == points.last
      points.pop if closed
      points = points.chunk_while { |a, b| a == b }.map(&:first)
      next if points.size < 2 || !touches?(points)

      if tags['building'] && points.size >= 3
        next unless tile.contains?(*centroid(points))
        type   = tags['building']
        levels = tags['building:levels']&.to_f
        height = tags['height']&.to_f || (levels ? levels * 3 : HEIGHTS.fetch(type, 6))
        buildings << { 'id' => element['id'], 'p' => points, 'h' => height.round(1), 'c' => element['id'] % 6,
                       'roof' => ROOFED.include?(type) && height <= 9 ? 'hip' : 'flat',
                       'sign' => (tags['brand'] || tags['name'])&.slice(0, 24) }.compact
      elsif tags['highway'] && WIDTHS[tags['highway']]
        roads << { 'id' => element['id'], 'p' => points, 'w' => WIDTHS[tags['highway']], 'kind' => PATHS.include?(tags['highway']) ? 'path' : 'road',
                   'name' => tags['name'], 'bridge' => (true if tags['bridge'] && tags['bridge'] != 'no') }.compact
      elsif tags['railway'] == 'rail'
        roads << { 'id' => element['id'], 'p' => points, 'w' => 3, 'kind' => 'rail', 'name' => tags['name'], 'bridge' => (true if tags['bridge'] && tags['bridge'] != 'no') }.compact
      elsif tags['waterway']
        roads << { 'id' => element['id'], 'p' => points, 'w' => tags['width']&.to_f || WATER[tags['waterway']] || 2, 'kind' => 'water', 'name' => tags['name'] }.compact
      elsif closed && points.size >= 3
        kind = area_kind(tags)
        areas << { 'id' => element['id'], 'p' => points, 'kind' => kind }
        trees.concat Scatter.trees(points, element['id'], kind, tile)
      end
    end
    buildings = TileBuilder.merge_pands(buildings, pands)
    Signs.attach(buildings, pois)
    towns = landmarks.towns(elements)
    x0, z0, x1, z1 = tile.bounds
    { 'buildings' => buildings, 'roads' => roads, 'areas' => areas, 'trees' => trees,
      'places' => landmarks.places(elements, towns), 'towns' => towns.select { |town| tile.contains?(town['x'], town['z']) } }
  end

  def self.merge_pands(buildings, pands)
    return buildings if pands.empty?
    taken = []
    merged = pands.map do |pand|
      match = buildings.find { |building| !taken.include?(building) && Geometry.inside?(pand['p'], *TileBuilder.middle(building['p'])) }
      taken << match if match
      { 'id' => pand['id'], 'p' => pand['p'].map { |x, z| [x.round(1), z.round(1)] }, 'h' => [pand['h'], 2.5].max, 'c' => pand['id'] % 6,
        'roof' => pand['roof'] == 'slanted' ? 'hip' : 'flat', 'ground' => pand['ground'],
        'faces' => pand['faces'].map { |type, *rings| [type, *rings.map { |ring| ring.map { |x, z, y| [x.round(2), z.round(2), y.round(2)] } }] },
        'sign' => match && match['sign'] }.compact
    end
    merged + buildings.reject { |building| taken.include?(building) }
  end

  def self.middle(points)
    xs, zs = points.transpose
    [(xs.min + xs.max) / 2.0, (zs.min + zs.max) / 2.0]
  end

  private

  attr_reader :projection, :tile, :landmarks

  def area_kind(tags)
    if tags['natural'] == 'water' then 'water'
    elsif tags['natural'] == 'wood' || tags['landuse'] == 'forest' then 'forest'
    elsif %w[farmland orchard allotments].include?(tags['landuse']) then 'field'
    elsif tags['amenity'] == 'parking' then 'parking'
    elsif %w[industrial commercial retail].include?(tags['landuse']) then 'lot'
    else 'grass'
    end
  end

  def centroid(points)
    xs, zs = points.transpose
    [(xs.min + xs.max) / 2.0, (zs.min + zs.max) / 2.0]
  end

  def touches?(points)
    xs, zs = points.transpose
    x0, z0, x1, z1 = tile.bounds
    xs.max >= x0 && xs.min < x1 && zs.max >= z0 && zs.min < z1
  end
end
