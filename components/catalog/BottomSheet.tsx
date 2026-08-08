'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useScrollLock } from '@/lib/useScrollLock'

type Props = {
  label: string
  eyebrow: string
  title: string
  blurb?: string
  /** Extra controls under the title — a search box, a filter row. */
  toolbar?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  /** False while the item sheet is stacked above — escape belongs to it then. */
  takesEscape: boolean
  className?: string
}

/**
 * The slide-up the menu opens things in. Sits below the item sheet in the
 * stack (z-45/46 against its z-50), so opening a bottle from inside one layers
 * on top rather than replacing what you were browsing.
 */
export function BottomSheet({
  label, eyebrow, title, blurb, toolbar, children, onClose, takesEscape, className,
}: Props) {
  useScrollLock()

  useEffect(() => {
    if (!takesEscape) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, takesEscape])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 z-[45] bg-ink/80 backdrop-blur-sm"
      />

      {/*
        Anchored to the bottom by the wrapper and animated on `y` alone:
        Framer Motion owns the inline transform, so any centring has to come
        from flex rather than a translate class.
      */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[46] flex justify-center">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.35 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 140 || info.velocity.y > 700) onClose()
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
          // Height follows the contents up to a ceiling, so a two-drink panel
          // gets a short sheet instead of a screen of empty ink.
          className={clsx(
            'pointer-events-auto flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 border-ink-line bg-ink-raised shadow-vault sm:max-h-[86dvh]',
            className ?? 'sm:w-[min(74rem,100%)]'
          )}
        >
          <div className="flex shrink-0 justify-center pt-2.5">
            <div className="h-1 w-10 rounded-full bg-ink-line" />
          </div>

          <header className="shrink-0 px-5 pb-4 pt-3 sm:px-7 sm:pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label">{eyebrow}</p>
                <h2 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{title}</h2>
                {blurb && <p className="mt-1.5 text-sm italic text-cream-muted">{blurb}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-full border border-ink-line p-2 text-cream-muted transition-colors hover:border-gold/50 hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {toolbar}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </motion.div>
      </div>
    </>
  )
}
