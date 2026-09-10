class Grid
  CELL = 40

  def initialize
    @cells = Hash.new { |hash, key| hash[key] = [] }
  end

  def add(entity, (min_x, min_z, max_x, max_z))
    ((min_x / CELL).floor..(max_x / CELL).floor).each do |cx|
      ((min_z / CELL).floor..(max_z / CELL).floor).each { |cz| cells[[cx, cz]] << entity }
    end
  end

  def at(x, z)
    cells.fetch([(x / CELL).floor, (z / CELL).floor], [])
  end

  private

  attr_reader :cells
end
