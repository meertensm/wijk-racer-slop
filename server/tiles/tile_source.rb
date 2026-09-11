class TileSource
  def initialize(slicer, generator)
    @slicer    = slicer
    @generator = generator
  end

  def generate(tx, tz)
    slicer&.covers?(tx, tz) ? slicer.generate(tx, tz) : generator.generate(tx, tz)
  end

  private

  attr_reader :slicer, :generator
end
