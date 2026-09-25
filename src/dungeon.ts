export type Direction = 'north' | 'east' | 'south' | 'west'
export type DungeonVerb = 'move' | 'travel' | 'peek' | 'take' | 'use' | 'open' | 'inspect' | 'ask' | 'question' | 'give' | 'name' | 'compliment' | 'insult' | 'unknown'
export type DungeonIntent = { verb: DungeonVerb; direction: Direction | 'back' | 'none'; room: number | null; item: string; name: string; topic: string; reply: string }
export type Door = { to: number; gate?: string; secret?: boolean }
export type Room = { id: number; doors: Partial<Record<Direction, Door>>; floor: string[]; gold: number; title: string; box?: { item: string; answer: string; clue: string; hint: string } }
export type Level = { rooms: Room[]; exit: number; secret: number; seed: number }
export type DungeonGame = {
  version: 1; levels: Level[]; level: number; room: number; previous: number | null
  visited: number[][]; revealed: string[]; opened: string[]; inventory: string[]
  collected: string[]; openedBoxes: string[]; gold: number; stones: number[]; deaths: number
  phase: 'maze' | 'dragon' | 'won'; dragon: { returned: boolean; name: string; praised: boolean }
}

export const directions: Direction[] = ['north', 'east', 'south', 'west']
export const directionNames: Record<Direction, string> = { north: 'top', east: 'right', south: 'bottom', west: 'left' }
const opposite: Record<Direction, Direction> = { north: 'south', east: 'west', south: 'north', west: 'east' }
type GateKind = 'fire' | 'lock' | 'wall' | 'rocks' | 'dog' | 'battery' | 'canyon' | 'monster'
type GatePlan = { kind: GateKind; item: string; name: string; warning: string; peek: string }
const plans: [GatePlan, GatePlan][] = [
  [{ kind: 'fire', item: 'ice-spell', name: 'Ice spell', warning: 'A curtain of fire fills this doorway. Stepping through it would be deadly.', peek: 'Through the heat you glimpse a cool blue chamber.' }, { kind: 'monster', item: 'sword', name: 'Silver sword', warning: 'A deep snarl and heavy footsteps come from beyond this door.', peek: 'You crack the door and see a hulking shadow beast. A silver sword might drive it away.' }],
  [{ kind: 'lock', item: 'key', name: 'Copper key', warning: 'A copper lock holds this door shut.', peek: 'The keyhole is shaped like a tiny star.' }, { kind: 'dog', item: 'meat', name: 'Meat', warning: 'A hungry guard dog growls on the other side.', peek: 'You see a large dog guarding the threshold. It seems hungry, not mean.' }],
  [{ kind: 'rocks', item: 'bomb-kit', name: 'Bomb kit', warning: 'A pile of rocks blocks this passage.', peek: 'There is a clear path behind the rocks if you could move them.' }, { kind: 'monster', item: 'mirror-shield', name: 'Mirror shield', warning: 'A scraping, clicking noise echoes from the next chamber.', peek: 'A stone-eyed cave spider waits inside. A mirror shield could turn its gaze away.' }],
  [{ kind: 'wall', item: 'ladder', name: 'Ladder', warning: 'A high stone wall stands between you and the doorway.', peek: 'Over the wall you can see a safe landing; a ladder could reach it.' }, { kind: 'canyon', item: 'rope', name: 'Rope', warning: 'A deep canyon splits the passage. It is far too wide to jump.', peek: 'A sturdy anchor stands on the far side, perfect for a rope.' }],
  [{ kind: 'battery', item: 'battery', name: 'Battery', warning: 'A powered door has gone dark. Its battery slot is empty.', peek: 'A little lamp blinks beside an empty battery slot.' }, { kind: 'monster', item: 'sun-charm', name: 'Sun charm', warning: 'A huge winged creature rustles in the dark beyond.', peek: 'You glimpse a cave gryphon, frightened of the dark. A sun charm might calm it.' }],
]
const titles = ['Mossy Gallery', 'Echoing Vault', 'Lantern Alcove', 'Crystal Hall', 'Dusty Library', 'Copper Workshop', 'Underground Garden', 'Moonlit Chamber', 'Old Watch Post', 'Whispering Arcade', 'Stone Observatory', 'Forgotten Pantry']
const details = ['Blue crystals shimmer above you.', 'A little stream trickles along the wall.', 'Footprints disappear into the dust.', 'A painted star marks the ceiling.', 'Mushrooms glow in a crack between stones.', 'The air smells of old books and rain.', 'A clockwork mouse scurries under a bench.', 'The floor tiles make a faint musical note.']
const riddles = [
  { answer: 'shadow', clue: 'I follow you in the light but disappear in the dark. What am I?', hint: 'Look on the ground behind you when you stand by a lamp.' },
  { answer: 'cat', clue: 'I purr, have whiskers, and walk on quiet paws. What am I?', hint: 'I think the clue is describing someone like me!' },
  { answer: 'mirror', clue: 'I show your face but have no eyes. What am I?', hint: 'What would you look into to see your own face?' },
  { answer: 'moon', clue: 'I glow above the world at night but am not a star. What am I?', hint: 'Look up on a clear night.' },
  { answer: 'sun', clue: 'I warm the world and make the day bright. What am I?', hint: 'It rises each morning.' },
]

