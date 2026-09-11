class Zwerver < HumanoidNpc
  LABEL  = 'Zwerver'
  REWARD = 1
  IDLE   = 0.6
  PACE   = 0.3..0.6
  GENDERS = %i[male female]
  MOODS   = %i[angry happy]
  LINES = {
    angry: [
      'Dit is mijn stoep, kankerlijer! Weg hier!',
      'Mijn blikjes! Je rijdt over mijn blikjes, klootzak!',
      'Flikker op met die kutpanda, ik slaap hier!',
      'Kom hier, tyfusjong, dan bijt ik je oor eraf!',
      'Ik heb niks meer en jij rijdt me ook nog dood!',
      'Mijn winkelwagen! Mijn hele leven zat daarin, lul!',
      'Ga terug naar Sittard, kutkop!',
      'Mijn rug! Mijn rug, godverdomme!'
    ],
    happy: [
      'Hé maat! Heb je een euro voor me? Fijne dag verder!',
      'Mooi weertje hè! Rij voorzichtig, jongen!',
      'Haha, wat een lekkere Panda! Mag ik een keer mee?',
      'Ik heb vandaag drie euro gevonden! Drie! Wat een dag!',
      'Toeter eens! Ja! Haha, geweldig!',
      'Geleen is toch prachtig in de herfst, vind je niet?',
      'Als je nog een blikje hebt, gooi maar hier! Bedankt!',
      'Wat een leven hè! Vrijheid, blijheid!'
    ]
  }
end
