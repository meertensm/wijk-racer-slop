require 'digest/sha1'

class WebSocket
  GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

  def initialize(socket, request)
    @socket  = socket
    @request = request
  end

  def handshake
    accept = [Digest::SHA1.digest(request.headers['sec-websocket-key'].to_s + GUID)].pack('m0')
    socket.write "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: #{accept}\r\n\r\n"
  end

  def read
    loop do
      frame = read_frame or return
      opcode, payload = frame
      case opcode
      when 1  then return payload.force_encoding('UTF-8')
      when 8  then close; return
      when 9  then write_frame(10, payload)
      when 10 then next
      else close(1003); return
      end
    end
  end

  def write(text)
    write_frame(1, text.b)
  end

  def close(code = 1000)
    write_frame(8, [code].pack('n')) rescue nil
    socket.close rescue nil
  end

  private

  attr_reader :socket, :request

  def read_frame
    head = socket.read(2) or return
    return if head.bytesize < 2
    opcode = head.getbyte(0) & 0x0f
    length = head.getbyte(1) & 0x7f
    masked = head.getbyte(1) & 0x80 != 0
    length = socket.read(2).unpack1('n') if length == 126
    length = socket.read(8).unpack1('Q>') if length == 127
    mask    = masked ? socket.read(4).bytes : nil
    payload = length.zero? ? ''.b : socket.read(length)
    return unless payload
    payload = payload.bytes.each_with_index.map { |byte, i| byte ^ mask[i % 4] }.pack('C*') if mask
    [opcode, payload]
  end

  def write_frame(opcode, payload)
    length = payload.bytesize
    header = [0x80 | opcode].pack('C')
    header << if length < 126     then [length].pack('C')
              elsif length < 65536 then [126, length].pack('Cn')
              else                      [127, length].pack('CQ>')
              end
    socket.write(header + payload)
  end
end
