class Npc < Entity
  KINDS  = %w[beagle baldman baldflag dogwalker labradoodle tattooman speakerboy zwerver zombie junkie]
  LEASH  = 40
  REWARD = nil
  LABEL  = 'Npc'
  IDLE   = 0.3
  PACE   = 0.8..1.4

  attr_reader :speed, :version, :dead, :dead_at, :killer, :home

  def initialize(id, x, z, heading, world, random)
    super(id, x, z, heading)
    @world   = world
    @random  = random
    @home    = [x, z]
    @speed   = 0.0
    @timer   = 0.0
    @version = 0
    @dead    = false
  end

  def kind
    self.class.name.downcase
  end

  def kind_index
    KINDS.index(kind)
  end

  def reward
    self.class::REWARD
  end

  def mortal?
    !reward.nil?
  end

  def tick(dt, game)
    if dead
      revive if game.now - dead_at > 600 && !game.nearest_player(x, z, 300)
      return
    end
    @timer -= dt
    decide(game) if @timer.negative?
    move(dt)
  end

  def decide(_game)
    @speed   = pick_speed
    @heading = far_from_home? ? home_heading : heading + (rand - 0.5) * 3
    @timer   = 2 + rand * 4
    touch
  end

  def move(dt)
    return if speed.zero?
    nx = x + Math.sin(heading) * speed * dt
    nz = z + Math.cos(heading) * speed * dt
    if world.blocked?(nx, nz)
      @heading += Math::PI
      touch
    else
      @x, @z = world.clamp(nx, nz)
    end
  end

  def hit_by(player, game)
    mortal? ? die(player, game) : game.explode(player, self)
  end

  def die(player, game)
    return if dead
    @dead    = true
    @dead_at = game.now
    @killer  = player
    @speed   = 0.0
    touch
    game.kill(self, player)
  end

  def revive
    @dead   = false
    @x, @z  = home
    @timer  = 0.0
    touch
  end

  def push(dx, dz)
    @x   += dx
    @z   += dz
    @home = [x, z]
    touch
  end

  def touch
    @version += 1
  end

  def to_row
    [id, kind_index, x.round(2), z.round(2), heading.round(3), speed.round(2), dead ? 1 : 0]
  end

  private

  attr_reader :world, :random

  def rand(range = nil)
    range ? random.rand(range) : random.rand
  end

  def pick_speed
    rand < self.class::IDLE ? 0.0 : rand(self.class::PACE)
  end

  def far_from_home?
    distance_to(*home) > self.class::LEASH
  end

  def home_heading
    Math.atan2(home[0] - x, home[1] - z)
  end
end
