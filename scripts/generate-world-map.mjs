// Regenerate the locally bundled map from Natural Earth public-domain data.
// Source: https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
// Terms: https://www.naturalearthdata.com/about/terms-of-use/
import { writeFile } from 'node:fs/promises'

const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
const response = await fetch(source)
if (!response.ok) throw new Error(`Natural Earth download failed: ${response.status}`)
const { features } = await response.json()
if (features.length < 160) throw new Error('Country outlines are missing from the map data')

// Keep these in sync with mapPoint in src/travel.ts: the SVG and route share
// one equirectangular coordinate space so city dots sit on the country shapes.
const point = ([lon, lat]) => [30 + (lon + 180) / 360 * 940, 35 + (75 - lat) / 140 * 440]
const pair = coords => coords.map(number => number.toFixed(1)).join(' ')
const ringPath = ring => `M${ring.map(coords => pair(point(coords))).join(' ')}Z`
const countryPaths = features.flatMap((feature, index) => {
  if (feature.properties.ADMIN === 'Antarctica') return []
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const d = polygons.flatMap(polygon => polygon.map(ringPath)).join('')
  const colors = ['#bfaa7b', '#c9b587', '#b9a475', '#c5af81']
  return [`<path d="${d}" fill="${colors[index % colors.length]}"/>`]
})

const labels = [
  ['UNITED STATES', -103, 39], ['MEXICO', -102, 24], ['COLOMBIA', -73, 2],
  ['ECUADOR', -77, -3], ['BRAZIL', -54, -13], ['TANZANIA', 34, -7],
  ['SPAIN', -4, 40], ['INDIA', 79, 23], ['VIETNAM', 108, 16],
  ['INDONESIA', 117, -7], ['AUSTRALIA', 134, -26], ['NEW ZEALAND', 164, -45],
].map(([name, lon, lat]) => {
  const [x, y] = point([lon, lat])
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${name}</text>`
}).join('')

const islands = [[-90.3, -.7], [73.5, 4.2], [39.2, -6.2]]
  .map(coords => { const [x, y] = point(coords); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4"/>` }).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" role="img" aria-label="Antique map of the world with country borders, based on Natural Earth public-domain data">
<defs><radialGradient id="sea"><stop stop-color="#efe0b2"/><stop offset=".75" stop-color="#d7bc83"/><stop offset="1" stop-color="#b79a6b"/></radialGradient><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="8" stitchTiles="stitch" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".14"/></feComponentTransfer></filter></defs>
<rect width="1000" height="520" fill="url(#sea)"/>
<g fill="none" stroke="#8c744e" stroke-opacity=".22" stroke-width=".7"><path d="M30 82H970 M30 176H970 M30 270H970 M30 364H970 M30 458H970 M135 30V485 M252 30V485 M370 30V485 M488 30V485 M605 30V485 M723 30V485 M840 30V485"/></g>
<g stroke="#735d40" stroke-width=".65" stroke-linejoin="round" fill-rule="evenodd">${countryPaths.join('')}</g>
<g fill="#bca979" stroke="#735d40" stroke-width=".5">${islands}</g>
<g fill="#55432f" font-family="Georgia,serif" font-size="6.7" font-weight="bold" letter-spacing=".6" opacity=".76" text-anchor="middle">${labels}</g>
<g fill="#715f43" font-family="Georgia,serif" font-size="10" font-style="italic" opacity=".55" letter-spacing="1"><text x="398" y="320">ATLANTIC OCEAN</text><text x="90" y="341">PACIFIC OCEAN</text><text x="679" y="378">INDIAN OCEAN</text></g>
<g transform="translate(73 435)" fill="none" stroke="#665239" opacity=".6"><circle r="23"/><circle r="17"/><path d="M-27 0H27 M0-27V27 M-13-13 13 13 M13-13-13 13"/><text x="-4" y="-29" font-family="Georgia" font-size="10" fill="#665239" stroke="none">N</text></g>
<rect width="1000" height="520" filter="url(#paper)" opacity=".75"/>
</svg>\n`
await writeFile(new URL('../public/world-map.svg', import.meta.url), svg)
console.log(`Wrote ${countryPaths.length} Natural Earth countries to public/world-map.svg`)