function random(seed: number) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 } }
function neighbors(id: number): { direction: Direction; id: number }[] {
  const x = id % 5, y = Math.floor(id / 5)
  return directions.flatMap(direction => {
    const nx = x + (direction === 'east' ? 1 : direction === 'west' ? -1 : 0)
    const ny = y + (direction === 'south' ? 1 : direction === 'north' ? -1 : 0)
    return nx >= 0 && nx < 5 && ny >= 0 && ny < 5 ? [{ direction, id: ny * 5 + nx }] : []
  })
}
export const itemName = (item: string) => item.split(':')[1]?.split('-').map(word => word[0]!.toUpperCase() + word.slice(1)).join(' ') ?? item
export const gateKey = (level: number, a: number, b: number) => `${level}:${Math.min(a, b)}-${Math.max(a, b)}`
export const secretKey = (level: number, room: number) => `${level}:${room}`

function buildLevel(seed: number, index: number): Level {
  const rand = random(seed)
  // A spanning tree gives every room a route to the entrance, without a shortcut around a gate.
  for (let attempt = 0; attempt < 200; attempt++) {
    const rooms: Room[] = Array.from({ length: 25 }, (_, id) => ({ id, doors: {}, floor: [], gold: rand() < .38 ? 3 + Math.floor(rand() * 16) : 0, title: titles[Math.floor(rand() * titles.length)]! }))
    const seen = new Set([0]), stack = [0], parent = Array<number>(25).fill(-1), depth = Array<number>(25).fill(0)
    while (stack.length) {
      const from = stack[stack.length - 1]!
      const options = neighbors(from).filter(next => !seen.has(next.id))
      if (!options.length) { stack.pop(); continue }
      const next = options[Math.floor(rand() * options.length)]!
      rooms[from]!.doors[next.direction] = { to: next.id }
      rooms[next.id]!.doors[opposite[next.direction]] = { to: from }
      seen.add(next.id); parent[next.id] = from; depth[next.id] = depth[from]! + 1; stack.push(next.id)
    }
    const exit = [...rooms].sort((a, b) => depth[b.id]! - depth[a.id]!)[0]!.id
    const path = [exit]
    while (path[0] !== 0) path.unshift(parent[path[0]!]!)
    const pathSet = new Set(path)
    const gatePositions = [Math.floor(path.length / 3), Math.floor(path.length * 2 / 3)]
    const secretCandidates = rooms.filter(room => !pathSet.has(room.id) && Object.keys(room.doors).length === 1 && depth[room.id]! < gatePositions[1]!)
    if (path.length < 12 || path.length > 22 || !secretCandidates.length || gatePositions[1]! - gatePositions[0]! < 3) continue
    const secret = secretCandidates[Math.floor(rand() * secretCandidates.length)]!.id
    const entrance = parent[secret]!
    const hiddenDirection = directions.find(direction => rooms[entrance]!.doors[direction]?.to === secret)!
    rooms[entrance]!.doors[hiddenDirection]!.secret = true
    rooms[secret]!.doors[opposite[hiddenDirection]]!.secret = true
    rooms[secret]!.gold = 25 + Math.floor(rand() * 20)
    const gates = plans[index]!
    gatePositions.forEach((step, i) => {
      const a = path[step - 1]!, b = path[step]!
      for (const room of [rooms[a]!, rooms[b]!]) {
        const door = Object.values(room.doors).find(door => door.to === (room.id === a ? b : a))!
        door.gate = gates[i]!.kind
      }
      // Place the solution immediately before the gate, or along a reachable branch.
      const itemRoom = path[Math.max(0, step - 2)]!
      if (i === 1) rooms[itemRoom]!.box = { item: `${index}:${gates[i]!.item}`, ...riddles[index]! }
      else rooms[itemRoom]!.floor.push(`${index}:${gates[i]!.item}`)
    })
    // A reusable bomb kit makes a hidden side chamber optional on every floor.
    rooms[0]!.floor.push(`${index}:bomb-kit`)
    rooms[exit]!.floor.push(`${index}:magic-stone`)
    return { rooms, exit, secret, seed }
  }
  throw new Error('Could not lay out the maze. Try starting a new game.')
}

