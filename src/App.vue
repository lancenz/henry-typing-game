<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { missions, source, testTexts } from './data'
import { animalImages } from './images'
import { initDb, getResults, getTests, getReports, getSetting, setSetting, saveResult, saveTest, saveReport, type Result, type TestResult, type Report } from './db'
import { checkReport, replyToReport, pickMystery, reviewMysteryQuestion, getMysteryHint, beginAdventure, continueAdventure, reviewDungeonAction, type AdventureScene, type Correction } from './ai'
import { travelRoutes, travelWords, mapPoint } from './travel'
import { raceWords, raceTerrain, rivalFinishTimes, rivalPath, rivalPosition, type RaceWaypoint } from './race'
import { shuffledAnswers, normalizeQuestion, isHintRequest, isGameQuestion, isCorrectGuess } from './twenty'
import { adventureThemes, isAdventureAction, type AdventureTheme } from './adventure'
import { newDungeon, validDungeonSave, upgradeDungeonSave, roomDescription, suggestedActions, applyDungeonIntent, itemName, directions, secretKey, stampyAdvice, dungeonContext, type DungeonGame } from './dungeon'

type Page = 'base' | 'map' | 'mission' | 'shelf' | 'test' | 'games' | 'twenty' | 'adventure' | 'dungeon' | 'settings'
const page = ref<Page>('base')
const ready = ref(false)
const error = ref('')
const results = ref<Result[]>([])
const tests = ref<TestResult[]>([])
const reports = ref<Report[]>([])
const apiKey = ref('')
const modelOptions = ['~deepseek/deepseek-flash-latest', 'openai/gpt-oss-120b', '~anthropic/claude-sonnet-latest', 'google/gemini-3.8-flash', '~openai/gpt-sol-latest'] as const
const model = ref<string>(modelOptions[0])
const voice = ref(true)
const speechLanguage = ref('en-US')
const speechVoice = ref('')
const speechVoices = ref<SpeechSynthesisVoice[]>([])
const speechFeedback = ref('')
const speechAvailable = 'speechSynthesis' in window
const voiceKey = (item: SpeechSynthesisVoice) => JSON.stringify([item.voiceURI, item.lang, item.name])
const speechLanguages = computed(() => [...new Set([speechLanguage.value, ...speechVoices.value.map(item => item.lang)])].sort((a, b) => a.localeCompare(b)))
const matchingVoices = computed(() => speechVoices.value.filter(item => item.lang.toLowerCase() === speechLanguage.value.toLowerCase()))
function languageLabel(lang: string) {
  try { return `${new Intl.DisplayNames(['en'], { type: 'language' }).of(lang) ?? lang} (${lang})` }
  catch { return lang }
}
function refreshVoices() {
  if (!speechAvailable) return
  speechVoices.value = speechSynthesis.getVoices()
}
function changeSpeechLanguage() { speechVoice.value = ''; speechFeedback.value = '' }
function stopSpeech() {
  speechSequence++
  if (speechAvailable) speechSynthesis.cancel()
}
let speechSequence = 0
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
const countdown = ref(0)
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
type MysteryMessage = { role: 'player' | 'guide'; text: string }
const mysteryStatus = ref<'idle' | 'playing' | 'won' | 'lost'>('idle')
const mysteryAnswer = ref('')
const mysteryRemaining = ref(20)
const mysteryMessages = ref<MysteryMessage[]>([])
const mysteryQuestion = ref('')
const mysteryLog = ref<HTMLDivElement | null>(null)
const mysteryCorrections = ref<Correction[]>([])
const mysteryBusy = ref(false)
const mysteryError = ref('')
const mysteryAsked = new Set<string>()
let mysteryGameId = 0
type AdventureMessage = { role: 'player' | 'guide'; text: string; choices?: string[] }
const adventureTheme = ref<AdventureTheme>('harry-potter')
const adventureStatus = ref<'idle' | 'playing' | 'finished'>('idle')
const adventureTurn = ref(0)
const adventureCurrent = ref<AdventureScene | null>(null)
const adventureMessages = ref<AdventureMessage[]>([])
const adventureAction = ref('')
const adventureCorrections = ref<Correction[]>([])
const adventureError = ref('')
const adventureBusy = ref(false)
const adventureLog = ref<HTMLDivElement | null>(null)
let adventureGameId = 0
type DungeonMessage = { role: 'player' | 'guide'; text: string; thinking?: boolean; duration?: string }
const dungeon = ref<DungeonGame | null>(null)
const dungeonMessages = ref<DungeonMessage[]>([])
const dungeonAction = ref('')
const dungeonCorrections = ref<Correction[]>([])
const dungeonError = ref('')
const dungeonBusy = ref(false)
const dungeonLog = ref<HTMLDivElement | null>(null)
const dungeonInput = ref<HTMLInputElement | null>(null)
const dungeonMapHover = ref<number | null>(null)
let dungeonGameId = 0
const dungeonRoom = computed(() => dungeon.value?.levels[dungeon.value.level]?.rooms[dungeon.value.room])
const dungeonTooltip = computed(() => {
  const game = dungeon.value, id = dungeonMapHover.value
  return game && id !== null && game.visited[game.level]?.includes(id) ? `Room ${id + 1}: ${roomDescription(game, id)}` : ''
})
const dungeonMap = computed(() => Array.from({ length: 25 }, (_, id) => {
  const game = dungeon.value
  const seen = !!game?.visited[game.level]?.includes(id)
  const room = game?.levels[game.level]?.rooms[id]
  const hasMap = !!game?.inventory.includes(`${game.level}:map`)
  const mapped = hasMap && room?.active !== false
  const compass = !!game?.inventory.includes(`${game.level}:compass`)
  const doors = directions.filter(direction => {
    const door = room?.doors[direction]
    return !!game && seen && !!door && (!door.secret || game.revealed.includes(secretKey(game.level, Math.min(id, door.to))))
  })
  const stairs = compass && id === game?.levels[game.level]?.exit
  const monster = compass && !!room && Object.values(room.doors).some(door => door.gate === 'monster')
  return { id, seen, mapped, absent: hasMap && room?.active === false, stairs, monster, doors, frontier: doors.filter(direction => !game?.visited[game.level]?.includes(room?.doors[direction]?.to ?? -1)) }
}))
const dungeonCompassHint = computed(() => {
  const game = dungeon.value
  if (!game?.inventory.includes(`${game.level}:compass`)) return ''
  const floor = game.levels[game.level]!
  const x = floor.exit % 5 - game.room % 5, y = Math.floor(floor.exit / 5) - Math.floor(game.room / 5)
  const bearing = [y < 0 ? 'north' : y > 0 ? 'south' : '', x > 0 ? 'east' : x < 0 ? 'west' : ''].filter(Boolean).join('-') || 'here'
  const monsters = floor.rooms.filter(room => room.active !== false && Object.values(room.doors).some(door => door.gate === 'monster')).map(room => room.id + 1)
  return `Magic compass: stairs and guardian in room ${floor.exit + 1} (${bearing}); monster signs near ${monsters.length ? `room${monsters.length > 1 ? 's' : ''} ${monsters.join(', ')}` : 'no rooms on this floor'}. You still need to visit rooms before navigating to them.`
})
const lastFlightKey = ref(0)
const stallSeconds = ref(10)
const raceElapsed = ref(0)
const rivalProgress = ref([0, 0, 0])
const rivalBoosts = ref([false, false, false])
let rivalPaths: RaceWaypoint[][] = []
const raceVisualDistance = ref(0)
const raceSpeed = ref(0)
const raceOdometer = ref(0)
let lastMotionTick = 0
let lastRaceCorrect = 0
const rescueLuck = ref(0)
const rescueHold = ref(0)
const rescueElapsed = ref(0)
const rescuePace = ref(0)
const rescueAccuracy = ref(0)
const rescueSceneIndex = computed(() => Math.min(8, Math.floor(rescueElapsed.value / 10)))
const rescueNight = computed(() => rescueSceneIndex.value % 2 === 1)
const rescueScene = computed(() => {
  const habitat = mission.value.habitat.toLowerCase()
  return habitat.includes('ocean') || habitat.includes('lake') || habitat.includes('river') ? 'water' : habitat.includes('volcanic') || habitat.includes('mountain') ? 'highland' : habitat.includes('swamp') ? 'wetland' : 'forest'
})
const rescueKeys: { time: number; correct: boolean }[] = []
let lastRescueTick = 0
const rescueTarget = computed(() => 10 + (mission.value.id - 1) * 2)
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
const isRescue = computed(() => phase.value === 4)
const playerDistance = computed(() => correct.value / Math.max(1, prompts.value.join(' ').length))
const raceView = .24
const raceCamera = computed(() => Math.max(-raceView * .14, Math.min(1 - raceView * .82, raceVisualDistance.value - raceView * .34)))
const raceWorldStyle = computed(() => ({ width: `${100 / raceView}%`, transform: `translateX(${-raceCamera.value * 100}%)` }))
const raceSceneryStyle = computed(() => ({ '--race-near-x': `${Math.round(-raceOdometer.value)}px`, '--race-far-x': `${Math.round(-raceOdometer.value * .42)}px`, '--race-road-x': `${Math.round(-raceOdometer.value * 1.5)}px` }))
const boosting = computed(() => raceSpeed.value >= 60)
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
const currentPrompt = computed(() => (isRescue.value || (isRoute.value || isRace.value) && promptIndex.value < prompts.value.length - 1) ? `${prompts.value[promptIndex.value] ?? ''} ` : prompts.value[promptIndex.value] ?? '')
const expected = computed(() => currentPrompt.value[character.value] ?? '')
const stageName = computed(() => phase.value === 2 ? 'Expedition route' : phase.value === 3 ? 'Race to the field site' : 'Wildlife camera watch')
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
  if (speechAvailable) { speechSynthesis.addEventListener('voiceschanged', refreshVoices); refreshVoices() }
  try {
    await initDb(); refresh(); apiKey.value = getSetting('key'); model.value = modelOptions.find(option => option === getSetting('model')) ?? modelOptions[0]; voice.value = getSetting('voice') !== 'off'; speechLanguage.value = getSetting('speech-language') || 'en-US'; speechVoice.value = getSetting('speech-voice')
    const saved = getSetting('dungeon-save')
    if (saved) {
      try {
        const loaded: unknown = JSON.parse(saved)
        if (validDungeonSave(loaded)) { dungeon.value = upgradeDungeonSave(loaded); dungeonMessage('guide', loaded.phase === 'maze' ? `Welcome back, Henry! ${roomDescription(loaded)}` : loaded.phase === 'dragon' ? `The dragon watches you closely. ${stampyAdvice(loaded)}` : 'Welcome back! You and your dragon friend already found your way out.') }
      } catch { /* An invalid saved game does not prevent the rest of the app from loading. */ }
    }
    ready.value = true
  }
  catch (e) { error.value = `Could not open local game data: ${String(e)}` }
})
onUnmounted(() => { stopTick(); stopSpeech(); if (speechAvailable) speechSynthesis.removeEventListener('voiceschanged', refreshVoices) })
function stopTick() { if (tick) clearInterval(tick); tick = undefined }
function speak(text: string, preview = false) {
  if (!voice.value || !speechAvailable) return
  stopSpeech()
  const sequence = speechSequence
  const local = speechVoices.value.find(item => item.localService && item.lang.toLowerCase() === speechLanguage.value.toLowerCase())
    ?? speechVoices.value.find(item => item.localService && item.lang.toLowerCase().startsWith('en'))
    ?? speechVoices.value.find(item => item.localService)
  const selected = speechVoices.value.find(item => voiceKey(item) === speechVoice.value && item.lang.toLowerCase() === speechLanguage.value.toLowerCase())
  const chosen = selected && (online.value || selected.localService) ? selected : !online.value ? local : undefined
  if (preview) speechFeedback.value = chosen && chosen !== selected ? `Using offline voice ${chosen.name}.` : ''
  function play(item?: SpeechSynthesisVoice, retry = false) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.82; utterance.pitch = 1.05; utterance.lang = item?.lang ?? speechLanguage.value
    if (item) utterance.voice = item
    utterance.onerror = event => {
      if (sequence !== speechSequence || event.error === 'canceled' || event.error === 'interrupted') return
      if (!retry && local && local !== item) {
        if (preview) speechFeedback.value = `That voice could not play; trying offline voice ${local.name}.`
        play(local, true)
      } else if (preview) speechFeedback.value = 'This voice could not play. Try another voice or install a local voice.'
    }
    speechSynthesis.speak(utterance)
  }
  play(chosen)
}
function testSpeech() {
  const samples: Record<string, string> = { en: 'Cat. C, A, T. Ready for an adventure, Henry?', es: 'Hola, Henry. ¿Listo para una aventura?', fr: 'Bonjour Henry. Prêt pour une aventure ?', de: 'Hallo Henry. Bereit für ein Abenteuer?', it: 'Ciao Henry. Pronto per un’avventura?', pt: 'Olá Henry. Pronto para uma aventura?' }
  speak(samples[speechLanguage.value.split('-')[0]!] ?? 'Hello, Henry!', true)
}
function go(where: Page) { stopTick(); countdown.value = 0; playing.value = false; testPlaying.value = false; stopSpeech(); page.value = where; if (where === 'settings') refreshVoices() }
function openMission(index: number) {
  if (index >= unlocked.value) return
  stopTick(); countdown.value = 0; missionIndex.value = index; phase.value = 0; playing.value = false; finished.value = false
  failed.value = false; reportText.value = reports.value.find(r => r.mission === index + 1)?.text ?? ''
  reportReply.value = ''
  corrections.value = []; checkedText.value = ''; aiError.value = ''; page.value = 'mission'
}
function nextPhase() {
  stopTick(); countdown.value = 0; playing.value = false; finished.value = false; failed.value = false; feedback.value = ''
  if (phase.value === 0) phase.value = 2
  else if (phase.value < 5) phase.value++
  else if (phase.value === 5) phase.value = 6
}
function skipStage() { nextPhase() }
function stagePrompts(): string[] {
  if (phase.value === 2) return travelWords(missionIndex.value)
  if (phase.value === 3) return raceWords(missionIndex.value)
  const words = [...mission.value.words, ...mission.value.sentences.flatMap(sentence => sentence.split(' '))]
  return Array.from({ length: 300 }, (_, i) => words[i % words.length]!)
}
function startStage() {
  stopTick()
  prompts.value = stagePrompts(); promptIndex.value = 0; character.value = 0; mistakes.value = 0; correct.value = 0
  failed.value = false; finished.value = false; feedback.value = ''
  rivalProgress.value = [0, 0, 0]; rivalBoosts.value = [false, false, false]; rivalPaths = rivalFinishTimes.map(rivalPath); raceElapsed.value = 0; raceVisualDistance.value = 0; raceSpeed.value = 0; raceOdometer.value = 0
  rescueKeys.length = 0; rescueLuck.value = 0; rescueHold.value = 0; rescueElapsed.value = 0; rescuePace.value = 0; rescueAccuracy.value = 0
  duration.value = isRoute.value ? 150 : 90
  seconds.value = duration.value
  startCountdown(beginStage)
}
function startCountdown(begin: () => void) {
  const countdownStarted = Date.now()
  countdown.value = 3
  tick = setInterval(() => {
    countdown.value = Math.max(0, 3 - Math.floor((Date.now() - countdownStarted) / 1000))
    if (countdown.value === 0) { stopTick(); begin() }
  }, 100)
}
function beginStage() {
  started.value = Date.now(); lastMotionTick = started.value; lastRaceCorrect = started.value; lastRescueTick = started.value; lastFlightKey.value = started.value; stallSeconds.value = 10; playing.value = true
  tick = setInterval(() => {
    const now = Date.now()
    seconds.value = Math.max(0, duration.value - Math.floor((now - started.value) / 1000))
    if (isRoute.value) stallSeconds.value = Math.max(0, 10 - Math.floor((now - lastFlightKey.value) / 1000))
    if (isRace.value) { updatePlayerMotion(now); updateRivals(now) }
    if (isRescue.value) updateLuck(now)
    if (playing.value && (seconds.value === 0 || (isRoute.value && stallSeconds.value === 0))) void endStage(true)
  }, 100)
  void nextTick(() => gameInput.value?.focus())
}
function updateLuck(now: number) {
  const delta = Math.min(.25, Math.max(0, (now - lastRescueTick) / 1000))
  lastRescueTick = now
  rescueElapsed.value = Math.min(90, (now - started.value) / 1000)
  while (rescueKeys.length && rescueKeys[0]!.time < now - 6000) rescueKeys.shift()
  const hits = rescueKeys.filter(key => key.correct).length
  const accuracy = rescueKeys.length ? hits / rescueKeys.length : 0
  rescueAccuracy.value = Math.round(accuracy * 100)
  const windowSeconds = Math.min(6, rescueElapsed.value)
  rescuePace.value = windowSeconds ? Math.round(hits / 5 / windowSeconds * 60 * accuracy) : 0
  const steady = rescueElapsed.value >= 3 && hits >= Math.max(4, Math.ceil(rescueTarget.value / 3)) && accuracy >= .92 && hits / 5 / windowSeconds * 60 * accuracy >= rescueTarget.value
  rescueLuck.value = Math.max(0, Math.min(100, rescueLuck.value + (steady ? 18 : -23) * delta))
  rescueHold.value = steady && rescueLuck.value >= 100 ? rescueHold.value + delta : 0
  if (rescueHold.value >= 15) void endStage()
}
function updateRivals(now: number) {
  raceElapsed.value = Math.max(0, (now - started.value) / 1000)
  const positions = rivalPaths.map(path => rivalPosition(path, raceElapsed.value))
  rivalProgress.value = positions.map(position => position.distance)
  rivalBoosts.value = positions.map(position => position.boosting)
}
function updatePlayerMotion(now: number) {
  const delta = Math.min(.1, Math.max(0, (now - lastMotionTick) / 1000))
  lastMotionTick = now
  // One second without a correct key starts a smooth 2 mph loss per tick.
  if (now - lastRaceCorrect >= 1000) raceSpeed.value = Math.max(0, raceSpeed.value - 20 * delta)
  // The jeep can coast a short distance beyond the typed progress, but it
  // cannot cross the finish line until the last word has actually been typed.
  raceOdometer.value += raceSpeed.value * 3.2 * delta
  const limit = Math.min(.995, playerDistance.value + .055)
  const remaining = Math.max(0, limit - raceVisualDistance.value)
  raceVisualDistance.value += Math.min(raceSpeed.value / 900, remaining * 5) * delta
}
async function endStage(timeout = false) {
  if (!playing.value) return
  stopTick(); playing.value = false
  const miss = mistakes.value
  const hits = correct.value
  const acc = hits + miss ? hits / (hits + miss) : 0
  const elapsed = Math.max(1, (Date.now() - started.value) / 1000)
  const wpm = Math.round((hits / 5) / (elapsed / 60))
  failed.value = timeout || (isRace.value && elapsed >= 90)
  if (failed.value) { feedback.value = isRescue.value ? 'No sighting on this camera watch. Try again: type steadily and accurately to fill the Luck meter, then keep it green for 15 seconds.' : isRace.value ? 'The poachers are almost at the finish! Reach it within 90 seconds to win. Your next try starts at the line.' : seconds.value === 0 ? 'The flight ran out of time and the plane crashed. Restart from Auckland!' : 'The plane stalled and crashed. Keep typing to stay in the air!'; return }
  if (isRace.value) { raceVisualDistance.value = 1; raceSpeed.value = 0 }
  const stars = Math.max(1, Math.min(5, Math.floor(wpm * acc / (isRescue.value ? (rescueTarget.value + 2) / 5 : 6))))
  const gold = stars * 10 + Math.round(acc * 10)
  outcome.value = { stars, gold, wpm, accuracy: Math.round(acc * 100) }
  try { await saveResult(mission.value.id, `stage-${phase.value}`, stars, gold, outcome.value.accuracy, wpm); refresh() }
  catch (e) { error.value = `Could not save the result: ${String(e)}` }
  finished.value = true; speak('Great work Henry!')
}
function typeKey(key: string) {
  if (!playing.value || !currentPrompt.value || key.length !== 1) return
   if (key === expected.value) {
     correct.value++; character.value++; feedback.value = ''
     if (isRoute.value) { lastFlightKey.value = Date.now(); stallSeconds.value = 10 }
       if (isRace.value) { raceSpeed.value = Math.min(180, raceSpeed.value + 5); lastRaceCorrect = Date.now() }
      if (isRescue.value) rescueKeys.push({ time: Date.now(), correct: true })
     if (character.value >= currentPrompt.value.length) {
        promptIndex.value++; character.value = 0
        if (isRescue.value && promptIndex.value >= prompts.value.length) promptIndex.value = 0
        else if (promptIndex.value >= prompts.value.length) void endStage()
    }
  } else {
      mistakes.value++
      if (isRace.value) raceSpeed.value = Math.max(0, raceSpeed.value - 1)
     if (isRescue.value) rescueKeys.push({ time: Date.now(), correct: false })
     feedback.value = `Try ${expected.value === ' ' ? 'Space' : expected.value.toUpperCase()} again. Stay on this letter.`
     if (!isRace.value && !isRescue.value) speak(expected.value === ' ' ? 'space' : expected.value.toUpperCase())
   }
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
  stopTick()
  testText.value = Array(5).fill(testTexts[tests.value.length % testTexts.length]!).join(' '); testCursor.value = 0; testCorrect.value = 0; testMistakes.value = 0
  testTime.value = 60; testDone.value = false; testPlaying.value = false
  startCountdown(beginTest)
}
function beginTest() {
  testPlaying.value = true; started.value = Date.now()
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
function mysteryMessage(role: MysteryMessage['role'], text: string) {
  mysteryMessages.value.push({ role, text })
  void nextTick(() => { if (mysteryLog.value) mysteryLog.value.scrollTop = mysteryLog.value.scrollHeight })
}
function adventureMessage(message: AdventureMessage) {
  adventureMessages.value.push(message)
  void nextTick(() => { if (adventureLog.value) adventureLog.value.scrollTop = adventureLog.value.scrollHeight })
}
function dungeonMessage(role: DungeonMessage['role'], text: string, duration?: string) {
  dungeonMessages.value.push({ role, text, duration })
  void nextTick(() => { if (dungeonLog.value) dungeonLog.value.scrollTop = dungeonLog.value.scrollHeight })
}
async function startDungeon() {
  if (dungeonBusy.value) return
  if (!apiKey.value.trim() || !online.value) { dungeonError.value = 'Add an OpenRouter key in Settings and connect to play.'; return }
  dungeonGameId++
  dungeonBusy.value = true
  try {
    dungeon.value = newDungeon()
    dungeonMessages.value = []
    dungeonMapHover.value = null
    dungeonAction.value = ''; dungeonCorrections.value = []; dungeonError.value = ''
    dungeonMessage('guide', `Level 1 begins. ${roomDescription(dungeon.value)} Stampy says: “I'm lost too. Let's find the five magic stones and get out together!”`)
    await setSetting('dungeon-save', JSON.stringify(dungeon.value))
  } catch (e) { dungeonError.value = String(e instanceof Error ? e.message : e) }
  finally { dungeonBusy.value = false }
}
async function sendDungeonAction() {
  const game = dungeon.value
  if (!game || game.phase === 'won' || dungeonBusy.value || !online.value) return
  const action = dungeonAction.value.trim()
  if (!action) return
  if (action.length < 5 || !/\p{L}/u.test(action)) { dungeonError.value = 'Type a full action in words, such as “peek through the left door”.'; return }
  dungeonError.value = ''; dungeonCorrections.value = []; dungeonBusy.value = true
  const id = dungeonGameId
  const start = performance.now()
  dungeonMessage('player', action)
  dungeonMessages.value.push({ role: 'guide', text: 'Stampy and the dungeon guide are thinking…', thinking: true })
  const waiting = dungeonMessages.value.at(-1)!
  void nextTick(() => { if (dungeonLog.value) dungeonLog.value.scrollTop = dungeonLog.value.scrollHeight })
  try {
    const checked = await reviewDungeonAction(apiKey.value, model.value, dungeonContext(game), action)
    if (id !== dungeonGameId) return
    const duration = `${((performance.now() - start) / 1000).toFixed(1)}s`
    if (checked.corrections.length) { dungeonCorrections.value = checked.corrections; waiting.text = 'Stampy says: “A few words need fixing first. Nothing in the dungeon has changed.”'; waiting.duration = duration; return }
    dungeonAction.value = ''
    const outcome = applyDungeonIntent(game, checked.intent!)
    waiting.text = outcome.text; waiting.duration = duration
    if (outcome.changed) await setSetting('dungeon-save', JSON.stringify(game))
  } catch (e) { if (id === dungeonGameId) { dungeonError.value = String(e instanceof Error ? e.message : e); waiting.text = 'Stampy says: “The guide could not answer just now. Your action has not changed the dungeon.”'; waiting.duration = `${((performance.now() - start) / 1000).toFixed(1)}s` } }
  finally {
    if (id === dungeonGameId) {
      waiting.thinking = false
      dungeonBusy.value = false
      await nextTick()
      if (dungeonLog.value) dungeonLog.value.scrollTop = dungeonLog.value.scrollHeight
      if (page.value === 'dungeon' && dungeon.value?.phase !== 'won' && online.value) dungeonInput.value?.focus()
    }
  }
}
function resetAdventure() {
  adventureGameId++; adventureStatus.value = 'idle'; adventureTurn.value = 0; adventureCurrent.value = null
  adventureMessages.value = []; adventureAction.value = ''; adventureCorrections.value = []; adventureError.value = ''; adventureBusy.value = false
}
async function startAdventure() {
  if (!apiKey.value.trim() || !online.value) { adventureError.value = 'Add an OpenRouter key in Settings and connect to play.'; return }
  const game = ++adventureGameId
  adventureStatus.value = 'idle'; adventureTurn.value = 0; adventureCurrent.value = null; adventureMessages.value = []
  adventureAction.value = ''; adventureCorrections.value = []; adventureError.value = ''; adventureBusy.value = true
  try {
    const theme = adventureThemes.find(item => item.id === adventureTheme.value)!
    const opening = await beginAdventure(apiKey.value, model.value, theme.setting, crypto.randomUUID())
    if (game !== adventureGameId) return
    adventureCurrent.value = opening; adventureStatus.value = 'playing'
    adventureMessage({ role: 'guide', text: opening.scene, choices: opening.choices })
  } catch (e) { if (game === adventureGameId) adventureError.value = String(e instanceof Error ? e.message : e) }
  finally { if (game === adventureGameId) adventureBusy.value = false }
}
async function chooseAdventure() {
  if (adventureStatus.value !== 'playing' || adventureBusy.value || !online.value || !adventureCurrent.value) return
  const action = adventureAction.value.trim()
  if (!action) return
  adventureError.value = ''; adventureCorrections.value = []
  if (!isAdventureAction(action)) { adventureError.value = 'Type an action in words, such as “follow the path”. Numbers, letters and out-of-story instructions do not count.'; return }
  adventureBusy.value = true
  const game = adventureGameId
  try {
    const theme = adventureThemes.find(item => item.id === adventureTheme.value)!
    const reply = await continueAdventure(apiKey.value, model.value, theme.setting, adventureCurrent.value, action, adventureTurn.value + 1)
    if (game !== adventureGameId) return
    if (reply.corrections.length) { adventureCorrections.value = reply.corrections; return }
    adventureMessage({ role: 'player', text: action }); adventureAction.value = ''
    if (!reply.understood || !reply.story) { adventureMessage({ role: 'guide', text: reply.message }); return }
    adventureCurrent.value = reply.story; adventureTurn.value++
    adventureMessage({ role: 'guide', text: reply.story.scene, choices: reply.story.choices })
    if (adventureTurn.value === 20) adventureStatus.value = 'finished'
  } catch (e) { if (game === adventureGameId) adventureError.value = String(e instanceof Error ? e.message : e) }
  finally { if (game === adventureGameId) adventureBusy.value = false }
}
function endMystery() {
  if (mysteryRemaining.value !== 0) return
  mysteryStatus.value = 'lost'
  mysteryMessage('guide', `No questions left! I was thinking of ${mysteryAnswer.value}. Want another round?`)
}
async function startMystery() {
  if (!apiKey.value.trim() || !online.value) { mysteryError.value = 'Add an OpenRouter key in Settings and connect to play.'; return }
  const game = ++mysteryGameId
  mysteryStatus.value = 'idle'; mysteryAnswer.value = ''; mysteryRemaining.value = 20; mysteryMessages.value = []
  mysteryQuestion.value = ''; mysteryCorrections.value = []; mysteryError.value = ''; mysteryAsked.clear(); mysteryBusy.value = true
  try {
    const answer = await pickMystery(apiKey.value, model.value, shuffledAnswers())
    if (game !== mysteryGameId) return
    mysteryAnswer.value = answer; mysteryStatus.value = 'playing'
    mysteryMessage('guide', 'I have picked something familiar: an animal, a plant, or a material. Ask up to 20 yes-or-no questions to guess it!')
  } catch (e) { if (game === mysteryGameId) mysteryError.value = String(e instanceof Error ? e.message : e) }
  finally { if (game === mysteryGameId) mysteryBusy.value = false }
}
async function askMystery() {
  if (mysteryStatus.value !== 'playing' || mysteryBusy.value || !online.value) return
  const question = mysteryQuestion.value.trim()
  if (!question) return
  mysteryError.value = ''; mysteryCorrections.value = []
  if (isHintRequest(question)) {
    mysteryMessage('player', question); mysteryQuestion.value = ''
    if (mysteryRemaining.value >= 10) { mysteryMessage('guide', 'Hints unlock when fewer than 10 questions remain. This did not use a turn.'); return }
    mysteryBusy.value = true
    try {
      const hint = await getMysteryHint(apiKey.value, model.value, mysteryAnswer.value, [...mysteryAsked])
      mysteryRemaining.value--; mysteryMessage('guide', `Hint: ${hint}`); endMystery()
    } catch (e) { mysteryError.value = String(e instanceof Error ? e.message : e); mysteryMessage('guide', 'That hint did not work. You kept your turn.') }
    finally { mysteryBusy.value = false }
    return
  }
  if (!isGameQuestion(question)) {
    mysteryMessage('player', question); mysteryMessage('guide', 'Please ask a yes-or-no question about the mystery thing. This did not use a turn.'); return
  }
  const normalized = normalizeQuestion(question)
  if (mysteryAsked.has(normalized)) {
    mysteryMessage('player', question); mysteryMessage('guide', 'You already asked me that! Try a different question. Your turn is safe.'); mysteryQuestion.value = ''; return
  }
  mysteryBusy.value = true
  try {
    const reply = await reviewMysteryQuestion(apiKey.value, model.value, mysteryAnswer.value, question)
    if (reply.corrections.length) { mysteryCorrections.value = reply.corrections; return }
    const correctGuess = isCorrectGuess(question, mysteryAnswer.value)
    mysteryMessage('player', question); mysteryQuestion.value = ''
    if (reply.answer === 'clarify') { mysteryMessage('guide', `${reply.message} You kept your turn.`); return }
    mysteryAsked.add(normalized); mysteryRemaining.value--
    if (correctGuess) { mysteryStatus.value = 'won'; mysteryMessage('guide', `Yes! You got it — ${mysteryAnswer.value}!`); return }
    mysteryMessage('guide', reply.message); endMystery()
  } catch (e) { mysteryError.value = String(e instanceof Error ? e.message : e) }
  finally { mysteryBusy.value = false }
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
  try { await setSetting('key', apiKey.value.trim()); await setSetting('model', model.value.trim()); await setSetting('voice', voice.value ? 'on' : 'off'); await setSetting('speech-language', speechLanguage.value); await setSetting('speech-voice', speechVoice.value); feedback.value = 'Settings saved on this device.' }
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
        <button :class="{active:page==='games'||page==='twenty'||page==='adventure'||page==='dungeon'}" @click="go('games')"><span>✦</span> Typing games</button>
      </nav>
      <div class="side-label tools-label">FIELD TOOLS</div>
      <nav><button :class="{active:page==='settings'}" @click="go('settings')"><span>⚙</span> Settings</button></nav>
      <div class="sidebar-bottom"><div class="avatar">H</div><div><strong>Explorer Henry</strong><small>Field researcher</small></div><span class="online-dot"></span></div>
    </aside>

    <main class="main">
      <header class="topbar"><div class="breadcrumb">THE EXPEDITION <span>/</span> {{ page === 'mission' ? `MISSION ${mission.id}` : page === 'base' ? 'BASE CAMP' : page === 'twenty' ? 'TYPING GAMES / 20 QUESTIONS' : page === 'adventure' ? 'TYPING GAMES / STORY ADVENTURE' : page === 'dungeon' ? 'TYPING GAMES / DUNGEON LABYRINTH' : page === 'games' ? 'TYPING GAMES' : page.toUpperCase() }}</div><div class="top-actions"><span class="offline-pill"><i></i> {{ online ? 'OFFLINE READY' : 'PLAYING OFFLINE' }}</span><span class="gold-pill">✦ <b>{{ earned }}</b> GOLD</span></div></header>
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

       <div v-if="ready && page==='mission'" class="content mission-content"><button class="back-link" @click="go('map')">← Back to mission map</button><div class="mission-header"><div><div class="eyebrow">MISSION {{ String(mission.id).padStart(2,'0') }} / 10 · {{ mission.region.toUpperCase() }}</div><h1>{{ mission.animal }}</h1><p>{{ mission.habitat }} · Near {{ mission.place }}, {{ mission.region }}</p></div><div class="mission-icon" :style="{'--accent':mission.color}"><span v-if="isRescue && !finished" aria-label="Animal hidden until camera watch complete">?</span><img v-else :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div></div>
         <div class="stepper"><div v-for="(label,i) in ['Briefing','Travel','Fieldwork','Rescue','Report']" :key="label" :class="{current:phase===(i===0?0:i+1),passed:phase>(i===0?0:i+1)}"><span>{{ phase>(i===0?0:i+1) ? '✓' : i+1 }}</span>{{ label }}</div></div>
         <template v-if="phase===0"><div class="paper-card brief-card"><div class="eyebrow">✉ &nbsp; INCOMING FIELD MESSAGE</div><h2>Message from your expedition guide</h2><p class="quote">“{{ mission.brief }}”</p><div class="signoff">Adventure awaits, <b>Forrest-inspired guide ✳</b></div></div><div class="fact-strip"><span>ⓘ</span><p><b>Real-world field note:</b> {{ mission.fact }}</p></div><button class="primary-btn" @click="nextPhase">Begin travel <span>→</span></button></template>
         <template v-else-if="phase>=2 && phase<=4"><div class="game-layout" :class="{'travel-layout':isRoute,'race-layout':isRace,'rescue-layout':isRescue}"><div class="game-main"><div class="paper-card game-card"><div class="game-top"><div><div class="eyebrow">STAGE {{ phase-1 }} OF 3 · {{ phase===2?'TRAVEL':phase===3?'FIELDWORK':'RESCUE' }}</div><h2>{{ stageName }}</h2></div><div v-if="playing" class="timer" :class="{urgent:seconds<12}">◷ {{ seconds }}s</div></div><p v-if="!playing && !finished && !failed && !countdown" class="game-instruction">{{ isRoute ? `Fly from Auckland to ${mission.place}. Type the words in order to draw your flight path. Keep typing: after 10 seconds without a correct key the plane crashes! You have 2½ minutes. Five stars starts at 30 WPM × accuracy.` : isRace ? `Race three poacher vehicles to the field site through ${mission.habitat.toLowerCase()} country. Each correct key boosts your car; mistakes cost time, but you can catch up. Finish within 90 seconds to win and continue.` : `Finding an animal in the wild requires patience, skill and some luck! Type steadily at ${rescueTarget} adjusted WPM or faster with at least 92% recent accuracy to raise the Luck meter from red to green. Keep typing to hold it green for 15 uninterrupted seconds. You have 90 seconds; otherwise the camera records no sighting and you can try again.` }}</p><div v-if="!playing && !finished && !failed && !countdown" class="preflight"><span>⌨</span><div><b>Ready when you are.</b><small>{{ isRoute ? '60 familiar words · Space between words · 30 adjusted WPM for ★★★★★' : isRace ? 'Space between words · Rivals finish at 91s, 100s, 110s · 30 adjusted WPM for ★★★★★' : `90-second camera watch · ${rescueTarget} adjusted WPM to fill · ${rescueTarget+2} for ★★★★★` }}</small></div><button class="primary-btn" @click="startStage">{{ isRoute?'Take off →':isRace?'Start race →':'Start camera watch →' }}</button></div><div v-if="countdown" :key="countdown" class="game-countdown" role="status" aria-live="assertive"><strong>{{ countdown }}</strong><span>GET READY · {{ isRoute?'TAKE OFF':isRace?'RACE':'CAMERA WATCH' }}</span></div>
            <template v-if="playing || countdown || (failed && (isRoute || isRace || isRescue)) || (finished && (isRace || isRescue))">
              <div v-if="isRoute" class="flight-map" :class="{crashed:failed}" role="group" :aria-label="`Flight from Auckland to ${mission.place}; ${Math.round(flightProgress*100)} percent complete`">
                <div class="flight-world" :style="cameraStyle">
                  <svg class="flight-routes" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><polyline class="flight-upcoming" :points="routeLine" vector-effect="non-scaling-stroke"/><polyline class="flight-flown" :points="flownLine" vector-effect="non-scaling-stroke"/></svg>
                  <div v-for="(stop,i) in flightStops" :key="i" class="flight-stop" :class="{visited:flightProgress >= i/(flightStops.length-1),destination:i===flightStops.length-1}" :style="{left:stop.x/10+'%',top:stop.y/5.2+'%',transform:`translate(-50%,-50%) scale(${1/mapZoom})`}"><span class="flight-dot"></span><span class="flight-label">{{ stop.name }}</span></div>
                  <div class="flight-plane" :style="{left:flightPosition.x/10+'%',top:flightPosition.y/5.2+'%',transform:`translate(-50%,-50%) rotate(${flightPosition.angle}deg) scale(${1/mapZoom})`}"><svg viewBox="-22 -18 44 36" aria-hidden="true"><path d="M-17-12 19 0-17 12-9 2-20 0-9-2Z"/></svg></div>
                </div>
                <div class="flight-overlay"><div class="flight-heading">✈ AUCKLAND → {{ mission.place.toUpperCase() }} <span>WORD {{ Math.min(promptIndex+1,prompts.length) }} / {{ prompts.length }}</span></div><div v-if="failed" class="flight-mayday">MAYDAY! FLIGHT INTERRUPTED</div><template v-else><div class="flight-words" aria-label="Words to type"><span v-for="(word,i) in prompts.slice(Math.max(0,promptIndex-1),promptIndex+6)" :key="Math.max(0,promptIndex-1)+i" :class="{past:Math.max(0,promptIndex-1)+i<promptIndex,active:Math.max(0,promptIndex-1)+i===promptIndex}"><template v-if="Math.max(0,promptIndex-1)+i===promptIndex"><b>{{ word.slice(0,character) }}</b><em>{{ expected===' ' ? '␣' : expected }}</em>{{ word.slice(Math.min(character+1,word.length)) }}</template><template v-else>{{ word }}</template></span></div><div class="flight-stats">{{ accuracy }}% accuracy · {{ mistakes }} misses <strong :class="{urgent:stallSeconds<=3}">✈ AIR: {{ stallSeconds }}s</strong></div></template></div>
                <div class="flight-cartouche">THE WILD TYPE · WORLD EXPEDITION</div>
             </div>
              <div v-else-if="isRace" class="race-scene" :class="[`terrain-${raceTerrain[missionIndex]}`,{lost:failed,won:finished,boosting:boosting && playing}]" :style="raceSceneryStyle" role="group" :aria-label="`Race through ${mission.habitat}; you are ${Math.round(playerDistance*100)} percent of the way to the finish`">
                <div class="race-sky"><div class="race-sun"></div><div class="race-far"></div><div class="race-near"></div><span class="race-place">{{ mission.habitat.toUpperCase() }} · {{ mission.region.toUpperCase() }}</span></div>
                <div class="race-track"><div class="race-world" :style="raceWorldStyle"><div class="race-finish-line"><span>FINISH</span></div><div v-for="(rival,i) in rivalProgress" :key="i" class="race-lane"><div class="race-car" :class="[`rival-${i}`,{surging:rivalBoosts[i]}]" :style="{left:`${rival*100}%`}"><img :src="`/car-villain-${i+1}.svg`" :alt="`Poacher ${i+1} car`"/><small>POACHER {{ i+1 }}</small></div></div><div class="race-lane player-lane"><div class="race-car player-car" :class="{boost:boosting && playing}" :style="{left:`${raceVisualDistance*100}%`}"><img src="/car-jeep.svg" alt="Henry's expedition jeep"/><small>HENRY</small></div></div></div><div class="race-lane-labels"><span v-for="(time,i) in rivalFinishTimes" :key="i" class="lane-label">{{ ['PURPLE','RED','GOLD'][i] }} · {{ time }}s</span><span class="lane-label">HENRY · YOU</span></div></div>
                <div class="race-hud"><div class="race-title">{{ finished?'FINISH LINE · HENRY WINS!':failed?'RACE OVER · TRY AGAIN':'TYPE TO BOOST · BEAT 90 SECONDS' }} <span>{{ Math.min(promptIndex+1,prompts.length) }} / {{ prompts.length }} WORDS</span></div><div v-if="playing" class="race-words" aria-label="Words to type"><span v-for="(word,i) in prompts.slice(Math.max(0,promptIndex-1),promptIndex+6)" :key="Math.max(0,promptIndex-1)+i" :class="{past:Math.max(0,promptIndex-1)+i<promptIndex,active:Math.max(0,promptIndex-1)+i===promptIndex}"><template v-if="Math.max(0,promptIndex-1)+i===promptIndex"><b>{{ word.slice(0,character) }}</b><em>{{ expected===' '?'␣':expected }}</em>{{ word.slice(Math.min(character+1,word.length)) }}</template><template v-else>{{ word }}</template></span></div><div v-else class="race-words" :class="{'race-words-lost':failed}">{{ failed?'THE POACHERS ARE CLOSING IN':'YOU MADE IT TO THE FIELD SITE!' }}</div><div class="race-metrics">{{ Math.round(playerDistance*100) }}% to finish · {{ accuracy }}% accuracy · {{ mistakes }} misses <span class="race-speed">SPEED {{ Math.round(raceSpeed) }} mph</span><strong>{{ Math.floor(raceElapsed) }} / 90s</strong></div></div>
             </div>
             <div v-else-if="isRescue" class="rescue-scene" :class="[{night:rescueNight,green:rescueLuck>=100,spotted:finished},`habitat-${rescueScene}`]" role="group" :aria-label="`${mission.habitat} camera watch; Luck meter ${Math.round(rescueLuck)} percent; green hold ${Math.floor(rescueHold)} of 15 seconds`">
               <div :key="rescueSceneIndex" class="rescue-frame"><div class="rescue-landscape"></div><div class="rescue-grain"></div></div>
               <div class="rescue-camera-tag"><span class="record-light">●</span> CAM {{ String(rescueSceneIndex+1).padStart(2,'0') }} · {{ rescueNight?'NIGHT VISION':'DAYLIGHT' }} <span>{{ mission.habitat.toUpperCase() }} · {{ mission.region.toUpperCase() }}</span></div>
               <div class="rescue-reticle" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
               <div v-if="finished" class="rescue-reveal"><div class="rescue-reveal-photo"><img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note" /></div><div><strong>ANIMAL REVEALED!</strong><h3>{{ mission.animal }}</h3><p>Mission reveal · {{ animalImages[missionIndex]!.note }}. This is a fictional camera-watch game, not footage of a new sighting.</p></div></div>
               <div v-else-if="failed" class="rescue-no-sighting">NO SIGHTING <small>Camera watch ended · try again</small></div>
               <div class="rescue-dashboard"><div class="rescue-meter-heading"><strong>✦ LUCK METER</strong><span>{{ rescueLuck>=100 ? `GREEN · HOLD ${Math.floor(rescueHold)} / 15s` : `${Math.round(rescueLuck)}% TO GREEN` }}</span></div><div class="rescue-meter" role="progressbar" aria-label="Luck meter" :aria-valuenow="Math.round(rescueLuck)" aria-valuemin="0" aria-valuemax="100"><div class="rescue-meter-fill" :style="{width:rescueLuck+'%'}"></div><span class="rescue-meter-end">✦</span></div><div class="rescue-hold"><div :style="{width:rescueHold/15*100+'%'}"></div></div><div class="rescue-metrics"><span>RECENT PACE <b>{{ rescuePace }} / {{ rescueTarget }} adjusted WPM</b></span><span>RECENT ACCURACY <b>{{ rescueAccuracy }}% / 92%</b></span><span>HOLD <b>{{ Math.floor(rescueHold) }} / 15s</b></span></div><div v-if="playing" class="rescue-words" aria-label="Words to type"><span v-for="(word,i) in prompts.slice(Math.max(0,promptIndex-1),promptIndex+6)" :key="Math.max(0,promptIndex-1)+i" :class="{past:Math.max(0,promptIndex-1)+i<promptIndex,active:Math.max(0,promptIndex-1)+i===promptIndex}"><template v-if="Math.max(0,promptIndex-1)+i===promptIndex"><b>{{ word.slice(0,character) }}</b><em>{{ expected===' '?'␣':expected }}</em>{{ word.slice(Math.min(character+1,word.length)) }}</template><template v-else>{{ word }}</template></span></div></div>
             </div>
               <div v-if="playing" class="feedback" aria-live="polite">{{ feedback || (isRoute ? 'Type the highlighted word and press Space. Keep the plane in the air!' : isRace ? 'Every correct key gives your car a boost. Keep going!' : 'Keep a steady rhythm! The Luck meter drains if your pace or accuracy drops.') }}</div><input v-if="playing" ref="gameInput" class="capture-input" aria-label="Type the highlighted text here" autocomplete="off" spellcheck="false" @input="($event.target as HTMLInputElement).value=''" />
           </template>
            <div v-if="failed" class="stage-result"><span class="result-symbol">↺</span><h3>{{ isRoute?'Flight crashed!':isRace?'The poachers got ahead!':'No sighting this time.' }}</h3><p>{{ feedback }}</p><button class="primary-btn" @click="startStage">{{ isRoute?'Fly again from Auckland →':isRace?'Retry race →':'Retry camera watch →' }}</button></div><div v-if="finished" class="stage-result"><span class="result-symbol">✦</span><h3>{{ isRoute?'Touchdown, Henry!':isRace?'You won the race!':'Animal revealed, Henry!' }}</h3><div class="stars">{{ '★'.repeat(outcome.stars) }}{{ '☆'.repeat(5-outcome.stars) }}</div><p>{{ outcome.accuracy }}% accuracy · {{ outcome.wpm }} WPM · {{ Math.round(outcome.wpm*outcome.accuracy/100) }} adjusted WPM · +{{ outcome.gold }} gold</p><button class="primary-btn" @click="nextPhase">{{ phase===4?'Write your field report':'Next stage' }} →</button></div><button v-if="!finished" class="text-btn testing-skip" @click="skipStage">Skip {{ isRoute?'Travel':isRace?'Fieldwork':'Rescue' }} (testing) →</button></div></div>
           <aside class="game-aside"><div class="keyboard-card"><div class="eyebrow">FINGER GUIDE</div><h3>{{ playing ? (expected===' '?'Space bar':shownKey) : 'Home row' }}</h3><p>{{ playing ? finger : 'Find F and J without looking down.' }} <span v-if="playing && expected!==expected.toLowerCase()">· Hold opposite Shift</span></p><div class="split-keyboard"><div class="key-half" v-for="(half,hi) in [leftKeys,rightKeys]" :key="hi"><div v-for="(row,ri) in half" :key="ri" class="key-row"><span v-for="key in row" :key="key" :class="{lit:playing && key===shownKey,home:['A','S','D','F','J','K','L',';'].includes(key)}">{{ key }}</span></div></div></div><div class="space-key" :class="{lit:playing && expected===' '}">SPACE · thumbs</div><div class="finger-legend"><span>● pinky</span><span>● ring</span><span>● middle</span><span>● index</span></div></div><div class="tip-card compact"><div class="tip-symbol">✳</div><div><div class="eyebrow">FIELD REMINDER</div><p>Eyes on the screen. Fingers on the home row. Every accurate key counts.</p></div></div></aside></div></template>
        <template v-else-if="phase===5"><div class="report-layout"><div class="paper-card report-card"><div class="eyebrow">✉ &nbsp; FIELD REPORT</div><h2>Write to your expedition guide</h2><p>Tell Forrest about the {{ mission.animal }}. Where does it live? What did you notice? What would you like to ask?</p><textarea v-model="reportText" :disabled="!!reportReply" placeholder="Dear Forrest, Today I learned about..." rows="8" aria-label="Your field report"></textarea><div class="report-actions"><button class="primary-btn" :disabled="aiBusy || !apiKey || !online" @click="checkWriting">{{ aiBusy?'Checking…':'Check my writing ✳' }}</button><span v-if="!apiKey || !online" class="unavailable">AI check unavailable · {{ !apiKey?'add a key in Settings':'offline' }}</span></div><div v-if="aiError" class="inline-error" role="alert">{{ aiError }}</div><div v-if="corrections.length && reportText===checkedText" class="corrections"><h3>Let's fix these first</h3><div v-for="(c,i) in corrections" :key="i"><s>{{ c.original }}</s> → <b>{{ c.replacement }}</b><p>{{ c.explanation }}</p></div><small>Edit your letter, then check again.</small></div><div v-if="reportText===checkedText && !corrections.length && checkedText && !aiError" class="success-box">✓ Great writing! Your report is ready to send.</div><div class="report-actions"><button v-if="reportText===checkedText && !corrections.length && checkedText && !aiError" class="primary-btn" :disabled="aiBusy" @click="sendReport">{{ aiBusy?'Sending…':'Send report & get reply →' }}</button><button class="secondary-btn" @click="localReport">Finish offline with a local reply →</button></div></div><div class="report-sidebar"><div class="animal-tile large"><img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div><h3>{{ mission.animal }}</h3><p>{{ mission.fact }}</p><small class="image-credit">{{ animalImages[missionIndex]!.note }} · <a :href="animalImages[missionIndex]!.source" target="_blank" rel="noopener">{{ animalImages[missionIndex]!.credit }} ↗</a> · <a :href="licenseUrl(animalImages[missionIndex]!.license)" target="_blank" rel="noopener">{{ animalImages[missionIndex]!.license }}</a></small><small>AI replies are fictional game messages inspired by an explorer, not actual messages from Forrest Galante.</small></div></div></template>
        <template v-else><div class="paper-card complete-card"><div class="eyebrow">MISSION {{ mission.id }} COMPLETE</div><div class="big-trophy">🏆 <img :src="animalImages[missionIndex]!.src" :alt="animalImages[missionIndex]!.note"/></div><h2>A new trophy for your shelf!</h2><p>You helped document the {{ mission.animal }}. Your field notes are saved and a new adventure awaits.</p><div class="reply-card"><div class="eyebrow">✉ &nbsp; REPLY FROM YOUR EXPEDITION GUIDE</div><p>“{{ reportReply }}”</p></div><div class="complete-actions"><button class="primary-btn" v-if="missionIndex<9" @click="openMission(missionIndex+1)">Next mission →</button><button class="secondary-btn" @click="go('shelf')">Visit trophy shelf</button></div></div></template>
      </div>

      <div v-if="ready && page==='shelf'" class="content"><div class="page-head"><div class="eyebrow">YOUR COLLECTION</div><h1>The trophy <em>shelf.</em></h1><p>Every report unlocks a new animal. {{ completed.size }} of 10 collected.</p></div><div class="trophy-grid"><div v-for="(m,i) in missions" :key="m.id" class="trophy-card" :class="{empty:!completed.has(m.id)}"><div class="trophy-figure"><img v-if="completed.has(m.id)" :src="animalImages[i]!.src" :alt="animalImages[i]!.note"/><span v-else>?</span></div><span class="trophy-cup">🏆</span><h3>{{ completed.has(m.id)?m.animal:'Undiscovered' }}</h3><small>{{ completed.has(m.id)?m.region:`MISSION ${String(m.id).padStart(2,'0')}` }}</small></div></div><details class="credits"><summary>Animal image credits &amp; identification notes</summary><div v-for="(image,i) in animalImages" :key="i"><b>{{ missions[i]!.animal }}</b> — {{ image.note }} · <a :href="image.source" target="_blank" rel="noopener">{{ image.credit }} ↗</a> · <a :href="licenseUrl(image.license)" target="_blank" rel="noopener">{{ image.license }}</a></div><p>Images have been resized for the offline app; no species or modern sighting is implied where a relative or archival specimen is shown.</p></details><p class="source-note"><a :href="source" target="_blank" rel="noopener">Animal episode source ↗</a>. No modern sighting is implied by an archival image.</p></div>

      <div v-if="ready && page==='test'" class="content"><div class="page-head"><div class="eyebrow">60-SECOND CHALLENGE</div><h1>Typing <em>test.</em></h1><p>One minute of easy-to-read text. See how far you've come!</p></div><div class="test-layout"><div class="paper-card test-card"><div class="test-top"><div><div class="eyebrow">YOUR PERSONAL BENCHMARK</div><h2>Ready, set, type.</h2></div><div class="timer">◷ {{ testTime }}s</div></div><div v-if="!testPlaying && !testDone" class="test-intro"><p>Type the highlighted text. Mistakes stay on the same letter. Your score is <b>WPM × accuracy</b>; your goal is <b>30 WPM at 95% accuracy</b>.</p><button class="primary-btn" @click="startTest">Start 1-minute test →</button></div><div v-if="testPlaying"><div class="test-paragraph"><span class="typed">{{ testText.slice(Math.max(0,testCursor-65),testCursor) }}</span><span class="cursor-letter">{{ testText[testCursor]===' '?'␣':testText[testCursor] }}</span>{{ testText.slice(testCursor+1,testCursor+170) }}</div><div class="feedback">{{ testMistakes }} mistakes · Keep your eyes on the screen</div><input ref="gameInput" class="capture-input" aria-label="Type the test text here" autocomplete="off" spellcheck="false" @input="($event.target as HTMLInputElement).value=''" /></div><div v-if="testDone" class="test-result"><div class="eyebrow">TEST COMPLETE {{ testOutcome.record?'· NEW PERSONAL BEST! ✦':'' }}</div><div class="result-numbers"><div><strong>{{ testOutcome.wpm }}</strong><small>WORDS / MIN</small></div><div><strong>{{ testOutcome.accuracy }}%</strong><small>ACCURACY</small></div><div><strong>{{ testOutcome.score }}</strong><small>ADJUSTED SCORE</small></div></div><p>Goal: 30 WPM × 95% = <b>28.5 adjusted WPM</b> {{ testOutcome.wpm>=30 && testOutcome.accuracy>=95?'· Goal achieved! 🎉':'' }}</p><button class="primary-btn" @click="startTest">Try again →</button></div></div><aside class="history-card"><div class="eyebrow">YOUR PROGRESS</div><h3>Past tests</h3><p v-if="!tests.length">Your results will appear here after your first test.</p><div v-for="t in tests.slice(0,8)" :key="t.id" class="history-row"><span>{{ dateLabel(t.created_at) }}</span><b>{{ t.score }} <small>score</small></b><span>{{ t.wpm }} WPM · {{ t.accuracy }}%</span></div><div v-if="tests.length>1" class="chart"><div v-for="t in [...tests].reverse().slice(-12)" :key="t.id" :style="{height:Math.max(8,t.score/Math.max(best,1)*100)+'%'}" :title="`${t.score} adjusted WPM`"></div></div></aside></div></div>

       <div v-if="ready && page==='settings'" class="content settings-content">
         <div class="page-head"><div class="eyebrow">FIELD STATION SETUP</div><h1>Settings <em>& tools.</em></h1><p>Keep your expedition comfortable. Your game progress lives on this device.</p></div>
         <div class="paper-card settings-card">
           <h2>Voice & sound</h2>
           <label class="toggle-row"><div><b>Speak words & letter hints</b><small>Read letter hints and encouragement aloud.</small></div><input v-model="voice" type="checkbox" /></label>
           <div class="speech-pickers">
             <label class="field-label">SPEECH LANGUAGE
               <select v-model="speechLanguage" aria-label="Speech language" :disabled="!speechAvailable" @change="changeSpeechLanguage">
                 <option v-for="lang in speechLanguages" :key="lang" :value="lang">{{ languageLabel(lang) }}</option>
               </select>
             </label>
             <label class="field-label">VOICE
               <select v-model="speechVoice" aria-label="Voice" :disabled="!speechAvailable || !matchingVoices.length">
                 <option value="">Browser default</option>
                 <option v-for="item in matchingVoices" :key="voiceKey(item)" :value="voiceKey(item)">{{ item.name }} · {{ item.localService ? 'on this device' : 'may need internet' }}</option>
               </select>
             </label>
           </div>
           <p class="small-note">{{ !speechAvailable ? 'Speech is not supported in this browser.' : !speechVoices.length ? 'No voices listed yet. Your browser may still be loading them; try Test voice or reopen Settings.' : !matchingVoices.length ? 'No listed voice for this language. The browser will try its default voice.' : 'Voices come from your browser and device. Local voices work offline; online voices may need internet. Language changes pronunciation, not the English game text.' }}</p>
           <button class="secondary-btn" :disabled="!voice || !speechAvailable" @click="testSpeech">Test voice ◖))</button><span v-if="speechFeedback" class="setting-feedback" role="status">{{ speechFeedback }}</span>
            <hr><h2>Optional AI field reports</h2><p>OpenRouter checks writing and creates fictional expedition-guide replies. The rest of the game works offline.</p><label class="field-label">OPENROUTER API KEY<input v-model="apiKey" type="password" autocomplete="off" placeholder="sk-or-…" /></label><label class="field-label">CHAT MODEL<select v-model="model"><option v-for="option in modelOptions" :key="option" :value="option">{{ option }}</option></select></label><p class="small-note">The key is stored locally in this browser's SQLite database. Calls go directly from your browser to OpenRouter; use a restricted key if possible. AI is unavailable without an internet connection.</p><button class="primary-btn" @click="saveSettings">Save settings →</button><span class="setting-feedback" role="status">{{ feedback }}</span>
         </div>
         <div class="fact-strip"><span>ⓘ</span><p>For best offline use, install the PWA from Chrome or Edge after loading it once while online. Available speech voices depend on your browser and operating system.</p></div>
       </div>
      <div v-if="page==='test' && countdown" :key="countdown" class="game-countdown test-countdown" role="status" aria-live="assertive"><strong>{{ countdown }}</strong><span>GET READY · TYPING TEST</span></div>
      <section v-if="ready && page==='games'" class="content twenty-promo">
        <div class="page-head typing-games-head"><div class="eyebrow">THREE WAYS TO PLAY</div><h1>Typing <em>games.</em></h1><p>Choose a game and practice your words through questions, stories, or dungeon adventures.</p></div>
        <div class="paper-card twenty-promo-card"><div><div class="eyebrow">A NEW WAY TO TYPE</div><h2>Play 20 Questions</h2><p>Guess an everyday animal, plant or material by typing yes-or-no questions. An AI guide answers while you practice spelling.</p></div><button class="primary-btn" @click="go('twenty')">Play 20 Questions →</button></div>
        <div class="paper-card twenty-promo-card"><div><div class="eyebrow">CHOOSE YOUR OWN PATH</div><h2>Story adventure</h2><p>Pick a favourite theme, then type your way through a short, original adventure with four paths at every turn.</p></div><button class="primary-btn" @click="go('adventure')">Play Story Adventure →</button></div>
        <div class="paper-card twenty-promo-card"><div><div class="eyebrow">FIVE FLOORS · ONE DRAGON</div><h2>Dungeon labyrinth</h2><p>Explore a changing maze with Stampy the talking cat, collect tools and gold, and type your way past tricky doors.</p></div><button class="primary-btn" @click="go('dungeon')">Play Dungeon Labyrinth →</button></div>
      </section>
      <div v-if="ready && page==='twenty'" class="content twenty-content">
        <button class="back-link" @click="go('games')">← Back to typing games</button>
        <div class="page-head"><div class="eyebrow">THE MYSTERY GAME</div><h1>20 <em>Questions.</em></h1><p>Ask yes-or-no questions about a familiar animal, plant or material. Guess before your 20 questions run out!</p></div>
        <div class="twenty-top"><div><b>{{ mysteryStatus==='idle'?'READY TO PLAY':mysteryStatus==='won'?'MYSTERY SOLVED':mysteryStatus==='lost'?'OUT OF QUESTIONS':'MYSTERY IN PROGRESS' }}</b><small>Spelling is checked before a question is sent. Unclear or repeated questions do not use a turn.</small></div><strong>{{ mysteryRemaining }} <span>/ 20 LEFT</span></strong></div>
        <div class="paper-card twenty-card">
          <div v-if="mysteryStatus==='idle'" class="twenty-intro"><span class="twenty-icon">?</span><h2>What am I thinking of?</h2><p>The AI picks an easy mystery from everyday animals, plants and materials. Type a question such as “Is it alive?” or guess “Is it a dog?”</p><p>Once fewer than 10 questions remain, type “hint” for a clue. A hint costs one turn.</p><button class="primary-btn" :disabled="mysteryBusy || !apiKey || !online" @click="startMystery">{{ mysteryBusy?'Choosing a mystery…':'Start a mystery →' }}</button><p v-if="!apiKey || !online" class="unavailable">An OpenRouter key and internet connection are needed. <button class="text-btn" @click="go('settings')">Open Settings →</button></p></div>
          <template v-else><div ref="mysteryLog" class="twenty-chat" role="log" aria-label="20 Questions chat" aria-live="polite"><div v-for="(message,i) in mysteryMessages" :key="i" class="twenty-message" :class="message.role"><small>{{ message.role==='player'?'YOU':'MYSTERY GUIDE' }}</small><p>{{ message.text }}</p></div></div>
            <div v-if="mysteryStatus==='playing'" class="twenty-controls"><form @submit.prevent="askMystery"><label for="mystery-question">YOUR NEXT QUESTION</label><div class="twenty-input-row"><input id="mystery-question" v-model="mysteryQuestion" type="text" maxlength="160" :disabled="mysteryBusy || !online" placeholder="Is it bigger than a dog?" autocomplete="off"/><button class="primary-btn" type="submit" :disabled="mysteryBusy || !mysteryQuestion.trim() || !online">{{ mysteryBusy?'Checking…':'Ask →' }}</button></div></form><div v-if="mysteryCorrections.length" class="twenty-corrections" role="alert"><b>Fix the spelling, then ask again:</b><p v-for="(item,i) in mysteryCorrections" :key="i"><s>{{ item.original }}</s> → <strong>{{ item.replacement }}</strong> · {{ item.explanation }}</p></div><div class="twenty-foot"><span>Questions left: <b>{{ mysteryRemaining }}</b> <template v-if="mysteryRemaining<10">· A hint costs one turn</template></span><button v-if="mysteryRemaining<10" class="secondary-btn" :disabled="mysteryBusy || !online" @click="mysteryQuestion='hint';askMystery()">Ask for a hint (−1) →</button></div></div>
            <div v-else class="twenty-finish"><h3>{{ mysteryStatus==='won'?'Great detective work, Henry!':'The mystery is over!' }}</h3><button class="primary-btn" :disabled="mysteryBusy || !online" @click="startMystery">{{ mysteryBusy?'Choosing a mystery…':'Play again →' }}</button></div>
          </template>
          <p v-if="mysteryError" class="inline-error" role="alert">{{ mysteryError }}</p>
        </div>
      </div>
      <div v-if="ready && page==='adventure'" class="content twenty-content adventure-content">
        <button class="back-link" @click="go('games')">← Back to typing games</button>
        <div class="page-head"><div class="eyebrow">A NEW STORY EACH TIME</div><h1>Story <em>adventure.</em></h1><p>Choose a theme and type what you want to do. Follow a suggested path or try a sensible new idea!</p></div>
        <div class="twenty-top"><div><b>{{ adventureStatus==='idle'?'CHOOSE A THEME':adventureStatus==='finished'?'THE END':adventureThemes.find(item=>item.id===adventureTheme)?.name.toUpperCase() }}</b><small>Type an action in words · Spelling is checked before the story continues · Unclear actions keep their turn.</small></div><strong>{{ adventureTurn }} <span>/ 20 TURNS</span></strong></div>
        <div class="paper-card twenty-card adventure-card">
          <div v-if="adventureStatus==='idle'" class="adventure-intro"><h2>Where shall we go?</h2><p>Every adventure is an original, kid-friendly story. Pick a world, then see where your choices lead.</p><div class="adventure-themes" role="radiogroup" aria-label="Story theme"><label v-for="theme in adventureThemes" :key="theme.id" :class="{selected:adventureTheme===theme.id}"><input v-model="adventureTheme" type="radio" name="adventure-theme" :value="theme.id"/><span><b>{{ theme.name }}</b><small>{{ theme.description }}</small></span></label></div><button class="primary-btn" :disabled="adventureBusy || !apiKey || !online" @click="startAdventure">{{ adventureBusy?'Creating your story…':'Start story →' }}</button><p v-if="!apiKey || !online" class="unavailable">An OpenRouter key and internet connection are needed. <button class="text-btn" @click="go('settings')">Open Settings →</button></p><p class="small-note">Fan adventures are original and unofficial. The Forrest Galante expedition is fictional and makes no claim of a real sighting.</p></div>
          <template v-else><div ref="adventureLog" class="twenty-chat adventure-chat" role="log" aria-label="Story adventure chat" aria-live="polite"><div v-for="(message,i) in adventureMessages" :key="i" class="twenty-message" :class="message.role"><small>{{ message.role==='player'?'YOU':'STORY GUIDE' }}</small><p>{{ message.text }}</p><div v-if="message.choices?.length" class="adventure-choices"><b>FOUR PATHS</b><ul><li v-for="choice in message.choices" :key="choice">{{ choice }}</li></ul></div></div></div>
            <div v-if="adventureStatus==='playing'" class="twenty-controls"><form @submit.prevent="chooseAdventure"><label for="adventure-action">WHAT DO YOU DO NEXT?</label><div class="twenty-input-row"><input id="adventure-action" v-model="adventureAction" type="text" maxlength="160" :disabled="adventureBusy || !online" placeholder="Type an action, like follow the path" autocomplete="off"/><button class="primary-btn" type="submit" :disabled="adventureBusy || !adventureAction.trim() || !online">{{ adventureBusy?'Checking…':'Continue story →' }}</button></div></form><div v-if="adventureCorrections.length" class="twenty-corrections" role="alert"><b>Fix the spelling, then try again:</b><p v-for="(item,i) in adventureCorrections" :key="i"><s>{{ item.original }}</s> → <strong>{{ item.replacement }}</strong> · {{ item.explanation }}</p></div><div class="twenty-foot"><span>Turn <b>{{ adventureTurn+1 }}</b> of 20 · Type the action in words, not a number or letter.</span><button class="text-btn" @click="resetAdventure">Change theme →</button></div></div>
            <div v-else class="twenty-finish"><h3>Adventure complete, Henry!</h3><p>You shaped the ending with your choices.</p><button class="primary-btn" :disabled="adventureBusy || !online" @click="startAdventure">{{ adventureBusy?'Creating your story…':'Another story →' }}</button><button class="secondary-btn" @click="resetAdventure">Choose another theme →</button></div>
          </template>
          <p v-if="adventureError" class="inline-error" role="alert">{{ adventureError }}</p>
        </div>
      </div>
      <div v-if="ready && page==='dungeon'" class="content dungeon-content">
        <button class="back-link" @click="go('games')">← Back to typing games</button>
        <div class="page-head"><div class="eyebrow">THE FIVE MAGIC STONES</div><h1>Dungeon <em>labyrinth.</em></h1><p>Type your decisions in full sentences. Peek before entering danger, ask Stampy for help, and collect each stone to reach the dragon.</p></div>
        <div class="twenty-top"><div><b>{{ !dungeon?'READY TO EXPLORE':dungeon.phase==='won'?'FRIENDS WITH A DRAGON':dungeon.phase==='dragon'?'THE DRAGON AWAITS':`LEVEL ${dungeon.level+1} · ${dungeonRoom?.title.toUpperCase()}` }}</b><small>Five levels · 20–24 rooms each · Spelling is checked before your action counts · Map and items survive a death.</small></div><strong>{{ dungeon?.stones.length ?? 0 }} <span>/ 5 STONES</span></strong></div>
        <div v-if="!dungeon" class="paper-card dungeon-intro"><span class="twenty-icon">◇</span><h2>Find your way out together.</h2><p>Each new game creates a fresh five-level maze. A lost talking cat named Stampy will help you; treasures, equipment and explored rooms remain yours if you die. The dragon needs kindness, not a sword.</p><button class="primary-btn" :disabled="dungeonBusy || !apiKey || !online" @click="startDungeon">Start a new dungeon →</button><p v-if="!apiKey || !online" class="unavailable">An OpenRouter key and internet connection are needed for typed actions. <button class="text-btn" @click="go('settings')">Open Settings →</button></p></div>
        <div v-else class="dungeon-layout">
          <section class="paper-card dungeon-main">
             <div ref="dungeonLog" class="twenty-chat dungeon-chat" role="log" aria-label="Dungeon events" aria-live="polite"><div v-for="(message,i) in dungeonMessages" :key="i" class="twenty-message" :class="[message.role,{thinking:message.thinking}]"><div class="dungeon-message-heading"><small>{{ message.role==='player'?'YOU':'DUNGEON GUIDE' }}</small><span v-if="message.duration" class="dungeon-call-time" :aria-label="`Guide response time ${message.duration}`">{{ message.duration }}</span></div><p>{{ message.text }}<span v-if="message.thinking" class="dungeon-thinking-dots" aria-hidden="true"> ● ● ●</span></p></div></div>
             <div v-if="dungeon.phase!=='won'" class="dungeon-choices"><b>FOUR IDEAS · TYPE YOUR OWN ACTION</b><ol v-if="dungeon.phase==='maze'"><li v-for="choice in suggestedActions(dungeon)" :key="choice">{{ choice }}</li></ol><ol v-else><li>Ask the dragon about its lost stones</li><li>Return the five magic stones</li><li>Offer the dragon a friendly name</li><li>Say something kind to the dragon</li></ol></div>
              <div v-if="dungeon.phase!=='won'" class="twenty-controls"><form @submit.prevent="sendDungeonAction"><label for="dungeon-action">WHAT DO YOU DO NEXT?</label><div class="twenty-input-row"><input id="dungeon-action" ref="dungeonInput" v-model="dungeonAction" type="text" maxlength="240" :disabled="dungeonBusy || !online" autocomplete="off" placeholder="I carefully peek through the east door…"/><button class="primary-btn" type="submit" :disabled="dungeonBusy || !dungeonAction.trim() || !online">{{ dungeonBusy?'Checking…':'Do it →' }}</button></div></form><div v-if="dungeonCorrections.length" class="twenty-corrections" role="alert"><b>Fix the spelling first; nothing has changed:</b><p v-for="(item,i) in dungeonCorrections" :key="i"><s>{{ item.original }}</s> → <strong>{{ item.replacement }}</strong> · {{ item.explanation }}</p></div><p v-if="!online" class="unavailable">Reconnect to send your next action. Your maze is saved on this device.</p></div>
            <div v-else class="twenty-finish"><h3>Well done, Henry and Stampy!</h3><p>The dragon has its stones back, a kind new name, and two new friends.</p></div>
            <p v-if="dungeonError" class="inline-error" role="alert">{{ dungeonError }}</p>
            <button class="text-btn dungeon-restart" :disabled="dungeonBusy || !online" @click="startDungeon">Start a different dungeon →</button>
          </section>
          <aside class="dungeon-sidebar">
            <div class="paper-card dungeon-map-card">
               <div class="eyebrow">DUNGEON MAP · LEVEL {{ dungeon.level+1 }}</div>
              <div class="dungeon-compass" role="img" aria-label="Compass: North at top, East at right, South at bottom, West at left"><span class="compass-north">NORTH</span><span class="compass-west">WEST</span><span class="compass-center">✣</span><span class="compass-east">EAST</span><span class="compass-south">SOUTH</span></div>
              <div class="dungeon-grid" role="group" aria-label="Map of explored rooms and visible doors">
                <template v-for="tile in dungeonMap" :key="tile.id">
                   <button v-if="tile.seen" type="button" class="dungeon-tile visited" :class="{current:dungeon.room===tile.id && dungeon.phase==='maze'}" :aria-label="`Room ${tile.id+1}${dungeon.room===tile.id && dungeon.phase==='maze'?' current':''}: ${roomDescription(dungeon, tile.id)}`" :title="`Room ${tile.id+1}: ${roomDescription(dungeon, tile.id)}`" @mouseenter="dungeonMapHover=tile.id" @mouseleave="dungeonMapHover=null" @focus="dungeonMapHover=tile.id" @blur="dungeonMapHover=null"><span v-for="dir in tile.doors" :key="dir" class="dungeon-door" :class="[`door-${dir}`,{frontier:tile.frontier.includes(dir)}]"></span><b>{{ tile.id+1 }}</b><small v-if="tile.stairs">★</small><small v-else-if="tile.monster">!</small></button>
                   <div v-else class="dungeon-tile" :class="{absent:tile.absent,mapped:tile.mapped}" :aria-label="tile.absent?'Outside the dungeon':tile.mapped?`Unvisited room ${tile.id+1}${tile.stairs?', stairs and guardian':tile.monster?', monster nearby':''}`:'Unexplored room'"><b v-if="tile.mapped">{{ tile.id+1 }}</b><small v-if="tile.mapped && tile.stairs">★</small><small v-else-if="tile.mapped && tile.monster">!</small></div>
                </template>
              </div>
               <p class="dungeon-map-key">Highlighted room: {{ dungeon.room+1 }} · bright door: unexplored passage · ★ stairs/guardian · ! monster (with magic compass).</p>
               <p v-if="dungeonCompassHint" class="dungeon-compass-hint">{{ dungeonCompassHint }}</p>
              <p v-if="dungeonTooltip" class="dungeon-map-tooltip" role="status">{{ dungeonTooltip }}</p><p v-else class="small-note">Hover or focus a visited room to read its description. Type “go to room 12” to return to a visited room.</p>
            </div>
            <div class="paper-card dungeon-inventory"><div class="eyebrow">YOUR PACK</div><h3>Inventory</h3><ul><li v-for="item in dungeon.inventory" :key="item">{{ itemName(item) }}</li><li v-if="!dungeon.inventory.length">Empty for now. Pick up anything useful.</li></ul><div class="dungeon-treasures">✦ {{ dungeon.gold }} gold <span>✧ {{ dungeon.stones.length }} / 5 stones</span></div><small>{{ dungeon.deaths }} {{ dungeon.deaths===1?'reset':'resets' }} · Progress kept</small></div>
            <div class="paper-card dungeon-stampy"><img class="stampy-portrait" src="/stampy-cat.svg" alt="Stampy, a friendly grey short-haired cartoon cat"/><h3>Stampy the cat</h3><p>{{ stampyAdvice(dungeon) }}</p><small>Type “Ask Stampy for advice” for a fresh clue.</small></div>
          </aside>
        </div>
      </div>
    </main>
  </div>
</template>
