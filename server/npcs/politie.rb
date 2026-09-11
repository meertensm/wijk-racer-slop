class Politie < Npc
  LABEL   = 'Politie'
  SPEED   = 17.0
  IDLE    = 0.0
  PAUSE   = 4
  RANGE   = 120
  GENDERS = %i[male female]
  LINES = {
    angry: [
      'Stop! Politie! Aan de kant met die kutpanda!',
      'Rijden maar, kankerlijer! We krijgen je toch wel!',
      'Zet die auto stil, teringhond! Nu!',
      'Je bent gezocht, vuile klootzak!',
      'Dit is de politie! Handen op het stuur, kutkop!',
      'Heel Limburg zoekt je, hoerenzoon!',
      'Godverdomme, hij gaat er weer vandoor!',
      'Centrale? Verdachte in een Panda, kankersnel!'
    ]
  }
  CATCH_RADIUS, CATCH_SPEED, CATCH_TIME, GIVE_UP_RADIUS, GIVE_UP_TIME = 3.2, 4.0, 1.2, 450, 12

  attr_reader :target

  def initialize(id, x, z, heading, world, random, target)
    super(id, x, z, heading, world, random)
    @target   = target
    @speed    = SPEED
    @holding  = 0.0
    @far      = 0.0
  end

  def tick(dt, game)
    return give_up(game) unless target.alive? || game.now < (target.dead_until || 0) + 0.5
    car = target.car
    distance = distance_to(car.x, car.z)
    if distance > GIVE_UP_RADIUS
      @far += dt
      return give_up(game) if @far > GIVE_UP_TIME
    else
      @far = 0.0
    end
    chase(car, distance, dt)
    say(game) if game.now - @chatted > PAUSE && distance < RANGE && rand < 0.05
    @holding = distance < CATCH_RADIUS && car.speed.abs < CATCH_SPEED ? @holding + dt : 0.0
    game.arrest(target, self) if @holding >= CATCH_TIME && target.alive?
  end

  def hit_by(_player, _game)
  end

  def die(_player, _game)
  end

  private

  def chase(car, distance, dt)
    lead   = [distance / SPEED, 1.5].min
    aim_x  = car.x + Math.sin(car.heading) * car.speed * lead
    aim_z  = car.z + Math.cos(car.heading) * car.speed * lead
    wanted = Math.atan2(aim_x - x, aim_z - z)
    turn   = Math.atan2(Math.sin(wanted - heading), Math.cos(wanted - heading))
    @heading += turn.clamp(-2.2 * dt, 2.2 * dt)
    @speed    = distance < 6 ? [distance * 2, 3.0].max : SPEED
    nx = x + Math.sin(heading) * speed * dt
    nz = z + Math.cos(heading) * speed * dt
    if world.blocked?(nx, nz) || !world.inside?(nx, nz)
      @heading += (rand < 0.5 ? 1 : -1) * Math::PI / 2
    else
      @x = nx
      @z = nz
    end
    touch
  end

  def give_up(game)
    game.dismiss(self)
  end
end
