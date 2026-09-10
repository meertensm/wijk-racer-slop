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
    dog&.panic!
  end
end
