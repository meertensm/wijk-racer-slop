require 'json'

class Positions
  def initialize(path)
    @path      = path
    @positions = File.exist?(path) ? JSON.parse(File.read(path, encoding: 'UTF-8')) : {}
    @dirty     = false
    @flushed   = 0.0
  end

  def [](name)
    positions[name]
  end

  def update(name, x, z, heading)
    positions[name] = { 'x' => x.round(1), 'z' => z.round(1), 'heading' => heading.round(3) }
    @dirty = true
  end

  def flush(now)
    return unless @dirty && now - @flushed > 5
    Dir.mkdir(File.dirname(path)) unless Dir.exist?(File.dirname(path))
    File.write("#{path}.tmp", JSON.pretty_generate(positions))
    File.rename("#{path}.tmp", path)
    @dirty   = false
    @flushed = now
  end

  private

  attr_reader :path, :positions
end
