class Zwerver < HumanoidNpc
  LABEL  = 'Zwerver'
  REWARD = 0.2
  IDLE   = 0.6
  PACE   = 0.3..0.6
  GENDERS = %i[male female]
  MOODS   = %i[angry happy]
  LINES = {
    angry: [
      'HÉ! DIT IS MIJN STOEP, KANKERLIJER!',
      'GODVERDOMME! MIJN BLIKJES! JE RIJDT OVER MIJN BLIKJES!',
      'FLIKKER OP MET DIE KUTPANDA, IK SLAAP HIER!',
      'KOM HIER DAN, TYFUSJONG! IK BIJT JE OOR ERAF!',
      'IK HEB NIKS MEER EN JIJ RIJDT ME OOK NOG KANKERDOOD!',
      'GODVER! MIJN WINKELWAGEN! MIJN HELE KANKERLEVEN ZAT DAAR IN!',
      'GA TERUG NAAR SITTARD, KUTKOP!',
      'AAAH! MIJN RUG! MIJN TERINGRUG!'
    ],
    happy: [
      'Hé maat! Heb je een euro voor me? Fijne dag verder!',
      'Mooi weertje hè! Rij voorzichtig, jonguh!',
      'Haha, wat een lekkere Panda! Mag ik een keer mee?',
      'Ik heb vandaag drie euro gevonden! Drie! Wat een dag!',
      'Toeter eens! Ja! Haha, geweldig!',
      'Geleen is toch prachtig in de herfst, vind je niet?',
      'Als je nog een blikje hebt, gooi maar hier! Bedankt!',
      'Wat een leven hè! Vrijheid, blijheid!'
    ]
  }
end
