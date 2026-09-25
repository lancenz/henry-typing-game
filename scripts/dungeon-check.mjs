import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/dungeon.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { newDungeon, applyDungeonIntent, upgradeDungeonSave, roomDescription, suggestedActions, routeToVisitedRoom, secretKey, portalKey, gateKey, directions } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

function act(game, verb, direction = 'none', item = '', name = '', topic = '') {
  return applyDungeonIntent(game, { verb, direction, room: null, item, name, topic, reply: '' })
}
function travel(game, number, nextDirection) {
  return applyDungeonIntent(game, { verb: 'travel', direction: 'none', room: number, nextDirection, item: '', name: '', topic: '', reply: '' })
}
function route(level, target) {
  const queue = [[level.entrance ?? 0]], found = new Set([level.entrance ?? 0])
  while (queue.length) {
    const path = queue.shift()
    if (path.at(-1) === target) return path
    for (const door of Object.values(level.rooms[path.at(-1)].doors)) {
      if (!found.has(door.to) && !door.secret) { found.add(door.to); queue.push([...path, door.to]) }
    }
  }
  throw new Error(`Unreachable room ${target}`)
}

const entrances = new Set()
let trinketCount = 0
for (let seed = 0; seed < 30; seed++) {
  const game = newDungeon(`repeatable-${seed}`)
  assert.equal(game.levels.length, 5)
  for (let floor = 0; floor < 5; floor++) {
    const level = game.levels[floor]
    assert.equal(level.rooms.length, 25)
    assert.equal(new Set(level.rooms.map(room => room.id)).size, 25)
    assert(level.rooms.filter(room => room.active).length >= 20 && level.rooms.filter(room => room.active).length <= 24)
    assert(level.rooms.some(room => !room.active))
    trinketCount += level.rooms.flatMap(room => room.floor).filter(item => item.split(':').length === 3).length
    entrances.add(level.entrance)
    assert.equal(game.level, floor)
    assert.equal(game.room, level.entrance)
    const path = route(level, level.exit)
    assert(path.length >= 10 && path.length <= 23)
    const grogRooms = level.rooms.filter(room => room.merchant).map(room => room.id)
    assert.equal(grogRooms.length, 2)
    assert(!grogRooms.includes(level.entrance))
    assert(grogRooms.every(id => path.indexOf(id) >= Math.floor(path.length * .4)))
    assert.equal(level.rooms[level.entrance].floor.includes(`${floor}:bomb-kit`), false)
    assert.equal(level.rooms[path[1]].chest, `${floor}:bomb-kit`)
    assert.match(roomDescription(game), /north|east|south|west/)
    assert.doesNotMatch(roomDescription(game), /\btop door|\bright door|\bleft door|\bbottom door/)
    assert(level.rooms.flatMap(room => Object.values(room.doors).filter(door => door.secret)).length === 2)
    assert.equal(suggestedActions(game).length, 4)
    assert.match(roomDescription(game), /Stampy/)
    const unseen = level.rooms.find(room => !game.visited[floor].includes(room.id))
    assert.equal(routeToVisitedRoom(game, unseen.id + 1), null)
    assert.match(travel(game, unseen.id + 1).text, /not been visited/)
    assert.match(travel(game, 26).text, /1 to 25/)
    assert.match(travel(game, level.entrance + 1).text, new RegExp(`already in room ${level.entrance + 1}`))
    if (floor === 0 && seed === 0) {
      assert.match(act(game, 'inspect').text, /extra gold.*guardian hint/)
      assert.equal(act(game, 'inspect').changed, false)
      assert.match(act(game, 'question', 'none', '', '', 'pick mushrooms').text, /poisonous/)
      assert.match(act(game, 'question', 'none', '', '', 'freeze the water').text, /no point in freezing/i)
      assert.match(act(game, 'unknown').text, /not sure what you mean/)
      assert.match(applyDungeonIntent(game, { verb: 'ask', direction: 'none', room: null, item: '', name: '', topic: 'Indy', action: 'Tell me about Indy', reply: '' }).text, /black cocker spaniel brother/)
      assert.match(applyDungeonIntent(game, { verb: 'ask', direction: 'none', room: null, item: '', name: '', topic: 'owners', reply: '' }).text, /three humans.*remember/i)
      assert.match(applyDungeonIntent(game, { verb: 'ask', direction: 'none', room: null, item: '', name: '', topic: 'portal', reply: '' }).text, /back yard.*magic portal/i)
      assert.match(applyDungeonIntent(game, { verb: 'unknown', direction: 'none', room: null, item: '', name: '', topic: '', action: 'pet Stampy the cat', reply: '' }).text, /Stampy purrs/)
      assert.match(act(game, 'buy').text, /don’t see Grog/)
      assert.equal(act(game, 'take', 'none', '0:bomb-kit').changed, false)
      assert.equal(routeToVisitedRoom(game, unseen.id + 1), null)
      const multi = structuredClone(game)
      multi.room = path[1]
      multi.levels[0].rooms[path[1]].gold = 9
      assert.match(act(multi, 'open', 'none', '', '', 'chest').text, /bomb kit/)
      const both = applyDungeonIntent(multi, { verb: 'take', direction: 'none', room: null, item: 'gold', items: ['gold', '0:bomb-kit'], topic: '', name: '', reply: '' })
      assert(both.changed)
      assert.equal(multi.gold, game.gold + 9)
      assert(multi.inventory.includes('0:bomb-kit'))
      assert.equal(multi.collected.filter(id => id === '0:bomb-kit').length, 1)
      assert.equal(applyDungeonIntent(multi, { verb: 'take', direction: 'none', room: null, item: 'gold', items: ['gold', '0:bomb-kit'], topic: '', name: '', reply: '' }).changed, false)
      const legacy = structuredClone(game)
      legacy.levels[0].rooms[level.entrance].merchant = true
      legacy.levels[0].rooms[level.entrance].floor.push('0:bomb-kit')
      legacy.levels[0].rooms[path[1]].chest = undefined
      upgradeDungeonSave(legacy)
      assert(!legacy.levels[0].rooms[level.entrance].merchant)
      assert.equal(legacy.levels[0].rooms[path[1]].chest, '0:bomb-kit')
      const solid = structuredClone(game)
      solid.inventory.push('0:bomb-kit')
      const wall = directions.find(direction => !level.rooms[solid.room].doors[direction]) ?? directions.find(direction => !level.rooms[solid.room].doors[direction]?.secret)
      assert(act(solid, 'use', wall, '0:bomb-kit').died)
      assert.equal(solid.room, level.entrance)
      const barrel = level.rooms.find(room => room.barrel)
      assert(barrel?.portal !== undefined)
      const portalTest = structuredClone(game)
      portalTest.room = barrel.id
      assert(act(portalTest, 'barrel').changed)
      assert(portalTest.revealed.includes(portalKey(0, barrel.id, barrel.portal)))
      assert(act(portalTest, 'portal').changed)
      assert.equal(portalTest.room, barrel.portal)
      const entrance = level.rooms.find(room => Object.values(room.doors).some(door => door.to === level.secret))
      const dir = directions.find(direction => entrance.doors[direction]?.to === level.secret)
      const test = structuredClone(game)
      test.room = entrance.id; test.inventory.push('0:bomb-kit')
      assert.match(act(test, 'move', dir).text, /sounds hollow/i)
      assert.match(act(test, 'use', dir, '0:bomb-kit').text, /hidden passage/i)
      assert(test.revealed.includes(secretKey(0, Math.min(entrance.id, level.secret))))
      assert.match(act(test, 'move', dir).text, /You walk/)
      assert(test.room === level.secret)
    }
    for (let step = 0; step < path.length; step++) {
      const room = level.rooms[path[step]]
      assert.equal(game.room, room.id)
      if (room.chest && !game.openedBoxes.includes(`chest:${floor}:${room.id}`)) {
        assert.match(act(game, 'open', 'none', '', '', 'chest').text, /bomb kit/i)
        assert(room.floor.includes(`${floor}:bomb-kit`))
      }
      if (room.merchant && seed === 0 && floor === 0) {
        assert.match(roomDescription(game), /small, friendly-looking troll named Grog/)
        assert.doesNotMatch(roomDescription(game), /merchant|explorer map|magic compass/i)
        assert.match(applyDungeonIntent(game, { verb: 'talk', action: 'fight Grog', direction: 'none', room: null, item: '', name: '', topic: 'fight Grog', reply: '' }).text, /Stampy.*looks friendly/i)
        assert.match(applyDungeonIntent(game, { verb: 'talk', action: 'how are you in two places?', direction: 'none', room: null, item: '', name: '', topic: 'two places', reply: '' }).text, /Grog doesn’t understand/)
        assert.match(applyDungeonIntent(game, { verb: 'question', action: 'What do you sell?', direction: 'none', room: null, item: '', name: '', topic: '', reply: '' }).text, /Grog has.*Explorer map/)
        const leaving = structuredClone(game)
        const back = directions.find(direction => leaving.levels[0].rooms[leaving.room].doors[direction]?.to === path[step - 1])
        assert.match(act(leaving, 'move', back).text, /Grog vanishes/)
        assert.match(applyDungeonIntent(game, { verb: 'talk', action: 'be friends with Grog', direction: 'none', room: null, item: '', name: '', topic: 'friend', reply: '' }).text, /Grog thinks you are a friend/)
        assert.match(applyDungeonIntent(game, { verb: 'buy', action: 'what do you have for sale Grog?', direction: 'none', room: null, item: '', name: '', topic: '', reply: '' }).text, /Explorer map.*Magic compass/)
        const unseenStock = structuredClone(game)
        unseenStock.gold = 100
        unseenStock.grogExtra = []
        unseenStock.inventory = unseenStock.inventory.filter(item => item !== '0:secret-sense')
        assert.equal(applyDungeonIntent(unseenStock, { verb: 'buy', action: 'buy secret sense charm', direction: 'none', room: null, item: '', name: '', topic: 'secret sense charm', reply: '' }).changed, false)
        assert(!unseenStock.inventory.includes('0:secret-sense'))
        assert.match(applyDungeonIntent(game, { verb: 'talk', action: 'what else do you sell Grog?', direction: 'none', room: null, item: '', name: '', topic: 'what else', reply: '' }).text, /secret sense charm/)
        game.gold += 100
        const alreadyHadMap = game.inventory.includes('0:map')
        const beforeDiscount = game.gold
        if (!alreadyHadMap) assert.match(applyDungeonIntent(game, { verb: 'buy', action: 'buy explorer map from Grog', direction: 'none', room: null, item: '0:map', name: '', topic: 'explorer map', reply: '' }).text, /All rooms.*outlined/)
        assert(game.inventory.includes('0:map'))
        if (!alreadyHadMap) assert.equal(beforeDiscount - game.gold, 10)
        assert.equal(routeToVisitedRoom(game, unseen.id + 1), null, 'A bought map never grants travel')
        if (!game.inventory.includes('0:compass')) assert(applyDungeonIntent(game, { verb: 'buy', action: 'buy magic compass', direction: 'none', room: null, item: '0:compass', name: '', topic: 'magic compass', reply: '' }).changed)
        if (!game.inventory.includes('0:secret-sense')) assert(applyDungeonIntent(game, { verb: 'buy', action: 'buy secret sense charm', direction: 'none', room: null, item: '', name: '', topic: 'secret sense charm', reply: '' }).changed)
        const sale = structuredClone(game)
        sale.inventory.push('0:24:shiny-button')
        assert.match(applyDungeonIntent(sale, { verb: 'barter', action: 'sell shiny button to Grog', direction: 'none', room: null, item: '0:24:shiny-button', name: '', topic: '', reply: '' }).text, /Grog buys your shiny button/)
        assert(!sale.inventory.includes('0:24:shiny-button'))
        const trade = structuredClone(game)
        trade.inventory = trade.inventory.filter(item => item !== '0:sword')
        trade.inventory.push('0:24:painted-pebble')
        assert.match(applyDungeonIntent(trade, { verb: 'barter', action: 'trade painted pebble for silver sword', direction: 'none', room: null, item: '0:24:painted-pebble', name: '', topic: 'silver sword', reply: '' }).text, /Grog trades a silver sword/)
        assert(trade.inventory.includes('0:sword'))
      }
      if (room.id === level.exit) {
        assert.match(act(game, 'take', 'none', `${floor}:magic-stone`).text, /guardian blocks/)
        const failed = structuredClone(game)
        assert.match(act(failed, 'answer', 'none', '', '', 'B').text, /One mistake used/)
        assert(act(failed, 'answer', 'none', '', '', 'C').died)
        assert.equal(failed.room, level.entrance)
        for (const letter of ['A', 'B', 'C']) assert(act(game, 'answer', 'none', '', '', letter).changed)
        assert(game.defeated.includes(floor))
      }
      for (const item of room.floor.filter(value => !game.collected.includes(value))) {
        const result = act(game, 'take', 'none', item)
        assert(result.changed, `Could not pick up ${item}`)
        if (item.endsWith('magic-stone')) break
      }
      if (game.level !== floor || game.phase === 'dragon') break
      if (floor === 0 && seed === 0 && step === 2) {
        const returnTo = room.id + 1
        const goldBefore = game.gold
         assert.deepEqual(routeToVisitedRoom(game, level.entrance + 1), path.slice(0, 3).reverse())
         assert.match(travel(game, level.entrance + 1).text, /retrace your steps/)
         assert.equal(game.room, level.entrance)
         assert.match(travel(game, returnTo).text, new RegExp(`room ${returnTo}`))
         assert.equal(game.room, room.id)
         assert.equal(game.gold, goldBefore, 'Backtracking must not pick up gold')
         assert.match(roomDescription(game, path[1]), /door/)
         const combined = structuredClone(game)
         const secondDirection = directions.find(dir => room.doors[dir]?.to === path[step + 1])
         combined.room = level.entrance
         combined.previous = null
         assert.match(travel(combined, room.id + 1, secondDirection).text, /You walk through/)
         assert.equal(combined.room, path[step + 1])
      }
      if (room.box) {
        const wrong = applyDungeonIntent(game, { verb: 'open', direction: 'none', item: '', name: '', topic: 'banana', reply: '' })
        assert.equal(wrong.changed, false)
        const right = applyDungeonIntent(game, { verb: 'open', direction: 'none', item: '', name: '', topic: room.box.answer, reply: '' })
        assert.match(right.text, /box clicks open/i)
        assert(game.inventory.includes(room.box.item))
      }
      if (room.gold) {
        const before = game.gold
        act(game, 'take', 'none', 'gold')
        assert.equal(game.gold, before + room.gold)
      }
      if (step === path.length - 1) throw new Error('Exit had no stone')
      const next = path[step + 1]
      const direction = directions.find(dir => room.doors[dir]?.to === next)
      const door = room.doors[direction]
      if (door.gate && !game.opened.includes(gateKey(floor, room.id, next))) {
        const peek = act(game, 'peek', direction)
        assert(peek.text.length > 10)
        assert.equal(game.room, room.id)
        if (seed === 0 && floor === 0 && door.gate === 'fire') {
          const savedGold = game.gold, savedItems = [...game.inventory], savedMap = [...game.visited[floor]]
          assert(act(game, 'move', direction).died, 'Fire should kill without casting the ice spell')
           assert.equal(game.room, level.entrance)
          assert.equal(game.gold, savedGold)
          assert.deepEqual(game.inventory, savedItems)
          assert.deepEqual(game.visited[floor], savedMap)
          for (let back = 0; back < step; back++) {
            const d = directions.find(dir => level.rooms[path[back]].doors[dir]?.to === path[back + 1])
            assert(act(game, 'move', d).changed)
          }
          assert.equal(game.room, room.id)
        }
        const required = Object.keys({ fire: 'ice-spell', lock: 'key', wall: 'ladder', rocks: 'bomb-kit', dog: 'meat', battery: 'battery', canyon: 'rope', monster: floor === 0 ? 'sword' : floor === 2 ? 'mirror-shield' : 'sun-charm' })
        assert(required.includes(door.gate))
        const tool = { fire: 'ice-spell', lock: 'key', wall: 'ladder', rocks: 'bomb-kit', dog: 'meat', battery: 'battery', canyon: 'rope', monster: floor === 0 ? 'sword' : floor === 2 ? 'mirror-shield' : 'sun-charm' }[door.gate]
        assert(game.inventory.includes(`${floor}:${tool}`), `${floor}: gate ${door.gate} has no obtainable solution before it`)
        assert(act(game, 'use', direction, `${floor}:${tool}`).changed)
        if (floor === 0 && seed === 0) {
          const blocked = structuredClone(game)
          blocked.opened = blocked.opened.filter(key => key !== gateKey(floor, room.id, next))
          blocked.visited[floor].push(next)
          blocked.room = next
          assert.equal(routeToVisitedRoom(blocked, room.id + 1), null, 'Auto navigation must not cross a closed gate')
        }
      }
       if (door.gate === 'monster') assert.equal(game.room, next, 'Defeating a monster enters its room')
       else assert(act(game, 'move', direction).changed)
      assert.equal(game.room, next)
      assert.equal(suggestedActions(game).length, 4)
    }
    assert.equal(game.stones.length, floor + 1)
  }
  assert.equal(game.phase, 'dragon')
  assert.match(act(game, 'question').text, /stones/i)
  assert(act(game, 'give').changed)
  assert(act(game, 'name', 'none', '', 'Ember').changed)
  assert(act(game, 'insult').died)
  assert.equal(game.phase, 'dragon')
  assert.equal(game.stones.length, 5)
  assert.equal(game.dragon.returned, false)
  assert(act(game, 'give').changed)
  assert(act(game, 'name', 'none', '', 'Ember').changed)
  assert.match(act(game, 'compliment').text, /sunset/i)
  assert.equal(game.phase, 'won')
  assert.deepEqual(newDungeon(`repeatable-${seed}`).levels, newDungeon(`repeatable-${seed}`).levels)
}
assert(entrances.size > 1 && [...entrances].some(id => id !== 0))
assert(trinketCount > 100, 'Irregular levels should contain optional keepsakes')
const aiSource = readFileSync(new URL('../src/ai.ts', import.meta.url), 'utf8')
const aiJs = ts.transpileModule(aiSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { reviewDungeonAction } = await import(`data:text/javascript;base64,${Buffer.from(aiJs).toString('base64')}`)
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
const originalFetch = globalThis.fetch
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: 'http://localhost' } })
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    calls++
    const request = JSON.parse(options.body)
    assert.match(request.messages[1].content, /gold and the bomb kit/)
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ corrections: [], verb: 'take', direction: 'none', item: 'gold', topic: '', reply: '' }) } }] }) }
  }
  const context = JSON.stringify({ phase: 'maze', floor: [{ id: '0:bomb-kit', name: 'Bomb Kit' }], goldOnFloor: true })
  const checked = await reviewDungeonAction('test-key', '~deepseek/deepseek-flash-latest', context, 'Pick up the gold and the bomb kit')
  assert.deepEqual(new Set(checked.intent.items), new Set(['gold', '0:bomb-kit']))
  assert.equal(calls, 1, 'A multi-item action still uses one spelling and intent request')
} finally {
  globalThis.fetch = originalFetch
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
  else delete globalThis.navigator
  if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation)
  else delete globalThis.location
}
console.log('Dungeon generation passed: 30 irregular five-floor mazes, random entrances, shortcuts, merchant, trivia bosses and dragon endings.')
