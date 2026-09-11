class Tile
  SIZE    = 1000
  STEP    = 10
  SAMPLES = SIZE / STEP + 1
  VERSION = 1

  attr_reader :tx, :tz, :data

  def self.key(x, z)
    [(x / SIZE).floor, (z / SIZE).floor]
  end

  def self.index(tx, tz)
    (tx + 512) * 1024 + (tz + 512)
  end

  def initialize(tx, tz, data = {})
    @tx   = tx
    @tz   = tz
    @data = data
  end

  def key
    [tx, tz]
  end

  def bounds
    [tx * SIZE, tz * SIZE, (tx + 1) * SIZE, (tz + 1) * SIZE]
  end

  def center
    [tx * SIZE + SIZE / 2.0, tz * SIZE + SIZE / 2.0]
  end

  def seed
    (tx * 73_856_093) ^ (tz * 19_349_663)
  end

  def id_base
    Tile.index(tx, tz) * 4096
  end

  def outside?
    data['outside'] == true
  end

  def contains?(x, z)
    x0, z0, x1, z1 = bounds
    x >= x0 && x < x1 && z >= z0 && z < z1
  end

  def roads
    data.fetch('roads', [])
  end

  def buildings
    data.fetch('buildings', [])
  end
end
