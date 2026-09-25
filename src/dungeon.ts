export type Direction = 'north' | 'east' | 'south' | 'west'
export type DungeonVerb = 'move' | 'travel' | 'peek' | 'take' | 'use' | 'open' | 'inspect' | 'ask' | 'question' | 'give' | 'name' | 'compliment' | 'insult' | 'buy' | 'search' | 'answer' | 'portal' | 'barrel' | 'talk' | 'barter' | 'unknown'
export type DungeonIntent = { verb: DungeonVerb; direction: Direction | 'back' | 'none'; room: number | null; item: string; items?: string[]; name: string; topic: string; reply: string; action?: string; nextDirection?: Direction | 'back' | 'none' }
export type Door = { to: number; gate?: string; secret?: boolean }
export type Room = { id: number; active?: boolean; doors: Partial<Record<Direction, Door>>; floor: string[]; gold: number; title: string; box?: { item: string; answer: string; clue: string; hint: string }; chest?: string; portal?: number; barrel?: boolean; merchant?: boolean }
export type Level = { rooms: Room[]; exit: number; secret: number; seed: number; entrance?: number }
export type DungeonGame = {
  version: 1; levels: Level[]; level: number; room: number; previous: number | null
  visited: number[][]; revealed: string[]; opened: string[]; inventory: string[]
  collected: string[]; openedBoxes: string[]; gold: number; stones: number[]; deaths: number
  phase: 'maze' | 'dragon' | 'won'; dragon: { returned: boolean; name: string; praised: boolean }
  searched?: string[]; boss?: { level: number; correct: number; mistakes: number }; defeated?: number[]
  grogFriend?: boolean; grogMet?: number[]; grogExtra?: number[]
}

export const directions: Direction[] = ['north', 'east', 'south', 'west']
export const directionNames: Record<Direction, string> = { north: 'north', east: 'east', south: 'south', west: 'west' }
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
export const bossQuestions = [
  [
    { text: 'Which animal purrs and has whiskers?', options: ['A. Cat', 'B. Frog', 'C. Eagle'], answer: 'a', clue: 'The first answer has whiskers and purrs.' },
    { text: 'What do bees collect from flowers?', options: ['A. Pebbles', 'B. Nectar', 'C. Snow'], answer: 'b', clue: 'Bees visit flowers for nectar.' },
    { text: 'Which animal has a long trunk?', options: ['A. Fox', 'B. Rabbit', 'C. Elephant'], answer: 'c', clue: 'An elephant has a trunk.' },
  ],
  [
    { text: 'Which animal builds dams?', options: ['A. Beaver', 'B. Owl', 'C. Shark'], answer: 'a', clue: 'A beaver builds dams.' },
    { text: 'Which bird cannot fly but swims well?', options: ['A. Eagle', 'B. Penguin', 'C. Sparrow'], answer: 'b', clue: 'Penguins are excellent swimmers.' },
    { text: 'What does a caterpillar become?', options: ['A. Fish', 'B. Mouse', 'C. Butterfly'], answer: 'c', clue: 'A butterfly begins life as a caterpillar.' },
  ],
  [
    { text: 'Which animal carries its baby in a pouch?', options: ['A. Kangaroo', 'B. Dolphin', 'C. Lizard'], answer: 'a', clue: 'A kangaroo has a pouch.' },
    { text: 'Which creature has eight legs?', options: ['A. Beetle', 'B. Spider', 'C. Bird'], answer: 'b', clue: 'Spiders have eight legs.' },
    { text: 'Which animal changes colour to blend in?', options: ['A. Horse', 'B. Sheep', 'C. Chameleon'], answer: 'c', clue: 'A chameleon can change colour.' },
  ],
  [
    { text: 'Which animal uses echolocation?', options: ['A. Bat', 'B. Tortoise', 'C. Hen'], answer: 'a', clue: 'Bats can navigate using echoes.' },
    { text: 'Which is the largest living animal?', options: ['A. Giraffe', 'B. Blue whale', 'C. Lion'], answer: 'b', clue: 'The blue whale is the largest animal.' },
    { text: 'What do pandas mostly eat?', options: ['A. Fish', 'B. Nuts', 'C. Bamboo'], answer: 'c', clue: 'Pandas mostly eat bamboo.' },
  ],
  [
    { text: 'Which animal has black-and-white stripes?', options: ['A. Zebra', 'B. Camel', 'C. Bear'], answer: 'a', clue: 'A zebra has stripes.' },
    { text: 'Which animal is famous for a very slow walk?', options: ['A. Cheetah', 'B. Sloth', 'C. Hare'], answer: 'b', clue: 'Sloths move slowly.' },
    { text: 'Which sea animal has three hearts?', options: ['A. Crab', 'B. Seal', 'C. Octopus'], answer: 'c', clue: 'An octopus has three hearts.' },
  ],
]
const trinkets = ['painted pebble', 'tiny wooden duck', 'shiny button', 'striped ribbon', 'smooth shell']
const entranceOf = (level: Level) => level.entrance ?? 0
export const portalKey = (level: number, a: number, b: number) => `portal:${gateKey(level, a, b)}`
export const merchantStock = (level: number) => [
  { id: `${level}:map`, name: 'Explorer map', price: 12 },
  { id: `${level}:compass`, name: 'Magic compass', price: 8 },
  { id: `${level}:${plans[level]![1].item}`, name: plans[level]![1].name, price: 14 },
]
const grogExtraStock = (level: number) => ({ id: `${level}:secret-sense`, name: 'Secret sense charm', price: 11 })

