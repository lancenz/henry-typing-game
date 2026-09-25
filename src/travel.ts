export interface Stop { name: string; lon: number; lat: number }
const city = (name: string, lon: number, lat: number): Stop => ({ name, lon, lat })
const auckland = city('Auckland', 174.8, -36.8)
const sydney = city('Sydney', 151.2, -33.9)
const singapore = city('Singapore', 103.8, 1.3)
const dubai = city('Dubai', 55.3, 25.2)
export const travelRoutes: Stop[][] = [
  [auckland, sydney, city('Darwin', 130.8, -12.5), singapore, city('Balikpapan', 116.8, -1.3), city('Samarinda', 117.2, -.5)],
  [auckland, sydney, singapore, city('Mumbai', 72.9, 19.1), city('Nairobi', 36.8, -1.3), city('Stone Town', 39.2, -6.2)],
  [auckland, sydney, singapore, dubai, city('Madrid', -3.7, 40.4), city('Bogotá', -74.1, 4.7), city('Puerto Ayora', -90.3, -.7)],
  [auckland, sydney, singapore, dubai, city('Lisbon', -9.1, 38.7), city('Bogotá', -74.1, 4.7), city('Leticia', -69.9, -4.2)],
  [auckland, sydney, city('Darwin', 130.8, -12.5), singapore, city('Ho Chi Minh City', 106.7, 10.8), city('Hanoi', 105.8, 21)],
  [auckland, sydney, singapore, city('Bangkok', 100.5, 13.8), city('Hanoi', 105.8, 21), city('Phong Nha', 106.3, 17.6)],
  [auckland, sydney, city('Darwin', 130.8, -12.5), singapore, city('Surabaya', 112.8, -7.3), city('Banyuwangi', 114.4, -8.2)],
  [auckland, sydney, singapore, city('Colombo', 79.9, 6.9), city('Malé', 73.5, 4.2)],
  [auckland, sydney, singapore, dubai, city('London', -.1, 51.5), city('New York', -74, 40.7), city('Lafayette', -92, 30.2)],
  [auckland, sydney, city('Melbourne', 144.9, -37.8), city('Launceston', 147.1, -41.4), city('Hobart', 147.3, -42.9)],
]

// Simple familiar words; 60 words of around four letters plus spaces take roughly
// two minutes at 30 conventional (five-character) words per minute.
const words = 'cat dog sun moon tree bird fish lake rain wind home book hand foot star leaf boat road hill rock sand wave blue gold green soft warm cool calm safe kind fast slow walk jump play look find help keep grow seed nest path map camp tent fire pond frog duck bear lion fox deer goat ship sail cloud light dark night day food milk cake apple grape river grass stone water small happy smile quiet brave watch after under over near far this that with from'.split(' ')
export const travelWords = (missionIndex: number) => Array.from({ length: 60 }, (_, i) => words[(i * 17 + missionIndex * 11) % words.length]!)
export const mapPoint = (stop: Stop) => ({ x: 30 + (stop.lon + 180) / 360 * 940, y: 35 + (75 - stop.lat) / 140 * 440 })
