require 'json'

class World
  attr_reader :name, :bounds, :terrain, :buildings, :roads, :trees, :zones, :spots, :places, :grid
  attr_accessor :start

  def self.load(name)
    new(name, JSON.parse(File.read("worlds/#{name}.json", encoding: 'UTF-8')))
  end

  def initialize(name, data)
    @name      = name
    @bounds    = data['bounds']
    @start     = data['start']
    @terrain   = data['terrain'].except('heights')
    @buildings = data['buildings'].each_with_index.map { |b, i| Building.new(i, b['p'], b['h']) }
    @roads     = data['roads'].each_with_index.map { |r, i| Road.new(i, r['p'], r['w'], r['kind'], r['name']) }
    @trees     = data['trees'].each_with_index.map { |(x, z), i| Tree.new(i, x, z) }
    @zones     = data.fetch('zones', []).each_with_index.map { |z, i| Zone.new(i, z['name'], z['kind'].split(','), z['p']) }
    @spots     = data.fetch('spots', []).each_with_index.map { |s, i| Spot.new(i, s['kind'], s['name'], s['x'], s['z'], s['heading']) }
    @places    = data.fetch('places', []).each_with_index.map { |p, i| Place.new(i, p['name'], p['kind'], p['town'], p['x'], p['z']) }
    @grid      = Grid.new
    buildings.each { |building| grid.add(building, building.bounds) }
    @zone_raster = Array.new(terrain['cols'] * terrain['rows'], 0)
    zones.each_with_index { |zone, i| Geometry.rasterize(zone.polygon, @zone_raster, terrain, i + 1) }
  end

  def blocked?(x, z)
    grid.at(x, z).any? { |building| building.contains?(x, z) }
  end

  def zone_of(x, z)
    col   = ((x - terrain['x0']) / terrain['sx']).round.clamp(0, terrain['cols'] - 1)
    row   = ((z - terrain['z0']) / terrain['sz']).round.clamp(0, terrain['rows'] - 1)
    index = @zone_raster[row * terrain['cols'] + col]
    zones[index - 1] if index.positive?
  end

  def clamp(x, z)
    [x.clamp(bounds[0], bounds[2]), z.clamp(bounds[1], bounds[3])]
  end

  def spawn_spots(random)
    roads.select(&:walkable?).flat_map { |road| road.sidewalk_spots(random) }
  end
end