function random(seed: number) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 } }
function neighbors(id: number): { direction: Direction; id: number }[] {
  const x = id % 5, y = Math.floor(id / 5)
  return directions.flatMap(direction => {
    const nx = x + (direction === 'east' ? 1 : direction === 'west' ? -1 : 0)
    const ny = y + (direction === 'south' ? 1 : direction === 'north' ? -1 : 0)
    return nx >= 0 && nx < 5 && ny >= 0 && ny < 5 ? [{ direction, id: ny * 5 + nx }] : []
  })
}
export const itemName = (item: string) => item.split(':').at(-1)?.split('-').map(word => word[0]!.toUpperCase() + word.slice(1)).join(' ') ?? item
export const gateKey = (level: number, a: number, b: number) => `${level}:${Math.min(a, b)}-${Math.max(a, b)}`
export const secretKey = (level: number, room: number) => `${level}:${room}`

function buildLevel(seed: number, index: number): Level {
  const rand = random(seed)
  // A spanning tree gives every room a route to the entrance, without a shortcut around a gate.
  for (let attempt = 0; attempt < 200; attempt++) {
    const rooms: Room[] = Array.from({ length: 25 }, (_, id) => ({ id, active: true, doors: {}, floor: [], gold: rand() < .38 ? 3 + Math.floor(rand() * 16) : 0, title: titles[Math.floor(rand() * titles.length)]! }))
    // Trim boundary cells only when the remaining footprint stays connected.
    const active = new Set(rooms.map(room => room.id))
    const size = 20 + Math.floor(rand() * 5)
    while (active.size > size) {
      const candidates = [...active].filter(id => neighbors(id).length < 4).sort(() => rand() - .5)
      let removed = false
      for (const id of candidates) {
        const remaining = new Set(active); remaining.delete(id)
        const reached = new Set<number>(), stack = [remaining.values().next().value as number]
        while (stack.length) { const point = stack.pop()!; if (reached.has(point)) continue; reached.add(point); stack.push(...neighbors(point).filter(next => remaining.has(next.id)).map(next => next.id)) }
        if (reached.size === remaining.size) { active.delete(id); removed = true; break }
      }
      if (!removed) break
    }
    if (active.size !== size) continue
    for (const room of rooms) if (!active.has(room.id)) room.active = false
    const entrance = [...active][Math.floor(rand() * active.size)]!
    const seen = new Set([entrance]), stack = [entrance], parent = Array<number>(25).fill(-1), depth = Array<number>(25).fill(0)
    while (stack.length) {
      const from = stack[stack.length - 1]!
      const options = neighbors(from).filter(next => active.has(next.id) && !seen.has(next.id))
      if (!options.length) { stack.pop(); continue }
      const next = options[Math.floor(rand() * options.length)]!
      rooms[from]!.doors[next.direction] = { to: next.id }
      rooms[next.id]!.doors[opposite[next.direction]] = { to: from }
      seen.add(next.id); parent[next.id] = from; depth[next.id] = depth[from]! + 1; stack.push(next.id)
    }
    const exit = [...active].sort((a, b) => depth[b]! - depth[a]!)[0]!
    const path = [exit]
    while (path[0] !== entrance) path.unshift(parent[path[0]!]!)
    const pathSet = new Set(path)
    const gatePositions = [Math.floor(path.length / 3), Math.floor(path.length * 2 / 3)]
    const secretCandidates = rooms.filter(room => room.active && !pathSet.has(room.id) && Object.keys(room.doors).length === 1 && depth[room.id]! < gatePositions[1]!)
    if (path.length < 10 || path.length > 23 || !secretCandidates.length || gatePositions[1]! - gatePositions[0]! < 3) continue
    const secret = secretCandidates[Math.floor(rand() * secretCandidates.length)]!.id
    const secretEntrance = parent[secret]!
    const hiddenDirection = directions.find(direction => rooms[secretEntrance]!.doors[direction]?.to === secret)!
    rooms[secretEntrance]!.doors[hiddenDirection]!.secret = true
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
    // The bomb kit is in an ordinary chest one step from the entrance.
    rooms[path[1]!]!.floor = rooms[path[1]!]!.floor.filter(item => item !== `${index}:bomb-kit`)
    rooms[path[1]!]!.chest = `${index}:bomb-kit`
    for (const step of [Math.floor(path.length * .46), Math.floor(path.length * .7)]) rooms[path[step]!]!.merchant = true
    for (const room of rooms.filter(room => room.active && room.id !== entrance && room.id !== exit)) if (rand() < .22) room.floor.push(`${index}:${room.id}:` + trinkets[Math.floor(rand() * trinkets.length)]!.replaceAll(' ', '-'))
    // Connect two pre-gate rooms without creating a way around either locked gate.
    const segments = [path.slice(0, gatePositions[0]), path.slice(gatePositions[0], gatePositions[1]), path.slice(gatePositions[1])]
    const candidates = segments.flatMap(segment => segment.flatMap(a => segment.filter(b => Math.abs(depth[a]! - depth[b]!) >= 2 && !Object.values(rooms[a]!.doors).some(door => door.to === b)).map(b => [a, b] as const)))
    if (candidates.length) { const [a, b] = candidates[Math.floor(rand() * candidates.length)]!; rooms[a]!.portal = b; rooms[b]!.portal = a; rooms[a]!.barrel = true }
    rooms[exit]!.floor.push(`${index}:magic-stone`)
    return { rooms, exit, secret, seed, entrance }
  }
  throw new Error('Could not lay out the maze. Try starting a new game.')
}

