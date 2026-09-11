class Scatter
  DENSITY = { 'forest' => 150, 'grass' => 1200 }

  def self.trees(polygon, id, kind, tile)
    density = DENSITY[kind] or return []
    xs, zs  = polygon.transpose
    area    = (xs.max - xs.min) * (zs.max - zs.min)
    random  = Random.new(id)
    Array.new([(area / density).to_i, 400].min) { [random.rand(xs.min..xs.max), random.rand(zs.min..zs.max)] }
         .select { |x, z| tile.contains?(x, z) && Geometry.inside?(polygon, x, z) }
         .map { |x, z| [x.round(1), z.round(1)] }
  end
end
