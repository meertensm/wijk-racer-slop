class Game
  TICK, NET, RANGE, DROP, ACTIVE = 0.05, 0.1, 600, 660, 700
  attr_reader :inbox, :now, :world, :npcs

  def initialize(world, npcs, scores, voices = {})
    @world   = world
    @npcs    = npcs
    @scores  = scores
    @voices  = voices
    @inbox   = Thread::Queue.new
    @players = {}
    @poops   = []
    @events  = []
    @now     = 0.0
    @net     = 0.0
  end

  def start
    Thread.new { run }
  end

  def nearest_player(x, z, radius)
    players.values.select(&:alive?).min_by { |player| player.car.distance_to(x, z) }&.then { |player| player if player.car.near?(x, z, radius) }
  end

  def kill(npc, player)
    scores.award(player.name, npc.reward)
    events << ['kill', npc.id, player.id, npc.reward, npc.x.round(1), npc.z.round(1)]
    events << ['score', player.id, scores[player.name]]
  end

  def explode(player, npc)
    return unless player.alive?
    player.dead_until = now + 2.5
    scores.reset(player.name)
    events << ['boom', player.id, npc.id]
    events << ['score', player.id, 0]
  end

  def lines_for(npc)
    voices.dig(npc.kind, npc.voice.mood.to_s) || []
  end

  def say(npc, index)
    events << ['say', npc.id, index]
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

  attr_reader :scores, :players, :poops, :events, :voices

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
    npcs.each { |npc| npc.tick(dt, self) if active?(npc) }
    respawn_players
    players.values.each { |player| leave(player.client) && player.client.close if now - player.last_seen > 10 }
    scores.flush(now)
    @net += dt
    return if @net < NET
    @net = 0.0
    players.each_value { |player| snapshot(player) }
    events.clear
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
    client.send('welcome' => { 'id' => player.id, 'world' => world.name, 'kinds' => Npc::KINDS, 'score' => scores[player.name], 't' => now.round(2), 'poops' => poops.map(&:to_row) })
  end

  def leave(client)
    players.delete(client.id) && events << ['left', client.id]
  end

  def move_player(player, x, z, heading, speed)
    return unless [x, z, heading, speed].all? { |value| value.is_a?(Numeric) && value.to_f.finite? }
    from = [player.car.x, player.car.z]
    player.car.move(*world.clamp(x, z), heading, speed)
    player.last_seen = now
    return if !player.alive? || Math.hypot(x - from[0], z - from[1]) > 30
    poops.reject! { |poop| poop.near?(player.car.x, player.car.z, 1.4) && events << ['unpoop', poop.id, player.id] }
    npcs.each do |npc|
      npc.combo(player, self) if npc.dead && npc.is_a?(DogWalker) && npc.near?(x, z, 10)
      next if npc.dead || !npc.near?(x, z, 40)
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
      npcs.each { |npc| npc.push(Math.sin(heading) * 12, Math.cos(heading) * 12) if !npc.dead && npc.near?(player.car.x, player.car.z, 6) }
      events << ['respawn', player.id]
    end
  end

  def active?(npc)
    players.each_value.any? { |player| player.car.near?(npc.x, npc.z, ACTIVE) }
  end

  def snapshot(player)
    rows, gone = [], []
    npcs.each do |npc|
      if player.car.near?(npc.x, npc.z, RANGE)
        rows << npc.to_row if player.known[npc.id] != npc.version
        player.known[npc.id] = npc.version
      elsif player.known.key?(npc.id) && !player.car.near?(npc.x, npc.z, DROP)
        gone << npc.id
        player.known.delete(npc.id)
      end
    end
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
