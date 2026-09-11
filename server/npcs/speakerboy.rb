class Speakerboy < HumanoidNpc
  LABEL  = 'Speakerboy'
  REWARD = 5
  LEASH  = 120
  IDLE   = 0
  PACE   = 4.5..6.0
  LINES = {
    angry: [
      'Speakerboy!',
      'Speakerboy! Speakerboy! Speakerboy!',
      'Harder! Harder, kankerhard!',
      'Ik ben Speakerboy, kutlul!',
      'Speakerboy in de plaats! Maak ruimte, teringlijers!',
      'Speakerboy! Oh oh oh oh! Kanker!',
      'Wie zet mijn muziek zachter? Ik sla je kapot!',
      'Bassen, jongen! Bassen tot je oren bloeden!'
    ]
  }

  def decide(_game)
    @speed   = pick_speed
    @heading = far_from_home? ? home_heading : heading + (rand - 0.5) * 0.8
    @timer   = 3 + rand * 4
    touch
  end
end
