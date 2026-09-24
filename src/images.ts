export interface AnimalImage {
  src: string
  note: string
  credit: string
  license: string
  source: string
}

// Local, downsized Commons files. Notes distinguish archival specimens and representative relatives.
export const animalImages: AnimalImage[] = [
  { src: '/animals/01.jpg', note: 'Wild Miller’s langur · photograph', credit: 'Simon Fraser University Public Affairs and Media Relations', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Presbytis_hosei_canicrus.jpg' },
  { src: '/animals/02.jpg', note: 'Zanzibar leopard · museum specimen (not a recent sighting)', credit: 'Peter Maas', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Zanzibar_Leopard_2.JPG' },
  { src: '/animals/03.jpg', note: 'Fernandina tortoise · archival 1906 specimen, not the living female', credit: 'John Van Denburgh', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Chelonoidis_nigra_phantastica.jpg' },
  { src: '/animals/04.jpg', note: 'Spectacled caiman · related subspecies, not a Rio Apaporis individual', credit: 'Charles J. Sharp', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Spectacled_caiman_(Caiman_crocodilus).jpg' },
  { src: '/animals/05.jpg', note: 'Yangtze giant softshell turtle · photograph', credit: 'Johnleung2000s', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Rafetus_swinhoei.jpg' },
  { src: '/animals/06.jpg', note: 'Saola · preserved head specimen, not a live sighting', credit: 'Dao Nguyen and James Hardcastle', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Pseudoryx_nghetinhensis_318200.jpg' },
  { src: '/animals/07.jpg', note: 'Javan tiger · historical 1938 photograph', credit: 'Andries Hoogerwerf', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Panthera_tigris_sondaica_01.jpg' },
  { src: '/animals/08.jpg', note: 'Pondicherry shark · scientific illustration, not a photograph', credit: 'Zoological Survey of India', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Carcharhinus_hemiodon_2.jpg' },
  { src: '/animals/09.jpg', note: 'Ivory-billed woodpecker · colorized historical photograph', credit: 'Arthur A. Allen (1935), colorized by Jerry A. Payne / USDA-ARS', license: 'CC BY 3.0 US', source: 'https://commons.wikimedia.org/wiki/File:Ivory-billed_Woodpecker_by_Jerry_A._Payne.jpg' },
  { src: '/animals/10.jpg', note: 'Thylacine · historical 1936 photograph', credit: 'Ben Sheppard', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Thylacine_at_Beaumaris_Zoo,_1936_(NS4371-1-1063).jpg' },
]
