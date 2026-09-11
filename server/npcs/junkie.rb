class Junkie < HumanoidNpc
  LABEL  = 'Junk'
  REWARD = 1
  IDLE   = 0.2
  PACE   = 1.6..2.8
  GENDERS = %i[male female]
  MOODS   = %i[angry happy]
  LINES = {
    angry: [
      'HÉ! HEB JE WAT VOOR ME OF NIET, KANKERLIJER!',
      'GODVERDOMME! IK ZIT TE TRILLEN EN JIJ RIJDT OVER MIJN VOETEN!',
      'GEEF ME GELD! NU! TYFUSHOND!',
      'IK ZIE JE WEL, KUTPANDA! IK ZIE ALLES!',
      'MIJN SPULLEN! JE HEBT MIJN KANKERSPULLEN GEPLET!',
      'FLIKKER OP, IK WACHT HIER OP IEMAND, TERINGLIJER!',
      'AAAH! MIJN ARM! MIJN GOEIE ARM, GODVERDOMME!',
      'IK GA JE AANGEVEN! BIJ IEDEREEN! KANKERZAK!'
    ],
    happy: [
      'Wow, wat een kleuren, man! Je auto glimt helemaal!',
      'Heb je een tientje? Nee? Ook goed, ook goed!',
      'Ik voel me fantastisch! Alles klopt vandaag!',
      'Haha, die Panda! Die praat tegen me, man!',
      'Rij maar door hoor, ik vlieg zelf wel!',
      'Alles is liefde, jonguh! Alles!',
      'Wat een rustige dag, hè? Zo mooi. Zo mooi.',
      'Toeter nog eens! Dat klonk als muziek!'
    ]
  }

  def decide(game)
    super
    @timer = 0.4 + rand * 0.8
  end
end
