class Zones
  CELL = 40

  def initialize(zones)
    @zones = zones
    @memo  = {}
  end

  def at(x, z)
    key = [(x / CELL).floor, (z / CELL).floor]
    return memo[key] if memo.key?(key)
    memo[key] = zones.find do |zone|
      min_x, min_z, max_x, max_z = zone.bounds
      x >= min_x && x <= max_x && z >= min_z && z <= max_z && zone.contains?(x, z)
    end
  end

  def to_a
    zones
  end

  private

  attr_reader :zones, :memo
end
