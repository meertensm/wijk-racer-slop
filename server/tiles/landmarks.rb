class Landmarks
  PRIORITY = %w[supermarket doityourself station skatepark park playground sports_centre swimming_pool stadium fuel fast_food mall
                garden_centre furniture cinema theatre hospital townhall school place_of_worship]
  LABELS   = { 'skatepark' => 'Skatebaan', 'park' => 'Park', 'playground' => 'Speeltuin', 'station' => 'Station', 'sports_centre' => 'Sportpark',
               'swimming_pool' => 'Zwembad', 'stadium' => 'Stadion', 'fuel' => 'Tankstation' }
  TOWNS    = %w[city town village suburb hamlet]

  def initialize(projection, tile)
    @projection = projection
    @tile       = tile
  end

  def towns(elements)
    elements.filter_map do |element|
      tags = element['tags'] || {}
      next unless TOWNS.include?(tags['place']) && tags['name'] && element['lat']
      x, z = projection.project(element['lat'], element['lon'])
      { 'id' => element['id'], 'name' => tags['name'], 'town' => %w[city town].include?(tags['place']), 'x' => x, 'z' => z }
    end
  end

  def places(elements, all_towns)
    found = elements.filter_map do |element|
      tags = element['tags'] || {}
      lat  = element['lat'] || element.dig('center', 'lat')
      lon  = element['lon'] || element.dig('center', 'lon')
      next if lat.nil? || tags['place']
      kind = tags['sport'] == 'skateboard' ? 'skatepark' : tags['railway'] || tags['amenity'] || tags['shop'] || tags['tourism'] || tags['leisure']
      name = tags['name'] || LABELS[kind]
      next unless kind && name
      x, z = projection.project(lat, lon)
      next unless tile.contains?(x, z)
      town = tags['addr:city'] || all_towns.min_by { |t| Math.hypot(t['x'] - x, t['z'] - z) / (t['town'] ? 3 : 1) }&.fetch('name')
      { 'id' => element['id'], 'name' => name, 'kind' => kind, 'town' => town, 'x' => x, 'z' => z, rank: PRIORITY.index(kind) || 99 }
    end
    found.uniq { |place| [place['name'], place['kind']] }.sort_by { |place| place[:rank] }.first(40).map { |place| place.except(:rank) }
  end

  private

  attr_reader :projection, :tile
end
