<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { missions, source, testTexts } from './data'
import { animalImages } from './images'
import { initDb, getResults, getTests, getReports, getSetting, setSetting, saveResult, saveTest, saveReport, type Result, type TestResult, type Report } from './db'
import { checkReport, replyToReport, type Correction } from './ai'
import { travelRoutes, travelWords, mapPoint } from './travel'
import { raceWords, raceTerrain, rivalFinishTimes } from './race'

type Page = 'base' | 'map' | 'mission' | 'shelf' | 'test' | 'settings'
const page = ref<Page>('base')
const ready = ref(false)
const error = ref('')
const results = ref<Result[]>([])
const tests = ref<TestResult[]>([])
const reports = ref<Report[]>([])
const apiKey = ref('')
const model = ref('openai/gpt-4o-mini')
const voice = ref(true)
const missionIndex = ref(0)
const phase = ref(0)
const playing = ref(false)
const finished = ref(false)
const failed = ref(false)
const prompts = ref<string[]>([])
const promptIndex = ref(0)
const character = ref(0)
const mistakes = ref(0)
const correct = ref(0)
const seconds = ref(0)
const duration = ref(0)
const started = ref(0)
const feedback = ref('')
const outcome = ref({ stars: 0, gold: 0, wpm: 0, accuracy: 0 })
const reportText = ref('')
const reportReply = ref('')
const corrections = ref<Correction[]>([])
const checkedText = ref('')
const aiBusy = ref(false)
const aiError = ref('')
const testPlaying = ref(false)
const testDone = ref(false)
const testText = ref('')
const testCursor = ref(0)
const testCorrect = ref(0)
const testMistakes = ref(0)
const testTime = ref(60)
const testOutcome = ref({ wpm: 0, accuracy: 0, score: 0, record: false })
const selectedIndex = ref<number | null>(null)
const clearedIndices = ref<number[]>([])
const lastFlightKey = ref(0)
const stallSeconds = ref(10)
const raceElapsed = ref(0)
const raceNow = ref(0)
const boostUntil = ref(0)
const rivalProgress = ref([0, 0, 0])
const rivalHoldUntil = [0, 0, 0]
const rivalNextHold = [0, 0, 0]
let lastRaceTick = 0
const gameInput = ref<HTMLInputElement | null>(null)
const online = ref(navigator.onLine)
let tick: ReturnType<typeof setInterval> | undefined

const mission = computed(() => missions[missionIndex.value]!)
const earned = computed(() => results.value.reduce((sum, r) => sum + r.gold, 0))
const best = computed(() => Math.max(0, ...tests.value.map(t => t.score)))
const completed = computed(() => new Set(reports.value.map(r => r.mission)))
const unlocked = computed(() => Math.min(missions.length, completed.value.size + 1))
const isRoute = computed(() => phase.value === 2)
const isRace = computed(() => phase.value === 3)
const playerDistance = computed(() => correct.value / Math.max(1, prompts.value.join(' ').length))
const boosting = computed(() => raceNow.value < boostUntil.value)
const flightStops = computed(() => travelRoutes[missionIndex.value]!.map(stop => ({ ...stop, ...mapPoint(stop) })))
const flightProgress = computed(() => Math.min(1, (promptIndex.value + character.value / Math.max(1, currentPrompt.value.length)) / Math.max(1, prompts.value.length)))
const flightPosition = computed(() => {
  const position = flightProgress.value * (flightStops.value.length - 1)
  const index = Math.min(Math.floor(position), flightStops.value.length - 2)
  const from = flightStops.value[index]!, to = flightStops.value[index + 1]!, fraction = position - index
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction, angle: Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI, index }
})
const routeLine = computed(() => flightStops.value.map(stop => `${stop.x},${stop.y}`).join(' '))
const flownLine = computed(() => [...flightStops.value.slice(0, flightPosition.value.index + 1).map(stop => `${stop.x},${stop.y}`), `${flightPosition.value.x},${flightPosition.value.y}`].join(' '))
const mapZoom = computed(() => missionIndex.value === 9 ? 3.6 : 2.35)
const cameraStyle = computed(() => {
  const plane = flightPosition.value
  const ahead = flightStops.value[Math.min(plane.index + 1, flightStops.value.length - 1)]!
  const focusX = (plane.x * .68 + ahead.x * .32) / 1000
  const focusY = (plane.y * .7 + ahead.y * .3) / 520
  const clamp = (value: number) => Math.max(1 - mapZoom.value, Math.min(0, value))
  const x = clamp(.5 - mapZoom.value * focusX)
  const y = clamp(.6 - mapZoom.value * focusY)
  return { transform: `translate(${x * 100}%, ${y * 100}%) scale(${mapZoom.value})` }
})
const isBoard = computed(() => phase.value === 4)
const boardKind = computed(() => ['vines','cameras','tracks','river','lake','radio','tracks','sonar','lookout','journal'][missionIndex.value] ?? 'tracks')
const currentPrompt = computed(() => isBoard.value ? prompts.value[selectedIndex.value ?? -1] ?? '' : (isRoute.value || isRace.value) && promptIndex.value < prompts.value.length - 1 ? `${prompts.value[promptIndex.value]} ` : prompts.value[promptIndex.value] ?? '')
const expected = computed(() => currentPrompt.value[character.value] ?? '')
const stageName = computed(() => phase.value === 2 ? 'Expedition route' : phase.value === 3 ? 'Race to the field site' : `Protect the ${mission.value.animal}`)
const progress = computed(() => prompts.value.length ? Math.round((promptIndex.value / prompts.value.length) * 100) : 0)
const accuracy = computed(() => correct.value + mistakes.value ? Math.round(100 * correct.value / (correct.value + mistakes.value)) : 100)
const fingers: Record<string, string> = {
  '`':'Left pinky','1':'Left pinky','q':'Left pinky','a':'Left pinky','z':'Left pinky',
  '2':'Left ring','w':'Left ring','s':'Left ring','x':'Left ring',
  '3':'Left middle','e':'Left middle','d':'Left middle','c':'Left middle',
  '4':'Left index','5':'Left index','r':'Left index','t':'Left index','f':'Left index','g':'Left index','v':'Left index','b':'Left index',
  '6':'Right index','7':'Right index','y':'Right index','u':'Right index','h':'Right index','j':'Right index','n':'Right index','m':'Right index',
  '8':'Right middle','i':'Right middle','k':'Right middle',',':'Right middle',
  '9':'Right ring','o':'Right ring','l':'Right ring','.':'Right ring',
  '0':'Right pinky','p':'Right pinky',';':'Right pinky','/':'Right pinky','-':'Right pinky',"'":'Right pinky',
  ' ':'Either thumb',
}
const leftKeys = [['1','2','3','4','5'],['Q','W','E','R','T'],['A','S','D','F','G'],['Z','X','C','V','B']]
const rightKeys = [['6','7','8','9','0'],['Y','U','I','O','P'],['H','J','K','L',';'],['N','M',',','.','/']]
const finger = computed(() => expected.value === ' ' ? 'Either thumb' : fingers[expected.value.toLowerCase()] ?? 'Nearest pinky')
const shownKey = computed(() => expected.value === ' ' ? 'SPACE' : expected.value.toUpperCase())

