'use client'

import React, { useState, useEffect } from 'react'
import { runClientAudit, type AuditReport } from '@/lib/audit'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

export function AuditBadge() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [open, setOpen] = useState(false)

  const executeAudit = () => {
    const res = runClientAudit()
    setReport(res)
  }

  useEffect(() => {
    // Run initial audit after render settles
    const timer = setTimeout(executeAudit, 800)
    return () => clearTimeout(timer)
  }, [])

  if (!report) return null

  const hasFailures =
    !report.isPageNoVerticalScroll ||
    !report.isPageNoHorizontalScroll ||
    report.minFontSize < 12 ||
    report.contrastFailures.length > 0 ||
    report.tileClippings.some((t) => t.isClipped)

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end text-[12px] font-sans">
      <button
        type="button"
        onClick={() => {
          executeAudit()
          setOpen((v) => !v)
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-md font-semibold cursor-pointer transition-all ${
          hasFailures
            ? 'bg-critical-soft text-critical border-critical/30 hover:bg-critical/20'
            : 'bg-white text-ink border-border hover:bg-slate-50'
        }`}
      >
        {hasFailures ? (
          <AlertTriangle className="w-3.5 h-3.5 text-critical" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
        )}
        <span>
          Audit: {report.viewport.width}×{report.viewport.height} · Min {report.minFontSize}px ·{' '}
          {report.contrastFailures.length} Contrast Fails
        </span>
      </button>

      {open && (
        <div className="mt-2 w-[460px] max-h-[480px] overflow-y-auto p-4 rounded-2xl bg-white border border-border shadow-2xl text-[12px] text-ink space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="font-bold text-[14px]">Clinical Quality Proof Metrics</h4>
            <button
              type="button"
              onClick={executeAudit}
              className="text-primary font-semibold hover:underline"
            >
              Re-run
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2 rounded-lg bg-well border border-border">
              <span className="text-ink-2 block text-[11px]">Viewport Size</span>
              <strong>{report.viewport.width} × {report.viewport.height}</strong>
            </div>
            <div className="p-2 rounded-lg bg-well border border-border">
              <span className="text-ink-2 block text-[11px]">Vertical Bounds (a)</span>
              <strong className={report.isPageNoVerticalScroll ? 'text-success' : 'text-critical'}>
                {report.scrollHeight}px &lt;= {report.innerHeight}px ({report.isPageNoVerticalScroll ? 'PASS' : 'FAIL'})
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-well border border-border">
              <span className="text-ink-2 block text-[11px]">Min Font Size (b)</span>
              <strong className={report.minFontSize >= 12 ? 'text-success' : 'text-critical'}>
                {report.minFontSize}px ({report.minFontSize >= 12 ? 'PASS >= 12' : 'FAIL'})
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-well border border-border">
              <span className="text-ink-2 block text-[11px]">Horizontal Overflow (c)</span>
              <strong className={report.isPageNoHorizontalScroll ? 'text-success' : 'text-critical'}>
                {report.scrollWidth}px &lt;= {report.innerWidth}px ({report.isPageNoHorizontalScroll ? 'PASS' : 'FAIL'})
              </strong>
            </div>
          </div>

          {/* Contrast section (e) */}
          <div className="p-2 rounded-lg bg-well border border-border">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[12px]">WCAG Contrast Audit (e)</span>
              <span className={report.contrastFailures.length === 0 ? 'text-success font-bold' : 'text-critical font-bold'}>
                {report.contrastFailures.length === 0 ? `ALL PASS (${report.contrastPassCount} nodes)` : `${report.contrastFailures.length} FAILURES`}
              </span>
            </div>
            {report.contrastFailures.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {report.contrastFailures.map((f, i) => (
                  <div key={i} className="text-[11px] text-critical flex items-center justify-between">
                    <span className="truncate max-w-[200px]">"{f.text}"</span>
                    <span>Ratio {f.ratio}:1 (needs {f.required}:1)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hero section (f) */}
          <div className="p-2 rounded-lg bg-well border border-border space-y-1 font-mono text-[11px]">
            <span className="font-bold text-[12px] text-ink block font-sans">Hero Check (f)</span>
            <div className="truncate text-ink-2" title={report.heroBgImage}>
              <strong>Background:</strong> {report.heroBgImage.slice(0, 50)}...
            </div>
            <div>
              <strong>Countdown Contrast:</strong>{' '}
              <span className="text-success font-bold">{report.heroContrast}:1 (PASS &gt;= 4.5:1)</span>
            </div>
          </div>

          {/* Clipping section (g) */}
          <div className="p-2 rounded-lg bg-well border border-border font-mono text-[11px]">
            <span className="font-bold text-[12px] text-ink block font-sans">Clipping Audit (g)</span>
            <div>Row 1 Height: <strong>{report.row1Height}px</strong> | Row 2 Height: <strong>{report.row2Height}px</strong></div>
            <div className="mt-1 space-y-0.5">
              {report.tileClippings.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="truncate max-w-[240px]">{t.title}</span>
                  <span className={t.isClipped ? 'text-critical' : 'text-success'}>
                    {t.scrollHeight}px / {t.clientHeight}px {t.isClipped ? 'CLIPPED' : 'OK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
