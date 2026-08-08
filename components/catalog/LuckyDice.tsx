'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'

/**
 * The golden die. Idle it reads CLICK ME; rolling it tumbles through faces;
 * settled it shows the face it landed on.
 *
 * Purely presentational — it reports when the roll finishes and the panel
 * decides what was won. The pick is made up front, not by the die.
 */
export function LuckyDice({
  state, onRoll, onSettled, disabled,
}: {
  state: 'idle' | 'rolling' | 'settled'
  onRoll: () => void
  onSettled: () => void
  disabled?: boolean
}) {
  const [face, setFace] = useState(5)
  const reduceMotion = useReducedMotion()
  const settle = useRef(onSettled)
  settle.current = onSettled

  useEffect(() => {
    if (state !== 'rolling') return

    // A short roll with a long one's drama: faces flick past, then stop.
    const duration = reduceMotion ? 200 : 1100
    const flicker = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 80)
    const stop = setTimeout(() => {
      clearInterval(flicker)
      setFace(1 + Math.floor(Math.random() * 6))
      settle.current()
    }, duration)

    return () => {
      clearInterval(flicker)
      clearTimeout(stop)
    }
  }, [state, reduceMotion])

  const rolling = state === 'rolling'

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={onRoll}
        disabled={disabled || rolling}
        aria-label={rolling ? 'Rolling' : 'Roll the die'}
        animate={
          rolling && !reduceMotion
            ? { rotate: [0, 220, 480, 735, 1080], scale: [1, 1.12, 0.94, 1.06, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={
          rolling && !reduceMotion
            ? { duration: 1.1, ease: [0.22, 1, 0.36, 1], times: [0, 0.25, 0.5, 0.78, 1] }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
        whileHover={state === 'idle' ? { scale: 1.05 } : undefined}
        whileTap={state === 'idle' ? { scale: 0.95 } : undefined}
        className={clsx(
          'relative grid h-28 w-28 place-items-center rounded-[1.35rem] shadow-gold transition-opacity sm:h-32 sm:w-32',
          'bg-gold-gradient',
          disabled && !rolling && 'cursor-not-allowed opacity-40',
          !disabled && state === 'idle' && 'cursor-pointer'
        )}
      >
        {state === 'idle' ? (
          <span className="px-2 text-center text-[13px] font-semibold uppercase leading-tight tracking-[0.14em] text-ink">
            Click
            <br />
            me
          </span>
        ) : (
          <DieFace value={face} />
        )}
      </motion.button>

      <p className="h-4 text-[11px] uppercase tracking-[0.18em] text-cream-muted">
        {rolling ? 'Rolling…' : state === 'settled' ? 'Roll again' : ''}
      </p>
    </div>
  )
}

// Pip positions on a 3×3 grid, per face.
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
}

function DieFace({ value }: { value: number }) {
  return (
    <span className="grid h-[62%] w-[62%] grid-cols-3 grid-rows-3 gap-[3px]" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const on = PIPS[value].some(([c, r]) => c === col && r === row)
        return (
          <span
            key={i}
            className={clsx('rounded-full', on ? 'bg-ink' : 'bg-transparent')}
          />
        )
      })}
    </span>
  )
}
