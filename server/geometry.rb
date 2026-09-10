module Geometry
  def self.inside?(polygon, x, z)
    hit = false
    j   = polygon.length - 1
    polygon.each_with_index do |(ax, az), i|
      bx, bz = polygon[j]
      hit = !hit if (az > z) != (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax
      j = i
    end
    hit
  end

  def self.segment_distance(x, z, ax, az, bx, bz)
    dx, dz = bx - ax, bz - az
    length = dx * dx + dz * dz
    t      = length.zero? ? 0 : (((x - ax) * dx + (z - az) * dz) / length).clamp(0, 1)
    Math.hypot(x - ax - dx * t, z - az - dz * t)
  end

  def self.rasterize(polygon, raster, terrain, value)
    cols, rows = terrain['cols'], terrain['rows']
    x0, z0, sx, sz = terrain.values_at('x0', 'z0', 'sx', 'sz')
    zs = polygon.map(&:last)
    r0 = (((zs.min - z0) / sz).ceil).clamp(0, rows - 1)
    r1 = (((zs.max - z0) / sz).floor).clamp(0, rows - 1)
    (r0..r1).each do |r|
      z = z0 + r * sz
      crossings = []
      j = polygon.length - 1
      polygon.each_with_index do |(ax, az), i|
        bx, bz = polygon[j]
        crossings << ax + (z - az) / (bz - az) * (bx - ax) if (az > z) != (bz > z)
        j = i
      end
      crossings.sort.each_slice(2) do |left, right|
        next unless right
        c0 = (((left - x0) / sx).ceil).clamp(0, cols - 1)
        c1 = (((right - x0) / sx).floor).clamp(0, cols - 1)
        (c0..c1).each { |c| raster[r * cols + c] = value if raster[r * cols + c].zero? }
      end
    end
  end
end
