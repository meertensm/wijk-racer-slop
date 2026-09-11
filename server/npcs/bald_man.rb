class BaldMan < HumanoidNpc
  LABEL  = 'Kale man'
  REWARD = 1
  LINES = {
    angry: [
      'Godverdomme!',
      'Godverdomme nog aan toe, kutlul!',
      'Kijk uit, kankerlijer!',
      'Godver! Mijn heup! Mijn heup!',
      'Godverdomme, wat een achterlijke sukkel!',
      'Dat is toch niet normaal meer, hoerenzoon!',
      'Godverdomme, mijn kale kop!',
      'Godverdomse kutpanda! Ik sla je auto in puin!',
      'Godverdomme! Ik vermoord je, kankerhond!',
      'Kom hier, dan trek ik je kop eraf!',
      'Godver, godver, godver! Kanker!',
      'Wat een stank hier, godverdomme!',
      'Ik heb je gezien, klootzak! Ik heb je gezien!'
    ]
  }

  def chatty?(game)
    player = game.nearest_player(x, z, 12)
    player && player.car.speed.abs > 6
  end
end

class BaldFlag < BaldMan
  LABEL = 'Kale man met Brabantse vlag'
  TTS_VOICE = 'nl-BE-ArnaudNeural'
  LINES = {
    angry: [
      'Godverdomme! Wat doede gij nou, kaoie kankerhond!',
      'Kijk uit, godverdomme! Kaoie teringlijer!',
      'Ge zijt nie goed wijs, godverdomse kutlul!',
      'Godverdomme! Mijn vlag! Ge hebt mijn vlag kapotgereden, kankerzak!',
      'Hedde gij wel gekeken, godverdomse tyfussukkel!',
      'Godverdomme! Da ken toch nie, kutjong!',
      'Houdoe en bedankt, godverdomse klootzak!',
      'Godver! Ge rijdt over mijn tenen, kankerlul!',
      'Godverdomme, gij kaoie kutpanda!',
      'Wat is da nou weer, godverdomme! Ik sla je plat!',
      'Ik zeg het tegen ons moeder, en die maakt je af!',
      'Kom hier, jongen! Dan krijgde gij een lel op je bakkes!'
    ]
  }
end
