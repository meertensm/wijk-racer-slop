require 'json'
require 'net/http'
require 'fileutils'

class Nominatim
  def initialize(dir)
    @dir  = dir
    @last = 0.0
    FileUtils.mkdir_p(dir)
  end

  def geocode(query)
    hit = cached("geocode-#{slug(query)}") { search('q' => query, 'limit' => '1') }.first
    raise "Nominatim: #{query} not found" unless hit
    [hit['lat'].to_f, hit['lon'].to_f]
  end

  def polygon(query)
    hit = cached("polygon-#{slug(query)}") { search('q' => query, 'limit' => '1', 'polygon_geojson' => '1') }.first
    raise "Nominatim: #{query} not found" unless hit
    ring(hit['geojson'], hit['boundingbox'])
  end

  def relation(id)
    hit = cached("relation-#{id}") { lookup("R#{id}") }.first
    raise "Nominatim: relation #{id} not found" unless hit
    ring(hit['geojson'], hit['boundingbox'])
  end

  private

  attr_reader :dir

  def cached(name)
    path = File.join(dir, "#{name}.json")
    return JSON.parse(File.read(path, encoding: 'UTF-8')) if File.exist?(path)
    result = yield
    File.write(path, JSON.generate(result))
    result
  end

  def search(params)
    get('/search', params.merge('format' => 'json'))
  end

  def lookup(ids)
    get('/lookup', 'osm_ids' => ids, 'format' => 'json', 'polygon_geojson' => '1')
  end

  def get(path, params)
    pause = @last + 1.1 - Process.clock_gettime(Process::CLOCK_MONOTONIC)
    sleep(pause) if pause.positive?
    @last    = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    uri      = URI("https://nominatim.openstreetmap.org#{path}?#{URI.encode_www_form(params)}")
    response = Net::HTTP.get_response(uri, 'User-Agent' => 'wijk-racer/0.2')
    raise "Nominatim #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  end

  def ring(geojson, box)
    coordinates = case geojson&.dig('type')
                  when 'Polygon'      then geojson['coordinates'].first
                  when 'MultiPolygon' then geojson['coordinates'].map(&:first).max_by(&:length)
                  else
                    south, north, west, east = box.map(&:to_f)
                    [[west, south], [east, south], [east, north], [west, north]]
                  end
    coordinates.map { |lon, lat| [lat, lon] }
  end

  def slug(text)
    text.downcase.gsub(/[^a-z0-9]+/, '-')
  end
end
