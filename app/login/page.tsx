import Image from 'next/image'
import { LoginForm } from './LoginForm'
import { LogoMark, LogoTypeface, DiamondRule } from '@/components/ui/Logo'

export const metadata = { title: 'Sign In' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reason?: string }
}) {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Left: the room. Hidden on small screens where it would just be chrome. */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/space/subourbon-vault.jpg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-ink/30 to-ink" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display text-2xl leading-snug text-cream/90">
            Cocktails first.
            <br />
            Questions later.
          </p>
          <DiamondRule className="mt-6 max-w-xs" />
        </div>
      </div>

      {/* Right: the form. */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center text-center">
            <LogoMark size={44} />
            <LogoTypeface className="mt-5" width={200} />
            <p className="label mt-5">Members</p>
          </div>

          {searchParams.reason === 'inactive' && (
            <p className="mb-6 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-cream/80">
              This membership is not currently active. Please speak with a manager.
            </p>
          )}

          <LoginForm next={searchParams.next} />

          <p className="mt-10 text-center text-xs leading-relaxed text-cream-muted">
            Trouble signing in? Speak to any manager, or write to{' '}
            <a href="mailto:members@subourbon.bar" className="text-gold hover:text-gold-bright">
              members@subourbon.bar
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
