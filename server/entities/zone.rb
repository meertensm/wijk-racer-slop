class Zone < Structure
  attr_reader :name, :kinds

  def initialize(id, name, kinds, polygon)
    super(id, polygon)
    @name  = name
    @kinds = kinds
  end
end
