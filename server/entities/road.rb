class Road < Entity
  SPOT_SPACING = 32
  attr_reader :points, :width, :kind, :name

  def initialize(id, points, width, kind, name)
    super(id, *points.first)
    @points = points
    @width  = width
    @kind   = kind
    @name   = name
  end

  def walkable?
    kind == 'road' && width.between?(5, 8)
  end

  def sidewalk_spots(random)
    spots     = []
    travelled = 0.0
    next_at   = SPOT_SPACING / 2.0
    points.each_cons(2) do |(ax, az), (bx, bz)|
      length = Math.hypot(bx - ax, bz - az)
      next if length.zero?
      while next_at <= travelled + length
        t      = (next_at - travelled) / length
        offset = (width / 2.0 + 2.5) * (random.rand < 0.5 ? -1 : 1)
        spots << [ax + (bx - ax) * t - (bz - az) / length * offset, az + (bz - az) * t + (bx - ax) / length * offset]
        next_at += SPOT_SPACING
      end
      travelled += length
    end
    spots
  end
end