export function newDungeon(seed = crypto.randomUUID()): DungeonGame {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  return { version: 1, levels: Array.from({ length: 5 }, (_, index) => buildLevel((hash + Math.imul(index + 1, 2654435761)) >>> 0, index)), level: 0, room: 0, previous: null, visited: [[0], [], [], [], []], opened: [], openedBoxes: [], revealed: [], inventory: [], collected: [], gold: 0, stones: [], deaths: 0, phase: 'maze', dragon: { returned: false, name: '', praised: false } }
}

export function availableDoors(game: DungeonGame, room = game.room) {
  const current = game.levels[game.level]!.rooms[room]!
  return directions.flatMap(direction => {
    const door = current.doors[direction]
    return door && (!door.secret || game.revealed.includes(secretKey(game.level, Math.min(room, door.to)))) ? [{ direction, door }] : []
  })
}
function gatePlan(level: number, kind: string) { return plans[level]!.find(plan => plan.kind === kind)! }
function doorLabel(game: DungeonGame, room: number, direction: Direction, door: Door) {
  const gate = door.gate && !game.opened.includes(gateKey(game.level, room, door.to)) ? gatePlan(game.level, door.gate) : null
  return gate ? `Beyond the ${directionNames[direction]} (${direction}) door: ${gate.warning}` : `The ${directionNames[direction]} (${direction}) door is open.`
}
export function roomDescription(game: DungeonGame, roomId = game.room): string {
  const room = game.levels[game.level]!.rooms[roomId]!
  const floor = room.floor.filter(item => !game.collected.includes(item))
  const intro = roomId === 0 ? 'Stampy, a lost talking cat, pads beside you. He wants to find the way out and offers to help.' : details[(room.id + game.level * 3 + room.title.length) % details.length]!
  const visible = availableDoors(game, roomId)
  const secret = Object.values(room.doors).find(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to))))
  return `${room.title}. ${intro} ${visible.map(({ direction, door }) => doorLabel(game, roomId, direction, door)).join(' ')} ${floor.length ? `On the floor: ${floor.map(itemName).join(', ')}.` : ''} ${room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`) ? `A puzzle box has a word dial. Its clue reads: “${room.box.clue}” Say a word to open it.` : ''} ${room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`) ? `${room.gold} gold coins glimmer nearby; ask to pick them up.` : ''} ${secret ? 'A wall sounds strangely hollow when Stampy taps it.' : ''} ${room.id === game.levels[game.level]!.exit && !game.stones.includes(game.level) ? 'A magic stone rests on a pedestal here. You must collect it to descend.' : ''}`.replace(/\s+/g, ' ').trim()
}

