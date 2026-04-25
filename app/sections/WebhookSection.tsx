'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FiLink, FiLink2, FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw, FiCopy, FiExternalLink } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import fetchWrapper from '@/lib/fetchWrapper'

interface WebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
  allowed_updates?: string[]
}

export default function WebhookSection() {
  const [botToken, setBotToken] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [autoDetectedUrl, setAutoDetectedUrl] = useState('')
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Load saved bot token from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('finpulse_telegram_token')
    if (saved) setBotToken(saved)

    // Auto-detect the webhook URL
    const host = window.location.host
    const proto = window.location.protocol === 'https:' ? 'https' : 'http'
    setAutoDetectedUrl(`${proto}://${host}/api/telegram/webhook`)
  }, [])

  const effectiveUrl = webhookUrl || autoDetectedUrl

  const checkWebhookStatus = useCallback(async () => {
    if (!botToken) return
    setChecking(true)
    try {
      const res = await fetchWrapper('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'info', bot_token: botToken }),
      })
      if (!res) return
      const data = await res.json()
      if (data.success && data.webhook_info) {
        setWebhookInfo(data.webhook_info)
      }
    } catch {
      // silent fail
    }
    setChecking(false)
  }, [botToken])

  // Check status when token is available
  useEffect(() => {
    if (botToken) {
      checkWebhookStatus()
    }
  }, [botToken, checkWebhookStatus])

  const handleRegister = async () => {
    if (!botToken) {
      setStatusMsg({ type: 'error', text: 'Please enter your Telegram Bot Token first.' })
      return
    }
    setLoading(true)
    setStatusMsg(null)
    try {
      // Save token to localStorage
      localStorage.setItem('finpulse_telegram_token', botToken)

      const res = await fetchWrapper('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          bot_token: botToken,
          webhook_url: effectiveUrl,
        }),
      })
      if (!res) { setStatusMsg({ type: 'error', text: 'No response from server.' }); setLoading(false); return }
      const data = await res.json()
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Webhook registered at ${data.webhook_url}` })
        await checkWebhookStatus()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to register webhook' })
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Network error. Please try again.' })
    }
    setLoading(false)
  }

  const handleRemove = async () => {
    if (!botToken) {
      setStatusMsg({ type: 'error', text: 'Please enter your Telegram Bot Token first.' })
      return
    }
    setLoading(true)
    setStatusMsg(null)
    try {
      const res = await fetchWrapper('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', bot_token: botToken }),
      })
      if (!res) { setStatusMsg({ type: 'error', text: 'No response from server.' }); setLoading(false); return }
      const data = await res.json()
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Webhook removed successfully.' })
        setWebhookInfo(null)
        await checkWebhookStatus()
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to remove webhook' })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error. Please try again.' })
    }
    setLoading(false)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(effectiveUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isActive = webhookInfo?.url && webhookInfo.url.length > 0
  const hasError = webhookInfo?.last_error_message

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold font-serif text-foreground">Telegram Webhook</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Telegram bot to FinPulse. Messages are automatically routed to the right agent.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FiLink className="h-4 w-4 text-primary" />
              Webhook Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Register a webhook so Telegram sends messages directly to your app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bot Token */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Bot Token</Label>
              <Input
                placeholder="Enter your Telegram bot token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="bg-background border-input text-sm font-mono"
                type="password"
              />
              <p className="text-[11px] text-muted-foreground">
                Get this from @BotFather on Telegram
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={autoDetectedUrl || 'https://your-domain.com/api/telegram/webhook'}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-background border-input text-sm font-mono flex-1"
                />
                <Button variant="outline" size="icon" onClick={copyUrl} className="shrink-0">
                  {copied ? <FiCheckCircle className="h-4 w-4 text-green-500" /> : <FiCopy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave empty to auto-detect from current domain. Must be HTTPS for production.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRegister}
                disabled={loading || !botToken}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                {loading ? (
                  <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FiLink2 className="h-4 w-4 mr-2" />
                )}
                Register Webhook
              </Button>
              <Button
                onClick={handleRemove}
                disabled={loading || !botToken}
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <FiXCircle className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>

            {/* Status Message */}
            {statusMsg && (
              <div
                className={`flex items-start gap-2 p-3 rounded-md text-xs ${
                  statusMsg.type === 'success'
                    ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <FiAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FiExternalLink className="h-4 w-4 text-primary" />
                Webhook Status
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={checkWebhookStatus}
                disabled={checking || !botToken}
                className="h-7 w-7"
              >
                <FiRefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Current webhook configuration from Telegram.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!botToken ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Enter your bot token to check webhook status.
              </div>
            ) : webhookInfo === null && !checking ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No webhook info available. Click refresh to check.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  {isActive ? (
                    <Badge variant="default" className="bg-green-600 text-white text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Not Connected
                    </Badge>
                  )}
                </div>

                {/* Webhook URL */}
                {webhookInfo?.url && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">URL</span>
                    <p className="text-xs font-mono bg-background p-2 rounded border border-input break-all">
                      {webhookInfo.url}
                    </p>
                  </div>
                )}

                {/* Pending Updates */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pending Updates</span>
                  <span className="text-xs font-medium">
                    {webhookInfo?.pending_update_count ?? 0}
                  </span>
                </div>

                {/* Allowed Updates */}
                {webhookInfo?.allowed_updates && webhookInfo.allowed_updates.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Allowed Updates</span>
                    <div className="flex flex-wrap gap-1">
                      {webhookInfo.allowed_updates.map((u) => (
                        <Badge key={u} variant="outline" className="text-[10px]">
                          {u}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Error */}
                {hasError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <FiAlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-medium text-destructive">Last Error</span>
                    </div>
                    <p className="text-[11px] text-destructive/80">{webhookInfo?.last_error_message}</p>
                    {webhookInfo?.last_error_date && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(webhookInfo.last_error_date * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Routing Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Message Routing</CardTitle>
          <CardDescription className="text-xs">
            How incoming Telegram messages are routed to FinPulse agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-background rounded-lg p-4 border border-input">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-foreground">Transaction Agent</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Handles messages about spending, earning, investing, and logging transactions.
              </p>
              <div className="flex flex-wrap gap-1">
                {['bought', 'spent', 'salary', 'invested', 'emi', 'paid'].map((kw) => (
                  <Badge key={kw} variant="outline" className="text-[10px] font-mono">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-input">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-xs font-semibold text-foreground">Finance Query Agent</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Handles questions, summaries, and analytical queries about your finances.
              </p>
              <div className="flex flex-wrap gap-1">
                {['what', 'how much', 'summary', 'total', 'show', 'report'].map((kw) => (
                  <Badge key={kw} variant="outline" className="text-[10px] font-mono">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
