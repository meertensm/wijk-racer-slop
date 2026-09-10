class Vehicle < Entity
  attr_reader :speed

  def initialize(id, x, z, heading = 0.0)
    super
    @speed = 0.0
  end

  def move(x, z, heading, speed)
    @x       = x
    @z       = z
    @heading = heading
    @speed   = speed
  end
end

class Car < Vehicle
end
