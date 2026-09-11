require 'socket'

class Server
  def initialize(port, game, root, tiles = nil)
    @port    = port
    @game    = game
    @static  = Static.new(root)
    @tiles   = tiles
    @counter = 0
  end

  def run
    listener = TCPServer.new(port)
    game.start
    puts "http://localhost:#{port}"
    loop do
      socket = listener.accept
      Thread.new { handle(socket) }
    end
  end

  private

  attr_reader :port, :game, :static, :tiles

  def handle(socket)
    request = HttpRequest.read(socket) or return socket.close
    if request.websocket?
      Client.new(@counter += 1, socket, request, game.inbox).run
    elsif tiles && request.path.start_with?('/tiles/')
      tiles.respond(socket, request)
    else
      static.respond(socket, request)
    end
  rescue IOError, SystemCallError
    socket.close rescue nil
  end
end
