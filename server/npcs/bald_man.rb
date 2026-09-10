class BaldMan < HumanoidNpc
  LABEL  = 'Kale man'
  REWARD = 0.1

  def chatty?(game)
    player = game.nearest_player(x, z, 12)
    player && player.car.speed.abs > 6
  end
end

class BaldFlag < BaldMan
  LABEL = 'Kale man met Brabantse vlag'
end
