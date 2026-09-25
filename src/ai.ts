export interface Correction { original: string; replacement: string; explanation: string }

async function request(key: string, model: string, system: string, content: string): Promise<string> {
  if (!key.trim() || !navigator.onLine) throw new Error('Unavailable — add an API key and connect to the internet.')
  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin, 'X-Title': "Henry's Wild Typing" },
      body: JSON.stringify({ model: model.trim(), temperature: 0.3, max_tokens: 500, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
    })
  } catch { throw new Error('Unavailable — could not reach OpenRouter.') }
  if (!response.ok) throw new Error(`Unavailable — OpenRouter returned ${response.status}. Check your key, model, or credits.`)
  const json = await response.json() as {choices?: {message?: {content?: string}}[]}
  const answer = json.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('Unavailable — no response from the model.')
  return answer
}

export async function checkReport(key: string, model: string, text: string): Promise<Correction[]> {
  const answer = await request(key, model, 'You are a friendly spelling, grammar and punctuation coach for a ten-year-old. Check only actual writing errors, not style or factual claims. Return ONLY JSON in this format: {"corrections":[{"original":"exact substring in submitted text","replacement":"corrected substring","explanation":"brief kind explanation"}]}. Do not rewrite the whole letter. If no errors return exactly {"corrections":[]}; an empty list means the writing is ready to send.', text)
  const cleaned = answer.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  const noErrors = (message: string) => /^(?:no (?:writing |spelling |grammar |punctuation )?(?:errors?|mistakes?|corrections?)(?: (?:found|needed|to correct)(?: in (?:your|the) (?:writing|report|text))?)?|there are no (?:errors?|mistakes?|corrections?)(?: in (?:your|the) (?:writing|report|text))?|(?:your|the) (?:writing|report|text) (?:has|contains) no (?:errors?|mistakes?)|looks good|great (?:job|work))[.!]?$/i.test(message.trim())
  if (noErrors(cleaned)) return []
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (typeof parsed === 'string' && noErrors(parsed)) return []
    const response = parsed as { corrections?: Correction[]; errors?: Correction[]; feedback?: string } | Correction[] | null
    const corrections = Array.isArray(response) ? response : response?.corrections ?? response?.errors
    if (!Array.isArray(corrections)) {
      if (response && !Array.isArray(response) && typeof response.feedback === 'string' && noErrors(response.feedback)) return []
      throw new Error('bad result')
    }
    return corrections.filter(c => c && typeof c.original === 'string' && typeof c.replacement === 'string' && typeof c.explanation === 'string' && c.original !== c.replacement && text.includes(c.original))
  } catch { throw new Error('Unavailable — the writing check could not be read. Please try again.') }
}

export function replyToReport(key: string, model: string, animal: string, text: string, next: string): Promise<string> {
  return request(key, model, `Write a short, warm, adventurous fictional reply in the style of a wildlife expedition leader to a ten-year-old named Henry. You are a fictional game character inspired by Forrest Galante, not the real person. Thank him for his report on ${animal}, refer to something he wrote, celebrate his careful observation, and tease the next mission: ${next}. Maximum 90 words. Do not claim an unconfirmed species has been found in real life.`, text)
}
