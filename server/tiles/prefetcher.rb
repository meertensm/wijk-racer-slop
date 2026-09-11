class Prefetcher
  def initialize(store)
    @store = store
  end

  def update(players)
    players.each do |player|
      tx, tz = player.tile
      store.request(tx, tz, 0)
      ring(tx, tz, 1) { |key| store.request(*key, 1) }
      if player.car.speed.abs > 8
        dx, dz = Math.sin(player.car.heading).round, Math.cos(player.car.heading).round
        store.request(tx + dx * 2, tz + dz * 2, 2)
        store.request(tx + dx * 3, tz + dz * 3, 2)
      end
      ring(tx, tz, 2) { |key| store.request(*key, 3) }
    end
  end

  private

  attr_reader :store

  def ring(tx, tz, reach)
    (-reach..reach).each { |dx| (-reach..reach).each { |dz| yield [tx + dx, tz + dz] } }
  end
end
