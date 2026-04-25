'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { FiTrendingUp, FiTrendingDown, FiPieChart, FiBarChart2, FiShield } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { callAIAgent } from '@/lib/aiAgent'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const HEALTH_AGENT = '69ec5581eac603bbd2d82ebc'

interface HealthInsightsProps {
  onSetActiveAgent: (id: string) => void
  activeAgentId: string | null
  showSample: boolean
}

const CHART_COLORS = ['hsl(27,61%,26%)', 'hsl(43,75%,38%)', 'hsl(30,55%,25%)', 'hsl(35,45%,42%)', 'hsl(20,65%,35%)', 'hsl(0,84%,60%)']

const SAMPLE_HEALTH = {
  net_worth: { total: 4850000, investments: 3200000, assets: 2500000, liabilities: 850000, composition: [
    { category: 'Stocks', value: 1800000, percentage: 37.1 },
    { category: 'Mutual Funds', value: 1000000, percentage: 20.6 },
    { category: 'Gold', value: 400000, percentage: 8.2 },
    { category: 'Real Estate', value: 2000000, percentage: 41.2 },
    { category: 'Liabilities', value: -850000, percentage: -17.5 },
  ]},
  investment_performance: [
    { display_name: 'Reliance Industries', identifier: 'RELIANCE.NS', type: 'Stock', units: 50, cost_basis: 120000, current_value: 145000, gain_loss_percent: 20.83 },
    { display_name: 'SBI Blue Chip Fund', identifier: '119598', type: 'MF', units: 625, cost_basis: 50000, current_value: 62000, gain_loss_percent: 24.0 },
    { display_name: 'TCS', identifier: 'TCS.NS', type: 'Stock', units: 30, cost_basis: 105000, current_value: 98000, gain_loss_percent: -6.67 },
    { display_name: 'Gold Jewellery', identifier: '22K', type: 'Gold', units: 50, cost_basis: 280000, current_value: 400000, gain_loss_percent: 42.86 },
  ],
  liability_breakdown: [
    { name: 'Home Loan - SBI', type: 'loan', original_amount: 3500000, outstanding: 2800000, repayment_progress: 20, utilisation: 0, health_label: 'On Track' },
    { name: 'HDFC Credit Card', type: 'credit_card', original_amount: 200000, outstanding: 45000, repayment_progress: 0, utilisation: 22.5, health_label: 'Healthy' },
    { name: 'ICICI Credit Card', type: 'credit_card', original_amount: 150000, outstanding: 62000, repayment_progress: 0, utilisation: 41.3, health_label: 'Warning' },
  ],
  savings_rate: 32.5,
  debt_to_income: 28.4,
  spending_breakdown: [
    { category: 'Housing', amount: 35000, percentage: 28 },
    { category: 'Food & Groceries', amount: 18000, percentage: 14.4 },
    { category: 'Transport', amount: 8000, percentage: 6.4 },
    { category: 'Utilities', amount: 6500, percentage: 5.2 },
    { category: 'Entertainment', amount: 5000, percentage: 4 },
    { category: 'Shopping', amount: 12000, percentage: 9.6 },
  ],
  message: 'Financial health report generated successfully.',
}

