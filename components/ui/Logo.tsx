import Image from 'next/image'
import clsx from 'clsx'

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand/logos/mark/Subourbon_Logo_Mark_gold.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}

export function LogoTypeface({ className, width = 180 }: { className?: string; width?: number }) {
  return (
    <Image
      src="/brand/logos/typeface/Subourbon_Logo_Typeface_rev.svg"
      alt="Subourbon"
      width={width}
      height={Math.round(width * 0.18)}
      className={className}
      priority
    />
  )
}

/** The single-diamond rule used throughout the brand. */
export function DiamondRule({ className }: { className?: string }) {
  return (
    <div className={clsx('rule-diamond', className)} aria-hidden>
      <svg width="9" height="9" viewBox="0 0 9 9" className="shrink-0">
        <path d="M4.5 0 9 4.5 4.5 9 0 4.5Z" fill="currentColor" />
      </svg>
    </div>
  )
}
