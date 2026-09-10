class Game
  attr_reader :inbox

  def initialize
    @inbox   = Thread::Queue.new
    @clients = {}
  end

  def start
    Thread.new { loop { handle(*inbox.pop) } }
  end

  private

  attr_reader :clients

  def handle(client, message)
    case message
    when nil
      clients.delete(client.id)
      broadcast({ 'id' => client.id, 'gone' => true })
    when :open
      clients[client.id] = client
      client.send({ 'you' => client.id })
    else
      broadcast(message.merge('id' => client.id), client)
    end
  end

  def broadcast(hash, skip = nil)
    clients.each_value { |client| client.send(hash) unless client == skip }
  end
end
