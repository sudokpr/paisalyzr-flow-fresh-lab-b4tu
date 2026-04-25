'use client'

import React, { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FiSettings, FiCheckCircle } from 'react-icons/fi'

export default function ConfigPopover() {
  const [notionId, setNotionId] = useState('')
  const [telegramToken, setTelegramToken] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
          <FiSettings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border shadow-lg" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm font-serif text-foreground">Configuration</h4>
            <p className="text-xs text-muted-foreground mt-1">Connect your Notion and Telegram integrations.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Notion Database ID</Label>
            <Input
              placeholder="Enter your Notion database ID"
              value={notionId}
              onChange={(e) => setNotionId(e.target.value)}
              className="bg-background border-input text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Telegram Bot Token</Label>
            <Input
              placeholder="Enter your Telegram bot token"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              className="bg-background border-input text-sm"
              type="password"
            />
          </div>
          <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
            {saved ? <><FiCheckCircle className="mr-2 h-4 w-4" />Saved</> : 'Save Configuration'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
