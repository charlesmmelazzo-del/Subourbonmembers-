import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, Lock, Sparkles, Wine } from 'lucide-react'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { listEvents, seatsTakenByEvent } from '@/lib/queries'
import { DiamondRule } from '@/components/ui/Logo'
import { EventStrip } from '@/components/events/EventStrip'
import { whenLabel } from '@/lib/format'
import type { CatalogItem, Share } from '@/lib/types'

export default async function TonightPage() {
  const profile = await requireProfile()
  const supabase = createClient()

  const now = new Date()
  const inTwoWeeks = new Date(now.getTime() + 14 * 86_400_000)

  const [events, { data: recentBottles }, { data: shares }, { data: openRequests }] =
    await Promise.all([
      listEvents(now, inTwoWeeks),
      supabase
        .from('catalog_items')
        .select('id, name, category, subcategory, region, hero_image_url')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('shares')
        .select('*, from:profiles!shares_from_member_id_fkey(first_name, last_name)')
        .eq('to_member_id', profile.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('product_requests')
        .select('id, requested_name, status')
        .eq('member_id', profile.id)
        .not('status', 'in', '("added","cancelled")'),
    ])

  const seats = await seatsTakenByEvent(events.map((e) => e.id))
  const tonight = events.filter(
    (e) => new Date(e.starts_at).toDateString() === now.toDateString()
  )
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="animate-fade-up">
        <p className="label">{greeting}</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          {profile.first_name}.
        </h1>
        <DiamondRule className="mt-6 max-w-sm" />
      </header>

      {tonight.length > 0 && (
        <section className="animate-fade-up rounded-xl border border-gold/30 bg-gold/5 p-5">
          <p className="label text-gold">Tonight in the space</p>
          <ul className="mt-3 space-y-2">
            {tonight.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events?event=${e.id}`}
                  className="group flex items-baseline gap-3 text-cream hover:text-gold-bright"
                >
                  <span className="font-display text-lg">{e.title}</span>
                  <span className="text-xs text-cream-muted">{whenLabel(e.starts_at)}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Quick actions --- */}
      <section className="grid gap-3 sm:grid-cols-3">
        <QuickCard
          href="/spirits"
          icon={Wine}
          title="The List"
          detail="Search the backbar, keep notes, build lists."
        />
        <QuickCard
          href="/events"
          icon={CalendarDays}
          title="Calendar"
          detail={
            events.length
              ? `${events.length} coming up in the next two weeks.`
              : 'Nothing on the books just yet.'
          }
        />
        <QuickCard
          href="/locker"
          icon={Lock}
          title="My Locker"
          detail={
            openRequests?.length
              ? `${openRequests.length} open request${openRequests.length > 1 ? 's' : ''}.`
              : 'Manage bottles, request a fitting.'
          }
        />
      </section>

      {/* --- Shared with me --- */}
      {shares && shares.length > 0 && (
        <section>
          <SectionHead title="Shared with you" href="/collection?tab=shared" />
          <ul className="mt-4 space-y-2">
            {(shares as unknown as Array<Share & { from: { first_name: string; last_name: string } }>).map((s) => (
              <li key={s.id}>
                <Link
                  href="/collection?tab=shared"
                  className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-gold/40"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-cream">
                      {s.from.first_name} {s.from.last_name} shared a list with you
                    </p>
                    {s.message && (
                      <p className="truncate text-xs italic text-cream-muted">“{s.message}”</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Upcoming --- */}
      <section>
        <SectionHead title="On the calendar" href="/events" />
        <EventStrip events={events.slice(0, 6)} seatsTaken={seats} className="mt-4" />
      </section>

      {/* --- New arrivals --- */}
      <section>
        <SectionHead title="Recently on the backbar" href="/spirits" />
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {((recentBottles ?? []) as Partial<CatalogItem>[]).map((item) => (
            <Link
              key={item.id}
              href={`/spirits?item=${item.id}`}
              className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-ink-line bg-ink-card transition-colors hover:border-gold/40"
            >
              <div className="relative aspect-[3/4] bg-vault">
                {item.hero_image_url ? (
                  <Image
                    src={item.hero_image_url}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Wine className="h-8 w-8 text-gold/25" strokeWidth={1} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 font-display text-sm leading-tight">{item.name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-cream-muted">
                  {item.subcategory ?? item.category}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-xl">{title}</h2>
      <Link href={href} className="text-xs text-gold transition-colors hover:text-gold-bright">
        See all
      </Link>
    </div>
  )
}

function QuickCard({
  href, icon: Icon, title, detail,
}: {
  href: string
  icon: typeof Wine
  title: string
  detail: string
}) {
  return (
    <Link
      href={href}
      className="card group p-5 transition-colors duration-base hover:border-gold/40"
    >
      <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
      <p className="mt-3 font-display text-lg">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-cream-muted">{detail}</p>
    </Link>
  )
}
