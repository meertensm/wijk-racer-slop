class Signs
  def self.attach(buildings, pois)
    grid = Hash.new { |hash, key| hash[key] = [] }
    buildings.each do |building|
      xs, zs = building['p'].transpose
      building[:centroid] = [xs.sum / xs.size, zs.sum / zs.size]
      grid[[(building[:centroid][0] / 50).floor, (building[:centroid][1] / 50).floor]] << building
    end
    pois.each do |x, z, name|
      nearby   = (-1..1).flat_map { |dx| (-1..1).flat_map { |dz| grid[[(x / 50).floor + dx, (z / 50).floor + dz]] } }
      building = nearby.find { |b| Geometry.inside?(b['p'], x, z) } || nearby.min_by { |b| Math.hypot(b[:centroid][0] - x, b[:centroid][1] - z) }
      building['sign'] ||= name.slice(0, 24) if building && Math.hypot(building[:centroid][0] - x, building[:centroid][1] - z) < 40
    end
    buildings.each { |building| building.delete(:centroid) }
  end
end