// Only use rooms and doors the player has actually explored. Never shortcut a closed gate.
export function routeToVisitedRoom(game: DungeonGame, number: number): number[] | null {
  const target = number - 1
  const visited = new Set(game.visited[game.level])
  if (!Number.isInteger(number) || target < 0 || target >= 25 || !visited.has(target)) return null
  const queue: number[][] = [[game.room]], found = new Set([game.room])
  while (queue.length) {
    const path = queue.shift()!
    const from = path[path.length - 1]!
    if (from === target) return path
    for (const { door } of availableDoors(game, from)) {
      if (!visited.has(door.to) || found.has(door.to) || door.gate && !game.opened.includes(gateKey(game.level, from, door.to))) continue
      found.add(door.to)
      queue.push([...path, door.to])
    }
  }
  return null
}

export function suggestedActions(game: DungeonGame): string[] {
  const room = game.levels[game.level]!.rooms[game.room]!
  const actions: string[] = []
  if (room.floor.some(item => !game.collected.includes(item))) actions.push(`Pick up the ${itemName(room.floor.find(item => !game.collected.includes(item))!).toLowerCase()}`)
  if (room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`)) actions.push('Pick up the gold coins')
  if (room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`)) actions.push('Open the puzzle box with a word')
  const hidden = Object.values(room.doors).some(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to))))
  if (hidden) actions.push('Place a bomb on the hollow wall')
  for (const { direction, door } of availableDoors(game)) {
    const closed = door.gate && !game.opened.includes(gateKey(game.level, game.room, door.to))
    if (closed) {
      actions.push(`Peek through the ${directionNames[direction]} door`)
      if (game.inventory.includes(`${game.level}:${gatePlan(game.level, door.gate!).item}`)) actions.push(`Use ${gatePlan(game.level, door.gate!).name.toLowerCase()} on the ${directionNames[direction]} door`)
    } else actions.push(`Walk through the ${directionNames[direction]} door`)
  }
  actions.push('Ask Stampy for advice', 'Look carefully around the room', 'Check your inventory')
  return [...new Set(actions)].slice(0, 4)
}

