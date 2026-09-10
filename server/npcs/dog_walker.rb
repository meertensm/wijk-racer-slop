class DogWalker < HumanoidNpc
  LABEL  = 'Niet poep oprapende labradoodle uitlater'
  REWARD = 1
  LEASH  = 150
  IDLE   = 0.35
  PACE   = 0.7..1.2
  LINES = {
    angry: [
      'GODVERDOMME! KIJK UIT, KANKERLIJER!',
      'HÉ! VUILE TERINGLIJER! KOM HIER!',
      'MIJN HOND! JE HEBT MIJN HOND BIJNA DOODGEREDEN, KUTLUL!',
      'WAT DOE JE NOU, ACHTERLIJKE KANKEREIKEL!',
      'BEN JE HELEMAAL VAN DE POT GERUKT, HOERENZOON!',
      'IK HEB JE KENTEKEN, KLOOTZAK! IK KOM JE HALEN!',
      'DIT IS EEN WOONWIJK, KANKERIDIOOT! HIER WONEN KINDEREN!',
      'HIER MAG JE DERTIG, TYFUSDEBIEL!',
      'FLIKKER OP MET DIE KUTPANDA!',
      'IK BEL DE POLITIE! NU! METEEN, KANKERHOND!',
      'KIJK NOU WAT JE DOET, VUILE HUFTER!',
      'AAAH! MIJN HEUP! MIJN KANKERHEUP, GODVERDOMME!',
      'WIE HEEFT JOU JE RIJBEWIJS GEGEVEN? DE HEMA, KUTKOP?!',
      'POEP OPRAPEN? RAAP JIJ JE EIGEN KANKERTROEP MAAR OP!',
      'DAT IS GEWOON NATUUR, DIE DROL! NATUUR, LUL!',
      'IK WOON HIER AL VEERTIG JAAR, TERINGHOND!',
      'AAAARGH! MIJN KNIE! JE HEBT MIJN KANKERKNIE GEBROKEN!',
      'DIT GA IK MELDEN! BIJ DE GEMEENTE! BIJ IEDEREEN, KUTZAK!',
      'BLIJF VAN MIJN HOND AF OF IK SLA JE KANKERKOP IN ELKAAR!',
      'KOM UIT DIE AUTO! KOM ER UIT, VUILE LAFBEK!',
      'IK MAAK JE KAPOT! HOOR JE ME? KANKERKAPOT!',
      'JE HEBT MIJN LEVEN VERWOEST, TYFUSLIJER!',
      'GODVERDOMME! GODVERDOMME! GODVERDEKANKER!',
      'STOP! STOP DIE AUTO, VUILE KUTMOORDENAAR!',
      'DAT WAS MIJN GOEIE BEEN, GODVERDOMME! MIJN GOEIE BEEN!',
      'IK SPUUG OP JE PANDA! IK PIS EROP, KLOOTZAK!',
      'JE GAAT BOETEN! JE GAAT HIERVOOR BOETEN, HOERENJONG!',
      'BRUTUS, BIJT HEM! BIJT HEM IN ZIJN KANKERBALLEN!'
    ]
  }
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
