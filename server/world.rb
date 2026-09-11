class World
  attr_reader :name, :projection, :zones, :spots, :grid, :tiles
  attr_accessor :start

  def initialize(name, projection, zones, spots = [])
    @name       = name
    @projection = projection
    @zones      = zones
    @spots      = spots
    @grid       = Grid.new(40)
    @tiles      = {}
    @start      = { 'x' => 0.0, 'z' => 0.0, 'heading' => 0.0 }
  end

  def load(tile)
    entry = {
      tile:      tile,
      buildings: tile.buildings.map { |b| Building.new(b['id'], b['p'], b['h']) },
      roads:     tile.roads.map { |r| Road.new(r['id'], r['p'], r['w'], r['kind'], r['name']) },
      npcs:      []
    }
    entry[:buildings].each { |building| grid.add(building, building.bounds) }
    tiles[tile.key] = entry
  end

  def unload(key)
    entry = tiles.delete(key) or return
    entry[:buildings].each { |building| grid.remove(building, building.bounds) }
    entry
  end

  def entry_at(x, z)
    tiles[Tile.key(x, z)]
  end

  def loaded?(key)
    tiles.key?(key)
  end

  def inside?(x, z)
    entry = entry_at(x, z)
    !entry.nil? && !entry[:tile].outside?
  end

  def blocked?(x, z)
    grid.at(x, z).any? { |building| building.contains?(x, z) }
  end

  def zone_of(x, z)
    zones.at(x, z)
  end
end
