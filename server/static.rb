class Static
  TYPES = {
    'html' => 'text/html; charset=utf-8', 'js'  => 'text/javascript', 'json' => 'application/json',
    'css'  => 'text/css',                 'jpg' => 'image/jpeg',      'jpeg' => 'image/jpeg',
    'png'  => 'image/png',                'svg' => 'image/svg+xml',   'mp3'  => 'audio/mpeg'
  }

  def initialize(root)
    @root = File.expand_path(root)
  end

  def respond(socket, request)
    if request.method != 'GET'
      head(socket, '405 Method Not Allowed')
    elsif (file = resolve(request.path))
      head(socket, '200 OK', 'Content-Type' => TYPES.fetch(File.extname(file).delete('.'), 'application/octet-stream'), 'Content-Length' => File.size(file))
      IO.copy_stream(file, socket)
    else
      head(socket, '404 Not Found')
    end
  ensure
    socket.close
  end

  private

  attr_reader :root

  def resolve(path)
    file = File.expand_path(path == '/' ? 'index.html' : path.delete_prefix('/'), root)
    file if file.start_with?("#{root}/") && File.file?(file)
  end

  def head(socket, status, extra = {})
    headers = { 'Cache-Control' => 'no-store', 'Connection' => 'close' }.merge(extra)
    socket.write "HTTP/1.1 #{status}\r\n#{headers.map { |name, value| "#{name}: #{value}\r\n" }.join}\r\n"
  end
end
