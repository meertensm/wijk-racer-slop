require 'json'
require 'net/http'

class Overpass
  MIRRORS = %w[https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter]

  def initialize
    @mutex = Mutex.new
    @last  = 0.0
    @turn  = 0
  end

  def fetch(query)
    mutex.synchronize do
      6.times do |attempt|
        pause = @last + 1.0 - clock
        sleep(pause) if pause.positive?
        @last = clock
        response = post(MIRRORS[(@turn += 1) % MIRRORS.length], query)
        return JSON.parse(response.body.force_encoding('UTF-8')).fetch('elements') if response.is_a?(Net::HTTPSuccess)
        warn "overpass: #{response.code}, attempt #{attempt + 1}"
        sleep([15 * 2**attempt, 120].min)
      rescue Net::ReadTimeout, Net::OpenTimeout, SocketError, JSON::ParserError => error
        warn "overpass: #{error.class}, attempt #{attempt + 1}"
        sleep([15 * 2**attempt, 120].min)
      end
      raise 'Overpass unavailable'
    end
  end

  private

  attr_reader :mutex

  def post(server, query)
    uri  = URI(server)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl      = true
    http.read_timeout = 150
    http.open_timeout = 20
    request = Net::HTTP::Post.new(uri.path, 'Content-Type' => 'application/x-www-form-urlencoded', 'User-Agent' => 'wijk-racer/0.2')
    request.body = URI.encode_www_form(data: query)
    http.request(request)
  end

  def clock
    Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end
end
