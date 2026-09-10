class Entity
  attr_reader :id, :x, :z, :heading

  def initialize(id, x, z, heading = 0.0)
    @id      = id
    @x       = x.to_f
    @z       = z.to_f
    @heading = heading.to_f
  end

  def distance_to(x, z)
    Math.hypot(self.x - x, self.z - z)
  end

  def near?(x, z, radius)
    (self.x - x).abs < radius && (self.z - z).abs < radius && distance_to(x, z) < radius
  end
end
