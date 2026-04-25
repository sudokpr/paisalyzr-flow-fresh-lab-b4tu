'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { FiRefreshCw, FiAlertTriangle, FiTrendingUp, FiChevronDown, FiSearch, FiSend, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { callAIAgent } from '@/lib/aiAgent'

const TELEGRAM_AGENT = '69ec557e5e51596669c0ed04'
const ENRICHMENT_AGENT = '69ec55805e51596669c0ed08'
const QUERY_AGENT = '69ec5581dcdea9592ddcd90f'

interface Transaction {
  description?: string
  amount?: number
  category?: string
  date?: string
  display_name?: string
  ticker_symbol?: string
  scheme_code?: string
  units?: number
  buy_price?: number
  interest_component?: number
  principal_component?: number
  transaction_type?: string
  source?: string
}

interface DashboardProps {
  onSetActiveAgent: (id: string) => void
  activeAgentId: string | null
  showSample: boolean
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { date: '2026-04-20', description: 'Salary Credit - April', amount: 185000, transaction_type: 'income', category: 'Salary', source: 'Bank CSV' },
  { date: '2026-04-18', description: 'Reliance Industries', amount: 45200, transaction_type: 'investment', category: 'Stocks', ticker_symbol: 'RELIANCE.NS', display_name: 'Reliance Industries', units: 18, buy_price: 2511, source: 'Telegram' },
  { date: '2026-04-17', description: 'Home Loan EMI', amount: 32500, transaction_type: 'emi', category: 'EMI', interest_component: 18200, principal_component: 14300, source: 'Bank CSV' },
  { date: '2026-04-15', description: 'Groceries - BigBasket', amount: 4350, transaction_type: 'expense', category: 'Groceries', source: 'Telegram' },
  { date: '2026-04-12', description: 'SBI Blue Chip Fund', amount: 25000, transaction_type: 'investment', category: 'Mutual Funds', scheme_code: '119598', display_name: 'SBI Blue Chip Fund - Direct Growth', units: 312.5, buy_price: 80, source: 'Telegram' },
]

const SAMPLE_STATS = { pendingEnrichment: 3, flaggedDuplicates: 1, unresolvedIds: 2, txnThisMonth: 47 }

