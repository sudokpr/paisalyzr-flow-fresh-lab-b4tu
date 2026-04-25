'use client'

import React, { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FiLayout, FiHeart, FiUpload, FiActivity, FiLink } from 'react-icons/fi'
import DashboardSection from './sections/DashboardSection'
import HealthInsightsSection from './sections/HealthInsightsSection'
import CSVUploadSection from './sections/CSVUploadSection'
import WebhookSection from './sections/WebhookSection'
import ConfigPopover from './sections/ConfigPopover'

const THEME_VARS = {
  '--background': '35 29% 95%',
  '--foreground': '30 22% 14%',
  '--card': '35 29% 92%',
  '--card-foreground': '30 22% 14%',
  '--popover': '35 29% 90%',
  '--popover-foreground': '30 22% 14%',
  '--primary': '27 61% 26%',
  '--primary-foreground': '35 29% 98%',
  '--secondary': '35 20% 88%',
  '--secondary-foreground': '30 22% 18%',
  '--accent': '43 75% 38%',
  '--accent-foreground': '35 29% 98%',
  '--destructive': '0 84% 60%',
  '--muted': '35 15% 85%',
  '--muted-foreground': '30 20% 45%',
  '--border': '27 61% 26%',
  '--input': '35 15% 75%',
  '--ring': '27 61% 26%',
  '--chart-1': '27 61% 26%',
  '--chart-2': '43 75% 38%',
  '--chart-3': '30 55% 25%',
  '--chart-4': '35 45% 42%',
  '--chart-5': '20 65% 35%',
  '--sidebar-background': '35 25% 90%',
  '--sidebar-foreground': '30 22% 14%',
  '--sidebar-border': '35 20% 85%',
  '--sidebar-primary': '27 61% 26%',
  '--sidebar-primary-foreground': '35 29% 98%',
  '--sidebar-accent': '35 20% 85%',
  '--sidebar-accent-foreground': '30 22% 14%',
  '--radius': '0.5rem',
} as React.CSSProperties

const AGENTS = [
  { id: '69ec557e5e51596669c0ed04', name: 'Telegram Transaction', purpose: 'Log transactions via natural language' },
  { id: '69ec557ff83595833f6326ff', name: 'CSV Ingest', purpose: 'Process CSV bank statements' },
  { id: '69ec55805e51596669c0ed08', name: 'Enrichment & Dedup', purpose: 'Enrich data, deduplicate' },
  { id: '69ec5581eac603bbd2d82ebc', name: 'Financial Health', purpose: 'Generate health reports' },
  { id: '69ec5581dcdea9592ddcd90f', name: 'Finance Query', purpose: 'Answer financial queries' },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

type TabKey = 'dashboard' | 'health' | 'csv' | 'webhook'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: FiLayout },
  { key: 'health', label: 'Health Insights', icon: FiHeart },
  { key: 'csv', label: 'CSV Upload', icon: FiUpload },
  { key: 'webhook', label: 'Webhook', icon: FiLink },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <h1 className="text-xl font-semibold font-serif text-primary tracking-wide">FinPulse</h1>

              <nav className="hidden md:flex items-center gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
                  <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                </div>
                <ConfigPopover />
              </div>
            </div>

            {/* Mobile nav */}
            <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && (
            <DashboardSection onSetActiveAgent={setActiveAgentId} activeAgentId={activeAgentId} showSample={showSample} />
          )}
          {activeTab === 'health' && (
            <HealthInsightsSection onSetActiveAgent={setActiveAgentId} activeAgentId={activeAgentId} showSample={showSample} />
          )}
          {activeTab === 'csv' && (
            <CSVUploadSection onSetActiveAgent={setActiveAgentId} activeAgentId={activeAgentId} showSample={showSample} />
          )}
          {activeTab === 'webhook' && (
            <WebhookSection />
          )}
        </main>

        {/* Agent Status Footer */}
        <footer className="border-t border-border bg-card/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 mb-3">
              <FiActivity className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent Status</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {AGENTS.map((agent) => {
                const isActive = activeAgentId === agent.id
                return (
                  <div key={agent.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className={isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}>{agent.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
