class Structure < Entity
  attr_reader :polygon

  def initialize(id, polygon)
    xs, zs = polygon.map(&:first), polygon.map(&:last)
    @bounds = [xs.min, zs.min, xs.max, zs.max]
    super(id, (xs.min + xs.max) / 2, (zs.min + zs.max) / 2)
    @polygon = polygon
  end

  attr_reader :bounds

  def contains?(x, z)
    Geometry.inside?(polygon, x, z)
  end
end

class Building < Structure
  attr_reader :height

  def initialize(id, polygon, height)
    super(id, polygon)
    @height = height
  end
end