export function newDungeon(seed = crypto.randomUUID()): DungeonGame {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  const levels = Array.from({ length: 5 }, (_, index) => buildLevel((hash + Math.imul(index + 1, 2654435761)) >>> 0, index))
  const entrance = entranceOf(levels[0]!)
  return { version: 1, levels, level: 0, room: entrance, previous: null, visited: [[entrance], [], [], [], []], opened: [], openedBoxes: [], revealed: [], inventory: [], collected: [], gold: 0, stones: [], deaths: 0, phase: 'maze', dragon: { returned: false, name: '', praised: false }, searched: [], defeated: [], grogFriend: false, grogMet: [], grogExtra: [] }
}

// Existing version-1 saves used an entrance stall and an exposed bomb kit.
// Move those fixtures without changing explored rooms, inventory or progress.
export function upgradeDungeonSave(game: DungeonGame): DungeonGame {
  for (let level = 0; level < game.levels.length; level++) {
    const floor = game.levels[level]!, start = entranceOf(floor)
    if (!floor.rooms[start]!.merchant || floor.rooms[start]!.chest) continue
    const queue = [[start]], found = new Set([start])
    let path: number[] = []
    while (queue.length) {
      const current = queue.shift()!
      if (current.at(-1) === floor.exit) { path = current; break }
      for (const door of Object.values(floor.rooms[current.at(-1)!]!.doors)) if (!door.secret && !found.has(door.to)) { found.add(door.to); queue.push([...current, door.to]) }
    }
    if (path.length < 4) continue
    floor.rooms[start]!.merchant = false
    for (const step of [Math.floor(path.length * .46), Math.floor(path.length * .7)]) floor.rooms[path[step]!]!.merchant = true
    const kit = `${level}:bomb-kit`
    const index = floor.rooms[start]!.floor.indexOf(kit)
    if (index >= 0 && !game.collected.includes(kit)) { floor.rooms[start]!.floor.splice(index, 1); floor.rooms[path[1]!]!.chest = kit }
  }
  return game
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
  return gate ? `Beyond the ${direction} door: ${gate.warning}` : `The ${direction} door is open.`
}
export function roomDescription(game: DungeonGame, roomId = game.room): string {
  const room = game.levels[game.level]!.rooms[roomId]!
  const floor = room.floor.filter(item => !game.collected.includes(item))
  const intro = roomId === entranceOf(game.levels[game.level]!) ? 'Stampy, a lost talking cat, pads beside you. He wants to find the way out and offers to help.' : details[(room.id + game.level * 3 + room.title.length) % details.length]!
  const visible = availableDoors(game, roomId)
  const secret = Object.values(room.doors).find(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to))))
  const boss = room.id === game.levels[game.level]!.exit && !game.stones.includes(game.level) && !(game.defeated ?? []).includes(game.level)
  const portal = room.portal !== undefined && game.revealed.includes(portalKey(game.level, room.id, room.portal))
  const secretSense = game.inventory.includes(`${game.level}:secret-sense`) && secret ? `Your secret sense charm glows beside the ${directions.find(direction => room.doors[direction] === secret)} wall.` : ''
  return `${room.title}. ${intro} ${visible.map(({ direction, door }) => doorLabel(game, roomId, direction, door)).join(' ')} ${floor.length ? `On the floor: ${floor.map(itemName).join(', ')}.` : ''} ${room.chest && !game.openedBoxes.includes(`chest:${game.level}:${room.id}`) ? 'A small wooden chest sits against the wall. You can open it.' : ''} ${room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`) ? `A puzzle box has a word dial. Its clue reads: “${room.box.clue}” Say a word to open it.` : ''} ${room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`) ? `${room.gold} gold coins glimmer nearby; ask to pick them up.` : ''} ${secret ? 'A wall sounds strangely hollow when Stampy taps it.' : ''} ${secretSense} ${room.barrel && !portal ? 'A heavy barrel might be moved aside to reveal a shortcut.' : ''} ${portal ? `A glowing portal leads to room ${room.portal! + 1}. You can enter the portal.` : ''} ${room.merchant && roomId === game.room ? 'A small, friendly-looking troll named Grog appears as you enter. He gives a shy wave.' : ''} ${boss ? `A stone guardian blocks the magic stone. Answer three animal trivia questions; one mistake is allowed. ${bossQuestion(game)}` : ''} ${room.id === game.levels[game.level]!.exit && !game.stones.includes(game.level) && !boss ? 'The magic stone is yours to collect and descend.' : ''}`.replace(/\s+/g, ' ').trim()
}

function bossQuestion(game: DungeonGame) {
  const progress = game.boss?.level === game.level ? game.boss : { correct: 0, mistakes: 0 }
  const question = bossQuestions[game.level]![progress.correct]!
  return `Question ${progress.correct + 1}/3 (mistakes ${progress.mistakes}/1): ${question.text} ${question.options.join(' · ')} Type “answer A”, “answer B”, or “answer C”.`
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
    const room = game.levels[game.level]!.rooms[from]!
    const adjacent = [...availableDoors(game, from).filter(({ door }) => !door.gate || game.opened.includes(gateKey(game.level, from, door.to))).map(({ door }) => door.to), ...(room.portal !== undefined && game.revealed.includes(portalKey(game.level, from, room.portal)) ? [room.portal] : [])]
    for (const to of adjacent) {
      if (!visited.has(to) || found.has(to)) continue
      found.add(to)
      queue.push([...path, to])
    }
  }
  return null
}

