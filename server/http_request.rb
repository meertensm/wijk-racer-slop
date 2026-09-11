require 'uri'

class HttpRequest
  attr_reader :method, :path, :query, :headers

  def self.read(socket)
    line = socket.gets or return
    method, target = line.split(' ')
    headers = {}
    while (header = socket.gets) && header != "\r\n"
      name, value = header.split(':', 2)
      headers[name.strip.downcase] = value.to_s.strip if value
    end
    path, query = target.to_s.split('?', 2)
    new(method, path, query, headers)
  end

  def initialize(method, path, query, headers)
    @method  = method
    @path    = path
    @query   = URI.decode_www_form(query.to_s).to_h
    @headers = headers
  end

  def websocket?
    headers['upgrade'].to_s.downcase == 'websocket'
  end
end
