class TileGenerator
  def initialize(projection, boundary, overpass, ahn)
    @projection = projection
    @boundary   = boundary
    @overpass   = overpass
    @ahn        = ahn
  end

  def generate(tx, tz)
    tile = Tile.new(tx, tz)
    return { 'v' => Tile::VERSION, 'tx' => tx, 'tz' => tz, 'outside' => true } unless boundary.inside?(*tile.center)
    heights  = Thread.new { ahn.heights(projection.bbox(tile, Tile::STEP / 2.0), Tile::SAMPLES) }
    elements = overpass.fetch(query(tile))
    { 'v' => Tile::VERSION, 'tx' => tx, 'tz' => tz, 'outside' => false, 'terrain' => Terrain.new(tile, heights.value).to_h }
      .merge(TileBuilder.new(projection, tile).build(elements))
  end

  def query(tile)
    geo   = projection.bbox(tile, 60).join(',')
    towns = projection.bbox(tile, 3000).join(',')
    exact = projection.bbox(tile).join(',')
    <<~QL
      [out:json][timeout:120];
      (
        way["building"](#{geo});
        way["highway"](#{geo});
        way["railway"="rail"](#{geo});
        node["natural"="tree"](#{geo});
        node["shop"]["name"](#{geo});
        node["amenity"]["name"](#{geo});
        way["natural"~"^(water|wood|scrub)$"](#{geo});
        way["landuse"~"^(grass|forest|farmland|meadow|orchard|allotments|industrial|commercial|retail)$"](#{geo});
        way["amenity"="parking"](#{geo});
        way["leisure"~"^(park|pitch|playground|garden)$"](#{geo});
        way["waterway"~"^(river|canal|stream|ditch|drain)$"](#{geo});
      );
      out geom;
      node["place"~"^(city|town|village|suburb|hamlet)$"]["name"](#{towns});
      out;
      (
        nwr["shop"]["name"](#{exact});
        nwr["amenity"]["name"](#{exact});
        nwr["tourism"]["name"](#{exact});
        nwr["leisure"~"^(park|stadium|sports_centre|swimming_pool|playground|skatepark)$"](#{exact});
        nwr["leisure"="pitch"]["sport"="skateboard"](#{exact});
        nwr["railway"="station"]["name"](#{exact});
      );
      out center tags;
    QL
  end

  private

  attr_reader :projection, :boundary, :overpass, :ahn
end
