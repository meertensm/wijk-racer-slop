require 'json'

class WorldSlicer
  attr_reader :world

  def initialize(path)
    @world = JSON.parse(File.read(path, encoding: 'UTF-8'))
    world['roads'].each_with_index { |road, i| road['id'] = i }
    world['areas'].each_with_index { |area, i| area['id'] = 100_000 + i }
    world['buildings'].each_with_index { |building, i| building['id'] = i }
  end

  def generate(tx, tz)
    tile = Tile.new(tx, tz)
    min_x, min_z, max_x, max_z = world['bounds']
    x0, z0, x1, z1 = tile.bounds
    return { 'v' => Tile::VERSION, 'tx' => tx, 'tz' => tz, 'outside' => true } if x1 <= min_x || x0 >= max_x || z1 <= min_z || z0 >= max_z
    {
      'v' => Tile::VERSION, 'tx' => tx, 'tz' => tz, 'outside' => false,
      'terrain'   => terrain(tile),
      'buildings' => world['buildings'].select { |b| tile.contains?(*centroid(b['p'])) },
      'roads'     => world['roads'].select { |r| touches?(r['p'], tile) },
      'areas'     => world['areas'].select { |a| touches?(a['p'], tile) },
      'trees'     => world['trees'].select { |x, z| tile.contains?(x, z) },
      'places'    => world.fetch('places', []).select { |p| tile.contains?(p['x'], p['z']) },
      'towns'     => world.fetch('towns', []).select { |t| tile.contains?(t['x'], t['z']) }
    }
  end

  def covers?(tx, tz)
    min_x, min_z, max_x, max_z = world['bounds']
    x0, z0, x1, z1 = Tile.new(tx, tz).bounds
    x0 >= min_x && x1 <= max_x && z0 >= min_z && z1 <= max_z
  end

  def zones
    world.fetch('zones', []).map { |zone| { 'name' => zone['name'], 'kinds' => zone['kind'].split(','), 'p' => zone['p'] } }
  end

  private

  def centroid(points)
    xs, zs = points.transpose
    [(xs.min + xs.max) / 2.0, (zs.min + zs.max) / 2.0]
  end

  def touches?(points, tile)
    xs, zs = points.transpose
    x0, z0, x1, z1 = tile.bounds
    xs.max >= x0 && xs.min < x1 && zs.max >= z0 && zs.min < z1
  end

  def terrain(tile)
    grid = world['terrain']
    x0, z0 = tile.bounds
    heights = Array.new(Tile::SAMPLES * Tile::SAMPLES) do |i|
      height(grid, x0 + (i % Tile::SAMPLES) * Tile::STEP, z0 + (i / Tile::SAMPLES) * Tile::STEP).round(2)
    end
    { 'x0' => x0, 'z0' => z0, 'step' => Tile::STEP, 'cols' => Tile::SAMPLES, 'rows' => Tile::SAMPLES, 'heights' => heights }
  end

  def height(grid, x, z)
    gx = ((x - grid['x0']) / grid['sx']).clamp(0, grid['cols'] - 1.001)
    gz = ((z - grid['z0']) / grid['sz']).clamp(0, grid['rows'] - 1.001)
    i, j = gx.floor, gz.floor
    fx, fz = gx - i, gz - j
    at = ->(c, r) { grid['heights'][r * grid['cols'] + c] }
    (at[i, j] * (1 - fx) + at[i + 1, j] * fx) * (1 - fz) + (at[i, j + 1] * (1 - fx) + at[i + 1, j + 1] * fx) * fz
  end
end
