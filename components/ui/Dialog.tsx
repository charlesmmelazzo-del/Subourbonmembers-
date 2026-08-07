'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import clsx from 'clsx'

/**
 * Modal shell used by every popup in the portal. Stacks above the item sheet,
 * so its z-index sits deliberately higher.
 */
export function Dialog({
  title, description, onClose, children, footer, wide,
}: {
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-ink/85 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-[61] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl border border-ink-line bg-ink-raised shadow-vault',
          'sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          wide ? 'sm:w-[min(42rem,calc(100vw-3rem))]' : 'sm:w-[min(30rem,calc(100vw-3rem))]'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg leading-tight">{title}</h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-cream-muted">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-cream-muted transition-colors hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer && (
          <div className="border-t border-ink-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </motion.div>
    </>
  )
}
