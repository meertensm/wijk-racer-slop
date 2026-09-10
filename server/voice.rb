Voice = Struct.new(:gender, :mood) do
  def code
    (gender == :female ? 2 : 0) + (mood == :happy ? 1 : 0)
  end
end
