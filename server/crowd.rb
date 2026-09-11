class Crowd
  include Enumerable

  def initialize(cell = 100)
    @grid  = Grid.new(cell)
    @npcs  = {}
    @cells = {}
  end

  def add(npc)
    npcs[npc.id] = npc
    place(npc)
  end

  def remove(npc)
    npcs.delete(npc.id)
    key = cells.delete(npc.id)
    grid.remove(npc, box(*key)) if key
  end

  def [](id)
    npcs[id]
  end

  def each(&block)
    npcs.each_value(&block)
  end

  def size
    npcs.size
  end

  def near(x, z, radius)
    grid.near(x, z, radius).select { |npc| npc.near?(x, z, radius) }
  end

  def settle(npc)
    return if cells[npc.id] == cell_of(npc)
    remove(npc)
    add(npc)
  end

  private

  attr_reader :grid, :npcs, :cells

  def cell_of(npc)
    [(npc.x / grid.cell).floor, (npc.z / grid.cell).floor]
  end

  def box(cx, cz)
    [cx * grid.cell, cz * grid.cell, cx * grid.cell, cz * grid.cell]
  end

  def place(npc)
    key = cell_of(npc)
    cells[npc.id] = key
    grid.add(npc, box(*key))
  end
end
