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

async function stampRoute(page) {
  for (let i = 0; i < 4; i++) {
    const name = (await page.locator('.route-scene p b').innerText()).trim()
    const options = await page.locator('.route-choices button').allTextContents()
    const index = options.findIndex(option => option.replace('⌖', '').trim() === name)
    assert.notEqual(index, -1, `Route option missing: ${name}`)
    await page.locator('.route-choices button').nth(index).click()
    if (i === 0 && (await page.getByRole('heading', { name: /Miller’s langur/ }).count())) {
      await page.keyboard.type('x')
      assert.match(await page.locator('.typing-prompt').innerText(), /Indonesia/)
    }
    await page.keyboard.type(name)
  }
  await page.getByRole('button', { name: 'Next stage' }).click()
}

async function typeBoard(page) {
  const count = await page.locator('.field-options button').count()
  for (let i = 0; i < count; i++) {
    const button = page.locator('.field-options button').nth(i)
    const text = await button.locator('.field-word').innerText()
    await button.click()
    await page.keyboard.type(text)
  }
}

async function playMouse(page) {
  for (let i = 0; i < 6; i++) {
    const target = page.locator('.marker-position.active button')
    const action = (await target.getAttribute('aria-label')).replace(' target', '')
    if (action === 'Right click') await target.click({ button: 'right' })
    else if (action === 'Double click') await target.dblclick()
    else if (action === 'Scroll down') await target.hover().then(() => page.mouse.wheel(0, 120))
    else await target.click()
  }
}

async function finishMission(page, number) {
  if (number === 1) await page.getByRole('button', { name: 'Start your first mission' }).click()
  else await page.getByRole('button', { name: 'Next mission' }).click()
  await page.getByRole('button', { name: 'Open your field lesson' }).click()
  await page.getByRole('button', { name: /Let's go to/ }).click()
  await page.getByRole('button', { name: 'Start stage' }).click()
  await stampRoute(page)
  await page.getByRole('button', { name: 'Start stage' }).click()
  if ([3, 5, 9].includes(number)) await playMouse(page)
  else if (number === 4) {
    for (const direction of ['left', 'forward', 'right', 'forward', 'left', 'forward', 'right', 'forward']) {
      await page.getByRole('button', { name: new RegExp(direction) }).last().click()
      await page.keyboard.type(direction)
    }
  } else await typeBoard(page)
  await page.getByRole('button', { name: 'Next stage' }).click()
  await page.getByRole('button', { name: 'Start stage' }).click()
  await typeBoard(page)
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
  console.log('Smoke test passed: all 10 missions, route, vines, cameras, drone, radio, sonar, journal, mouse surveys, reports, persistent trophies and offline photos.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
