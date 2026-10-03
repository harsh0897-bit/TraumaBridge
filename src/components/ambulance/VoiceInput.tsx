'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Mic, MicOff, RefreshCw, Check, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui'

type VoiceState = 'idle' | 'listening' | 'processing' | 'preview' | 'confirmed'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  placeholder?: string
  nightMode?: boolean
  field?: string  // Which field we're filling
}

// Demo transcripts keyed by field hint
const DEMO_TRANSCRIPTS: Record<string, string[]> = {
  notes:     [
    'Patient is alert and oriented. Complaining of severe chest pain and difficulty breathing.',
    'No loss of consciousness. Visible deformity right lower leg. Patient distressed.',
    'Scene: RTC. Driver unrestrained. Airbag deployed. Significant frontal intrusion.',
  ],
  name:      ['John Unknown', 'Identity not available'],
  mechanism: ['Road traffic collision, driver, high-speed frontal impact, motorway'],
  vitals:    ['Heart rate 112. Blood pressure 98 over 64. Oxygen saturation 97 percent. GCS 14.'],
  treatment: ['18 gauge IV access right antecubital. 500 millilitres Hartmann\'s solution running.'],
  default:   ['Voice input simulation active. Dictate clinical notes here.'],
}

export function VoiceInput({ onTranscript, placeholder, nightMode, field }: VoiceInputProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [editedTranscript, setEditedTranscript] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const startListening = () => {
    setVoiceState('listening')
    setTranscript('')
    // Simulate listening for 2s then processing
    timerRef.current = setTimeout(() => {
      setVoiceState('processing')
      timerRef.current = setTimeout(() => {
        const pool = DEMO_TRANSCRIPTS[field ?? 'default'] ?? DEMO_TRANSCRIPTS.default
        const text = pool[Math.floor(Math.random() * pool.length)]
        setTranscript(text)
        setEditedTranscript(text)
        setVoiceState('preview')
      }, 1000)
    }, 2000)
  }

  const stopListening = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVoiceState('idle')
  }

  const confirm = () => {
    onTranscript(editedTranscript)
    setVoiceState('confirmed')
    timerRef.current = setTimeout(() => setVoiceState('idle'), 1200)
  }

  const retry = () => {
    setVoiceState('idle')
    setTranscript('')
    setEditedTranscript('')
    setIsEditing(false)
  }

  return (
    <div className={cn('rounded-xl border p-3', nightMode ? 'bg-[#0F1E35] border-[#1E3A5F]' : 'bg-slate-50 border-slate-200')}>
      <div className="flex items-start gap-3">
        {/* Mic button */}
        <AnimatePresence mode="wait">
          {voiceState === 'idle' && (
            <motion.button
              key="idle"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={startListening}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150',
                nightMode ? 'bg-[#1E3A5F] text-slate-400 hover:text-white hover:bg-sky-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-400'
              )}
              title="Tap to dictate (simulated)"
            >
              <Mic className="w-4 h-4" />
            </motion.button>
          )}
          {voiceState === 'listening' && (
            <motion.button
              key="listening"
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } }}
              onClick={stopListening}
              className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_-2px_rgba(239,68,68,0.6)]"
              title="Stop listening"
            >
              <MicOff className="w-4 h-4 text-white" />
            </motion.button>
          )}
          {voiceState === 'processing' && (
            <motion.div
              key="processing"
              className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 flex-shrink-0"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </motion.div>
            </motion.div>
          )}
          {voiceState === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          )}
          {voiceState === 'preview' && (
            <motion.div key="preview" className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center flex-shrink-0">
              <Edit2 className="w-4 h-4 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* State content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {voiceState === 'idle' && (
              <motion.p key="idle-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-slate-400 pt-2.5">
                {placeholder ?? 'Tap to dictate'}{' '}
                <span className="font-mono text-[10px] text-amber-500">(simulated)</span>
              </motion.p>
            )}
            {voiceState === 'listening' && (
              <motion.div key="listening-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-red-400 rounded-full"
                        animate={{ height: ['8px', '20px', '8px'] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-red-400 font-mono">Listening…</p>
                </div>
              </motion.div>
            )}
            {voiceState === 'processing' && (
              <motion.p key="processing-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-sky-400 font-mono pt-2.5">
                Processing transcript…
              </motion.p>
            )}
            {voiceState === 'preview' && (
              <motion.div key="preview-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                <p className="font-mono text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Review before confirming:</p>
                {isEditing ? (
                  <textarea
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className={cn('w-full text-sm p-2 rounded-lg border resize-none', nightMode ? 'bg-[#162440] border-[#1E3A5F] text-white' : 'bg-white border-slate-200 text-slate-900')}
                    rows={2}
                    autoFocus
                  />
                ) : (
                  <p className={cn('text-sm italic', nightMode ? 'text-slate-200' : 'text-slate-700')}>
                    "{editedTranscript}"
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="primary" size="sm" onClick={confirm}>Confirm</Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Done editing' : 'Edit'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
                </div>
              </motion.div>
            )}
            {voiceState === 'confirmed' && (
              <motion.p key="confirmed-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-emerald-500 font-mono pt-2.5">
                ✓ Transcript confirmed
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
