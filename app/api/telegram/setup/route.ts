import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/telegram/setup
 *
 * Register or remove the Telegram webhook.
 * Body: { action: 'register' | 'remove', bot_token?: string, webhook_url?: string }
 *
 * If bot_token is not provided, falls back to TELEGRAM_BOT_TOKEN env var.
 * If webhook_url is not provided for 'register', uses the app's own URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, bot_token, webhook_url } = body

    const token = bot_token || process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Bot token is required. Provide bot_token or set TELEGRAM_BOT_TOKEN env var.' },
        { status: 400 }
      )
    }

    if (action === 'register') {
      // Determine webhook URL
      let finalUrl = webhook_url
      if (!finalUrl) {
        // Try to auto-detect from request headers
        const host = request.headers.get('host')
        const proto = request.headers.get('x-forwarded-proto') || 'https'
        if (host) {
          finalUrl = `${proto}://${host}/api/telegram/webhook`
        }
      }

      if (!finalUrl) {
        return NextResponse.json(
          { success: false, error: 'Could not determine webhook URL. Please provide webhook_url.' },
          { status: 400 }
        )
      }

      // Register webhook with Telegram
      const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalUrl,
          allowed_updates: ['message', 'edited_message'],
          drop_pending_updates: false,
        }),
      })

      const result = await telegramRes.json()

      if (result.ok) {
        return NextResponse.json({
          success: true,
          message: 'Webhook registered successfully',
          webhook_url: finalUrl,
          telegram_response: result,
        })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to register webhook', telegram_response: result },
          { status: 400 }
        )
      }
    }

    if (action === 'remove') {
      const telegramRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: true }),
      })

      const result = await telegramRes.json()

      if (result.ok) {
        return NextResponse.json({
          success: true,
          message: 'Webhook removed successfully',
          telegram_response: result,
        })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to remove webhook', telegram_response: result },
          { status: 400 }
        )
      }
    }

    if (action === 'info') {
      const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
      const result = await telegramRes.json()

      return NextResponse.json({
        success: true,
        webhook_info: result.result,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "register", "remove", or "info".' },
      { status: 400 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
