/**
 * TRAUMABRIDGE AI — Voice dictation store
 *
 * The active wizard step (or an open sheet) registers a VoiceTarget. The global
 * mic button in the bottom bar dictates into whichever target is on top of the
 * stack. Individual fields can also request a one-shot dictation (FieldMic).
 */

'use client'

import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface VoiceTarget {
  /** Short name shown in the voice panel, e.g. "Vitals" */
  label: string
  /** Example phrase shown as guidance */
  hint: string
  /** Text used when the browser has no speech recognition (simulated mode) */
  sample: string
  /** Applies the transcript and returns a human-readable summary of what changed */
  apply: (text: string) => string
}

interface VoiceState {
  stack: VoiceTarget[]
  adHoc: VoiceTarget | null
  open: boolean
  continuous: boolean
  push: (t: VoiceTarget) => void
  remove: (t: VoiceTarget) => void
  start: (opts?: { target?: VoiceTarget; continuous?: boolean }) => void
  close: () => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  stack: [],
  adHoc: null,
  open: false,
  continuous: false,
  push: (t) => set((s) => ({ stack: [...s.stack, t] })),
  remove: (t) => set((s) => ({ stack: s.stack.filter((x) => x !== t) })),
  start: (opts) =>
    set({ open: true, adHoc: opts?.target ?? null, continuous: opts?.continuous ?? false }),
  close: () => set({ open: false, adHoc: null, continuous: false }),
}))

/**
 * Register the calling component as the voice target. Pass `null` to
 * unregister (e.g. when a sheet is closed). The latest `apply` closure is
 * always used, so state captured inside it never goes stale.
 */
export function useVoiceTarget(target: VoiceTarget | null) {
  const ref = useRef(target)
  ref.current = target
  const enabled = !!target
  const label = target?.label ?? ''
  const hint = target?.hint ?? ''
  const sample = target?.sample ?? ''

  useEffect(() => {
    if (!enabled) return
    const stable: VoiceTarget = {
      label,
      hint,
      sample,
      apply: (text) => ref.current?.apply(text) ?? '',
    }
    useVoiceStore.getState().push(stable)
    return () => useVoiceStore.getState().remove(stable)
  }, [enabled, label, hint, sample])
}

/** Resolve the target the dock should dictate into */
export function activeTarget(s: Pick<VoiceState, 'stack' | 'adHoc'>): VoiceTarget | null {
  return s.adHoc ?? s.stack[s.stack.length - 1] ?? null
}
