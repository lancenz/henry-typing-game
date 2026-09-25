import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/dungeon.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { newDungeon, applyDungeonIntent, roomDescription, suggestedActions, routeToVisitedRoom, secretKey, gateKey, directions } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

function act(game, verb, direction = 'none', item = '', name = '') {
  return applyDungeonIntent(game, { verb, direction, room: null, item, name, topic: '', reply: '' })
}
function travel(game, number) {
  return applyDungeonIntent(game, { verb: 'travel', direction: 'none', room: number, item: '', name: '', topic: '', reply: '' })
}
function route(level, target) {
  const queue = [[0]], found = new Set([0])
  while (queue.length) {
    const path = queue.shift()
    if (path.at(-1) === target) return path
    for (const door of Object.values(level.rooms[path.at(-1)].doors)) {
      if (!found.has(door.to) && !door.secret) { found.add(door.to); queue.push([...path, door.to]) }
    }
  }
  throw new Error(`Unreachable room ${target}`)
}

for (let seed = 0; seed < 30; seed++) {
  const game = newDungeon(`repeatable-${seed}`)
  assert.equal(game.levels.length, 5)
  for (let floor = 0; floor < 5; floor++) {
    const level = game.levels[floor]
    assert.equal(level.rooms.length, 25)
    assert.equal(new Set(level.rooms.map(room => room.id)).size, 25)
    assert.equal(game.level, floor)
    assert.equal(game.room, 0)
    const path = route(level, level.exit)
    assert(path.length >= 12 && path.length <= 22)
    assert(level.rooms.flatMap(room => Object.values(room.doors).filter(door => door.secret)).length === 2)
    assert.equal(suggestedActions(game).length, 4)
    assert.match(roomDescription(game), /Stampy/)
    assert.equal(routeToVisitedRoom(game, 25), null)
    assert.match(travel(game, 25).text, /not been visited/)
    assert.match(travel(game, 26).text, /1 to 25/)
    assert.match(travel(game, 1).text, /already in room 1/)
    if (floor === 0 && seed === 0) {
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
      for (const item of room.floor.filter(value => !game.collected.includes(value))) {
        const result = act(game, 'take', 'none', item)
        assert(result.changed, `Could not pick up ${item}`)
        if (item.endsWith('magic-stone')) break
      }
      if (game.level !== floor || game.phase === 'dragon') break
      if (floor === 0 && seed === 0 && step === 2) {
        const returnTo = room.id + 1
        const goldBefore = game.gold
        assert.deepEqual(routeToVisitedRoom(game, 1), path.slice(0, 3).reverse())
        assert.match(travel(game, 1).text, /retrace your steps/)
        assert.equal(game.room, 0)
        assert.match(travel(game, returnTo).text, new RegExp(`room ${returnTo}`))
        assert.equal(game.room, room.id)
        assert.equal(game.gold, goldBefore, 'Backtracking must not pick up gold')
        assert.match(roomDescription(game, path[1]), /door/)
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
          assert.equal(game.room, 0)
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
      assert(act(game, 'move', direction).changed)
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
console.log('Dungeon generation passed: 30 complete five-floor mazes, gates, death persistence, hidden rooms and dragon endings.')
