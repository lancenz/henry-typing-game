import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const port = 4175
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
let browser

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://localhost:${port}/`)
      if (response.ok) return
    } catch { /* server still starting */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Preview server did not start')
}

async function flyRoute(page, number) {
  assert(await page.locator('.flight-world').evaluate(map => getComputedStyle(map).backgroundImage.includes('world-map.svg')))
  assert.equal(await page.locator('.flight-stop').first().locator('.flight-label').innerText(), 'Auckland')
  if (number === 1 && process.env.TRAVEL_SCREENSHOT) await page.locator('.flight-map').screenshot({ path: process.env.TRAVEL_SCREENSHOT })
  if (number === 1) {
    await page.waitForTimeout(11000)
    await page.getByRole('heading', { name: 'Flight crashed!' }).waitFor()
    assert.equal(await page.locator('.flight-map.crashed .flight-plane').count(), 1)
    await page.getByRole('button', { name: 'Fly again from Auckland' }).click()
    assert.equal(await page.locator('.flight-stats').innerText().then(text => text.includes('AIR: 10s')), true)
    await page.keyboard.type('x')
    assert.equal(await page.locator('.flight-words .active').innerText(), 'cat')
  }
  const initialPosition = await page.locator('.flight-plane').getAttribute('style')
  const initialCamera = await page.locator('.flight-world').getAttribute('style')
  for (let i = 0; i < 60; i++) {
    const word = (await page.locator('.flight-words .active').innerText()).trim()
    await page.keyboard.type(word + (i < 59 ? ' ' : ''))
    if (i === 15) assert.notEqual(await page.locator('.flight-plane').getAttribute('style'), initialPosition)
    if (i === 44 && number === 3) {
      await page.waitForTimeout(450)
      assert.notEqual(await page.locator('.flight-world').getAttribute('style'), initialCamera)
      if (process.env.TRAVEL_MID_SCREENSHOT) await page.locator('.flight-map').screenshot({ path: process.env.TRAVEL_MID_SCREENSHOT })
    }
    if (i === 55) {
      await page.waitForTimeout(450)
      const bounds = await page.locator('.flight-stop.destination').evaluate(destination => {
        const stop = destination.getBoundingClientRect(), map = destination.closest('.flight-map').getBoundingClientRect()
        return { visible: stop.left >= map.left && stop.right <= map.right && stop.top >= map.top && stop.bottom <= map.bottom, stop: [stop.left,stop.top,stop.right,stop.bottom], map: [map.left,map.top,map.right,map.bottom] }
      })
      assert(bounds.visible, `Destination should be visible near the end of mission ${number}: ${JSON.stringify(bounds)}`)
    }
  }
  assert.match(await page.locator('.stage-result .stars').innerText(), /★★★★★/)
  await page.getByRole('button', { name: 'Next stage' }).click()
}

