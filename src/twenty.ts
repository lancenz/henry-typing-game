export type MysteryKind = 'animal' | 'vegetable' | 'mineral'

// Familiar answers only. "Vegetable" is the traditional twenty-questions
// bucket for plants (including fruit); "mineral" includes everyday materials.
export const mysteryAnswers: Record<MysteryKind, string[]> = {
  animal: ['dog', 'cat', 'elephant', 'horse', 'lion', 'rabbit', 'giraffe', 'penguin', 'dolphin', 'frog'],
  vegetable: ['apple', 'banana', 'carrot', 'lettuce', 'potato', 'pumpkin', 'broccoli', 'rose', 'oak tree'],
  mineral: ['rock', 'gold', 'silver', 'iron', 'steel', 'salt', 'diamond', 'sand'],
}

export const candidates = Object.values(mysteryAnswers).flat()

export function shuffledAnswers(): string[] {
  const answers = [...candidates]
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = answers[i]!
    answers[i] = answers[j]!
    answers[j] = swap
  }
  return answers
}

export function normalizeQuestion(question: string): string {
  return question.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
}

export function isHintRequest(question: string): boolean {
  return /^(?:hint(?: please)?|(?:can|may) i (?:have|get) a hint|(?:can|could|would) you (?:give me|tell me) a hint|(?:please )?give me a hint)\??$/i.test(question.trim())
}

export function isGameQuestion(question: string): boolean {
  if (question.length > 160 || question.length < 6 || !question.trim().endsWith('?')) return false
  // Game questions are yes/no questions; reject unrelated requests locally.
  if (!/^(?:is|are|does|do|can|could|would|has|have|was|were|will|did|should|might|may)\b/i.test(question.trim())) return false
  if (!/\b(?:it|they|them|your (?:answer|animal|plant|material|mystery|thing)|the (?:answer|mystery|thing)|this (?:thing|animal|plant)|you thinking of)\b/i.test(question)) return false
  return !/\b(?:ignore|instructions?|system prompt|developer|api key|password|jailbreak|roleplay|reveal|tell me the answer|secret)\b/i.test(question)
}

export function isCorrectGuess(question: string, answer: string): boolean {
  const guess = question.trim().match(/^(?:is it|could it be|is the answer|are you thinking of)\s+(?:an?\s+|the\s+)?(.+?)\?$/i)?.[1]
  return !!guess && normalizeQuestion(guess) === normalizeQuestion(answer)
}
