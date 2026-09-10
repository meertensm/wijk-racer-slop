class Beagle < Npc
  LABEL = 'Beagle'
  IDLE  = 0.25
  PACE  = 0.6..1.8
  PAUSE = 3
  DENSITY = 0.3

  def chatty?(game)
    return false

    rand < 0.04 && game.nearest_player(x, z, 60)
  end

  def say(game)
    @chatted = game.now
    game.bark(self)
  end
end
