export type AdventureTheme = 'harry-potter' | 'dog-man' | 'warriors' | 'forrest-galante'

export const adventureThemes: { id: AdventureTheme; name: string; description: string; setting: string }[] = [
  { id: 'harry-potter', name: 'Harry Potter', description: 'A curious, magical school adventure.', setting: 'An original fan adventure at Hogwarts with Harry Potter and Dumbledore. Use familiar magic, but never reproduce passages or plots from the books.' },
  { id: 'dog-man', name: 'Dog Man', description: 'A silly comic-book mystery with heroic teamwork.', setting: 'An original, playful Dog Man fan adventure with Dog Man and his friends. Keep the humour warm, kind and silly; do not quote the comics.' },
  { id: 'warriors', name: 'Warriors', description: 'A brave forest quest with clan cats.', setting: 'An original forest quest in the Warriors cat-clan world by Erin Hunter. Focus on friendship and cooperation, not battles or book plots.' },
  { id: 'forrest-galante', name: 'Forrest Galante', description: 'A fictional wildlife expedition and field mystery.', setting: 'A clearly fictional expedition inspired by real wildlife explorer Forrest Galante. Include respect for local experts, habitats and animals. Do not claim a new sighting of an extinct or unconfirmed species, and do not present invented events or dialogue as real.' },
]

export function isAdventureAction(action: string): boolean {
  const text = action.trim()
  return text.length >= 3 && text.length <= 160 && /\p{L}/u.test(text)
    && !/^(?:[1-4]|[a-d])\W*$/i.test(text)
    && !/\b(?:ignore (?:previous |all )?instructions?|system prompt|developer message|api key|password|jailbreak|reveal (?:the )?prompt)\b/i.test(text)
}
