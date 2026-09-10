class Junkie < HumanoidNpc
  LABEL  = 'Junk'
  REWARD = 0.2
  IDLE   = 0.2
  PACE   = 1.6..2.8

  def decide(game)
    super
    @timer = 0.4 + rand * 0.8
  end
end
