class DogWalker < HumanoidNpc
  LABEL  = 'Niet poep oprapende labradoodle uitlater'
  REWARD = 1
  LEASH  = 150
  IDLE   = 0.35
  PACE   = 0.7..1.2
  attr_accessor :dog

  def decide(game)
    super
    return unless speed.zero? && dog && rand < 0.5 && game.now - (@pooped || -100) > 45
    @pooped = game.now
    game.drop_poop(dog.x, dog.z)
  end

  def die(player, game)
    super
    @stage  = 0
    @on_top = { player.id => true }
    dog&.panic!
  end

  def combo(player, game)
    return if @stage >= 2
    return @on_top.delete(player.id) unless near?(player.car.x, player.car.z, 1.8)
    return if @on_top[player.id] || game.now - dead_at > 5
    return unless @stage.zero? ? player.car.speed < -0.5 : player.car.speed > 0.5
    @on_top[player.id] = true
    @stage  += 1
    @dead_at = game.now
    game.award(player, 0.5, self, @stage)
  end
end
