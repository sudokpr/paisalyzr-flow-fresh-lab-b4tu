import { NextRequest, NextResponse } from 'next/server'
import parseLLMJson from '@/lib/jsonParser'

const LYZR_AGENT_BASE_URL = process.env.LYZR_AGENT_BASE_URL || 'https://agent-prod.studio.lyzr.ai'
const LYZR_TASK_URL = `${LYZR_AGENT_BASE_URL}/v3/inference/chat/task`
const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

// Telegram-capable agent IDs
const TELEGRAM_TRANSACTION_AGENT = '69ec557e5e51596669c0ed04'
const FINANCE_QUERY_AGENT = '69ec5581dcdea9592ddcd90f'

// Keywords that indicate a transaction log vs a query
const TRANSACTION_KEYWORDS = [
  'bought', 'sold', 'spent', 'paid', 'received', 'invested',
  'emi', 'salary', 'credit', 'debit', 'transfer', 'purchase',
  'sip', 'mutual fund', 'stock', 'expense', 'income', 'log',
  'add transaction', 'record', 'groceries', 'rent', 'bill',
  'recharge', 'subscription', 'insurance', 'loan', 'repay',
]

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Route the incoming message to the correct agent based on intent.
 * Transaction-like messages go to the Transaction Agent.
 * Query/analysis messages go to the Finance Query Agent.
 */
function routeToAgent(messageText: string): { agentId: string; agentName: string } {
  const lower = messageText.toLowerCase()

  const isTransaction = TRANSACTION_KEYWORDS.some((kw) => lower.includes(kw))

  if (isTransaction) {
    return { agentId: TELEGRAM_TRANSACTION_AGENT, agentName: 'Telegram Transaction Agent' }
  }

  return { agentId: FINANCE_QUERY_AGENT, agentName: 'Finance Query Agent' }
}

/**
 * Submit a message to the Lyzr agent and poll until completion.
 */
async function callAgentSync(message: string, agentId: string, userId: string): Promise<string> {
  const sessionId = `telegram-${agentId}-${userId}`

  // Submit task
  const submitRes = await fetch(LYZR_TASK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': LYZR_API_KEY,
    },
    body: JSON.stringify({
      message,
      agent_id: agentId,
      user_id: `telegram-${userId}`,
      session_id: sessionId,
    }),
  })

  if (!submitRes.ok) {
    const errText = await submitRes.text()
    console.error('[Webhook] Agent submit failed:', errText)
    return 'Sorry, I could not process your request right now. Please try again later.'
  }

  const { task_id } = await submitRes.json()

  // Poll for completion (max 60 seconds)
  const startTime = Date.now()
  const TIMEOUT_MS = 60_000
  let attempt = 0

  while (Date.now() - startTime < TIMEOUT_MS) {
    const delay = Math.min(500 * Math.pow(1.4, attempt), 4000)
    await new Promise((r) => setTimeout(r, delay))
    attempt++

    const pollRes = await fetch(`${LYZR_TASK_URL}/${task_id}`, {
      headers: {
        accept: 'application/json',
        'x-api-key': LYZR_API_KEY,
      },
    })

    if (!pollRes.ok) continue

    const task = await pollRes.json()

    if (task.status === 'processing') continue

    if (task.status === 'failed') {
      return 'Sorry, something went wrong while processing your request.'
    }

    // Extract response text
    try {
      const rawText = JSON.stringify(task.response)
      let agentResponseRaw: any = rawText

      try {
        const envelope = JSON.parse(rawText)
        if (envelope && typeof envelope === 'object' && 'response' in envelope) {
          agentResponseRaw = envelope.response
        }
      } catch {}

      const parsed = parseLLMJson(agentResponseRaw)

      // Try to extract readable text from response
      if (typeof parsed === 'string') return parsed
      if (parsed?.message) return parsed.message
      if (parsed?.result?.text) return parsed.result.text
      if (parsed?.result?.message) return parsed.result.message
      if (parsed?.result?.response) return parsed.result.response
      if (parsed?.result?.summary) return parsed.result.summary
      if (parsed?.result?.answer) return parsed.result.answer
      if (parsed?.result?.confirmation_message) return parsed.result.confirmation_message
      if (parsed?.text) return parsed.text

      // Fallback: stringify result
      const resultStr = JSON.stringify(parsed?.result || parsed, null, 2)
      return resultStr.length > 4000 ? resultStr.substring(0, 4000) + '...' : resultStr
    } catch {
      return 'Your request was processed successfully.'
    }
  }

  return 'Request timed out. Please try again.'
}

/**
 * Send a message back to the Telegram user via Telegram Bot API.
 */
async function sendTelegramReply(chatId: number, text: string, botToken: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

/**
 * POST /api/telegram/webhook
 *
 * Telegram sends updates to this endpoint.
 * We parse the message, route it to the right agent, get a response,
 * and reply to the user on Telegram.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Telegram sends update objects — extract the message
    const message = body.message || body.edited_message
    if (!message || !message.text) {
      // Could be a non-text update (photo, sticker, etc.) — acknowledge silently
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const userId = String(message.from?.id || chatId)
    const messageText = message.text.trim()

    // Handle /start command
    if (messageText === '/start') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        await sendTelegramReply(
          chatId,
          'Welcome to FinPulse! I can help you:\n\n' +
            '- *Log transactions* - Just tell me what you bought, spent, or earned\n' +
            '- *Query finances* - Ask me about your spending, balances, or trends\n\n' +
            'Try: "Bought groceries for 2500" or "What did I spend this month?"',
          botToken
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Handle /help command
    if (messageText === '/help') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        await sendTelegramReply(
          chatId,
          '*FinPulse Commands:*\n\n' +
            '/start - Welcome message\n' +
            '/help - Show this help\n\n' +
            '*Transaction Examples:*\n' +
            '- Bought coffee for 250\n' +
            '- Salary credit 185000\n' +
            '- Paid rent 25000\n' +
            '- Invested 10000 in SBI Blue Chip Fund\n\n' +
            '*Query Examples:*\n' +
            '- What did I spend this week?\n' +
            '- Show my investment summary\n' +
            '- Total income this month?',
          botToken
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Route to the appropriate agent
    const { agentId, agentName } = routeToAgent(messageText)
    console.log(`[Webhook] Routing to ${agentName} (${agentId}) for user ${userId}: "${messageText.substring(0, 50)}..."`)

    if (!LYZR_API_KEY) {
      console.error('[Webhook] LYZR_API_KEY not configured')
      return NextResponse.json({ ok: true })
    }

    // Call the agent and get a response
    const agentResponse = await callAgentSync(messageText, agentId, userId)

    // Reply to the user on Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (botToken) {
      await sendTelegramReply(chatId, agentResponse, botToken)
    } else {
      console.warn('[Webhook] TELEGRAM_BOT_TOKEN not set — cannot reply to user')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook] Error processing update:', error)
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}

/**
 * GET /api/telegram/webhook
 *
 * Health check / verification endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'Telegram webhook endpoint',
    agents: {
      transaction: TELEGRAM_TRANSACTION_AGENT,
      query: FINANCE_QUERY_AGENT,
    },
  })
}
