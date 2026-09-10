class Speakerboy < HumanoidNpc
  LABEL  = 'Speakerboy'
  REWARD = 5
  LEASH  = 120
  IDLE   = 0
  PACE   = 4.5..6.0
  LINES = {
    angry: [
      'SPEAKERBOY!',
      'SPEAKERBOOOOOOY!',
      'SPEAKERBOY! SPEAKERBOY! SPEAKERBOY!',
      'SPEAKERBOY, JONGUH! HARDER, KANKERHARD!',
      'IK BEN SPEAKERBOY, KUTLUL!',
      'SPEAKERBOY IN DE PLAATS! MAAK RUIMTE, TERINGLIJERS!',
      'HARDER! HARDER! SPEAKERBOY, GODVERDOMME!',
      'SPEAKERBOY! OH OH OH OH! KANKER!'
    ]
  }

  def decide(_game)
    @speed   = pick_speed
    @heading = far_from_home? ? home_heading : heading + (rand - 0.5) * 0.8
    @timer   = 3 + rand * 4
    touch
  end
end
