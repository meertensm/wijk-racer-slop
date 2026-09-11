class Projection
  attr_reader :lat0, :lng0

  def initialize(lat0, lng0)
    @lat0    = lat0
    @lng0    = lng0
    @scale_x = 111_320 * Math.cos(lat0 * Math::PI / 180)
    @scale_z = 110_540.0
  end

  def project(lat, lon)
    [((lon - lng0) * scale_x).round(1), (-(lat - lat0) * scale_z).round(1)]
  end

  def unproject(x, z)
    [lat0 - z.to_f / scale_z, lng0 + x.to_f / scale_x]
  end

  def bbox(tile, margin = 0)
    x0, z0, x1, z1 = tile.bounds
    south, west = unproject(x0 - margin, z1 + margin)
    north, east = unproject(x1 + margin, z0 - margin)
    [south, west, north, east]
  end

  private

  attr_reader :scale_x, :scale_z
end
