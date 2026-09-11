require 'json'
require 'fileutils'

class TileStore
  attr_reader :dir, :ready

  def initialize(dir, generator)
    @dir       = dir
    @generator = generator
    @mutex     = Mutex.new
    @pending   = {}
    @queue     = []
    @failed    = {}
    @ready     = Thread::Queue.new
    FileUtils.mkdir_p(dir)
    Thread.new { work }
  end

  def path(tx, tz)
    File.join(dir, "#{tx}_#{tz}.json")
  end

  def cached?(tx, tz)
    File.exist?(path(tx, tz))
  end

  def failed?(tx, tz)
    (failed[[tx, tz]] || 0) > clock - 60
  end

  def request(tx, tz, priority = 1)
    key = [tx, tz]
    mutex.synchronize do
      return if cached?(tx, tz) || pending.key?(key) || failed?(tx, tz)
      pending[key] = ConditionVariable.new
      queue << [priority, key]
      queue.sort_by!(&:first)
    end
  end

  def wait(tx, tz, timeout)
    deadline = clock + timeout
    mutex.synchronize do
      while !cached?(tx, tz) && (condition = pending[[tx, tz]]) && clock < deadline
        condition.wait(mutex, deadline - clock)
      end
    end
    cached?(tx, tz)
  end

  def tile(tx, tz)
    Tile.new(tx, tz, JSON.parse(File.read(path(tx, tz), encoding: 'UTF-8'))) if cached?(tx, tz)
  end

  def queued
    mutex.synchronize { queue.length }
  end

  private

  attr_reader :generator, :mutex, :pending, :queue, :failed

  def work
    loop do
      key = mutex.synchronize { queue.shift&.last }
      next sleep(0.05) unless key
      generate(*key)
    end
  end

  def generate(tx, tz)
    started = clock
    data    = generator.generate(tx, tz)
    adopt_edges(tx, tz, data)
    File.write("#{path(tx, tz)}.tmp", JSON.generate(data))
    File.rename("#{path(tx, tz)}.tmp", path(tx, tz))
    ready << [tx, tz]
    puts "tile #{tx},#{tz}: #{data['outside'] ? 'outside' : "#{data['buildings']&.length || 0} buildings"} in #{(clock - started).round(1)} s"
  rescue StandardError => error
    warn "tile #{tx},#{tz}: #{error.class}: #{error.message}"
    failed[[tx, tz]] = clock
  ensure
    mutex.synchronize { pending.delete([tx, tz])&.broadcast }
  end

  def adopt_edges(tx, tz, data)
    heights = data.dig('terrain', 'heights') or return
    n = Tile::SAMPLES
    { [1, 0] => ->(i) { [i * n + n - 1, i * n] }, [-1, 0] => ->(i) { [i * n, i * n + n - 1] },
      [0, 1] => ->(i) { [(n - 1) * n + i, i] }, [0, -1] => ->(i) { [i, (n - 1) * n + i] } }.each do |(dx, dz), pair|
      other = tile(tx + dx, tz + dz)&.data&.dig('terrain', 'heights') or next
      n.times { |i| mine, theirs = pair.call(i); heights[mine] = other[theirs] }
    end
  end

  def clock
    Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end
end
