require 'net/http'
require 'json'

class Bag3d
  BASE  = 'https://api.3dbag.nl/collections/pand/items'
  LIMIT = 500
  KEEP  = %w[RoofSurface WallSurface]

  def initialize(projection)
    @projection = projection
  end

  def pands(tile)
    south, west, north, east = projection.bbox(tile, 20)
    corners = [[south, west], [south, east], [north, west], [north, east]].map { |lat, lon| Rd.to_rd(lat, lon) }
    xs, ys  = corners.transpose
    url     = "#{BASE}?bbox=#{[xs.min, ys.min, xs.max, ys.max].map { |v| v.round(1) }.join(',')}&limit=#{LIMIT}"
    result  = []
    while url
      document = fetch(url)
      transform = document.dig('metadata', 'transform') || { 'scale' => [1, 1, 1], 'translate' => [0, 0, 0] }
      document.fetch('features', []).each { |feature| pand = convert(feature, transform, tile) and result << pand }
      url = document.fetch('links', []).find { |link| link['rel'] == 'next' }&.fetch('href', nil)
    end
    result
  end

  private

  attr_reader :projection

  def fetch(url)
    uri      = URI(url)
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 60) { |http| http.get(uri.request_uri, 'User-Agent' => 'wijk-racer/0.2', 'Accept' => 'application/city+json') }
    raise "3dbag #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  end

  def convert(feature, transform, tile)
    scale, shift = transform['scale'], transform['translate']
    objects  = feature['CityObjects']
    building = objects.values.find { |object| object['type'] == 'Building' } or return nil
    attributes = building['attributes'] || {}
    part = objects.values.find { |object| object['type'] == 'BuildingPart' && object['geometry']&.any? { |g| g['lod'] == '2.2' } } or return nil
    geometry = part['geometry'].find { |g| g['lod'] == '2.2' }
    vertices = feature['vertices'].map { |vx, vy, vz| [vx * scale[0] + shift[0], vy * scale[1] + shift[1], vz * scale[2] + shift[2]] }
    world    = Hash.new { |cache, index| cache[index] = world_point(vertices[index]) }
    types    = geometry.dig('semantics', 'surfaces')&.map { |s| s['type'] } || []
    values   = geometry.dig('semantics', 'values')&.first || []
    faces    = []
    geometry['boundaries'].first.each_with_index do |surface, i|
      type = types[values[i] || -1] || 'WallSurface'
      next unless KEEP.include?(type)
      rings = surface.map { |ring| ring.map { |index| world[index] } }
      faces << [type == 'RoofSurface' ? 'roof' : 'wall', *rings]
    end
    ground = geometry['boundaries'].first.each_with_index.find { |_, i| types[values[i] || -1] == 'GroundSurface' }&.first
    footprint = ground ? ground.first.map { |index| world[index].first(2) } : nil
    return nil if faces.empty? || footprint.nil? || footprint.length < 3
    cx = footprint.sum(&:first) / footprint.length
    cz = footprint.sum(&:last) / footprint.length
    return nil unless tile.contains?(cx, cz)
    { 'id' => building_id(feature['id']), 'p' => footprint, 'faces' => faces,
      'ground' => attributes['b3_h_maaiveld']&.round(2), 'h' => ((attributes['b3_h_dak_max'] || 0) - (attributes['b3_h_maaiveld'] || 0)).round(1),
      'roof' => attributes['b3_dak_type'], 'levels' => attributes['b3_bouwlagen'] }.compact
  end

  def world_point((x, y, z))
    lat, lon = Rd.to_wgs(x, y)
    gx, gz   = projection.project(lat, lon)
    [gx, gz, z.round(2)]
  end

  def building_id(id)
    id.to_s.split('.').last.to_i
  end
end
