'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { FiUpload, FiFileText, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { callAIAgent } from '@/lib/aiAgent'

const CSV_AGENT = '69ec557ff83595833f6326ff'

interface CSVUploadProps {
  onSetActiveAgent: (id: string) => void
  activeAgentId: string | null
  showSample: boolean
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
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{type ?? 'auto-detect'}</span>
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n')
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  })
}

const SAMPLE_CSV = [
  ['Date', 'Description', 'Amount', 'Balance'],
  ['2026-04-01', 'Salary Credit', '185000', '520000'],
  ['2026-04-03', 'Electricity Bill', '-2400', '517600'],
  ['2026-04-05', 'SBI MF SIP', '-25000', '492600'],
  ['2026-04-07', 'Amazon Shopping', '-3200', '489400'],
  ['2026-04-10', 'Freelance Payment', '15000', '504400'],
]

export default function CSVUploadSection({ onSetActiveAgent, activeAgentId, showSample }: CSVUploadProps) {
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({ date: '', dateFormat: 'YYYY-MM-DD', remarks: '', amount: '', balance: '' })
  const [defaultType, setDefaultType] = useState('auto-detect')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayData = showSample ? SAMPLE_CSV : csvData
  const displayHeaders = showSample ? SAMPLE_CSV[0] : headers

  const handleFile = useCallback((file: File) => {
    setError('')
    setResult(null)
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length > 501) {
        setError('CSV exceeds 500 rows limit. Please reduce the file size.')
        return
      }
      setFileName(file.name)
      setHeaders(parsed[0] ?? [])
      setCsvData(parsed)
      // Auto-map columns
      const h = (parsed[0] ?? []).map(c => c.toLowerCase())
      const newMapping = { ...mapping }
      h.forEach((col, i) => {
        if (col.includes('date')) newMapping.date = String(i)
        if (col.includes('desc') || col.includes('remark') || col.includes('narration') || col.includes('particular')) newMapping.remarks = String(i)
        if (col.includes('amount') || col.includes('debit') || col.includes('credit')) newMapping.amount = String(i)
        if (col.includes('balance') || col.includes('bal')) newMapping.balance = String(i)
      })
      setMapping(newMapping)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleProcess = async () => {
    if (displayData.length < 2) {
      setError('No data rows to process')
      return
    }
    if (!mapping.date || !mapping.remarks || !mapping.amount) {
      setError('Please map Date, Remarks, and Amount columns')
      return
    }
    setProcessing(true)
    setError('')
    onSetActiveAgent(CSV_AGENT)
    try {
      const dataRows = (showSample ? displayData.slice(1) : csvData.slice(1)).map(row => ({
        date: row[parseInt(mapping.date)] ?? '',
        date_format: mapping.dateFormat,
        remarks: row[parseInt(mapping.remarks)] ?? '',
        amount: row[parseInt(mapping.amount)] ?? '',
        balance: mapping.balance ? (row[parseInt(mapping.balance)] ?? '') : '',
      }))
      const message = JSON.stringify({
        action: 'ingest_csv',
        default_type: defaultType,
        column_mapping: mapping,
        rows: dataRows,
      })
      const res = await callAIAgent(message, CSV_AGENT)
      const parsed = res?.response?.result ?? res?.response ?? null
      setResult(parsed)
    } catch (e: any) {
      setError(e?.message ?? 'CSV processing failed')
    } finally {
      setProcessing(false)
      onSetActiveAgent('')
    }
  }

  const clearFile = () => {
    setCsvData([])
    setHeaders([])
    setFileName('')
    setResult(null)
    setError('')
  }

  const colOptions = (showSample ? SAMPLE_CSV[0] : headers).map((h, i) => ({ label: h, value: String(i) }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold font-serif text-foreground">CSV Upload</h2>
        <p className="text-sm text-muted-foreground">Import bank statements or transaction exports. Max 500 rows.</p>
      </div>

      {/* Dropzone */}
      {displayData.length === 0 && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FiUpload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Drop your CSV file here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">Maximum 500 rows supported</p>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* File loaded */}
      {(displayData.length > 0 || showSample) && (
        <>
          {/* File header */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiFileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{showSample ? 'sample_transactions.csv' : fileName}</p>
                    <p className="text-xs text-muted-foreground">{(showSample ? displayData.length - 1 : csvData.length - 1)} data rows, {displayHeaders.length} columns</p>
                  </div>
                </div>
                {!showSample && <Button variant="ghost" size="icon" onClick={clearFile}><FiX className="h-4 w-4" /></Button>}
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif text-foreground">Column Mapping</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">Map your CSV columns to required fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'date', label: 'Date Column *' },
                  { key: 'remarks', label: 'Remarks Column *' },
                  { key: 'amount', label: 'Amount Column *' },
                  { key: 'balance', label: 'Balance Column' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Select value={mapping[key] || undefined} onValueChange={(v) => setMapping(prev => ({ ...prev, [key]: v }))}>
                      <SelectTrigger className="mt-1 bg-background border-input"><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {colOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div>
                  <Label className="text-xs text-muted-foreground">Date Format</Label>
                  <Select value={mapping.dateFormat} onValueChange={(v) => setMapping(prev => ({ ...prev, dateFormat: v }))}>
                    <SelectTrigger className="mt-1 bg-background border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Default Transaction Type</Label>
                  <Select value={defaultType} onValueChange={setDefaultType}>
                    <SelectTrigger className="mt-1 bg-background border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['auto-detect', 'income', 'expense', 'investment', 'asset', 'liability', 'emi'].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Table */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif text-foreground">Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[280px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      {displayHeaders.map((h, i) => <TableHead key={i} className="text-muted-foreground text-xs">{h}</TableHead>)}
                      <TableHead className="text-muted-foreground text-xs">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showSample ? displayData.slice(1, 6) : csvData.slice(1, 11)).map((row, i) => (
                      <TableRow key={i} className="border-border">
                        {row.map((cell, j) => <TableCell key={j} className="text-sm text-foreground">{cell}</TableCell>)}
                        <TableCell>{typeBadge(defaultType === 'auto-detect' ? undefined : defaultType)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Process Button */}
          <Button onClick={handleProcess} disabled={processing || (!mapping.date || !mapping.remarks || !mapping.amount)} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full md:w-auto">
            {processing ? <><AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />Processing CSV...</> : <><FiUpload className="mr-2 h-4 w-4" />Process CSV</>}
          </Button>

          {/* Results */}
          {result && (
            <Card className="bg-card border-border shadow-sm border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-serif text-foreground flex items-center gap-2">
                  <FiCheckCircle className="h-5 w-5 text-green-600" />Processing Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                    <p className="text-xl font-semibold text-foreground">{result?.total_rows ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Processed</p>
                    <p className="text-xl font-semibold text-foreground">{result?.processed_rows ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Unresolved</p>
                    <p className="text-xl font-semibold text-foreground">{result?.unresolved_investments ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium text-green-600">{result?.status ?? '--'}</p>
                  </div>
                </div>
                {/* Type Breakdown */}
                {result?.type_breakdown && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Type Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(result.type_breakdown).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          {typeBadge(type)}
                          <span className="text-sm font-medium text-foreground">{String(count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(result?.errors) && result.errors.length > 0 && (
                  <div className="mt-3 p-3 rounded bg-destructive/10">
                    <p className="text-xs text-destructive font-medium mb-1">Errors:</p>
                    {result.errors.map((err: string, i: number) => <p key={i} className="text-xs text-destructive">{err}</p>)}
                  </div>
                )}
                {result?.message && <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
