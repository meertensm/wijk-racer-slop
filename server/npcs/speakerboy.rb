class Speakerboy < HumanoidNpc
  LABEL  = 'Speakerboy'
  REWARD = 5
  LEASH  = 120
  IDLE   = 0
  PACE   = 4.5..6.0

  def decide(_game)
    @speed   = pick_speed
    @heading = far_from_home? ? home_heading : heading + (rand - 0.5) * 0.8
    @timer   = 3 + rand * 4
    touch
  end
end