export function stampyAdvice(game: DungeonGame): string {
  if (game.phase === 'dragon') return 'Stampy whispers: “Ask why the stones matter. Give them back, offer a kind name, and tell the dragon something you truly like about it.”'
  const room = game.levels[game.level]!.rooms[game.room]!
  if (room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`)) return `Stampy says: “${room.box.hint} Tell the word dial your answer.”`
  const hidden = Object.values(room.doors).some(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to))))
  if (hidden) return 'Stampy says: “That wall sounds hollow. A bomb kit might reveal an optional treasure room!”'
  const closed = availableDoors(game).find(({ door }) => door.gate && !game.opened.includes(gateKey(game.level, game.room, door.to)))
  if (closed) {
    const plan = gatePlan(game.level, closed.door.gate!)
    return `Stampy whispers: “I ${plan.kind === 'dog' ? 'smell' : 'hear'} danger by the ${directionNames[closed.direction]} door. Peek first! ${game.inventory.includes(`${game.level}:${plan.item}`) ? `Try using your ${plan.name.toLowerCase()}.` : `Look for a ${plan.name.toLowerCase()} before crossing.`}”`
  }
  return 'Stampy says: “We can peek through doors, gather anything on the floor, and explore rooms we have not visited. Ask me again if a doorway looks risky!”'
}

export type DungeonOutcome = { text: string; changed: boolean; died?: boolean }
export function applyDungeonIntent(game: DungeonGame, intent: DungeonIntent): DungeonOutcome {
  if (game.phase === 'dragon') return talkToDragon(game, intent)
  if (game.phase === 'won') return { text: 'You and your new dragon friend are already flying toward the sunset!', changed: false }
  const level = game.level, room = game.levels[level]!.rooms[game.room]!
  if (intent.verb === 'travel') {
    if (intent.room === null || !Number.isInteger(intent.room) || intent.room < 1 || intent.room > 25) return { text: 'Say a room number from 1 to 25 on this level, such as “go to room 12”.', changed: false }
    if (!game.visited[level]!.includes(intent.room - 1)) return { text: `Room ${intent.room} has not been visited on this level. Explore the visible doors first.`, changed: false }
    const path = routeToVisitedRoom(game, intent.room)
    if (!path) return { text: `There is no safe route to room ${intent.room} through your explored doors. Check for a blocked passage.`, changed: false }
    if (path.length === 1) return { text: `You are already in room ${intent.room}. ${roomDescription(game)}`, changed: false }
    game.previous = path[path.length - 2]!
    game.room = path[path.length - 1]!
    return { text: `You retrace your steps through ${path.length - 1} explored ${path.length === 2 ? 'doorway' : 'doorways'} to room ${intent.room}. ${roomDescription(game)}`, changed: true }
  }
  if (intent.verb === 'ask') return { text: stampyAdvice(game), changed: false }
  if (intent.verb === 'inspect' || intent.verb === 'question') return { text: `You take another careful look. ${roomDescription(game)} ${stampyAdvice(game)}`, changed: false }
  if (intent.verb === 'open') {
    if (!room.box || game.openedBoxes.includes(`${level}:${room.id}`)) return { text: 'There is no closed puzzle box here.', changed: false }
    if (intent.topic.trim().toLowerCase() !== room.box.answer) return { text: `The word dial does not open yet. Its clue reads: “${room.box.clue}” Ask Stampy if you need help.`, changed: false }
    game.openedBoxes.push(`${level}:${room.id}`)
    game.collected.push(room.box.item); game.inventory.push(room.box.item)
    return { text: `The box clicks open! You take the ${itemName(room.box.item).toLowerCase()} from inside and add it to your inventory.`, changed: true }
  }
  if (intent.verb === 'take') {
    if (intent.item === 'gold') {
      const id = `${level}:${room.id}:gold`
      if (!room.gold || game.collected.includes(id)) return { text: 'There are no loose gold coins to collect here.', changed: false }
      game.collected.push(id); game.gold += room.gold
      return { text: `You pick up ${room.gold} gold coins. Your purse now holds ${game.gold}.`, changed: true }
    }
    const floor = room.floor.filter(item => !game.collected.includes(item))
    const item = floor.find(value => value === intent.item || itemName(value).toLowerCase() === intent.item.toLowerCase()) ?? (floor.length === 1 && (!intent.item || intent.item === 'item') ? floor[0] : undefined)
    if (!item) return { text: `You cannot find that on this floor. ${floor.length ? `You can pick up: ${floor.map(itemName).join(', ')}.` : 'There is nothing left to pick up.'}`, changed: false }
    game.collected.push(item)
    if (item.endsWith(':magic-stone')) {
      game.stones.push(level)
      if (level === 4) {
        game.phase = 'dragon'
        return { text: 'You collect the fifth magic stone. A stairway spirals upward to a giant fire-breathing dragon. “You took my lost stones!” it says. “I have no name. Why should I trust you?” Stampy nudges you: talk kindly, return the stones, and listen.', changed: true }
      }
      game.level++; game.room = 0; game.previous = null; game.visited[game.level]!.push(0)
      return { text: `You collect magic stone ${level + 1} of 5! A staircase takes you to level ${game.level + 1}. Stampy follows, ready to help. ${roomDescription(game)}`, changed: true }
    }
    game.inventory.push(item)
    return { text: `You pick up the ${itemName(item).toLowerCase()} and keep it in your inventory.`, changed: true }
  }
  if (intent.verb === 'peek' || intent.verb === 'move' || intent.verb === 'use') {
    let direction: Direction | undefined = intent.direction !== 'none' && intent.direction !== 'back' ? intent.direction : undefined
    if (intent.direction === 'back') direction = directions.find(dir => room.doors[dir]?.to === game.previous)
    if (!direction && intent.verb === 'use' && intent.item.includes('bomb')) direction = directions.find(dir => room.doors[dir]?.secret && !game.revealed.includes(secretKey(level, Math.min(room.id, room.doors[dir]!.to))))
    if (!direction && intent.verb === 'use') {
      const matches = availableDoors(game).filter(({ door }) => door.gate && !game.opened.includes(gateKey(level, room.id, door.to)) && `${level}:${gatePlan(level, door.gate).item}` === intent.item)
      if (matches.length === 1) direction = matches[0]!.direction
    }
    if (!direction) return { text: 'Which door? Say top, right, bottom or left, or ask Stampy for advice.', changed: false }
    const door = room.doors[direction]
    if (!door) return { text: `There is no door on the ${directionNames[direction]} side.`, changed: false }
    const secret = door.secret && !game.revealed.includes(secretKey(level, Math.min(room.id, door.to)))
    if (secret) {
      if (intent.verb !== 'use') return { text: 'That looks like a plain wall. Stampy taps it: it sounds hollow.', changed: false }
      if (!game.inventory.some(item => item.endsWith(':bomb-kit')) || !intent.item.includes('bomb')) return { text: 'This hollow wall might open with a bomb kit. Find one before trying.', changed: false }
      game.revealed.push(secretKey(level, Math.min(room.id, door.to)))
      return { text: `You safely set a small bomb against the ${directionNames[direction]} wall. The hidden passage opens! Your reusable bomb kit stays with you.`, changed: true }
    }
    const gate = door.gate && !game.opened.includes(gateKey(level, room.id, door.to)) ? gatePlan(level, door.gate) : null
    if (intent.verb === 'peek') return { text: gate ? gate.peek : `You peek into the ${directionNames[direction]} room: ${game.levels[level]!.rooms[door.to]!.title}. It looks passable.`, changed: false }
    if (intent.verb === 'use') {
      if (!gate) return { text: 'This doorway is already passable. You can walk through it.', changed: false }
      if (intent.item !== `${level}:${gate.item}` || !game.inventory.includes(intent.item)) return { text: `That does not solve this doorway. ${gate.warning} Ask Stampy for advice.`, changed: false }
      game.opened.push(gateKey(level, room.id, door.to))
      return { text: `${gate.name} works! The ${directionNames[direction]} passage is now safe. ${gate.kind === 'monster' || gate.kind === 'dog' ? 'The creature settles down and lets you pass.' : ''}`, changed: true }
    }
    if (gate) {
      if (intent.item === `${level}:${gate.item}` && game.inventory.includes(intent.item)) {
        game.opened.push(gateKey(level, room.id, door.to))
      } else if (['fire', 'monster', 'dog', 'canyon'].includes(gate.kind)) {
        const advice = stampyAdvice(game)
        game.deaths++; game.room = 0; game.previous = null
        return { text: `${gate.warning} You rush in without solving it and lose this attempt! Stampy guides you back to the level entrance. Your explored map, gold, stones, and items are safe. ${advice}`, changed: true, died: true }
      } else return { text: `You cannot pass yet. ${gate.warning} Try the correct item first.`, changed: false }
    }
    game.previous = game.room; game.room = door.to
    if (!game.visited[level]!.includes(door.to)) game.visited[level]!.push(door.to)
    return { text: `You walk through the ${directionNames[direction]} door. ${roomDescription(game)}`, changed: true }
  }
  return { text: 'Try a full sentence: peek through a door, pick up an item, use an item on a doorway, or ask Stampy.', changed: false }
}

function talkToDragon(game: DungeonGame, intent: DungeonIntent): DungeonOutcome {
  const dragon = game.dragon
  if (intent.verb === 'ask') return { text: stampyAdvice(game), changed: false }
  if (intent.verb === 'insult') {
    game.deaths++; game.dragon = { returned: false, name: '', praised: false }
    return { text: 'The dragon roars at the unkind words. Your conversation starts over; your five stones, gold and inventory are safe. Stampy says: “Be gentle. Ask what it needs, then return its stones and choose a kind name.”', changed: true, died: true }
  }
  if (intent.verb === 'question' || intent.verb === 'inspect') return { text: intent.reply || '“I lost my five magic stones long ago,” the dragon says. “I miss their light, and I wish someone would give me a name.”', changed: false }
  if (intent.verb === 'give') {
    if (dragon.returned) return { text: '“Thank you. My stones are safe with me now,” says the dragon. “Perhaps I need a name?”', changed: false }
    dragon.returned = true
    return dragonResponse(game, 'You return all five stones. The dragon gently folds its wings. “You brought them back! Perhaps we can be friends. What would you call me?”')
  }
  if (intent.verb === 'name') {
    const name = intent.name.trim()
    if (!/^[\p{L}][\p{L} '\-]{1,23}$/u.test(name)) return { text: 'The dragon asks for a short, kind name. Try “I would name you Ember.”', changed: false }
    dragon.name = name
    return dragonResponse(game, `“${name}? I like that name!” the dragon says, its eyes brightening.`)
  }
  if (intent.verb === 'compliment') {
    dragon.praised = true
    return dragonResponse(game, '“That is kind of you to say,” the dragon replies with a shy smile.')
  }
  return { text: 'The dragon waits for your words. Ask a question, return its stones, offer a kind name, or say something you appreciate about it.', changed: false }
}
function dragonResponse(game: DungeonGame, text: string): DungeonOutcome {
  if (game.dragon.returned && game.dragon.name && game.dragon.praised) {
    game.phase = 'won'
    return { text: `${text} “You gave back my stones, chose my name, and saw the good in me. We are friends!” Stampy leaps onto your shoulder. You climb onto the dragon's back and ride together into the sunset. THE END.`, changed: true }
  }
  const missing = [!game.dragon.returned && 'return the stones', !game.dragon.name && 'offer a name', !game.dragon.praised && 'say something kind about the dragon'].filter(Boolean).join(', ')
  return { text: `${text} Stampy whispers: “Now ${missing}.”`, changed: true }
}

