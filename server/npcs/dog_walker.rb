class DogWalker < HumanoidNpc
  LABEL  = 'Niet poep oprapende labradoodle uitlater'
  REWARD = 1
  LEASH  = 150
  IDLE   = 0.35
  PACE   = 0.7..1.2
  LINES = {
    angry: [
      'Kijk uit, klootzak! Mijn hond loopt hier!',
      'Godverdomme, wat doe jij nou, kankerlijer!',
      'Ben je blind of gewoon achterlijk, kutkop?',
      'Dit is een woonwijk, tyfuslijer! Hier wonen kinderen!',
      'Ik heb je kenteken, hoerenzoon! Ik kom je halen!',
      'Flikker op met die kutpanda, nu!',
      'Poep oprapen? Raap jij je eigen troep maar op, lul!',
      'Dat is gewoon natuur, die drol! Natuur!',
      'Ik woon hier al veertig jaar, teringhond!',
      'Mijn heup! Mijn heup, godverdomme!',
      'Kom uit die auto, lafbek! Kom eruit!',
      'Ik sla je kop in elkaar als je mijn hond raakt!',
      'Wie heeft jou je rijbewijs gegeven? De Hema?',
      'Ik bel de politie! Nu meteen, kankerhond!',
      'Stop die auto, vuile moordenaar!',
      'Je gaat hiervoor boeten, hoerenjong!',
      'James, bijt hem! Bijt hem in zijn ballen!',
      'Dertig! Hier mag je dertig, debiel!',
      'Ik spuug op je Panda! Ik pis erop!',
      'Godverdomme! Godverdomme! Godverdomme nog aan toe!'
    ]
  }
  RAGE, CHARGE, HIT_RADIUS, HIT_COOLDOWN, HIT_COST = 8, 4.0, 2.4, 3, 1
  attr_accessor :dog

  def say(game)
    super
    @rage_until = game.now + RAGE if game.nearest_player(x, z, 30)
  end

  def tick(dt, game)
    prey = @rage_until && game.now < @rage_until && !dead && game.nearest_player(x, z, 60)
    return super unless prey
    @heading = Math.atan2(prey.car.x - x, prey.car.z - z)
    @speed   = CHARGE
    move(dt)
    touch
    return unless near?(prey.car.x, prey.car.z, HIT_RADIUS) && game.now - (@hit_at || -10) > HIT_COOLDOWN
    @hit_at = game.now
    game.attack(prey, self, HIT_COST)
  end

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
