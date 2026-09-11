class Population
  CLASSES = {
    'beagle'     => Beagle,    'baldman'   => BaldMan,   'baldflag' => BaldFlag, 'dogwalker' => DogWalker,
    'tattooman'  => TattooMan, 'speakerboy' => Speakerboy, 'zwerver' => Zwerver, 'zombie'   => Zombie,
    'junkie'     => Junkie,    'labradoodle' => Labradoodle, 'politie' => Politie
  }
  SPOTS_PER_TILE = 1000

  def initialize(world, crowd)
    @world = world
    @crowd = crowd
  end

  def spawn(entry)
    tile   = entry[:tile]
    random = Random.new(tile.seed & 0x7fffffff)
    ids    = tile.id_base
    start  = world.start
    spots  = entry[:roads].select(&:walkable?).flat_map { |road| road.sidewalk_spots(random) }
                          .select { |x, z| tile.contains?(x, z) && !world.blocked?(x, z) && Math.hypot(x - start['x'], z - start['z']) > 30 }
                          .shuffle(random: random).first(SPOTS_PER_TILE)
    spots.each do |x, z|
      klass = CLASSES.fetch(kind_for(x, z, random))
      next if random.rand > klass::DENSITY
      npc = klass.new(ids += 1, x, z, random.rand * Math::PI * 2, world, random)
      entry[:npcs] << npc
      crowd.add(npc)
      next unless npc.is_a?(DogWalker)
      npc.dog = Labradoodle.new(ids += 1, npc, world, random)
      entry[:npcs] << npc.dog
      crowd.add(npc.dog)
    end
    world.spots.select { |spot| tile.contains?(spot.x, spot.z) }.each_with_index do |spot, i|
      npc = CLASSES.fetch(spot.kind).new(tile.id_base + 4000 + i, spot.x, spot.z, spot.heading, world, random)
      entry[:npcs] << npc
      crowd.add(npc)
    end
    entry[:npcs]
  end

  def despawn(entry)
    entry[:npcs].each { |npc| crowd.remove(npc) }
    entry[:npcs].clear
  end

  private

  attr_reader :world, :crowd

  def kind_for(x, z, random)
    zone = world.zone_of(x, z)
    kind = zone ? zone.kinds[(random.rand * zone.kinds.length).floor] : random.rand < 0.17 ? 'dogwalker' : 'beagle'
    kind = 'baldflag' if kind == 'baldman' && random.rand < 0.3
    kind = 'beagle'   if kind == 'speakerboy' && crowd.near(x, z, 700).any?(Speakerboy)
    kind
  end
end
