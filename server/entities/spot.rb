class Spot < Entity
  attr_reader :kind, :name

  def initialize(id, kind, name, x, z, heading)
    super(id, x, z, heading)
    @kind = kind
    @name = name
  end
end
