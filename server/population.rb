class Population
  CLASSES = {
    'beagle'     => Beagle,    'baldman'   => BaldMan,   'baldflag' => BaldFlag, 'dogwalker' => DogWalker,
    'tattooman'  => TattooMan, 'speakerboy' => Speakerboy, 'zwerver' => Zwerver, 'zombie'   => Zombie,
    'junkie'     => Junkie
  }

  def initialize(world, random = Random.new(7))
    @world  = world
    @random = random
    @npcs   = []
  end

  def build
    chosen_spots.each { |x, z| spawn(kind_for(x, z), x, z, random.rand * Math::PI * 2) }
    world.spots.each { |spot| spawn(spot.kind, spot.x, spot.z, spot.heading) }
    npcs
  end

  private

  attr_reader :world, :random, :npcs

  def chosen_spots
    start      = [world.start['x'], world.start['z']]
    candidates = world.spawn_spots(random).shuffle(random: random).select { |x, z| Math.hypot(x - start[0], z - start[1]) > 30 && !world.blocked?(x, z) }
    near, far  = candidates.partition { |x, z| Math.hypot(x - start[0], z - start[1]) < 600 }
    chosen     = near.first(400) + far.first(600)
    world.zones.each { |zone| chosen += candidates.select { |x, z| world.zone_of(x, z) == zone }.first(150) }
    chosen.uniq
  end

  def kind_for(x, z)
    zone = world.zone_of(x, z)
    kind = zone ? zone.kinds[(random.rand * zone.kinds.length).floor] : random.rand < 0.17 ? 'dogwalker' : 'beagle'
    kind = 'baldflag' if kind == 'baldman' && random.rand < 0.3
    kind = 'beagle'   if kind == 'speakerboy' && npcs.any? { |npc| npc.is_a?(Speakerboy) && npc.distance_to(x, z) < 700 }
    kind
  end

  def spawn(kind, x, z, heading)
    npc = CLASSES.fetch(kind).new(npcs.length, x, z, heading, world, random)
    npcs << npc
    return unless npc.is_a?(DogWalker)
    npc.dog = Labradoodle.new(npcs.length, npc, world, random)
    npcs << npc.dog
  end
end
