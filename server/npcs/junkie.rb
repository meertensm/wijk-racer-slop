class Junkie < HumanoidNpc
  LABEL  = 'Junk'
  REWARD = 1
  IDLE   = 0.2
  PACE   = 1.6..2.8
  GENDERS = %i[male female]
  MOODS   = %i[angry happy]
  LINES = {
    angry: [
      'Heb je wat voor me of niet, kankerlijer!',
      'Ik zit te trillen en jij rijdt over mijn voeten, lul!',
      'Geef me geld! Nu! Tyfushond!',
      'Ik zie je wel, kutpanda! Ik zie alles!',
      'Mijn spullen! Je hebt mijn spullen geplet, klootzak!',
      'Flikker op, ik wacht hier op iemand, teringlijer!',
      'Mijn arm! Mijn goeie arm, godverdomme!',
      'Ik geef je aan! Bij iedereen! Kankerzak!'
    ],
    happy: [
      'Wauw, wat een kleuren, man! Je auto glimt helemaal!',
      'Heb je een tientje? Nee? Ook goed, ook goed!',
      'Ik voel me fantastisch! Alles klopt vandaag!',
      'Haha, die Panda! Die praat tegen me, man!',
      'Rij maar door hoor, ik vlieg zelf wel!',
      'Alles is liefde, jongen! Alles!',
      'Wat een rustige dag, hè? Zo mooi. Zo mooi.',
      'Toeter nog eens! Dat klonk als muziek!'
    ]
  }

  def decide(game)
    super
    @timer = 0.4 + rand * 0.8
  end
end
