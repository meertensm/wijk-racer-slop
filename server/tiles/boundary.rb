class Boundary
  def initialize(projection, ring)
    @polygon = ring.map { |lat, lon| projection.project(lat, lon) }
    xs, zs   = @polygon.transpose
    @box     = [xs.min, zs.min, xs.max, zs.max]
  end

  def inside?(x, z)
    x >= box[0] && x <= box[2] && z >= box[1] && z <= box[3] && Geometry.inside?(polygon, x, z)
  end

  private

  attr_reader :polygon, :box
end
