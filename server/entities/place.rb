class Place < Entity
  attr_reader :name, :kind, :town

  def initialize(id, name, kind, town, x, z)
    super(id, x, z)
    @name = name
    @kind = kind
    @town = town
  end
end
