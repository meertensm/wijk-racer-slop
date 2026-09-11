class Start
  def initialize(store, projection, nominatim)
    @store      = store
    @projection = projection
    @nominatim  = nominatim
  end

  def locate(address)
    x, z = projection.project(*nominatim.geocode(address))
    tile = store.tile(*Tile.key(x, z)) or raise "start tile for #{address} is not cached"
    snap(tile, x, z)
  end

  private

  attr_reader :store, :projection, :nominatim

  def snap(tile, x, z)
    best = nil
    tile.roads.select { |road| road['kind'] == 'road' }.each do |road|
      road['p'].each_cons(2) do |a, b|
        t = fraction(x, z, a, b)
        px, pz = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        distance = Math.hypot(px - x, pz - z)
        best = { 'x' => px.round(1), 'z' => pz.round(1), 'heading' => Math.atan2(b[0] - a[0], b[1] - a[1]).round(3), distance: distance } if best.nil? || distance < best[:distance]
      end
    end
    best ? best.except(:distance) : { 'x' => x, 'z' => z, 'heading' => 0.0 }
  end

  def fraction(x, z, (ax, az), (bx, bz))
    dx, dz = bx - ax, bz - az
    length = dx * dx + dz * dz
    length.zero? ? 0.0 : (((x - ax) * dx + (z - az) * dz) / length).clamp(0.0, 1.0)
  end
end