function formatINR(n: number | undefined): string {
  if (n == null) return '--'
  const abs = Math.abs(n)
  if (abs >= 10000000) return `${n < 0 ? '-' : ''}${'\u20B9'}${(abs / 10000000).toFixed(2)}Cr`
  if (abs >= 100000) return `${n < 0 ? '-' : ''}${'\u20B9'}${(abs / 100000).toFixed(2)}L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function utilisationColor(u: number): string {
  if (u <= 30) return 'text-green-600'
  if (u <= 50) return 'text-amber-600'
  return 'text-red-600'
}

function utilisationBg(u: number): string {
  if (u <= 30) return 'bg-green-500'
  if (u <= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function HealthInsightsSection({ onSetActiveAgent, activeAgentId, showSample }: HealthInsightsProps) {
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const data = healthData ? healthData : (showSample ? SAMPLE_HEALTH : null)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    onSetActiveAgent(HEALTH_AGENT)
    try {
      const result = await callAIAgent('Generate comprehensive financial health report', HEALTH_AGENT)
      const parsed = result?.response?.result ?? result?.response ?? null
      setHealthData(parsed)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate insights')
    } finally {
      setLoading(false)
      onSetActiveAgent('')
    }
  }

  const composition = Array.isArray(data?.net_worth?.composition) ? data.net_worth.composition.filter((c: any) => (c?.value ?? 0) > 0) : []
  const investments = Array.isArray(data?.investment_performance) ? data.investment_performance : []
  const liabilities = Array.isArray(data?.liability_breakdown) ? data.liability_breakdown : []
  const creditCards = liabilities.filter((l: any) => l?.type === 'credit_card')
  const loans = liabilities.filter((l: any) => l?.type !== 'credit_card')
  const spending = Array.isArray(data?.spending_breakdown) ? data.spending_breakdown : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-serif text-foreground">Health Insights</h2>
          <p className="text-sm text-muted-foreground">Comprehensive financial health analysis</p>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <><AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><FiBarChart2 className="mr-2 h-4 w-4" />Generate Insights</>}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}

      {!data && !loading && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="py-12 text-center">
            <FiPieChart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Click "Generate Insights" to get your financial health report.</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Worth</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatINR(data?.net_worth?.total)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Savings Rate</p>
                <p className="text-2xl font-bold text-foreground mt-1">{data?.savings_rate != null ? `${data.savings_rate}%` : '--'}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Debt-to-Income</p>
                <p className="text-2xl font-bold text-foreground mt-1">{data?.debt_to_income != null ? `${data.debt_to_income}%` : '--'}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Investments</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatINR(data?.net_worth?.investments)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Net Worth Composition Donut + Investment Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-serif text-foreground">Net Worth Composition</CardTitle></CardHeader>
              <CardContent>
                {composition.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={composition} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                        {composition.map((_: any, idx: number) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No composition data available</p>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-serif text-foreground">Investment Performance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground text-xs">Holding</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Cost</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Current</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Gain/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investments.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No investment data</TableCell></TableRow>
                      ) : investments.map((inv: any, i: number) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-sm">
                            <div>
                              <p className="font-medium text-foreground">{inv?.display_name ?? '--'}</p>
                              <p className="text-xs text-muted-foreground">{inv?.identifier ?? '--'} | {inv?.units ?? 0} units</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-right text-muted-foreground">{formatINR(inv?.cost_basis)}</TableCell>
                          <TableCell className="text-sm text-right font-medium text-foreground">{formatINR(inv?.current_value)}</TableCell>
                          <TableCell className="text-sm text-right">
                            <span className={`font-medium ${(inv?.gain_loss_percent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(inv?.gain_loss_percent ?? 0) >= 0 ? '+' : ''}{inv?.gain_loss_percent?.toFixed(2) ?? '0'}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liability Breakdown + Credit Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-serif text-foreground">Loan Liabilities</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loans.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No loans on record</p>
                ) : loans.map((l: any, i: number) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">{l?.name ?? '--'}</p>
                        <p className="text-xs text-muted-foreground">{formatINR(l?.outstanding)} / {formatINR(l?.original_amount)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{l?.health_label ?? '--'}</Badge>
                    </div>
                    <Progress value={l?.repayment_progress ?? 0} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{l?.repayment_progress ?? 0}% repaid</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-serif text-foreground flex items-center gap-2"><FiShield className="h-4 w-4" />Credit Card Utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {creditCards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No credit cards on record</p>
                ) : creditCards.map((cc: any, i: number) => {
                  const util = cc?.utilisation ?? 0
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-foreground">{cc?.name ?? '--'}</p>
                        <span className={`text-sm font-semibold ${utilisationColor(util)}`}>{util.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${utilisationBg(util)}`} style={{ width: `${Math.min(util, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatINR(cc?.outstanding)} used</span>
                        <span>Limit: {formatINR(cc?.original_amount)}</span>
                      </div>
                    </div>
                  )
                })}
                {creditCards.length > 0 && (() => {
                  const totalUsed = creditCards.reduce((s: number, c: any) => s + (c?.outstanding ?? 0), 0)
                  const totalLimit = creditCards.reduce((s: number, c: any) => s + (c?.original_amount ?? 0), 0)
                  const aggUtil = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
                  return (
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-foreground">Aggregate</p>
                        <span className={`text-sm font-bold ${utilisationColor(aggUtil)}`}>{aggUtil.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Spending Breakdown */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-serif text-foreground">Spending Breakdown</CardTitle></CardHeader>
            <CardContent>
              {spending.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={spending} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                        {spending.map((_: any, idx: number) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatINR(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {spending.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-foreground">{s?.category ?? '--'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-foreground">{formatINR(s?.amount)}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({s?.percentage ?? 0}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-6">No spending data available</p>}
            </CardContent>
          </Card>

          {data?.message && (
            <p className="text-sm text-muted-foreground italic">{data.message}</p>
          )}
        </>
      )}
    </div>
  )
}
