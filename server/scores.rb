require 'json'

class Scores
  def initialize(path)
    @path    = path
    @scores  = File.exist?(path) ? JSON.parse(File.read(path, encoding: 'UTF-8')) : {}
    @dirty   = false
    @flushed = 0.0
  end

  def [](name)
    scores.fetch(name, 0)
  end

  def award(name, amount)
    scores[name] = ((self[name] + amount) * 10).round / 10.0
    @dirty = true
  end

  def reset(name)
    scores[name] = 0
    @dirty = true
  end

  def flush(now)
    return unless @dirty && now - @flushed > 5
    Dir.mkdir(File.dirname(path)) unless Dir.exist?(File.dirname(path))
    File.write("#{path}.tmp", JSON.pretty_generate(scores))
    File.rename("#{path}.tmp", path)
    @dirty   = false
    @flushed = now
  end

  private

  attr_reader :path, :scores
end
