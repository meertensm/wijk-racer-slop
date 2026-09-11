class Game
  TICK, NET, RANGE, DROP, ACTIVE, INTEREST, KEEP = 0.05, 0.1, 600, 660, 700, 1, 2
  TURBO_PRICE, POOP_REWARD = 5, 0.5
  HEAT_PER_KILL, HEAT_DECAY, WANTED_AT, POLICE_ID = 1.0, 1 / 30.0, 2.0, 10**12
  attr_reader :inbox, :now, :world, :crowd, :store

  def initialize(world, store, scores, positions = Positions.new('data/positions.json'))
    @world      = world
    @store      = store
    @scores     = scores
    @positions  = positions
    @crowd      = Crowd.new
    @population = Population.new(world, crowd)
    @prefetcher = Prefetcher.new(store)
    @inbox      = Thread::Queue.new
    @players    = {}
    @poops      = []
    @events     = []
    @now        = 0.0
    @net        = 0.0
    @interest   = 0.0
    @heat       = Hash.new(0.0)
    @heat_at    = {}
    @police     = {}
  end

  def start
    Thread.new { run }
  end

  def warm(x, z)
    tx, tz = Tile.key(x, z)
    (-INTEREST..INTEREST).each { |dx| (-INTEREST..INTEREST).each { |dz| load_tile([tx + dx, tz + dz]) } }
  end

  def nearest_player(x, z, radius)
    players.values.select(&:alive?).min_by { |player| player.car.distance_to(x, z) }&.then { |player| player if player.car.near?(x, z, radius) }
  end

  def kill(npc, player)
    scores.award(player.name, npc.reward)
    events << ['kill', npc.id, player.id, npc.reward, npc.x.round(1), npc.z.round(1)]
    events << ['score', player.id, scores[player.name]]
    heat_up(player)
  end

  def arrest(player, cop)
    scores.award(player.name, -(scores[player.name] / 2.0))
    player.dead_until = now + 2.5
    events << ['arrest', player.id, cop.id]
    events << ['score', player.id, scores[player.name]]
    dismiss(cop)
  end

  def dismiss(cop)
    return unless police.delete(cop.target.id)
    crowd.remove(cop)
    heat[cop.target.id] = 0.0
    events << ['gone', cop.id]
    events << ['wanted', cop.target.id, 0]
  end

  def explode(player, npc)
    return unless player.alive?
    player.dead_until = now + 2.5
    scores.reset(player.name)
    events << ['boom', player.id, npc.id]
    events << ['score', player.id, 0]
  end

  def say(npc, index)
    events << ['say', npc.id, index]
  end

  def bark(npc)
    events << ['bark', npc.id]
  end

  def award(player, amount, npc, stage)
    scores.award(player.name, amount)
    events << ['combo', npc.id, player.id, stage]
    events << ['score', player.id, scores[player.name]]
  end

  def drop_poop(x, z)
    poop = Poop.new((@poop_id = (@poop_id || 0) + 1), x, z, now)
    poops << poop
    events << ['poop', *poop.to_row]
    events << ['unpoop', poops.shift.id, nil] if poops.length > 120
  end

  private

  attr_reader :scores, :positions, :players, :poops, :events, :population, :prefetcher, :heat, :police

  def run
    last = clock
    loop do
      time = clock
      @now = time
      begin
        step(time - last)
      rescue StandardError => error
        warn "#{error.class}: #{error.message}\n  #{error.backtrace.first(3).join("\n  ")}"
      end
      last = time
      sleep [TICK - (clock - time), 0].max
    end
  end

  def step(dt)
    handle(*inbox.pop) until inbox.empty?
    @interest -= dt
    if @interest <= 0
      @interest = 0.5
      interest
    end
    active = {}
    players.each_value { |player| crowd.near(player.car.x, player.car.z, ACTIVE).each { |npc| active[npc.id] = npc } }
    police.each_value { |cop| active[cop.id] = cop }
    active.each_value { |npc| npc.tick(dt, self); crowd.settle(npc) if crowd[npc.id] }
    respawn_players
    players.values.each { |player| leave(player.client) && player.client.close if now - player.last_seen > 10 }
    scores.flush(now)
    positions.flush(now)
    @net += dt
    return if @net < NET
    @net = 0.0
    players.each_value { |player| snapshot(player) }
    events.clear
  end

  def interest
    wanted = {}
    players.each_value do |player|
      tx, tz = player.tile
      (-INTEREST..INTEREST).each { |dx| (-INTEREST..INTEREST).each { |dz| wanted[[tx + dx, tz + dz]] = true } }
    end
    wanted.each_key { |key| load_tile(key) unless world.loaded?(key) }
    world.tiles.keys.each do |key|
      next if players.each_value.any? { |player| (key[0] - player.tile[0]).abs <= KEEP && (key[1] - player.tile[1]).abs <= KEEP }
      population.despawn(world.unload(key))
    end
    prefetcher.update(players.values)
  end

  def load_tile(key)
    return if world.loaded?(key)
    tile = store.tile(*key)
    return store.request(*key, 1) unless tile
    population.spawn(world.load(tile))
  end

  def handle(client, message)
    case message
    when nil  then leave(client)
    when Hash then command(client, message)
    end
  end

  def command(client, message)
    if message['join']
      join(client, message['join'])
    elsif (player = client.player)
      move_player(player, *message['pos']) if message['pos'].is_a?(Array)
      player.rename(message['name']) if message.key?('name')
      turbo(player) if message['turbo']
    end
  end

  def join(client, data)
    if data['world'] && data['world'] != world.name
      client.send('error' => 'world')
      return client.close
    end
    player = Player.new(client.id, client, data['name'], world)
    client.player = player
    players[player.id] = player
    player.last_seen = now
    client.send('welcome' => { 'id' => player.id, 'world' => world.name, 'start' => positions[player.name] || world.start, 'origin' => Limburg::ORIGIN, 'tileSize' => Tile::SIZE, 'tileVersion' => Tile::VERSION, 'kinds' => Npc::KINDS, 'npcs' => Population::CLASSES.transform_values(&:describe), 'score' => scores[player.name], 't' => now.round(2), 'poops' => poops.map(&:to_row) })
  end

  def turbo(player)
    return unless player.alive? && scores[player.name] >= TURBO_PRICE
    scores.award(player.name, -TURBO_PRICE)
    events << ['turbo', player.id]
    events << ['score', player.id, scores[player.name]]
  end

  def leave(client)
    player = players.delete(client.id) or return
    dismiss(police[player.id]) if police[player.id]
    events << ['left', client.id]
  end

  def heat_up(player)
    heat[player.id] = [heat[player.id] - (now - @heat_at.fetch(player.id, now)) * HEAT_DECAY, 0.0].max + HEAT_PER_KILL
    @heat_at[player.id] = now
    return if police[player.id] || heat[player.id] < WANTED_AT
    dispatch(player)
  end

  def dispatch(player)
    car = player.car
    candidates = [90, 60, 130].product((0...8).map { |k| Math::PI + k * Math::PI / 4 }).map { |radius, turn| [car.x + Math.sin(car.heading + turn) * radius, car.z + Math.cos(car.heading + turn) * radius] }
    spot = candidates.find { |x, z| world.inside?(x, z) && !world.blocked?(x, z) } || [car.x - Math.sin(car.heading) * 25, car.z - Math.cos(car.heading) * 25]
    cop = Politie.new(POLICE_ID + player.id, spot[0], spot[1], car.heading, world, Random.new(player.id), player)
    police[player.id] = cop
    crowd.add(cop)
    events << ['wanted', player.id, 1]
  end

  def move_player(player, x, z, heading, speed)
    return unless [x, z, heading, speed].all? { |value| value.is_a?(Numeric) && value.to_f.finite? }
    player.last_seen = now
    entry = world.entry_at(x, z)
    return if entry && entry[:tile].outside?
    from = [player.car.x, player.car.z]
    player.car.move(x.to_f, z.to_f, heading, speed)
    positions.update(player.name, x, z, heading) if player.alive?
    return if !player.alive? || Math.hypot(x - from[0], z - from[1]) > 30
    poops.reject! do |poop|
      next false unless poop.near?(player.car.x, player.car.z, 1.4)
      scores.award(player.name, POOP_REWARD)
      events << ['unpoop', poop.id, player.id]
      events << ['score', player.id, scores[player.name]]
    end
    crowd.near(x, z, 40).each do |npc|
      npc.combo(player, self) if npc.dead && npc.is_a?(DogWalker) && npc.near?(x, z, 10)
      next if npc.dead
      next if Geometry.segment_distance(npc.x, npc.z, from[0], from[1], player.car.x, player.car.z) > 2.2
      npc.hit_by(player, self)
      break unless player.alive?
    end
  end

  def respawn_players
    players.each_value do |player|
      next unless player.dead_until && now >= player.dead_until
      player.dead_until = nil
      heading = player.car.heading + Math::PI / 2
      crowd.near(player.car.x, player.car.z, 6).each { |npc| next if npc.dead; npc.push(Math.sin(heading) * 12, Math.cos(heading) * 12); crowd.settle(npc) }
      events << ['respawn', player.id]
    end
  end

  def snapshot(player)
    rows = []
    crowd.near(player.car.x, player.car.z, RANGE).each do |npc|
      rows << npc.to_row if player.known[npc.id] != npc.version
      player.known[npc.id] = npc.version
    end
    gone = player.known.keys.select { |id| (npc = crowd[id]).nil? || !player.car.near?(npc.x, npc.z, DROP) }
    gone.each { |id| player.known.delete(id) }
    frame = { 't' => now.round(2), 'players' => players.each_value.map { |other| other.to_row(scores[other.name]) } }
    frame['npcs']   = rows   unless rows.empty?
    frame['gone']   = gone   unless gone.empty?
    frame['events'] = events.dup unless events.empty?
    player.client.send(frame)
  end

  def clock
    Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end
end
