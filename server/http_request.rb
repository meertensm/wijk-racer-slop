class HttpRequest
  attr_reader :method, :path, :headers

  def self.read(socket)
    line = socket.gets or return
    method, target = line.split(' ')
    headers = {}
    while (header = socket.gets) && header != "\r\n"
      name, value = header.split(':', 2)
      headers[name.strip.downcase] = value.to_s.strip if value
    end
    new(method, target.to_s.split('?').first, headers)
  end

  def initialize(method, path, headers)
    @method  = method
    @path    = path
    @headers = headers
  end

  def websocket?
    headers['upgrade'].to_s.downcase == 'websocket'
  end
end
