class Player
  attr_reader :id, :client, :name, :car, :known
  attr_accessor :dead_until, :last_seen

  def initialize(id, client, name, world)
    @id     = id
    @client = client
    @car    = Car.new(id, world.start['x'], world.start['z'], world.start['heading'])
    @known  = {}
    rename(name)
  end

  def rename(name)
    name  = name.to_s.strip[0, 16]
    @name = name.empty? ? 'Panda' : name
  end

  def alive?
    dead_until.nil?
  end

  def to_row(score)
    [id, name, car.x.round(2), car.z.round(2), car.heading.round(3), car.speed.round(1), score, alive? ? 0 : 1]
  end
end
