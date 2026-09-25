import { travelWords } from './travel'

export const rivalFinishTimes = [91, 100, 110]
export const raceTerrain = ['jungle', 'woodland', 'volcano', 'river', 'lake', 'mountain', 'jungle', 'coast', 'bayou', 'woodland']

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
