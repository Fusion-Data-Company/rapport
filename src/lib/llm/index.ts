import OpenAI from "openai"

export interface LLMConfig {
  provider: string
  apiKey?: string
  model?: string
  temperature?: number
  customBaseUrl?: string
}

const PROVIDERS: Record<string, { baseURL: string; defaultModel: string }> = {
  openrouter: { baseURL: "https://openrouter.ai/api/v1", defaultModel: "google/gemma-4-26b-a4b-it" },
  anthropic:  { baseURL: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-6" },
  openai:     { baseURL: "https://api.openai.com/v1",    defaultModel: "gpt-4o-mini" },
  google:     { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", defaultModel: "gemini-2.0-flash" },
}

function getClient(config: LLMConfig): { client: OpenAI; model: string } {
  const p = PROVIDERS[config.provider] ?? PROVIDERS.openrouter
  const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY!
  const baseURL = config.customBaseUrl || p.baseURL
  const model = config.model || p.defaultModel
  return { client: new OpenAI({ apiKey, baseURL }), model }
}

export async function generateEmailContent(opts: {
  /** The short human label for the occasion, e.g. "Policy renews March 14". */
  occasion: string
  /** One sentence saying exactly why this note is going out today. */
  occasionPrompt?: string
  contactFirstName: string
  context: Record<string, string | null | undefined>
  businessName: string
  /** The person signing the note, when that is not the business name. */
  senderName?: string
  /** The last few things that actually happened with this contact, oldest first. */
  history?: string | null
  sensitiveTopics?: string | null
  llmConfig: LLMConfig
}): Promise<{ subject: string; body: string }> {
  const { client, model } = getClient(opts.llmConfig)

  const contextLines = Object.entries(opts.context)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")

  const sensitiveNote = opts.sensitiveTopics
    ? `\nNever mention or allude to any of these topics: ${opts.sensitiveTopics}`
    : ""

  const signer = opts.senderName?.trim() || opts.businessName

  const historyBlock = opts.history
    ? `\nWhat has actually happened between you, oldest first. Prefer this over the profile: a
line that picks up the real last conversation is the whole point. Do not repeat a note
you already sent, and do not quote their reply back at them.
${opts.history}\n`
    : ""

  const prompt = `You are ${signer} at "${opts.businessName}", writing one short personal email to ${opts.contactFirstName}.

Why you are writing today:
${opts.occasionPrompt ?? opts.occasion}
${historyBlock}
What you know about ${opts.contactFirstName} (fall back to at most ONE of these, and only if it fits):
${contextLines || "- Nothing beyond their name"}
${sensitiveNote}

Write:
1. EMAIL SUBJECT: a short subject line a real person would type. No emoji, no exclamation marks.
2. EMAIL BODY: two or three sentences that read as if you typed them yourself.

Rules:
- Start the body with "${opts.contactFirstName}," on its own line.
- Do not open with "Dear", "Hello", "I hope this email finds you", or "just wanted to reach out".
- No marketing language, no offers, no prices, no promises about coverage or rates.
- Do not sign off; the signature is added for you.
- Plain sentences. Brief beats long. No em-dashes.

Format your response EXACTLY as:
SUBJECT: [subject line]
BODY: [the message]`

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 320,
    temperature: opts.llmConfig.temperature ?? 0.7,
  })

  const text = completion.choices[0]?.message?.content ?? ""
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i)
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i)

  return {
    subject: subjectMatch?.[1]?.trim() ?? `${opts.occasion}, ${opts.contactFirstName}`,
    body: bodyMatch?.[1]?.trim() ?? text.trim(),
  }
}
