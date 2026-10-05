/**
 * TRAUMABRIDGE AI — Global voice dock
 *
 * Centre button of the bottom action bar. Tap = dictate into the active step.
 * Long-press = continuous mode (keeps listening after each apply).
 *
 * Uses the browser Web Speech API when available. Otherwise it falls back to a
 * clearly-labelled SIMULATED dictation using the step's sample phrase, so the
 * flow can still be demonstrated. The crew always reviews the transcript
 * before anything is written to the run.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mic, Square, Check, RotateCcw, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceStore, activeTarget } from '@/lib/voice'

type Phase = 'listening' | 'review' | 'applied'

const SILENCE_MS = 2200

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-10" aria-hidden>
      {Array.from({ length: 23 }).map((_, i) => {
        const peak = 10 + ((i * 37) % 26)
        return (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-sky-500"
            animate={active ? { height: [6, peak, 8, peak * 0.6, 6] } : { height: 6 }}
            transition={active ? { duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.04 } : { duration: 0.2 }}
            style={{ height: 6, opacity: active ? 1 : 0.35 }}
          />
        )
      })}
    </div>
  )
}

export function VoiceDock({ nightMode }: { nightMode: boolean }) {
  const open = useVoiceStore((s) => s.open)
  const continuous = useVoiceStore((s) => s.continuous)
  const target = useVoiceStore((s) => activeTarget(s))
  const start = useVoiceStore((s) => s.start)
  const close = useVoiceStore((s) => s.close)

  const [phase, setPhase] = useState<Phase>('listening')
  const [text, setText] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [simulated, setSimulated] = useState(false)

  const recRef = useRef<any>(null)
  const silenceRef = useRef<number | null>(null)
  const simRef = useRef<number | null>(null)
  const closeRef = useRef<number | null>(null)
  const pressRef = useRef<number | null>(null)
  const longFired = useRef(false)

  const clearTimers = useCallback(() => {
    for (const r of [silenceRef, simRef, closeRef]) {
      if (r.current) window.clearTimeout(r.current)
      r.current = null
    }
  }, [])

  const stopRecognition = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* already stopped */
    }
    recRef.current = null
  }, [])

  // ── Begin a listening session ──────────────────────────────────────────────
  const beginListening = useCallback(() => {
    clearTimers()
    stopRecognition()
    setPhase('listening')
    setText('')
    setSummary('')
    setError('')

    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (SR) {
      setSimulated(false)
      const rec = new SR()
      rec.lang = 'en-IN'
      rec.continuous = true
      rec.interimResults = true
      let finalText = ''
      rec.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalText += r[0].transcript + ' '
          else interim += r[0].transcript
        }
        setText((finalText + interim).trim())
        if (silenceRef.current) window.clearTimeout(silenceRef.current)
        silenceRef.current = window.setTimeout(() => {
          try {
            rec.stop()
          } catch {
            /* ignore */
          }
        }, SILENCE_MS)
      }
      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setError('Microphone permission is blocked. Allow it in the browser address bar, then retry.')
        } else if (e.error === 'no-speech') {
          setError('Nothing heard. Tap retry and speak closer to the device.')
        } else if (e.error !== 'aborted') {
          setError(`Speech recognition error: ${e.error}`)
        }
        setPhase('review')
      }
      rec.onend = () => setPhase((p) => (p === 'listening' ? 'review' : p))
      try {
        rec.start()
        recRef.current = rec
      } catch {
        setError('Could not start the microphone.')
        setPhase('review')
      }
    } else {
      // Simulated dictation — type the sample phrase out
      setSimulated(true)
      const sample = useVoiceStore.getState()
      const t = activeTarget(sample)?.sample ?? ''
      let i = 0
      const tick = () => {
        i += 2
        setText(t.slice(0, i))
        if (i < t.length) simRef.current = window.setTimeout(tick, 38)
        else simRef.current = window.setTimeout(() => setPhase('review'), 500)
      }
      simRef.current = window.setTimeout(tick, 600)
    }
  }, [clearTimers, stopRecognition])

  // Start / stop when the panel opens / closes
  useEffect(() => {
    if (open) beginListening()
    else {
      clearTimers()
      stopRecognition()
    }
    return () => {
      clearTimers()
      stopRecognition()
    }
  }, [open, beginListening, clearTimers, stopRecognition])

  // Escape = discard
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const finishNow = () => {
    clearTimers()
    stopRecognition()
    setPhase('review')
  }

  const apply = () => {
    if (!target) return
    const result = target.apply(text.trim())
    if (!result) {
      setError('Nothing recognised for this step. Edit the text or retry.')
      return
    }
    setError('')
    setSummary(result)
    setPhase('applied')
    closeRef.current = window.setTimeout(() => {
      if (continuous) beginListening()
      else close()
    }, continuous ? 1300 : 1700)
  }

  // ── Mic button (tap / long-press) ─────────────────────────────────────────
  const onDown = () => {
    longFired.current = false
    pressRef.current = window.setTimeout(() => {
      longFired.current = true
      start({ continuous: true })
    }, 500)
  }
  const onUp = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current)
    pressRef.current = null
  }
  const onClick = () => {
    if (longFired.current) return
    if (open) close()
    else start()
  }

  const listening = open && phase === 'listening'

  return (
    <>
      {/* Mic button — lives in the bottom action bar */}
      <div className="relative flex flex-col items-center">
        {listening && (
          <motion.span
            className="absolute top-0 w-16 h-16 rounded-full bg-sky-500/40"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
          onClick={onClick}
          aria-label={open ? 'Stop voice input' : 'Start voice input'}
          title="Tap to dictate · hold for continuous voice"
          className={cn(
            'relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-colors cursor-pointer border-4',
            open ? 'bg-red-500 border-red-300/60 shadow-red-500/30' : 'bg-sky-500 hover:bg-sky-600 border-sky-200/60 shadow-sky-500/30',
            nightMode && !open && 'border-[#0F1E38]'
          )}
        >
          {open ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-7 h-7" />}
        </motion.button>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-1 hidden sm:block">
          {open ? (continuous ? 'Continuous' : 'Listening') : 'Voice'}
        </span>
      </div>

      {/* Dismiss backdrop + panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="voice-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px]"
            />
            <motion.div
              key="voice-panel"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-label="Voice input"
              className={cn(
                'fixed z-50 left-1/2 -translate-x-1/2 bottom-28 w-[min(94vw,580px)] rounded-3xl border-2 p-5 shadow-2xl space-y-4',
                nightMode ? 'bg-[#0E1A2F] border-sky-500/50 text-white' : 'bg-white border-sky-400/60 text-slate-900'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-black uppercase tracking-wider text-sky-500">
                      Dictating · {target?.label ?? 'No active field'}
                    </span>
                    {simulated && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 font-mono text-[10px] font-bold uppercase">
                        Simulated — no speech engine in this browser
                      </span>
                    )}
                    {continuous && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 font-mono text-[10px] font-bold uppercase">
                        Continuous
                      </span>
                    )}
                  </div>
                  {target?.hint && <p className="text-xs text-slate-400 mt-1 leading-snug">Try: “{target.hint}”</p>}
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Discard and close"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex-shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Waveform active={listening} />

              {phase === 'review' ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  aria-label="Transcript"
                  placeholder="Transcript will appear here — you can edit it before applying."
                  className={cn(
                    'w-full p-3.5 rounded-2xl border-2 text-base focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none',
                    nightMode ? 'bg-[#152742] border-[#223F68] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'min-h-[84px] p-3.5 rounded-2xl border-2 text-base',
                    nightMode ? 'bg-[#152742] border-[#223F68]' : 'bg-slate-50 border-slate-200',
                    !text && 'text-slate-400'
                  )}
                >
                  {text || (phase === 'listening' ? 'Listening…' : '')}
                  {listening && <span className="inline-block w-0.5 h-5 bg-sky-500 ml-0.5 align-middle animate-pulse" />}
                </div>
              )}

              {error && (
                <p className="flex items-start gap-2 text-xs font-semibold text-amber-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                </p>
              )}

              {phase === 'applied' && (
                <p className="flex items-start gap-2 text-sm font-bold text-emerald-500">
                  <Check className="w-5 h-5 flex-shrink-0 stroke-[3]" /> {summary}
                </p>
              )}

              {phase === 'listening' && (
                <button
                  type="button"
                  onClick={finishNow}
                  className="w-full min-h-[56px] rounded-2xl bg-slate-900 text-white font-bold text-base cursor-pointer hover:bg-slate-800"
                >
                  Done speaking
                </button>
              )}

              {phase === 'review' && (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={apply}
                    disabled={!text.trim()}
                    className="flex-1 min-h-[56px] rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-black text-base flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-5 h-5 stroke-[3]" /> Apply to {target?.label ?? 'step'}
                  </button>
                  <button
                    type="button"
                    onClick={beginListening}
                    className={cn(
                      'min-h-[56px] px-5 rounded-2xl border-2 font-bold flex items-center gap-2 cursor-pointer',
                      nightMode ? 'border-[#223F68] bg-[#152742] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                    )}
                  >
                    <RotateCcw className="w-4 h-4" /> Retry
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
