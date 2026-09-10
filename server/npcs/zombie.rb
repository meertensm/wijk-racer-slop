class Zombie < HumanoidNpc
  LABEL  = 'Zombie'
  REWARD = 0.2
  IDLE   = 0
  PACE   = 0.6..0.6

  def decide(game)
    prey = game.nearest_player(x, z, 70)
    return super unless prey
    @speed   = 0.6
    @heading = Math.atan2(prey.car.x - x, prey.car.z - z) + (rand - 0.5) * 0.4
    @timer   = 0.6
    touch
  end
end
