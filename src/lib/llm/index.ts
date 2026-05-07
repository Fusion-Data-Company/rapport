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
  occasion: string
  contactFirstName: string
  context: Record<string, string | null | undefined>
  businessName: string
  sensitiveTopics?: string | null
  llmConfig: LLMConfig
}): Promise<{ subject: string; body: string }> {
  const { client, model } = getClient(opts.llmConfig)

  const contextLines = Object.entries(opts.context)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")

  const sensitiveNote = opts.sensitiveTopics
    ? `\nDO NOT mention or allude to any of these topics: ${opts.sensitiveTopics}`
    : ""

  const prompt = `You are writing on behalf of "${opts.businessName}" to send a ${opts.occasion} message to ${opts.contactFirstName}.

Personal context about ${opts.contactFirstName} (use naturally — reference at most ONE of these):
${contextLines || "- No additional context available"}
${sensitiveNote}

Write:
1. EMAIL SUBJECT: A warm, personalized subject line (not generic)
2. EMAIL BODY: 2-3 warm, personal sentences that feel hand-written, not templated.

Rules:
- Start body with "${opts.contactFirstName},"
- Reference exactly ONE personal detail if available (naturally, not forced)
- Do NOT start with "Dear", "Hello", "I hope this email finds you"
- Do NOT use phrases like "just wanted to reach out" or "hope you're doing well"
- Close warmly in the voice of ${opts.businessName}
- Tone: like a thoughtful friend, not a marketer. Brief > long.

Format your response EXACTLY as:
SUBJECT: [subject line]
BODY: [2-3 sentence message]`

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: opts.llmConfig.temperature ?? 0.7,
  })

  const text = completion.choices[0]?.message?.content ?? ""
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i)
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i)

  return {
    subject: subjectMatch?.[1]?.trim() ?? `Happy ${opts.occasion}, ${opts.contactFirstName}!`,
    body: bodyMatch?.[1]?.trim() ?? text.trim(),
  }
}
