class Labradoodle < Npc
  LABEL = 'Labradoodle'
  attr_reader :owner

  def initialize(id, owner, world, random)
    super(id, owner.x + Math.sin(owner.heading) * 1.1, owner.z + Math.cos(owner.heading) * 1.1, owner.heading, world, random)
    @owner = owner
    @panic = 0
  end

  def tick(dt, game)
    if owner.dead
      super
    else
      follow
    end
  end

  def decide(game)
    @panic  -= 1
    @speed   = @panic.positive? ? 4.5 : 1.2 + rand
    prey     = game.nearest_player(x, z, 200)
    @heading = @panic.positive? && prey ? Math.atan2(x - prey.car.x, z - prey.car.z) + rand - 0.5 : heading + (rand - 0.5) * 3
    @timer   = 0.8 + rand
    touch
  end

  def panic!
    @panic = 6
    @timer = 0.0
  end

  def hit_by(player, game)
    owner.hit_by(player, game) unless owner.dead
  end

  private

  def follow
    changed  = owner.version != @followed
    @x       = owner.x + Math.sin(owner.heading) * 1.1
    @z       = owner.z + Math.cos(owner.heading) * 1.1
    @heading = owner.heading
    @speed   = owner.speed
    return unless changed
    @followed = owner.version
    touch
  end
end
