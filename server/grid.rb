class Grid
  attr_reader :cell

  def initialize(cell = 40)
    @cell  = cell
    @cells = Hash.new { |hash, key| hash[key] = [] }
  end

  def add(entity, (min_x, min_z, max_x, max_z))
    each_cell(min_x, min_z, max_x, max_z) { |key| cells[key] << entity }
  end

  def remove(entity, (min_x, min_z, max_x, max_z))
    each_cell(min_x, min_z, max_x, max_z) { |key| cells[key].delete(entity); cells.delete(key) if cells[key].empty? }
  end

  def at(x, z)
    cells.fetch([(x / cell).floor, (z / cell).floor], [])
  end

  def near(x, z, radius)
    found = []
    each_cell(x - radius, z - radius, x + radius, z + radius) { |key| found.concat(cells.fetch(key, [])) }
    found
  end

  private

  attr_reader :cells

  def each_cell(min_x, min_z, max_x, max_z)
    ((min_x / cell).floor..(max_x / cell).floor).each do |cx|
      ((min_z / cell).floor..(max_z / cell).floor).each { |cz| yield [cx, cz] }
    end
  end
end