async function rescue(page, number) {
  const scene = page.locator('.rescue-scene')
  assert(await page.locator('.rescue-landscape').evaluate(element => getComputedStyle(element).backgroundImage.includes('camera-')))
  assert.match(await page.locator('.rescue-metrics').innerText(), new RegExp(`/ ${10 + (number - 1) * 2} adjusted WPM`))
  assert.equal(await page.getByRole('progressbar', { name: 'Luck meter' }).getAttribute('aria-valuenow'), '0')
  assert.equal(await scene.locator('.rescue-reveal img').count(), 0)
  if (number === 1) {
    await page.keyboard.type('xxxx')
    assert.equal(await page.getByRole('progressbar', { name: 'Luck meter' }).getAttribute('aria-valuenow'), '0')
    await page.clock.fastForward(91000)
    await page.getByRole('heading', { name: 'No sighting this time.' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Write your field report' }).count(), 0)
    await page.getByRole('button', { name: 'Retry camera watch' }).click()
    await page.clock.runFor(10500)
    assert(await scene.getAttribute('class').then(classes => classes.includes('night')))
    assert.match(await page.locator('.rescue-camera-tag').innerText(), /NIGHT VISION/)
    assert(await page.locator('.rescue-landscape').evaluate(element => getComputedStyle(element).backgroundImage.includes('camera-forest-night.svg')))
    if (process.env.RESCUE_SCREENSHOT) await scene.screenshot({ path: process.env.RESCUE_SCREENSHOT })
    await page.clock.runFor(10000)
    assert.match(await page.locator('.rescue-camera-tag').innerText(), /DAYLIGHT/)
  }
  // Dispatch actual keyboard events at a steady human-like pace using the browser clock.
  await page.evaluate(interval => {
    window.rescueTestTyping = setInterval(() => {
      const letter = document.querySelector('.rescue-words .active em')?.textContent
      if (letter) window.dispatchEvent(new KeyboardEvent('keydown', { key: letter === '␣' ? ' ' : letter, bubbles: true }))
    }, interval)
  }, number === 1 ? 1000 : 115)
  await page.clock.runFor(13500)
  assert.equal(await page.getByRole('progressbar', { name: 'Luck meter' }).getAttribute('aria-valuenow'), '100')
  assert.match(await page.locator('.rescue-meter-heading').innerText(), /GREEN · HOLD/)
  assert.equal(await scene.locator('.rescue-reveal img').count(), 0)
  if (number === 1) {
    await page.evaluate(() => clearInterval(window.rescueTestTyping))
    await page.clock.runFor(6500)
    assert.equal(await page.locator('.rescue-metrics').innerText().then(text => text.includes('HOLD 0 / 15s')), true)
    assert(Number(await page.getByRole('progressbar', { name: 'Luck meter' }).getAttribute('aria-valuenow')) < 100)
    await page.evaluate(() => {
      window.rescueTestTyping = setInterval(() => {
        const letter = document.querySelector('.rescue-words .active em')?.textContent
        if (letter) window.dispatchEvent(new KeyboardEvent('keydown', { key: letter === '␣' ? ' ' : letter, bubbles: true }))
      }, 1000)
    })
    await page.clock.runFor(13500)
    assert.equal(await page.getByRole('progressbar', { name: 'Luck meter' }).getAttribute('aria-valuenow'), '100')
  }
  await page.clock.runFor(15500)
  await page.evaluate(() => clearInterval(window.rescueTestTyping))
  await page.getByRole('heading', { name: 'Animal revealed, Henry!' }).waitFor()
  assert.equal(await scene.locator('.rescue-reveal img').count(), 1)
  assert(await scene.locator('.rescue-reveal img').evaluate(image => image.complete && image.naturalWidth > 0))
}

async function race(page, number) {
  assert.equal(await page.locator('.race-car').count(), 4)
  assert(await page.locator('.race-near').evaluate(element => getComputedStyle(element).backgroundImage.includes('race-')))
  if (number === 1) {
    await page.clock.fastForward(91000)
    await page.getByRole('heading', { name: 'The poachers got ahead!' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Next stage' }).count(), 0)
    await page.getByRole('button', { name: 'Retry race' }).click()
    assert.equal(await page.locator('.race-metrics').innerText().then(text => text.includes('0% to finish')), true)
    await page.clock.runFor(12000)
    assert(await page.locator('.rival-0').getAttribute('style').then(style => style !== 'left: 7%;'))
    if (process.env.RACE_SCREENSHOT) await page.locator('.race-scene').screenshot({ path: process.env.RACE_SCREENSHOT })
    await page.clock.resume()
    await page.keyboard.type('x')
    assert.equal(await page.locator('.race-metrics').innerText().then(text => text.includes('0% to finish')), true)
  }
  const count = Number((await page.locator('.race-title span').innerText()).match(/\/ (\d+) WORDS/)?.[1])
  assert(count > 30 && count < 60)
  const initialPosition = await page.locator('.player-car').getAttribute('style')
  for (let i = 0; i < count; i++) {
    const word = (await page.locator('.race-words .active').innerText()).trim()
    await page.keyboard.type(word + (i < count-1 ? ' ' : ''))
    if (i === 0) assert.notEqual(await page.locator('.player-car').getAttribute('style'), initialPosition)
  }
  await page.getByRole('heading', { name: 'You won the race!' }).waitFor()
  assert.match(await page.locator('.stage-result .stars').innerText(), /★★★★★/)
}

async function finishMission(page, number) {
  if (number === 1) await page.getByRole('button', { name: 'Start your first mission' }).click()
  else await page.getByRole('button', { name: 'Next mission' }).click()
  await page.getByRole('button', { name: 'Open your field lesson' }).click()
  await page.getByRole('button', { name: /Let's go to/ }).click()
  await page.getByRole('button', { name: 'Take off' }).click()
  await flyRoute(page, number)
  if (number === 1) await page.clock.install()
  await page.getByRole('button', { name: 'Start race' }).click()
  await race(page, number)
  await page.getByRole('button', { name: 'Next stage' }).click()
  await page.getByRole('button', { name: 'Start camera watch' }).click()
  await rescue(page, number)
  await page.getByRole('button', { name: 'Write your field report' }).click()
  await page.getByRole('textbox', { name: 'Your field report' }).fill(`Dear Forrest, I learned about the animal in mission ${number}. I will protect its home.`)
  await page.getByRole('button', { name: 'Finish offline with a local reply' }).click()
  await page.getByRole('heading', { name: 'A new trophy for your shelf!' }).waitFor()
}

try {
  await waitForServer()
  const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`].find(path => path && existsSync(path))
  browser = await chromium.launch({ ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }), headless: true, args: process.platform === 'linux' ? ['--no-sandbox'] : [] })
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } })
  page.on('pageerror', error => { throw error })
  await page.goto(`http://localhost:${port}/`)
  await page.getByRole('button', { name: 'Start your first mission' }).waitFor()
  assert(await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"')))
  assert(await page.locator('.hero-art img').evaluate(image => image.complete && image.naturalWidth > 0))
  for (let number = 1; number <= 10; number++) await finishMission(page, number)
  await page.getByRole('button', { name: 'Visit trophy shelf' }).click()
  assert.equal(await page.locator('.trophy-card:not(.empty)').count(), 10)
  await page.reload()
  await page.getByRole('button', { name: '♜ Trophy shelf' }).click()
  assert.equal(await page.locator('.trophy-card:not(.empty)').count(), 10)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.context().setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: '♜ Trophy shelf' }).click()
  assert.equal(await page.locator('.trophy-card:not(.empty)').count(), 10)
  assert(await page.locator('.trophy-figure img').first().evaluate(image => image.complete && image.naturalWidth > 0))
  assert(await page.evaluate(async () => (await fetch('/world-map.svg')).ok))
  assert(await page.evaluate(async () => (await Promise.all(['/race-forest.svg','/race-mountains.svg','/race-shore.svg',...['forest','highland','water','wetland'].flatMap(habitat => [`/camera-${habitat}.svg`,`/camera-${habitat}-night.svg`])].map(path => fetch(path)))).every(response => response.ok)))
  console.log('Smoke test passed: all 10 missions, flight, race, Luck meter rescue win/loss/retry, reports, persistence and offline assets.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
