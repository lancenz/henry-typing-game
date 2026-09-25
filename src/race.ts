import { travelWords } from './travel'

export const rivalFinishTimes = [91, 100, 110]
export const raceTerrain = ['jungle', 'woodland', 'volcano', 'river', 'lake', 'mountain', 'jungle', 'coast', 'bayou', 'woodland']

export interface RaceWaypoint { time: number; distance: number }

// Change pace every few seconds, then normalize the distance so each rival
// still reaches the line at its scheduled time. New attempts get new bursts.
export function rivalPath(finish: number): RaceWaypoint[] {
  const sections: { time: number; effort: number }[] = []
  let time = 0
  while (time < finish) {
    const next = Math.min(finish, time + 2 + Math.random() * 3)
    const pace = Math.random() < .16 ? .08 : .45 + Math.random() * 1.7
    sections.push({ time: next, effort: (next - time) * pace })
    time = next
  }
  const total = sections.reduce((sum, section) => sum + section.effort, 0)
  let distance = 0
  return [{ time: 0, distance: 0 }, ...sections.map(section => ({ time: section.time, distance: (distance += section.effort / total) }))]
}

export function rivalPosition(path: RaceWaypoint[], elapsed: number): { distance: number; boosting: boolean } {
  if (elapsed >= path[path.length - 1]!.time) return { distance: 1, boosting: false }
  const index = path.findIndex(point => point.time > elapsed)
  const from = path[index - 1]!, to = path[index]!
  const fraction = (elapsed - from.time) / (to.time - from.time)
  const eased = fraction * fraction * (3 - 2 * fraction)
  return { distance: from.distance + (to.distance - from.distance) * eased, boosting: (to.distance - from.distance) / (to.time - from.time) > 1.3 / path[path.length - 1]!.time }
}

// About 210 characters = 42 conventional typing-test words, giving a
// 30 WPM typist a few seconds of room inside the 90-second finish line.
export function raceWords(missionIndex: number): string[] {
  const words: string[] = []
  for (const word of travelWords(missionIndex)) {
    words.push(word)
    if (words.join(' ').length >= 210) break
  }
  return words
}
