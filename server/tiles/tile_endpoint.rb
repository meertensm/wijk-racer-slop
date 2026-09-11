require 'json'

class TileEndpoint
  def initialize(store, static, world_info)
    @store      = store
    @static     = static
    @world_info = world_info
  end

  def respond(socket, request)
    case request.path
    when '/tiles/world.json' then static.json(socket, '200 OK', world_info.call)
    when '/tiles/status'     then static.json(socket, '200 OK', status(request.query['x'].to_f, request.query['z'].to_f))
    when '/places.json'      then static.json(socket, '200 OK', places)
    when %r{\A/tiles/#{Tile::VERSION}/(-?\d+)_(-?\d+)\.json\z} then tile(socket, Regexp.last_match(1).to_i, Regexp.last_match(2).to_i)
    else static.head(socket, '404 Not Found')
    end
  ensure
    socket.close
  end

  private

  attr_reader :store, :static, :world_info

  def tile(socket, tx, tz)
    store.request(tx, tz, 0) unless store.cached?(tx, tz)
    if store.wait(tx, tz, 25)
      static.file(socket, store.path(tx, tz), 'Cache-Control' => 'public, max-age=31536000, immutable', 'ETag' => %("#{Tile::VERSION}-#{tx}_#{tz}"))
    elsif store.failed?(tx, tz)
      static.json(socket, '503 Service Unavailable', { 'failed' => true }, 'Retry-After' => '30')
    else
      static.json(socket, '202 Accepted', { 'pending' => true }, 'Retry-After' => '2')
    end
  end

  def places
    Dir.glob(File.join(store.dir, '*.json')).flat_map do |file|
      JSON.parse(File.read(file, encoding: 'UTF-8')).fetch('places', [])
    rescue JSON::ParserError
      []
    end
  end

  def status(x, z)
    tx, tz = Tile.key(x, z)
    keys   = (-1..1).flat_map { |dx| (-1..1).map { |dz| [tx + dx, tz + dz] } }
    keys.each { |key| store.request(*key, 1) }
    { 'ready' => keys.count { |key| store.cached?(*key) }, 'wanted' => keys.length, 'queue' => store.queued }
  end
end
