class Poop < Entity
  attr_reader :born

  def initialize(id, x, z, born)
    super(id, x, z)
    @born = born
  end

  def to_row
    [id, x.round(1), z.round(1), born.round(1)]
  end
end