function formatINR(n: number | undefined): string {
  if (n == null) return '--'
  const abs = Math.abs(n)
  if (abs >= 10000000) return `${n < 0 ? '-' : ''}${(abs / 10000000).toFixed(2)}Cr`
  if (abs >= 100000) return `${n < 0 ? '-' : ''}${(abs / 100000).toFixed(2)}L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function typeBadge(type?: string) {
  const colors: Record<string, string> = {
    income: 'bg-green-100 text-green-800 border-green-300',
    expense: 'bg-red-100 text-red-800 border-red-300',
    investment: 'bg-blue-100 text-blue-800 border-blue-300',
    asset: 'bg-purple-100 text-purple-800 border-purple-300',
    liability: 'bg-orange-100 text-orange-800 border-orange-300',
    emi: 'bg-amber-100 text-amber-800 border-amber-300',
  }
  const cls = colors[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{type ?? 'Unknown'}</span>
}

export default function DashboardSection({ onSetActiveAgent, activeAgentId, showSample }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<typeof SAMPLE_STATS | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichResult, setEnrichResult] = useState<any>(null)
  const [enrichError, setEnrichError] = useState('')
  const [dupModalOpen, setDupModalOpen] = useState(false)
  const [queryInput, setQueryInput] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryError, setQueryError] = useState('')
  const [txnInput, setTxnInput] = useState('')
  const [txnLoading, setTxnLoading] = useState(false)
  const [txnResult, setTxnResult] = useState<any>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const displayTxns = showSample ? SAMPLE_TRANSACTIONS : transactions
  const displayStats = showSample ? SAMPLE_STATS : stats

  const fetchTransactions = useCallback(async () => {
    if (showSample) return
    onSetActiveAgent(QUERY_AGENT)
    try {
      const result = await callAIAgent('List all my recent transactions with full details including date, description, amount, type, category and source', QUERY_AGENT)
      const data = result?.response?.result ?? result?.response ?? null
      if (data?.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
        if (data.stats) setStats(data.stats)
      } else if (Array.isArray(data)) {
        setTransactions(data)
      }
    } catch {
      // silently fail - user can manually query
    } finally {
      onSetActiveAgent('')
    }
  }, [showSample, onSetActiveAgent])

  useEffect(() => {
    if (!showSample && transactions.length === 0) {
      fetchTransactions()
    }
  }, [showSample]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnrich = async () => {
    setEnrichLoading(true)
    setEnrichError('')
    onSetActiveAgent(ENRICHMENT_AGENT)
    try {
      const result = await callAIAgent('Run enrichment and deduplication on all transactions', ENRICHMENT_AGENT)
      const data = result?.response?.result ?? result?.response ?? null
      setEnrichResult(data)
    } catch (e: any) {
      setEnrichError(e?.message ?? 'Enrichment failed')
    } finally {
      setEnrichLoading(false)
      onSetActiveAgent('')
    }
  }

  const handleQuery = async () => {
    if (!queryInput.trim()) return
    setQueryLoading(true)
    setQueryError('')
    onSetActiveAgent(QUERY_AGENT)
    try {
      const result = await callAIAgent(queryInput, QUERY_AGENT)
      const text = result?.response?.result?.response ?? result?.response?.message ?? (typeof result?.response === 'string' ? result.response : JSON.stringify(result?.response?.result ?? result?.response ?? ''))
      setQueryResult(text)
    } catch (e: any) {
      setQueryError(e?.message ?? 'Query failed')
    } finally {
      setQueryLoading(false)
      onSetActiveAgent('')
    }
  }

  const handleLogTransaction = async () => {
    if (!txnInput.trim()) return
    setTxnLoading(true)
    onSetActiveAgent(TELEGRAM_AGENT)
    try {
      const result = await callAIAgent(txnInput, TELEGRAM_AGENT)
      const data = result?.response?.result ?? result?.response ?? null
      setTxnResult(data)
      if (data?.transaction_details) {
        setTransactions(prev => [{ ...data.transaction_details, transaction_type: data.transaction_type }, ...prev])
      }
    } catch {
      setTxnResult({ status: 'error', message: 'Failed to log transaction' })
    } finally {
      setTxnLoading(false)
      onSetActiveAgent('')
      setTxnInput('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Log Transaction */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold font-serif text-foreground">Log Transaction</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">Type naturally: "Paid 4500 for groceries" or "Bought 10 shares of TCS at 3800"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="e.g. Salary credited 1,85,000" value={txnInput} onChange={(e) => setTxnInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogTransaction()} className="flex-1 bg-background border-input" />
            <Button onClick={handleLogTransaction} disabled={txnLoading || !txnInput.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {txnLoading ? <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
            </Button>
          </div>
          {txnResult && (
            <div className={`mt-3 p-3 rounded-md text-sm ${txnResult?.status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800'}`}>
              {txnResult?.status === 'needs_clarification' && Array.isArray(txnResult?.clarification_options) ? (
                <div>
                  <p className="font-medium mb-2">{txnResult?.message ?? 'Please clarify:'}</p>
                  <div className="flex flex-wrap gap-2">
                    {txnResult.clarification_options.map((opt: string, i: number) => (
                      <Button key={i} variant="outline" size="sm" onClick={() => { setTxnInput(opt); }}>{opt}</Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p>{txnResult?.message ?? JSON.stringify(txnResult, null, 2)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Enrichment', value: displayStats?.pendingEnrichment ?? 0, icon: FiRefreshCw },
          { label: 'Flagged Duplicates', value: displayStats?.flaggedDuplicates ?? 0, icon: FiAlertTriangle },
          { label: 'Unresolved IDs', value: displayStats?.unresolvedIds ?? 0, icon: FiXCircle },
          { label: 'Txns This Month', value: displayStats?.txnThisMonth ?? 0, icon: FiTrendingUp },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><s.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleEnrich} disabled={enrichLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {enrichLoading ? <><AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />Enriching...</> : <><FiRefreshCw className="mr-2 h-4 w-4" />Enrich &amp; Deduplicate</>}
        </Button>
        <Dialog open={dupModalOpen} onOpenChange={setDupModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-border text-foreground">View Duplicates</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-foreground">Flagged Duplicates</DialogTitle>
              <DialogDescription className="text-muted-foreground">Transactions flagged as potential duplicates during enrichment.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {enrichResult?.dedup_summary?.flagged_for_review ? (
                <p className="text-sm text-foreground">{enrichResult.dedup_summary.flagged_for_review} transactions flagged for review. {enrichResult.dedup_summary.auto_merged ?? 0} auto-merged.</p>
              ) : (
                <p className="text-sm text-muted-foreground">No duplicates found yet. Run Enrich &amp; Deduplicate first.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enrichment Result */}
      {enrichResult && !enrichError && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-serif text-foreground">Enrichment Results</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { k: 'Stocks Enriched', v: enrichResult?.enrichment_summary?.stocks_enriched },
                { k: 'MFs Enriched', v: enrichResult?.enrichment_summary?.mfs_enriched },
                { k: 'Gold Enriched', v: enrichResult?.enrichment_summary?.gold_enriched },
                { k: 'IDs Resolved', v: enrichResult?.enrichment_summary?.identifiers_resolved },
                { k: 'Depreciation Applied', v: enrichResult?.enrichment_summary?.depreciation_applied },
                { k: 'Loans Recalculated', v: enrichResult?.enrichment_summary?.loans_recalculated },
                { k: 'Duplicates Found', v: enrichResult?.dedup_summary?.duplicates_found },
                { k: 'Auto-Merged', v: enrichResult?.dedup_summary?.auto_merged },
              ].map((item) => (
                <div key={item.k} className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground text-xs">{item.k}</p>
                  <p className="font-semibold text-foreground">{item.v ?? 0}</p>
                </div>
              ))}
            </div>
            {enrichResult?.message && <p className="mt-3 text-sm text-muted-foreground">{enrichResult.message}</p>}
          </CardContent>
        </Card>
      )}
      {enrichError && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{enrichError}</p>}

      {/* Finance Query */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif text-foreground flex items-center gap-2"><FiSearch className="h-5 w-5" />Finance Query</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">Ask: "What is my net worth?" or "How much is my MF portfolio worth?"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Ask about your finances..." value={queryInput} onChange={(e) => setQueryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuery()} className="flex-1 bg-background border-input" />
            <Button onClick={handleQuery} disabled={queryLoading || !queryInput.trim()} className="bg-primary text-primary-foreground">
              {queryLoading ? <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
            </Button>
          </div>
          {queryResult && (
            <div className="mt-3 p-4 rounded-md bg-muted/40 border border-border">
              <p className="text-sm text-foreground whitespace-pre-line">{queryResult}</p>
            </div>
          )}
          {queryError && <p className="mt-2 text-sm text-destructive">{queryError}</p>}
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif text-foreground">Recent Transactions</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">{displayTxns.length} transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTxns.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions yet. Log one above or upload a CSV.</TableCell></TableRow>
                ) : displayTxns.map((txn, i) => (
                  <React.Fragment key={i}>
                    <TableRow className="border-border hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                      <TableCell className="text-sm text-foreground whitespace-nowrap">{txn.date ?? '--'}</TableCell>
                      <TableCell className="text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          {txn.description ?? '--'}
                          {txn.transaction_type === 'investment' && txn.ticker_symbol && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">{txn.ticker_symbol}</Badge>
                          )}
                          {txn.transaction_type === 'investment' && txn.scheme_code && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">{txn.scheme_code}</Badge>
                          )}
                          {txn.transaction_type === 'investment' && !txn.ticker_symbol && !txn.scheme_code && (
                            <FiAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-foreground">{formatINR(txn.amount)}</TableCell>
                      <TableCell>{typeBadge(txn.transaction_type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{txn.category ?? '--'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{txn.source ?? '--'}</TableCell>
                    </TableRow>
                    {expandedRow === i && txn.transaction_type === 'emi' && (txn.principal_component || txn.interest_component) && (
                      <TableRow className="bg-muted/20 border-border">
                        <TableCell colSpan={6} className="py-2 px-8">
                          <div className="flex gap-6 text-xs text-muted-foreground">
                            <span>Principal: <strong className="text-foreground">{formatINR(txn.principal_component)}</strong></span>
                            <span>Interest: <strong className="text-foreground">{formatINR(txn.interest_component)}</strong></span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
