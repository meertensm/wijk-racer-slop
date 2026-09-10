require 'json'

class Client
  attr_reader :id
  attr_accessor :player

  def initialize(id, socket, request, inbox)
    @id     = id
    @ws     = WebSocket.new(socket, request)
    @inbox  = inbox
    @outbox = Thread::Queue.new
  end

  def run
    ws.handshake
    inbox << [self, :open]
    Thread.new { write_loop }
    read_loop
  end

  def send(hash)
    close if outbox.size > 200
    outbox << JSON.generate(hash) unless outbox.closed?
  end

  def close
    outbox.close
    ws.close
  end

  private

  attr_reader :ws, :inbox, :outbox

  def read_loop
    while (text = ws.read)
      inbox << [self, JSON.parse(text)] rescue JSON::ParserError
    end
  rescue IOError, SystemCallError
  ensure
    inbox << [self, nil]
    close
  end

  def write_loop
    while (text = outbox.pop)
      ws.write(text)
    end
  rescue IOError, SystemCallError
    close
  end
end