function refresh() { results.value = getResults(); tests.value = getTests(); reports.value = getReports() }
onMounted(async () => {
  try { await initDb(); refresh(); apiKey.value = getSetting('key'); model.value = getSetting('model') || model.value; voice.value = getSetting('voice') !== 'off'; ready.value = true }
  catch (e) { error.value = `Could not open local game data: ${String(e)}` }
})
onUnmounted(() => { stopTick(); speechSynthesis.cancel() })
function stopTick() { if (tick) clearInterval(tick); tick = undefined }
function speak(text: string) {
  if (!voice.value || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.82; utterance.pitch = 1.05; utterance.lang = 'en-US'
  speechSynthesis.speak(utterance)
}
function sayPrompt() {
  if (currentPrompt.value && !currentPrompt.value.includes(' ')) speak(`${currentPrompt.value}. ${[...currentPrompt.value].join(', ')}`)
}
function go(where: Page) { stopTick(); playing.value = false; testPlaying.value = false; speechSynthesis.cancel(); page.value = where }
function openMission(index: number) {
  if (index >= unlocked.value) return
  stopTick(); missionIndex.value = index; phase.value = 0; playing.value = false; finished.value = false
  failed.value = false; reportText.value = reports.value.find(r => r.mission === index + 1)?.text ?? ''
  reportReply.value = ''
  corrections.value = []; aiError.value = ''; page.value = 'mission'
}
function nextPhase() {
  stopTick(); playing.value = false; finished.value = false; failed.value = false; feedback.value = ''
  if (phase.value < 5) phase.value++
  else if (phase.value === 5) phase.value = 6
}
function stagePrompts(): string[] {
  if (phase.value === 2) return travelWords(missionIndex.value)
  if (phase.value === 3) return raceWords(missionIndex.value)
  return mission.value.id >= 7 ? mission.value.sentences : [...mission.value.words.slice(4), ...mission.value.sentences.slice(0, 1)]
}
function startStage() {
  prompts.value = stagePrompts(); promptIndex.value = 0; character.value = 0; mistakes.value = 0; correct.value = 0
  failed.value = false; finished.value = false; feedback.value = ''
  selectedIndex.value = null; clearedIndices.value = []
  rivalProgress.value = [0, 0, 0]; rivalHoldUntil.fill(0); rivalNextHold.fill(0); raceElapsed.value = 0; boostUntil.value = 0
  const letters = prompts.value.join(' ').length
  duration.value = isRoute.value ? 150 : isRace.value ? 90 : Math.max(55, Math.ceil((letters / 5) / (5 + mission.value.id * 2.5) * 60 * 2.1 + 25))
  seconds.value = duration.value; started.value = Date.now(); lastRaceTick = started.value; raceNow.value = started.value; lastFlightKey.value = started.value; stallSeconds.value = 10; playing.value = true
  tick = setInterval(() => {
    const now = Date.now()
    seconds.value = Math.max(0, duration.value - Math.floor((now - started.value) / 1000))
    if (isRoute.value) stallSeconds.value = Math.max(0, 10 - Math.floor((now - lastFlightKey.value) / 1000))
    if (isRace.value) updateRivals(now)
    if (seconds.value === 0 || (isRoute.value && stallSeconds.value === 0)) void endStage(true)
  }, 100)
  void nextTick(() => gameInput.value?.focus())
}
function updateRivals(now: number) {
  const delta = Math.min(.25, (now - lastRaceTick) / 1000)
  lastRaceTick = now; raceNow.value = now
  raceElapsed.value = Math.max(0, (now - started.value) / 1000)
  rivalProgress.value = rivalProgress.value.map((position, i) => {
    const finish = rivalFinishTimes[i]!
    const target = Math.min(1, raceElapsed.value / finish)
    // Rivals briefly brake when far ahead; in the final stretch they recover
    // their scheduled 91/100/110-second finish pace instead of drifting away.
    if (raceElapsed.value < finish - 8 && target > playerDistance.value + .22 && now >= rivalNextHold[i]!) {
      rivalHoldUntil[i] = now + 1200 + i * 250
      rivalNextHold[i] = now + 4500 + i * 300
    }
    if (now < rivalHoldUntil[i]! && raceElapsed.value < finish - 8) return position
    if (raceElapsed.value >= finish - 8) return Math.min(1, position + (1 - position) * delta / Math.max(.1, finish - raceElapsed.value))
    return Math.min(target, position + delta * Math.max(1 / finish, (target - position) * .6))
  })
}
async function endStage(timeout = false) {
  if (!playing.value) return
  stopTick(); playing.value = false
  const miss = mistakes.value
  const hits = correct.value
  const acc = hits + miss ? hits / (hits + miss) : 0
  const elapsed = Math.max(1, (Date.now() - started.value) / 1000)
  const wpm = Math.round((hits / 5) / (elapsed / 60))
  failed.value = timeout || (isRace.value && elapsed >= 90) || (phase.value === 4 && miss >= 4)
  if (failed.value) { feedback.value = isRace.value ? 'The poachers are almost at the finish! Reach it within 90 seconds to win. Your next try starts at the line.' : isRoute.value ? seconds.value === 0 ? 'The flight ran out of time and the plane crashed. Restart from Auckland!' : 'The plane stalled and crashed. Keep typing to stay in the air!' : timeout ? 'Time is up. Take a breath and try again!' : 'The equipment needs a reset. Try again with steady hands!'; return }
  const stars = isRoute.value || isRace.value ? Math.max(1, Math.min(5, Math.floor(wpm * acc / 6))) : Math.max(1, Math.min(5, Math.round(acc * 3 + (seconds.value / duration.value) * 2)))
  const gold = stars * 10 + Math.round(acc * 10)
  outcome.value = { stars, gold, wpm, accuracy: Math.round(acc * 100) }
  try { await saveResult(mission.value.id, `stage-${phase.value}`, stars, gold, outcome.value.accuracy, wpm); refresh() }
  catch (e) { error.value = `Could not save the result: ${String(e)}` }
  finished.value = true; speak('Great work, Henry!')
}
function typeKey(key: string) {
  if (!playing.value || !currentPrompt.value || key.length !== 1) return
   if (key === expected.value) {
     correct.value++; character.value++; feedback.value = ''
     if (isRoute.value) { lastFlightKey.value = Date.now(); stallSeconds.value = 10 }
     if (isRace.value) { boostUntil.value = Date.now() + 300; raceNow.value = Date.now() }
    if (character.value >= currentPrompt.value.length) {
      if (isBoard.value && selectedIndex.value !== null) { clearedIndices.value.push(selectedIndex.value); selectedIndex.value = null }
       promptIndex.value++; character.value = 0
       if (promptIndex.value >= prompts.value.length) void endStage()
    }
  } else {
    mistakes.value++
    feedback.value = `Try ${expected.value === ' ' ? 'Space' : expected.value.toUpperCase()} again. Stay on this letter.`
    if (!isRace.value) speak(expected.value === ' ' ? 'space' : expected.value.toUpperCase())
    if (phase.value === 4 && mistakes.value >= 4) void endStage()
  }
}
function pickBoard(index: number) {
  if (!playing.value || clearedIndices.value.includes(index)) return
  if (['radio','journal'].includes(boardKind.value) && index !== promptIndex.value) {
    mistakes.value++
    feedback.value = boardKind.value === 'radio' ? `Wrong frequency. Find ${prompts.value[promptIndex.value]}.` : `That page comes later. Find page ${promptIndex.value + 1}.`
    if (phase.value === 4 && mistakes.value >= 4) void endStage()
    return
  }
  if (selectedIndex.value !== null && character.value > 0) { feedback.value = 'Finish this clue before switching stations.'; return }
  selectedIndex.value = index; character.value = 0; feedback.value = 'Clue selected. Type it to complete the action.'
  sayPrompt(); void nextTick(() => gameInput.value?.focus())
}
function keydown(event: KeyboardEvent) {
  if (page.value === 'mission' && playing.value) {
    if (event.key === 'Tab' || event.key === 'Escape' || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key.length === 1 || event.key === 'Backspace') { event.preventDefault(); typeKey(event.key) }
  } else if (page.value === 'test' && testPlaying.value) {
    if (event.key === 'Tab' || event.key === 'Escape' || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key.length === 1 || event.key === 'Backspace') { event.preventDefault(); testKey(event.key) }
  }
}
onMounted(() => { window.addEventListener('keydown', keydown); window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline) })
onUnmounted(() => { window.removeEventListener('keydown', keydown); window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) })
function updateOnline() { online.value = navigator.onLine }
function startTest() {
  testText.value = Array(5).fill(testTexts[tests.value.length % testTexts.length]!).join(' '); testCursor.value = 0; testCorrect.value = 0; testMistakes.value = 0
  testTime.value = 60; testDone.value = false; testPlaying.value = true; started.value = Date.now()
  tick = setInterval(() => {
    testTime.value = Math.max(0, 60 - Math.floor((Date.now() - started.value) / 1000))
    if (testTime.value === 0) void finishTest()
  }, 200)
  void nextTick(() => gameInput.value?.focus())
}
function testKey(key: string) {
  if (key.length !== 1) return
  if (key === testText.value[testCursor.value]) { testCorrect.value++; testCursor.value++ }
  else testMistakes.value++
  if (testCursor.value >= testText.value.length) testText.value += ' ' + testTexts[0]
}
async function finishTest() {
  if (!testPlaying.value) return
  stopTick(); testPlaying.value = false
  const elapsed = Math.max(1, (Date.now() - started.value) / 1000)
  const wpm = Math.round((testCorrect.value / 5) / (elapsed / 60) * 10) / 10
  const acc = testCorrect.value + testMistakes.value ? testCorrect.value / (testCorrect.value + testMistakes.value) : 0
  const score = Math.round(wpm * acc * 10) / 10
  testOutcome.value = { wpm, accuracy: Math.round(acc * 100), score, record: score > best.value }
  testDone.value = true
  try { await saveTest(wpm, testOutcome.value.accuracy, score); refresh() } catch (e) { error.value = `Could not save the test: ${String(e)}` }
}
async function saveSettings() {
  try { await setSetting('key', apiKey.value.trim()); await setSetting('model', model.value.trim()); await setSetting('voice', voice.value ? 'on' : 'off'); feedback.value = 'Settings saved on this device.' }
  catch (e) { error.value = `Could not save settings: ${String(e)}` }
}
async function checkWriting() {
  if (reportText.value.trim().length < 20) { aiError.value = 'Write at least 20 characters about the animal first.'; return }
  aiBusy.value = true; aiError.value = ''; corrections.value = []
  try { corrections.value = await checkReport(apiKey.value, model.value, reportText.value); checkedText.value = reportText.value }
  catch (e) { aiError.value = String(e instanceof Error ? e.message : e) }
  finally { aiBusy.value = false }
}
async function sendReport() {
  if (reportText.value !== checkedText.value || corrections.value.length) return
  aiBusy.value = true; aiError.value = ''
  try {
    const next = missions[missionIndex.value + 1]?.animal ?? 'your next wildlife adventure'
    const reply = await replyToReport(apiKey.value, model.value, mission.value.animal, reportText.value, next)
    await saveReport(mission.value.id, reportText.value, reply); reportReply.value = reply; refresh(); phase.value = 6
  } catch (e) { aiError.value = String(e instanceof Error ? e.message : e) }
  finally { aiBusy.value = false }
}
function localReport() {
  if (reportText.value.trim().length < 20) { aiError.value = 'Write at least 20 characters about the animal first.'; return }
  const next = missions[missionIndex.value + 1]?.animal ?? 'another amazing creature'
  reportReply.value = `Great field notes, Henry! Your observations about the ${mission.value.animal} are part of the adventure. Keep asking questions and looking after wildlife. Next up: the ${next}! — Your expedition guide (offline message)`
  void saveReport(mission.value.id, reportText.value, reportReply.value).then(() => { refresh(); phase.value = 6 }).catch(e => { aiError.value = `Could not save report: ${String(e)}` })
}
function dateLabel(date: string) { return new Date(date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) }
function licenseUrl(license: string) {
  if (license === 'Public domain') return 'https://creativecommons.org/publicdomain/mark/1.0/'
  const version = license.match(/[\d.]+/)?.[0] ?? '4.0'
  return `https://creativecommons.org/licenses/${license.includes('BY-SA') ? 'by-sa' : 'by'}/${version}/${license.endsWith('US') ? 'us/' : ''}`
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand" @click="go('base')"><div class="brand-mark">✳</div><div><strong>WILD<span>TYPE</span></strong><small>HENRY'S EXPEDITION</small></div></div>
      <div class="side-label">EXPLORE</div>
      <nav aria-label="Main navigation">
        <button :class="{active:page==='base'}" @click="go('base')"><span>⌂</span> Base camp</button>
        <button :class="{active:page==='map'||page==='mission'}" @click="go('map')"><span>◇</span> Missions <b>{{ completed.size }}/10</b></button>
        <button :class="{active:page==='shelf'}" @click="go('shelf')"><span>♜</span> Trophy shelf</button>
        <button :class="{active:page==='test'}" @click="go('test')"><span>◷</span> Typing test</button>
      </nav>
      <div class="side-label tools-label">FIELD TOOLS</div>
      <nav><button :class="{active:page==='settings'}" @click="go('settings')"><span>⚙</span> Settings</button></nav>
      <div class="sidebar-bottom"><div class="avatar">H</div><div><strong>Explorer Henry</strong><small>Field researcher</small></div><span class="online-dot"></span></div>
    </aside>

    <main class="main">
      <header class="topbar"><div class="breadcrumb">THE EXPEDITION <span>/</span> {{ page === 'mission' ? `MISSION ${mission.id}` : page === 'base' ? 'BASE CAMP' : page.toUpperCase() }}</div><div class="top-actions"><span class="offline-pill"><i></i> {{ online ? 'OFFLINE READY' : 'PLAYING OFFLINE' }}</span><span class="gold-pill">✦ <b>{{ earned }}</b> GOLD</span></div></header>
      <div v-if="error" class="error-banner" role="alert">{{ error }} <button @click="error=''">×</button></div>
      <div v-if="!ready && !error" class="loading">Setting up base camp…</div>

      <div v-if="ready && page==='base'" class="content home-content">
        <div class="eyebrow">✦ &nbsp; YOUR ADVENTURE STARTS HERE</div>
        <section class="hero"><div class="hero-copy"><div class="hero-kicker">WELCOME BACK, EXPLORER</div><h1>Hey Henry, <em>the wild</em><br>is calling.</h1><p>Every word is a step closer to an incredible animal. Ready to follow the trail?</p><button class="primary-btn" @click="openMission(Math.min(completed.size,9))">{{ completed.size ? 'Continue expedition' : 'Start your first mission' }} <span>↗</span></button></div><div class="hero-art"><img :src="animalImages[Math.min(completed.size,9)]!.src" :alt="animalImages[Math.min(completed.size,9)]!.note"/><div class="hero-photo-note">{{ animalImages[Math.min(completed.size,9)]!.note }}</div></div></section>
        <div class="section-heading"><div><div class="eyebrow">THE JOURNEY SO FAR</div><h2>Your field station</h2></div><button class="text-btn" @click="go('map')">View all missions →</button></div>
        <div class="stats-grid"><div class="stat-card"><div class="stat-icon green">◇</div><small>MISSIONS COMPLETE</small><strong>{{ completed.size }} <span>/ 10</span></strong><div class="mini-track"><div :style="{width:completed.size*10+'%'}"></div></div></div><div class="stat-card"><div class="stat-icon yellow">✦</div><small>GOLD EARNED</small><strong>{{ earned }} <span>coins</span></strong><p>Keep going, explorer!</p></div><div class="stat-card"><div class="stat-icon blue">⌁</div><small>BEST TYPING SCORE</small><strong>{{ best }} <span>adjusted WPM</span></strong><p>Goal: 28.5 (30 WPM × 95%)</p></div></div>
        <div class="bottom-grid"><div class="next-card"><div class="eyebrow">UP NEXT · MISSION {{ Math.min(completed.size+1,10) }}</div><div class="next-row"><div class="animal-tile"><img :src="animalImages[Math.min(completed.size,9)]!.src" :alt="missions[Math.min(completed.size,9)]!.animal"/></div><div><h3>{{ missions[Math.min(completed.size,9)]?.animal }}</h3><p>{{ missions[Math.min(completed.size,9)]?.habitat }} · {{ missions[Math.min(completed.size,9)]?.region }}</p></div><button class="round-arrow" aria-label="Open mission" @click="openMission(Math.min(completed.size,9))">↗</button></div><div class="card-foot">Discover the clues. Practice your keys. Protect the wild.</div></div><div class="tip-card"><div class="tip-symbol">✳</div><div><div class="eyebrow">EXPLORER'S TIP</div><h3>Slow is smooth. Smooth is fast.</h3><p>Keep your fingers on the home row, watch the screen, and let accuracy lead the way.</p></div></div></div>
      </div>

      <div v-if="ready && page==='map'" class="content"><div class="page-head"><div class="eyebrow">THE EXPEDITION MAP</div><h1>Choose your <em>mission.</em></h1><p>Ten real animals from Forrest's wildlife adventures. Complete a report to unlock the next stop.</p></div><div class="mission-grid"><button v-for="(m,i) in missions" :key="m.id" class="mission-card" :class="{locked:i>=unlocked}" :disabled="i>=unlocked" @click="openMission(i)"><div class="mission-art" :style="{'--accent':m.color}"><img :src="animalImages[i]!.src" :alt="animalImages[i]!.note" loading="lazy"/><span class="number-badge">{{ String(m.id).padStart(2,'0') }}</span><span class="photo-type">{{ animalImages[i]!.note }}</span></div><div class="mission-card-body"><div class="eyebrow">{{ m.habitat }} · {{ m.region }}</div><h3>{{ m.animal }}</h3><p>{{ m.focus }}</p><div class="mission-card-foot"><span>{{ completed.has(m.id) ? '✓ REPORT SENT' : i>=unlocked ? '🔒 LOCKED' : '● READY TO EXPLORE' }}</span><span>↗</span></div></div></button></div><p class="source-note">Animals are species featured in <a :href="source" target="_blank" rel="noopener">Extinct or Alive episode listings ↗</a>. Images are credited individually in the field report and trophy shelf. Expeditions are fictional.</p></div>

      <div v-if="ready && page==='mission'" class="content mission-content"><button class="back-link" @click="go('map')">← Back to mission map</button><div class="mission-header"><div><div class="eyebrow">MISSION {{ String(mission.id).padStart(2,'0') }} / 10 · {{ mission.region.toUpperCase() }}</div><h1>{{ mission.animal }}</h1><p>{{ mission.habitat }} · Near {{ mission.place }}, {{ mission.region }}</p></div><div class="mission-icon" :style="{'--accent':mission.color}"><img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div></div>
        <div class="stepper"><div v-for="(label,i) in ['Briefing','Lesson','Travel','Fieldwork','Rescue','Report']" :key="label" :class="{current:phase===i,passed:phase>i}"><span>{{ phase>i ? '✓' : i+1 }}</span>{{ label }}</div></div>
        <template v-if="phase===0"><div class="paper-card brief-card"><div class="eyebrow">✉ &nbsp; INCOMING FIELD MESSAGE</div><h2>Message from your expedition guide</h2><p class="quote">“{{ mission.brief }}”</p><div class="signoff">Adventure awaits, <b>Forrest-inspired guide ✳</b></div></div><div class="fact-strip"><span>ⓘ</span><p><b>Real-world field note:</b> {{ mission.fact }}</p></div><button class="primary-btn" @click="nextPhase">Open your field lesson <span>→</span></button></template>
        <template v-else-if="phase===1"><div class="paper-card lesson-card"><div class="eyebrow">KEYBOARD FIELD GUIDE</div><h2>{{ mission.focus }}</h2><p>{{ mission.tip }}</p><div class="lesson-columns"><div><h3>Before you begin</h3><ul><li>Rest your fingers on <b>A S D F</b> and <b>J K L ;</b>.</li><li>Feel the little bumps on <b>F</b> and <b>J</b>.</li><li>Look at the screen, not down at the keys.</li><li>Type with the suggested finger. Mistakes never skip a letter.</li></ul></div><div class="lesson-example"><small>YOU'LL PRACTICE</small><div>{{ mission.words.slice(1,5).join(' · ') }}</div><span>Real words. Real clues. Your pace.</span></div></div></div><button class="primary-btn" @click="nextPhase">Let's go to {{ mission.region }} <span>→</span></button></template>
        <template v-else-if="phase>=2 && phase<=4"><div class="game-layout" :class="{'travel-layout':isRoute,'race-layout':isRace}"><div class="game-main"><div class="paper-card game-card"><div class="game-top"><div><div class="eyebrow">STAGE {{ phase-1 }} OF 3 · {{ phase===2?'TRAVEL':phase===3?'FIELDWORK':'RESCUE' }}</div><h2>{{ stageName }}</h2></div><div v-if="playing" class="timer" :class="{urgent:seconds<12}">◷ {{ seconds }}s</div></div><p v-if="!playing && !finished && !failed" class="game-instruction">{{ isRoute ? `Fly from Auckland to ${mission.place}. Type the words in order to draw your flight path. Keep typing: after 10 seconds without a correct key the plane crashes! You have 2½ minutes. Five stars starts at 30 WPM × accuracy.` : isRace ? `Race three poacher vehicles to the field site through ${mission.habitat.toLowerCase()} country. Each correct key boosts your car; mistakes cost time, but you can catch up. Finish within 90 seconds to win and continue.` : `Choose the clues and complete each rescue task. Four mistakes will reset your tools.` }}</p><div v-if="!playing && !finished && !failed" class="preflight"><span>⌨</span><div><b>Ready when you are.</b><small>{{ isRoute ? '60 familiar words · Space between words · 30 adjusted WPM for ★★★★★' : isRace ? 'Space between words · Rivals finish at 91s, 100s, 110s · 30 adjusted WPM for ★★★★★' : `Target pace: ${5+mission.id*2.5} WPM · 4 tool strikes available` }}</small></div><button class="primary-btn" @click="startStage">{{ isRoute?'Take off →':isRace?'Start race →':'Start stage →' }}</button></div>
           <template v-if="playing || (failed && (isRoute || isRace)) || (finished && isRace)">
              <div v-if="isRoute" class="flight-map" :class="{crashed:failed}" role="group" :aria-label="`Flight from Auckland to ${mission.place}; ${Math.round(flightProgress*100)} percent complete`">
                <div class="flight-world" :style="cameraStyle">
                  <svg class="flight-routes" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><polyline class="flight-upcoming" :points="routeLine" vector-effect="non-scaling-stroke"/><polyline class="flight-flown" :points="flownLine" vector-effect="non-scaling-stroke"/></svg>
                  <div v-for="(stop,i) in flightStops" :key="i" class="flight-stop" :class="{visited:flightProgress >= i/(flightStops.length-1),destination:i===flightStops.length-1}" :style="{left:stop.x/10+'%',top:stop.y/5.2+'%',transform:`translate(-50%,-50%) scale(${1/mapZoom})`}"><span class="flight-dot"></span><span class="flight-label">{{ stop.name }}</span></div>
                  <div class="flight-plane" :style="{left:flightPosition.x/10+'%',top:flightPosition.y/5.2+'%',transform:`translate(-50%,-50%) rotate(${flightPosition.angle}deg) scale(${1/mapZoom})`}"><svg viewBox="-22 -18 44 36" aria-hidden="true"><path d="M-17-12 19 0-17 12-9 2-20 0-9-2Z"/></svg></div>
                </div>
                <div class="flight-overlay"><div class="flight-heading">✈ AUCKLAND → {{ mission.place.toUpperCase() }} <span>WORD {{ Math.min(promptIndex+1,prompts.length) }} / {{ prompts.length }}</span></div><div v-if="failed" class="flight-mayday">MAYDAY! FLIGHT INTERRUPTED</div><template v-else><div class="flight-words" aria-label="Words to type"><span v-for="(word,i) in prompts.slice(Math.max(0,promptIndex-1),promptIndex+6)" :key="Math.max(0,promptIndex-1)+i" :class="{past:Math.max(0,promptIndex-1)+i<promptIndex,active:Math.max(0,promptIndex-1)+i===promptIndex}"><template v-if="Math.max(0,promptIndex-1)+i===promptIndex"><b>{{ word.slice(0,character) }}</b><em>{{ expected===' ' ? '␣' : expected }}</em>{{ word.slice(Math.min(character+1,word.length)) }}</template><template v-else>{{ word }}</template></span></div><div class="flight-stats">{{ accuracy }}% accuracy · {{ mistakes }} misses <strong :class="{urgent:stallSeconds<=3}">✈ AIR: {{ stallSeconds }}s</strong></div></template></div>
                <div class="flight-cartouche">THE WILD TYPE · WORLD EXPEDITION</div>
             </div>
             <div v-else-if="isRace" class="race-scene" :class="[`terrain-${raceTerrain[missionIndex]}`,{lost:failed,won:finished,boosting:boosting && playing}]" role="group" :aria-label="`Race through ${mission.habitat}; you are ${Math.round(playerDistance*100)} percent of the way to the finish`">
               <div class="race-sky"><div class="race-sun"></div><div class="race-far"></div><div class="race-near"></div><span class="race-place">{{ mission.habitat.toUpperCase() }} · {{ mission.region.toUpperCase() }}</span></div>
               <div class="race-track"><div class="race-finish-line"><span>FINISH</span></div><div v-for="(rival,i) in rivalProgress" :key="i" class="race-lane"><span class="lane-label">{{ ['RED','BLUE','GOLD'][i] }} · {{ rivalFinishTimes[i] }}s</span><div class="race-car" :class="`rival-${i}`" :style="{left:`${7+rival*83}%`}"><div class="race-driver"><i></i><span></span></div><div class="race-body"><span class="race-wheel"></span><span class="race-wheel"></span></div><small>POACHER {{ i+1 }}</small></div></div><div class="race-lane player-lane"><span class="lane-label">HENRY · YOU</span><div class="race-car player-car" :class="{boost:boosting && playing}" :style="{left:`${7+playerDistance*83}%`}"><div class="race-driver"><i></i><span></span></div><div class="race-body"><span class="race-wheel"></span><span class="race-wheel"></span></div><small>HENRY</small></div></div></div>
               <div class="race-hud"><div class="race-title">{{ finished?'FINISH LINE · HENRY WINS!':failed?'RACE OVER · TRY AGAIN':'TYPE TO BOOST · BEAT 90 SECONDS' }} <span>{{ Math.min(promptIndex+1,prompts.length) }} / {{ prompts.length }} WORDS</span></div><div v-if="playing" class="race-words" aria-label="Words to type"><span v-for="(word,i) in prompts.slice(Math.max(0,promptIndex-1),promptIndex+6)" :key="Math.max(0,promptIndex-1)+i" :class="{past:Math.max(0,promptIndex-1)+i<promptIndex,active:Math.max(0,promptIndex-1)+i===promptIndex}"><template v-if="Math.max(0,promptIndex-1)+i===promptIndex"><b>{{ word.slice(0,character) }}</b><em>{{ expected===' '?'␣':expected }}</em>{{ word.slice(Math.min(character+1,word.length)) }}</template><template v-else>{{ word }}</template></span></div><div v-else class="race-words" :class="{'race-words-lost':failed}">{{ failed?'THE POACHERS ARE CLOSING IN':'YOU MADE IT TO THE FIELD SITE!' }}</div><div class="race-metrics">{{ Math.round(playerDistance*100) }}% to finish · {{ accuracy }}% accuracy · {{ mistakes }} misses <strong>{{ Math.floor(raceElapsed) }} / 90s</strong></div></div>
             </div>
            <div v-else-if="isBoard" class="field-scene" :class="`scene-${boardKind}`">
              <div class="scene-title">{{ boardKind==='vines'?'VINE BARRIER':boardKind==='cameras'?'CAMERA TRAP NETWORK':boardKind==='radio'?'RADIO SIGNAL DESK':boardKind==='sonar'?'SONAR SCAN':boardKind==='journal'?'EXPEDITION JOURNAL':boardKind==='lake'?'LAKE OBSERVATION POSTS':boardKind==='lookout'?'BAYOU LOOKOUT':'TRACKING GRID' }} <span>{{ clearedIndices.length }} / {{ prompts.length }} CLEAR</span></div>
              <p>{{ boardKind==='vines'?'Choose a vine and type its word to cut it.':boardKind==='cameras'?'Log each camera station by typing its clue. The archive specimen image is for reference, not new footage.':boardKind==='radio'?`Find and tune the next signal: ${prompts[promptIndex]}.`:boardKind==='sonar'?'Choose a sonar echo and type its label to identify it.':boardKind==='journal'?`Reassemble the journal in order: find page ${promptIndex+1}.`:'Choose a field marker and record its clue.' }}</p>
              <div class="field-options">
                <button v-for="(word,i) in prompts" :key="i" :class="{cleared:clearedIndices.includes(i),selected:selectedIndex===i}" :disabled="clearedIndices.includes(i)" @click="pickBoard(i)"><img v-if="boardKind==='cameras'" class="camera-image" :src="animalImages[missionIndex]!.src" alt=""/><span class="field-symbol">{{ boardKind==='vines'?'╱':boardKind==='cameras'?'▣':boardKind==='radio'?'⌁':boardKind==='sonar'?'◎':boardKind==='journal'?'▤':boardKind==='lake'?'◉':boardKind==='lookout'?'♧':'❖' }}</span><span class="field-word">{{ word }}</span><small>{{ clearedIndices.includes(i)?boardKind==='cameras'?'ARCHIVE REFERENCE':'COMPLETE':boardKind==='vines'?'CUT THIS VINE':boardKind==='journal'?`PAGE ${i+1}`:'SELECT CLUE' }}</small></button>
              </div>
            </div>
              <div v-if="playing && isBoard" class="game-progress"><span>CLUES {{ promptIndex }} / {{ prompts.length }}</span><span>{{ progress }}% COMPLETE</span></div><div v-if="playing && isBoard" class="progress-track"><div :style="{width:progress+'%'}"></div></div>
              <div v-if="isBoard && currentPrompt" class="typing-prompt" aria-label="Text to type"><span class="typed">{{ currentPrompt.slice(0,character) }}</span><span class="cursor-letter">{{ expected === ' ' ? '␣' : expected }}</span><span>{{ currentPrompt.slice(character+1) }}</span></div>
              <div v-else-if="isBoard" class="awaiting-prompt">Choose a clue above to begin typing ↑</div>
              <p v-if="playing && isBoard" class="game-hint">{{ accuracy }}% accuracy · {{ mistakes }} mistakes · Tool strength {{ Math.max(0,4-mistakes) }}/4</p><div v-if="playing" class="feedback" aria-live="polite">{{ feedback || (isRoute ? 'Type the highlighted word and press Space. Keep the plane in the air!' : isRace ? 'Every correct key gives your car a boost. Keep going!' : 'Choose an action, then type the highlighted letters. Wrong keys stay on the same letter.') }}</div><input v-if="playing" ref="gameInput" class="capture-input" aria-label="Type the highlighted text here" autocomplete="off" spellcheck="false" @input="($event.target as HTMLInputElement).value=''" /><button v-if="playing && isBoard && currentPrompt && !currentPrompt.includes(' ')" class="audio-btn" @click="sayPrompt">◖)) Hear word and spelling</button>
           </template>
           <div v-if="failed" class="stage-result"><span class="result-symbol">↺</span><h3>{{ isRoute?'Flight crashed!':isRace?'The poachers got ahead!':'Let’s try that again.' }}</h3><p>{{ feedback }}</p><button class="primary-btn" @click="startStage">{{ isRoute?'Fly again from Auckland →':isRace?'Retry race →':'Restart stage →' }}</button></div><div v-if="finished" class="stage-result"><span class="result-symbol">✦</span><h3>{{ isRoute?'Touchdown, Henry!':isRace?'You won the race!':'Trail complete, Henry!' }}</h3><div class="stars">{{ '★'.repeat(outcome.stars) }}{{ '☆'.repeat(5-outcome.stars) }}</div><p>{{ outcome.accuracy }}% accuracy · {{ outcome.wpm }} WPM<span v-if="isRoute || isRace"> · {{ Math.round(outcome.wpm*outcome.accuracy/100) }} adjusted WPM</span> · +{{ outcome.gold }} gold</p><button class="primary-btn" @click="nextPhase">{{ phase===4?'Write your field report':'Next stage' }} →</button></div></div></div>
           <aside class="game-aside"><div class="keyboard-card"><div class="eyebrow">FINGER GUIDE</div><h3>{{ playing ? (expected===' '?'Space bar':shownKey) : 'Home row' }}</h3><p>{{ playing ? finger : 'Find F and J without looking down.' }} <span v-if="playing && expected!==expected.toLowerCase()">· Hold opposite Shift</span></p><div class="split-keyboard"><div class="key-half" v-for="(half,hi) in [leftKeys,rightKeys]" :key="hi"><div v-for="(row,ri) in half" :key="ri" class="key-row"><span v-for="key in row" :key="key" :class="{lit:playing && key===shownKey,home:['A','S','D','F','J','K','L',';'].includes(key)}">{{ key }}</span></div></div></div><div class="space-key" :class="{lit:playing && expected===' '}">SPACE · thumbs</div><div class="finger-legend"><span>● pinky</span><span>● ring</span><span>● middle</span><span>● index</span></div></div><div class="tip-card compact"><div class="tip-symbol">✳</div><div><div class="eyebrow">FIELD REMINDER</div><p>Eyes on the screen. Fingers on the home row. Every accurate key counts.</p></div></div></aside></div></template>
        <template v-else-if="phase===5"><div class="report-layout"><div class="paper-card report-card"><div class="eyebrow">✉ &nbsp; FIELD REPORT</div><h2>Write to your expedition guide</h2><p>Tell Forrest about the {{ mission.animal }}. Where does it live? What did you notice? What would you like to ask?</p><textarea v-model="reportText" :disabled="!!reportReply" placeholder="Dear Forrest, Today I learned about..." rows="8" aria-label="Your field report"></textarea><div class="report-actions"><button class="primary-btn" :disabled="aiBusy || !apiKey || !online" @click="checkWriting">{{ aiBusy?'Checking…':'Check my writing ✳' }}</button><span v-if="!apiKey || !online" class="unavailable">AI check unavailable · {{ !apiKey?'add a key in Settings':'offline' }}</span></div><div v-if="aiError" class="inline-error" role="alert">{{ aiError }}</div><div v-if="corrections.length && reportText===checkedText" class="corrections"><h3>Let's fix these first</h3><div v-for="(c,i) in corrections" :key="i"><s>{{ c.original }}</s> → <b>{{ c.replacement }}</b><p>{{ c.explanation }}</p></div><small>Edit your letter, then check again.</small></div><div v-if="reportText===checkedText && !corrections.length && checkedText && !aiError" class="success-box">✓ Great writing! Your report is ready to send.</div><div class="report-actions"><button v-if="reportText===checkedText && !corrections.length && checkedText && !aiError" class="primary-btn" :disabled="aiBusy" @click="sendReport">{{ aiBusy?'Sending…':'Send report & get reply →' }}</button><button class="secondary-btn" @click="localReport">Finish offline with a local reply →</button></div></div><div class="report-sidebar"><div class="animal-tile large"><img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div><h3>{{ mission.animal }}</h3><p>{{ mission.fact }}</p><small class="image-credit">{{ animalImages[missionIndex]!.note }} · <a :href="animalImages[missionIndex]!.source" target="_blank" rel="noopener">{{ animalImages[missionIndex]!.credit }} ↗</a> · <a :href="licenseUrl(animalImages[missionIndex]!.license)" target="_blank" rel="noopener">{{ animalImages[missionIndex]!.license }}</a></small><small>AI replies are fictional game messages inspired by an explorer, not actual messages from Forrest Galante.</small></div></div></template>
        <template v-else><div class="paper-card complete-card"><div class="eyebrow">MISSION {{ mission.id }} COMPLETE</div><div class="big-trophy">🏆 <img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div><h2>A new trophy for your shelf!</h2><p>You helped document the {{ mission.animal }}. Your field notes are saved and a new adventure awaits.</p><div class="reply-card"><div class="eyebrow">✉ &nbsp; REPLY FROM YOUR EXPEDITION GUIDE</div><p>“{{ reportReply }}”</p></div><div class="complete-actions"><button class="primary-btn" v-if="missionIndex<9" @click="openMission(missionIndex+1)">Next mission →</button><button class="secondary-btn" @click="go('shelf')">Visit trophy shelf</button></div></div></template>
      </div>

      <div v-if="ready && page==='shelf'" class="content"><div class="page-head"><div class="eyebrow">YOUR COLLECTION</div><h1>The trophy <em>shelf.</em></h1><p>Every report unlocks a new animal. {{ completed.size }} of 10 collected.</p></div><div class="trophy-grid"><div v-for="(m,i) in missions" :key="m.id" class="trophy-card" :class="{empty:!completed.has(m.id)}"><div class="trophy-figure"><img v-if="completed.has(m.id)" :src="animalImages[i]!.src" :alt="animalImages[i]!.note"/><span v-else>?</span></div><span class="trophy-cup">🏆</span><h3>{{ completed.has(m.id)?m.animal:'Undiscovered' }}</h3><small>{{ completed.has(m.id)?m.region:`MISSION ${String(m.id).padStart(2,'0')}` }}</small></div></div><details class="credits"><summary>Animal image credits &amp; identification notes</summary><div v-for="(image,i) in animalImages" :key="i"><b>{{ missions[i]!.animal }}</b> — {{ image.note }} · <a :href="image.source" target="_blank" rel="noopener">{{ image.credit }} ↗</a> · <a :href="licenseUrl(image.license)" target="_blank" rel="noopener">{{ image.license }}</a></div><p>Images have been resized for the offline app; no species or modern sighting is implied where a relative or archival specimen is shown.</p></details><p class="source-note"><a :href="source" target="_blank" rel="noopener">Animal episode source ↗</a>. No modern sighting is implied by an archival image.</p></div>

      <div v-if="ready && page==='test'" class="content"><div class="page-head"><div class="eyebrow">60-SECOND CHALLENGE</div><h1>Typing <em>test.</em></h1><p>One minute of easy-to-read text. See how far you've come!</p></div><div class="test-layout"><div class="paper-card test-card"><div class="test-top"><div><div class="eyebrow">YOUR PERSONAL BENCHMARK</div><h2>Ready, set, type.</h2></div><div class="timer">◷ {{ testTime }}s</div></div><div v-if="!testPlaying && !testDone" class="test-intro"><p>Type the highlighted text. Mistakes stay on the same letter. Your score is <b>WPM × accuracy</b>; your goal is <b>30 WPM at 95% accuracy</b>.</p><button class="primary-btn" @click="startTest">Start 1-minute test →</button></div><div v-if="testPlaying"><div class="test-paragraph"><span class="typed">{{ testText.slice(Math.max(0,testCursor-65),testCursor) }}</span><span class="cursor-letter">{{ testText[testCursor]===' '?'␣':testText[testCursor] }}</span>{{ testText.slice(testCursor+1,testCursor+170) }}</div><div class="feedback">{{ testMistakes }} mistakes · Keep your eyes on the screen</div><input ref="gameInput" class="capture-input" aria-label="Type the test text here" autocomplete="off" spellcheck="false" @input="($event.target as HTMLInputElement).value=''" /></div><div v-if="testDone" class="test-result"><div class="eyebrow">TEST COMPLETE {{ testOutcome.record?'· NEW PERSONAL BEST! ✦':'' }}</div><div class="result-numbers"><div><strong>{{ testOutcome.wpm }}</strong><small>WORDS / MIN</small></div><div><strong>{{ testOutcome.accuracy }}%</strong><small>ACCURACY</small></div><div><strong>{{ testOutcome.score }}</strong><small>ADJUSTED SCORE</small></div></div><p>Goal: 30 WPM × 95% = <b>28.5 adjusted WPM</b> {{ testOutcome.wpm>=30 && testOutcome.accuracy>=95?'· Goal achieved! 🎉':'' }}</p><button class="primary-btn" @click="startTest">Try again →</button></div></div><aside class="history-card"><div class="eyebrow">YOUR PROGRESS</div><h3>Past tests</h3><p v-if="!tests.length">Your results will appear here after your first test.</p><div v-for="t in tests.slice(0,8)" :key="t.id" class="history-row"><span>{{ dateLabel(t.created_at) }}</span><b>{{ t.score }} <small>score</small></b><span>{{ t.wpm }} WPM · {{ t.accuracy }}%</span></div><div v-if="tests.length>1" class="chart"><div v-for="t in [...tests].reverse().slice(-12)" :key="t.id" :style="{height:Math.max(8,t.score/Math.max(best,1)*100)+'%'}" :title="`${t.score} adjusted WPM`"></div></div></aside></div></div>

      <div v-if="ready && page==='settings'" class="content settings-content"><div class="page-head"><div class="eyebrow">FIELD STATION SETUP</div><h1>Settings <em>& tools.</em></h1><p>Keep your expedition comfortable. Your game progress lives on this device.</p></div><div class="paper-card settings-card"><h2>Voice & sound</h2><label class="toggle-row"><div><b>Speak words & letter hints</b><small>Uses your browser's built-in speech voice, even without an AI key when a local voice is available.</small></div><input v-model="voice" type="checkbox" /></label><button class="secondary-btn" @click="speak('Cat. C, A, T. Ready for an adventure, Henry?')">Test voice ◖))</button><hr><h2>Optional AI field reports</h2><p>OpenRouter checks writing and creates fictional expedition-guide replies. The rest of the game works offline.</p><label class="field-label">OPENROUTER API KEY<input v-model="apiKey" type="password" autocomplete="off" placeholder="sk-or-…" /></label><label class="field-label">CHAT MODEL<input v-model="model" type="text" placeholder="openai/gpt-4o-mini" /></label><p class="small-note">The key is stored locally in this browser's SQLite database. Calls go directly from your browser to OpenRouter; use a restricted key if possible. AI is unavailable without an internet connection.</p><button class="primary-btn" @click="saveSettings">Save settings →</button><span class="setting-feedback" role="status">{{ feedback }}</span></div><div class="fact-strip"><span>ⓘ</span><p>For best offline use, install the PWA from Chrome or Edge after loading it once while online. Local speech voices depend on your operating system.</p></div></div>
    </main>
  </div>
</template>