export function dungeonContext(game: DungeonGame): string {
  if (game.phase === 'dragon') return JSON.stringify({ phase: 'dragon', returnedStones: game.dragon.returned, name: game.dragon.name, complimented: game.dragon.praised, stampy: stampyAdvice(game) })
  const room = game.levels[game.level]!.rooms[game.room]!
  return JSON.stringify({ phase: 'maze', level: game.level + 1, room: roomDescription(game), visitedRooms: game.visited[game.level]!.map(id => id + 1), choices: suggestedActions(game), doors: availableDoors(game).map(({ direction, door }) => ({ direction, gate: door.gate && !game.opened.includes(gateKey(game.level, room.id, door.to)) ? door.gate : 'open' })), inventory: game.inventory.map(item => ({ id: item, name: itemName(item) })), floor: room.floor.filter(item => !game.collected.includes(item)).map(item => ({ id: item, name: itemName(item) })), box: room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`) ? { clue: room.box.clue } : null, goldOnFloor: room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`), previousDirection: directions.find(direction => room.doors[direction]?.to === game.previous) ?? null, hiddenWall: Object.values(room.doors).some(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to)))) })
}

export function validDungeonSave(value: unknown): value is DungeonGame {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<DungeonGame>
  return game.version === 1 && Array.isArray(game.levels) && game.levels.length === 5 && game.levels.every(level => level.rooms?.length === 25) && typeof game.level === 'number' && game.level >= 0 && game.level < 5 && typeof game.room === 'number' && game.room >= 0 && game.room < 25 && Array.isArray(game.visited) && game.visited.length === 5 && Array.isArray(game.inventory) && Array.isArray(game.stones) && Array.isArray(game.collected) && Array.isArray(game.opened) && Array.isArray(game.openedBoxes) && Array.isArray(game.revealed) && !!game.dragon && ['maze', 'dragon', 'won'].includes(game.phase ?? '')
}