export function suggestedActions(game: DungeonGame): string[] {
  const room = game.levels[game.level]!.rooms[game.room]!
  const actions: string[] = []
  if (room.id === game.levels[game.level]!.exit && !(game.defeated ?? []).includes(game.level)) return ['Answer A', 'Answer B', 'Answer C', 'Ask Stampy for advice']
  if (room.barrel && room.portal !== undefined && !game.revealed.includes(portalKey(game.level, room.id, room.portal))) actions.push('Move the heavy barrel')
  if (room.merchant) actions.push('Talk to Grog')
  if (room.floor.some(item => !game.collected.includes(item))) actions.push(`Pick up the ${itemName(room.floor.find(item => !game.collected.includes(item))!).toLowerCase()}`)
  if (room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`)) actions.push('Pick up the gold coins')
  if (room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`)) actions.push('Open the puzzle box with a word')
  if (room.chest && !game.openedBoxes.includes(`chest:${game.level}:${room.id}`)) actions.push('Open the wooden chest')
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
  if (room.id === game.levels[game.level]!.exit && !(game.defeated ?? []).includes(game.level)) return `Stampy says: “Think about animals! ${bossQuestions[game.level]![game.boss?.level === game.level ? game.boss.correct : 0]!.clue} You may make one mistake.”`
   if (room.merchant) return 'Stampy says: “Grog looks kind. I wonder what he wants to talk about? Say hello!”'
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
function stampyConversation(topic: string): DungeonOutcome {
  if (/indy|dog|brother|cocker|bark/i.test(topic)) return { text: 'Stampy says: “Indy is my black cocker spaniel brother. He barks at everything and dislikes other cats, but he loves me. I miss his noisy ears!”', changed: false }
  if (/owner|human|family|remember|home|house/i.test(topic)) return { text: 'Stampy says: “I lived in a nice house with three humans. I know they cared for me, but I can’t remember their faces or why I forgot. That’s a strange feeling.”', changed: false }
  if (/portal|back.?yard|arriv|stuck|came here/i.test(topic)) return { text: 'Stampy says: “I was playing in my back yard when I found a magic portal. I stepped through and ended up here. I’ve been stuck ever since. I still wonder where it came from.”', changed: false }
  if (/pet|stroke|hug|friend|love|thank|hello|hi\b|play|feed/i.test(topic)) return { text: 'Stampy purrs and rubs against your hand. “Thanks for staying with me. Adventures feel less scary with a friend!”', changed: false }
  if (/breed|fur|grey|gray|cat|yourself|who are you/i.test(topic)) return { text: 'Stampy says: “I’m a grey domestic short-haired cat! My whiskers are excellent at finding gaps, but they can’t find the way home on their own.”', changed: false }
  return { text: 'Stampy tilts his grey head. “I’m not sure about that, but I like talking with you. Ask me about Indy, my home, or how I found this place!”', changed: false }
}
function grogConversation(game: DungeonGame, intent: DungeonIntent, room: Room): DungeonOutcome {
  if (!room.merchant) return { text: 'Stampy says: “Grog isn’t here right now.”', changed: false }
  const speech = `${intent.action ?? ''} ${intent.topic}`.toLowerCase()
  const stock = merchantStock(game.level)
  const extra = grogExtraStock(game.level)
  const extraKnown = (game.grogExtra ?? []).includes(game.level)
  if (/attack|battle|fight|hurt|kill|hit|punch|slay|strike.*sword/i.test(speech)) return { text: 'Stampy steps between you. “Grog looks friendly! Maybe we should talk to him instead.” Grog gives a timid wave.', changed: false }
  if (/what else|anything else|other (?:item|thing)|hidden stock|more to sell/i.test(speech)) {
    if (!extraKnown) (game.grogExtra ??= []).push(game.level)
    return { text: `Grog says: “Grog nearly forgot! Grog has a ${extra.name.toLowerCase()} for ${extra.price} gold. It helps spot hollow walls, but Grog doesn't know where any are!”`, changed: !extraKnown }
  }
  if (/how long|how did|where.*from|why.*here|how.*got|about.*dungeon|know.*dungeon|two places|another room|both rooms|again|twice/i.test(speech)) return { text: 'Grog says: “Grog doesn’t know how long Grog has been here or how Grog arrived. Grog just appears when someone enters, then disappears when they leave. Grog doesn’t understand how Grog can be in two rooms! Grog doesn’t know the dungeon, but Grog likes helping.”', changed: false }
  if (/friend|thank|nice to meet|glad to meet|help you/i.test(speech) && intent.verb === 'talk') { const was = !!game.grogFriend; game.grogFriend = true; return { text: 'Grog beams. “Grog thinks you are a friend! Grog will make prices a little kinder for friends.”', changed: !was } }
  if (/discount|cheaper|lower price/i.test(speech) && !/buy\b/.test(speech)) return { text: game.grogFriend ? 'Grog says: “For Grog’s friend, Grog takes a little off each price!”' : 'Grog says: “Grog likes making friends. Grog might lower prices for one.”', changed: false }
  const forSale = [...stock, ...(extraKnown ? [extra] : [])]
  let desired = forSale.find(entry => (entry.id === intent.item && intent.verb === 'buy') || (!!intent.topic && entry.name.toLowerCase() === intent.topic.toLowerCase()) || speech.includes(entry.name.toLowerCase()))
  const asksStock = /what.*sell|what.*for sale|what.*have|shop|wares|stock|offer|have.*buy/i.test(speech)
  if (intent.verb === 'barter' || /\b(sell|trade|swap|barter)\b/i.test(speech) && !asksStock) {
    const offered = game.inventory.find(item => item === intent.item || speech.includes(itemName(item).toLowerCase()))
    if (!offered) return { text: 'Grog says: “Grog can trade for something in your pack. What would you like to offer?”', changed: false }
    const value = offered.split(':').length === 3 ? 4 : 6
    if (desired?.id === offered && !/\bfor\b/.test(speech)) desired = undefined
    if (desired && desired.id === offered) return { text: 'Grog says: “Grog cannot trade your item back to you!”', changed: false }
    if (desired) {
      if (game.inventory.includes(desired.id)) return { text: `Grog says: “You already have a ${desired.name.toLowerCase()}!”`, changed: false }
      const price = game.grogFriend ? Math.ceil(desired.price * .8) : desired.price
      const difference = Math.max(0, price - value)
      if (game.gold < difference) return { text: `Grog says: “Grog values your ${itemName(offered).toLowerCase()} at ${value} gold. Grog still needs ${difference} gold, but you have ${game.gold}.”`, changed: false }
      game.inventory.splice(game.inventory.indexOf(offered), 1); game.gold -= difference; game.inventory.push(desired.id)
      return { text: `Grog says: “Grog trades a ${desired.name.toLowerCase()} for your ${itemName(offered).toLowerCase()}${difference ? ` and ${difference} gold` : ''}. Grog hopes it helps!”`, changed: true }
    }
    game.inventory.splice(game.inventory.indexOf(offered), 1); game.gold += value
    return { text: `Grog says: “Grog buys your ${itemName(offered).toLowerCase()} for ${value} gold. Grog thinks it is lovely!” You now have ${game.gold} gold.`, changed: true }
  }
  if (intent.verb === 'buy' && desired) {
    if (game.inventory.includes(desired.id)) return { text: `Grog says: “You already have the ${desired.name.toLowerCase()}!”`, changed: false }
    const price = game.grogFriend ? Math.ceil(desired.price * .8) : desired.price
    if (game.gold < price) return { text: `Grog says: “The ${desired.name.toLowerCase()} costs ${price} gold; you have ${game.gold}. Grog thinks it is a good item, but Grog knows it is expensive.”`, changed: false }
    game.gold -= price; game.inventory.push(desired.id)
    return { text: `Grog says: “Grog is glad the ${desired.name.toLowerCase()} found a friend! ${price} gold, please.” ${desired.id.endsWith(':map') ? 'All rooms on this floor are now outlined, but unvisited rooms have no descriptions and cannot be jumped to.' : desired.id.endsWith(':compass') ? 'The compass points toward the stairs and shows monster locations on a mapped floor.' : desired.id.endsWith(':secret-sense') ? 'The charm tingles in rooms with hollow walls.' : ''}`, changed: true }
  }
  if (intent.verb === 'buy' || asksStock) { const met = (game.grogMet ?? []).includes(game.level); if (!met) (game.grogMet ??= []).push(game.level); return { text: `Grog says: “Grog has ${stock.map(entry => `${entry.name} for ${game.grogFriend ? Math.ceil(entry.price * .8) : entry.price} gold`).join(', ')}. Grog hopes something helps!”`, changed: !met } }
  return { text: 'Grog gives a shy smile. “Grog likes meeting new people! Grog doesn’t know how Grog got here, but Grog appears whenever someone enters. Grog wants to help.”', changed: false }
}
function dungeonDeath(game: DungeonGame, text: string): DungeonOutcome {
  game.deaths++; game.room = entranceOf(game.levels[game.level]!); game.previous = null; game.boss = undefined
  return { text: `${text} Stampy leads you back to room ${game.room + 1}. Your explored rooms, gold, stones and items are safe.`, changed: true, died: true }
}
export function applyDungeonIntent(game: DungeonGame, intent: DungeonIntent): DungeonOutcome {
  if (game.phase === 'dragon') return talkToDragon(game, intent)
  if (game.phase === 'won') return { text: 'You and your new dragon friend are already flying toward the sunset!', changed: false }
  const level = game.level, room = game.levels[level]!.rooms[game.room]!
  if (intent.verb === 'travel') {
    if (intent.room === null || !Number.isInteger(intent.room) || intent.room < 1 || intent.room > 25) return { text: 'Say a room number from 1 to 25 on this level, such as “go to room 12”.', changed: false }
    if (!game.visited[level]!.includes(intent.room - 1)) return { text: `Room ${intent.room} has not been visited on this level. Explore the visible doors first.`, changed: false }
    const path = routeToVisitedRoom(game, intent.room)
    if (!path) return { text: `There is no safe route to room ${intent.room} through your explored doors. Check for a blocked passage.`, changed: false }
    if (path.length > 1) { game.previous = path[path.length - 2]!; game.room = path.at(-1)! }
    const travelText = path.length === 1 ? `You are already in room ${intent.room}.` : `You retrace your steps through ${path.length - 1} explored ${path.length === 2 ? 'passage' : 'passages'} to room ${intent.room}. ${room.merchant ? 'Grog vanishes in a little puff of glitter as you leave.' : ''}`
    if (intent.nextDirection && intent.nextDirection !== 'none') {
      const second = applyDungeonIntent(game, { ...intent, verb: 'move', direction: intent.nextDirection, room: null, nextDirection: undefined })
      return { ...second, changed: path.length > 1 || second.changed, text: `${travelText} ${second.text}` }
    }
    return { text: `${travelText} ${roomDescription(game)}`, changed: path.length > 1 }
  }
  const utterance = `${intent.action ?? ''} ${intent.topic}`
  if (room.merchant && (/\bgrog\b|\btroll\b/i.test(utterance) || (['buy', 'barter', 'talk'].includes(intent.verb) || /\b(sell|trade|swap|barter)\b|what.*(?:sell|for sale)/i.test(utterance)) && !/\bstampy\b/i.test(utterance))) return grogConversation(game, intent, room)
  if (/\bstampy\b/i.test(utterance) && /\b(pet|stroke|hug|play|feed)\b/i.test(utterance)) return stampyConversation(utterance)
  if (intent.verb === 'ask') return /\badvice\b|\bhint\b|\bhelp\b/i.test(utterance) || !utterance.trim() ? { text: stampyAdvice(game), changed: false } : stampyConversation(utterance)
  if (intent.verb === 'talk') return /\bstampy\b/i.test(utterance) ? stampyConversation(utterance) : { text: 'Stampy says: “I’m right here! Want to ask me about Indy or the portal?”', changed: false }
  if (intent.verb === 'barter' || intent.verb === 'buy') return { text: 'Stampy says: “I don’t see Grog in this room. Maybe we will meet him later.”', changed: false }
  if (intent.verb === 'question') {
    if (/stampy|indy|cat brother|dog brother/i.test(utterance)) return stampyConversation(utterance)
    if (/mushroom|fungus|pick.*mushroom/i.test(intent.topic)) return { text: 'Stampy says: “I don’t think we should touch those mushrooms; they look poisonous. Let’s leave them alone.”', changed: false }
    if (/water|stream|freez/i.test(intent.topic)) return { text: 'Stampy says: “That’s just some water. No point in freezing it! Let’s keep exploring.”', changed: false }
    return { text: `Stampy says: “I'm not sure what you mean. Tell me what you see or what you want to try.” ${roomDescription(game)}`, changed: false }
  }
  if (intent.verb === 'inspect' || intent.verb === 'search') {
    const key = `${level}:${room.id}`
    if ((game.searched ?? []).includes(key)) return { text: `Stampy says: “We've found the secret here already.” ${roomDescription(game)}`, changed: false }
    ;(game.searched ??= []).push(key)
    const coins = 1 + (room.id + level) % 3
    game.gold += coins
    return { text: `You look carefully and find ${coins} extra gold ${coins === 1 ? 'coin' : 'coins'} in a crack. Writing on the wall gives a guardian hint: “${bossQuestions[level]![(room.id + level) % 3]!.clue}” ${roomDescription(game)}`, changed: true }
  }
  if (intent.verb === 'barrel') {
    if (!room.barrel || room.portal === undefined) return { text: 'Stampy says: “I don’t see a barrel to move here.”', changed: false }
    const key = portalKey(level, room.id, room.portal)
    if (game.revealed.includes(key)) return { text: 'The barrel is already moved. You can enter the portal.', changed: false }
    game.revealed.push(key)
    return { text: `You roll the barrel aside! A glowing shortcut opens to room ${room.portal + 1}. Type “enter the portal” to step through.`, changed: true }
  }
  if (intent.verb === 'portal') {
    if (room.portal === undefined || !game.revealed.includes(portalKey(level, room.id, room.portal))) return { text: 'There is no open portal here. Look for a barrel hiding one.', changed: false }
    game.previous = game.room; game.room = room.portal
    if (!game.visited[level]!.includes(game.room)) game.visited[level]!.push(game.room)
    return { text: `You step through the portal to room ${game.room + 1}. ${room.merchant ? 'Grog vanishes in a little puff of glitter as you leave. ' : ''}${roomDescription(game)}`, changed: true }
  }
  if (intent.verb === 'answer') {
    if (room.id !== game.levels[level]!.exit || (game.defeated ?? []).includes(level)) return { text: 'There is no guardian asking questions here.', changed: false }
    if (game.boss?.level !== level) game.boss = { level, correct: 0, mistakes: 0 }
    const question = bossQuestions[level]![game.boss.correct]!
    const choice = intent.topic.trim().toLowerCase().replace(/^(?:answer|option|choice)\s+/, '')
    const answer = question.options.findIndex(option => option.slice(3).toLowerCase() === choice)
    const letter = /^[abc]$/.test(choice) ? choice : answer < 0 ? '' : 'abc'[answer]!
    if (!letter) return { text: `Stampy says: “Choose A, B or C.” ${bossQuestion(game)}`, changed: false }
    if (letter !== question.answer) {
      game.boss.mistakes++
      if (game.boss.mistakes > 1) return dungeonDeath(game, 'The guardian shakes its head at a second wrong answer and sends you back!')
      return { text: `Not quite. One mistake used; another will send you back. Try this question again. ${bossQuestion(game)}`, changed: true }
    }
    game.boss.correct++
    if (game.boss.correct === 3) { (game.defeated ??= []).push(level); return { text: 'Three correct answers! The guardian bows and steps aside. You may now pick up the magic stone.', changed: true } }
    return { text: `Correct! ${bossQuestion(game)}`, changed: true }
  }
  if (intent.verb === 'open') {
    if (room.chest && !game.openedBoxes.includes(`chest:${level}:${room.id}`) && (!room.box || /chest/i.test(utterance) || !intent.topic)) {
      game.openedBoxes.push(`chest:${level}:${room.id}`)
      room.floor.push(room.chest)
      return { text: `You open the wooden chest. A ${itemName(room.chest).toLowerCase()} is inside! You can pick it up now.`, changed: true }
    }
    if (!room.box || game.openedBoxes.includes(`${level}:${room.id}`)) return { text: 'There is no closed puzzle box here.', changed: false }
    if (intent.topic.trim().toLowerCase() !== room.box.answer) return { text: `The word dial does not open yet. Its clue reads: “${room.box.clue}” Ask Stampy if you need help.`, changed: false }
    game.openedBoxes.push(`${level}:${room.id}`)
    game.collected.push(room.box.item); game.inventory.push(room.box.item)
    return { text: `The box clicks open! You take the ${itemName(room.box.item).toLowerCase()} from inside and add it to your inventory.`, changed: true }
  }
  if (intent.verb === 'take') {
    if (/mushroom|fungus|water|stream/i.test(`${intent.item} ${intent.topic}`)) return applyDungeonIntent(game, { ...intent, verb: 'question', topic: `${intent.item} ${intent.topic}` })
    const floor = room.floor.filter(item => !game.collected.includes(item))
    const requested = intent.items?.length ? intent.items : [intent.item]
    const items = [...new Set(requested.map(request => request === 'gold' ? 'gold' : floor.find(value => value === request || itemName(value).toLowerCase() === request.toLowerCase()) ?? (floor.length === 1 && (!request || request === 'item') ? floor[0] : request)))]
    if (items.some(item => item !== 'gold' && !floor.includes(item)) || items.includes('gold') && (!room.gold || game.collected.includes(`${level}:${room.id}:gold`))) return { text: `You cannot find all of that here. ${floor.length ? `On the floor: ${floor.map(itemName).join(', ')}.` : ''} ${room.gold && !game.collected.includes(`${level}:${room.id}:gold`) ? 'You can collect the gold coins.' : ''}`.trim(), changed: false }
    if (items.some(item => item.endsWith(':magic-stone')) && !(game.defeated ?? []).includes(level)) return { text: `The guardian blocks the stone. Answer its three questions first! ${bossQuestion(game)}`, changed: false }
    if (items.includes('gold')) { game.collected.push(`${level}:${room.id}:gold`); game.gold += room.gold }
    const other = items.filter(item => item !== 'gold')
    for (const item of other) { game.collected.push(item); if (!item.endsWith(':magic-stone')) game.inventory.push(item) }
    if (other.some(item => item.endsWith(':magic-stone'))) {
      game.stones.push(level)
      if (level === 4) {
        game.phase = 'dragon'
        return { text: `You collect ${items.map(item => item === 'gold' ? `${room.gold} gold coins` : itemName(item).toLowerCase()).join(' and ')}. A stairway spirals upward to a giant fire-breathing dragon. “You took my lost stones!” it says. “I have no name. Why should I trust you?” Stampy nudges you: talk kindly, return the stones, and listen.`, changed: true }
      }
      game.level++; game.room = entranceOf(game.levels[game.level]!); game.previous = null; game.boss = undefined; game.visited[game.level]!.push(game.room)
      return { text: `You collect magic stone ${level + 1} of 5${items.length > 1 ? ` and ${room.gold} gold coins` : ''}! A staircase takes you to level ${game.level + 1}. Stampy follows, ready to help. ${roomDescription(game)}`, changed: true }
    }
    return { text: items.length === 1 && items[0] === 'gold' ? `You pick up ${room.gold} gold coins. Your purse now holds ${game.gold}.` : `You pick up ${items.map(item => item === 'gold' ? `${room.gold} gold coins` : `the ${itemName(item).toLowerCase()}`).join(' and ')} and keep ${other.length > 1 ? 'them' : 'it'} in your inventory${items.includes('gold') ? `. Your purse holds ${game.gold} gold` : ''}.`, changed: true }
  }
  if (intent.verb === 'peek' || intent.verb === 'move' || intent.verb === 'use') {
    if (intent.verb === 'use' && /water|stream|freez/i.test(intent.topic)) return applyDungeonIntent(game, { ...intent, verb: 'question' })
    let direction: Direction | undefined = intent.direction !== 'none' && intent.direction !== 'back' ? intent.direction : undefined
    if (intent.direction === 'back') direction = directions.find(dir => room.doors[dir]?.to === game.previous)
    if (!direction && intent.verb === 'use' && intent.item.includes('bomb')) direction = directions.find(dir => room.doors[dir]?.secret && !game.revealed.includes(secretKey(level, Math.min(room.id, room.doors[dir]!.to))))
    if (!direction && intent.verb === 'use') {
      const matches = availableDoors(game).filter(({ door }) => door.gate && !game.opened.includes(gateKey(level, room.id, door.to)) && `${level}:${gatePlan(level, door.gate).item}` === intent.item)
      if (matches.length === 1) direction = matches[0]!.direction
    }
    if (!direction) return intent.verb === 'use' && intent.item.includes('bomb') && game.inventory.some(item => item.endsWith(':bomb-kit')) ? dungeonDeath(game, 'The bomb goes off against solid stone! It cannot break, and the blast knocks you out.') : { text: 'Which door? Say north, east, south or west, or ask Stampy for advice.', changed: false }
    const door = room.doors[direction]
    if (!door) return intent.verb === 'use' && intent.item.includes('bomb') && game.inventory.some(item => item.endsWith(':bomb-kit')) ? dungeonDeath(game, 'The bomb hits an unbreakable wall! The blast knocks you out.') : { text: `There is no door on the ${directionNames[direction]} side.`, changed: false }
    const secret = door.secret && !game.revealed.includes(secretKey(level, Math.min(room.id, door.to)))
    if (secret) {
      if (intent.verb !== 'use') return { text: 'That looks like a plain wall. Stampy taps it: it sounds hollow.', changed: false }
      if (!game.inventory.some(item => item.endsWith(':bomb-kit')) || !intent.item.includes('bomb')) return { text: 'This hollow wall might open with a bomb kit. Find one before trying.', changed: false }
      game.revealed.push(secretKey(level, Math.min(room.id, door.to)))
      return { text: `You safely set a small bomb against the ${directionNames[direction]} wall. The hidden passage opens! Your reusable bomb kit stays with you.`, changed: true }
    }
    const gate = door.gate && !game.opened.includes(gateKey(level, room.id, door.to)) ? gatePlan(level, door.gate) : null
    if (intent.verb === 'peek') return { text: gate ? `You peek through the ${direction} door. ${gate.peek}` : `You peek through the ${direction} door into ${game.levels[level]!.rooms[door.to]!.title}. It looks passable.`, changed: false }
    if (intent.verb === 'use') {
      if (intent.item.includes('bomb') && !gate) return dungeonDeath(game, 'The bomb hits a wall that cannot break! The blast knocks you out.')
      if (!gate) return { text: 'This doorway is already passable. You can walk through it.', changed: false }
      if (intent.item.includes('bomb') && gate.kind !== 'rocks') return dungeonDeath(game, 'The bomb cannot break this doorway! The blast knocks you out.')
      if (intent.item !== `${level}:${gate.item}` || !game.inventory.includes(intent.item)) return { text: `That does not solve this doorway. ${gate.warning} Ask Stampy for advice.`, changed: false }
      game.opened.push(gateKey(level, room.id, door.to))
      if (gate.kind === 'monster') { game.previous = game.room; game.room = door.to; if (!game.visited[level]!.includes(door.to)) game.visited[level]!.push(door.to) }
      return { text: `${gate.name} works! ${gate.kind === 'monster' ? `You defeat the monster and step into room ${door.to + 1}. ${room.merchant ? 'Grog vanishes in a little puff of glitter as you leave. ' : ''}${roomDescription(game)}` : `The ${directionNames[direction]} passage is now safe. ${gate.kind === 'dog' ? 'The dog settles down and lets you pass.' : ''}`}`, changed: true }
    }
    if (gate) {
      if (intent.item === `${level}:${gate.item}` && game.inventory.includes(intent.item)) {
        game.opened.push(gateKey(level, room.id, door.to))
      } else if (['fire', 'monster', 'dog', 'canyon'].includes(gate.kind)) {
        const advice = stampyAdvice(game)
         return dungeonDeath(game, `${gate.warning} You rush in without solving it and lose this attempt! ${advice}`)
      } else return { text: `You cannot pass yet. ${gate.warning} Try the correct item first.`, changed: false }
    }
    game.previous = game.room; game.room = door.to
    if (!game.visited[level]!.includes(door.to)) game.visited[level]!.push(door.to)
    return { text: `You walk through the ${directionNames[direction]} door. ${room.merchant ? 'Grog vanishes in a little puff of glitter as you leave. ' : ''}${roomDescription(game)}`, changed: true }
  }
   return { text: 'Stampy says: “I’m not sure what you mean. Tell me what you want to try in this room!”', changed: false }
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
  return JSON.stringify({ phase: 'maze', level: game.level + 1, roomNumber: game.room + 1, room: roomDescription(game), visitedRooms: game.visited[game.level]!.map(id => id + 1), choices: suggestedActions(game), doors: availableDoors(game).map(({ direction, door }) => ({ direction, gate: door.gate && !game.opened.includes(gateKey(game.level, room.id, door.to)) ? door.gate : 'open' })), inventory: game.inventory.map(item => ({ id: item, name: itemName(item) })), floor: room.floor.filter(item => !game.collected.includes(item)).map(item => ({ id: item, name: itemName(item) })), chest: room.chest && !game.openedBoxes.includes(`chest:${game.level}:${room.id}`), grog: !!room.merchant, stock: room.merchant && (game.grogMet ?? []).includes(game.level) ? merchantStock(game.level) : [], guardian: room.id === game.levels[game.level]!.exit && !(game.defeated ?? []).includes(game.level) ? bossQuestion(game) : null, portal: room.portal !== undefined && game.revealed.includes(portalKey(game.level, room.id, room.portal)), barrel: room.barrel && room.portal !== undefined && !game.revealed.includes(portalKey(game.level, room.id, room.portal)), box: room.box && !game.openedBoxes.includes(`${game.level}:${room.id}`) ? { clue: room.box.clue } : null, goldOnFloor: !!room.gold && !game.collected.includes(`${game.level}:${room.id}:gold`), previousDirection: directions.find(direction => room.doors[direction]?.to === game.previous) ?? null, hiddenWall: Object.values(room.doors).some(door => door.secret && !game.revealed.includes(secretKey(game.level, Math.min(room.id, door.to)))) })
}

export function validDungeonSave(value: unknown): value is DungeonGame {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<DungeonGame>
  return game.version === 1 && Array.isArray(game.levels) && game.levels.length === 5 && game.levels.every(level => level.rooms?.length === 25) && typeof game.level === 'number' && game.level >= 0 && game.level < 5 && typeof game.room === 'number' && game.room >= 0 && game.room < 25 && Array.isArray(game.visited) && game.visited.length === 5 && Array.isArray(game.inventory) && Array.isArray(game.stones) && Array.isArray(game.collected) && Array.isArray(game.opened) && Array.isArray(game.openedBoxes) && Array.isArray(game.revealed) && !!game.dragon && ['maze', 'dragon', 'won'].includes(game.phase ?? '')
}
