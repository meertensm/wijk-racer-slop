class Terrain
  FALLBACK = 40.0

  def initialize(tile, grid)
    @tile = tile
    @grid = grid
  end

  def to_h
    x0, z0 = tile.bounds
    { 'x0' => x0, 'z0' => z0, 'step' => Tile::STEP, 'cols' => Tile::SAMPLES, 'rows' => Tile::SAMPLES, 'heights' => filled.flatten.map { |h| h.round(2) } }
  end

  def filled
    return @filled if @filled
    rows = grid.map(&:dup)
    25.times do
      break unless rows.flatten.include?(nil)
      rows = rows.each_with_index.map do |row, r|
        row.each_with_index.map do |value, c|
          next value if value
          neighbours = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter_map { |nr, nc| rows.dig(nr, nc) if nr >= 0 && nc >= 0 }
          neighbours.empty? ? nil : neighbours.sum / neighbours.size
        end
      end
    end
    known = rows.flatten.compact
    mean  = known.empty? ? FALLBACK : known.sum / known.size
    @filled = rows.map { |row| row.map { |value| value || mean } }
  end

  def filled_count
    grid.flatten.count(nil)
  end

  private

  attr_reader :tile, :grid
end
