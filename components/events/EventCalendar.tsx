'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import clsx from 'clsx'
import { EVENT_STYLES, dayKey, groupByDay } from '@/lib/events'
import { whenLabel } from '@/lib/format'
import { EventDetail } from './EventDetail'
import { RequestDateDialog } from './RequestDateDialog'
import { JuniorUpsell } from './JuniorUpsell'
import type { EventRow, Profile } from '@/lib/types'

type Props = {
  profile: Profile
  events: EventRow[]
  seatsTaken: Record<string, number>
  myReservations: Record<string, number>
  initialEventId?: string
  initialMonth: string
}

export function EventCalendar({
  profile, events, seatsTaken, myReservations, initialEventId, initialMonth,
}: Props) {
  const [cursor, setCursor] = useState(() => new Date(`${initialMonth}-01T12:00:00`))
  const [openId, setOpenId] = useState<string | null>(initialEventId ?? null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [mode, setMode] = useState<'month' | 'list'>('month')
  const [requesting, setRequesting] = useState<Date | null>(null)
  const [upsell, setUpsell] = useState(false)
  const [reservations, setReservations] = useState(myReservations)

  const canRequest = profile.tier === 'senior' || profile.role !== 'member'
  const byDay = useMemo(() => groupByDay(events), [events])

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor))
    const end = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const openEvent = events.find((e) => e.id === openId) ?? null
  const dayEvents = selectedDay ? byDay.get(dayKey(selectedDay)) ?? [] : []

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 40),
    [events]
  )

  function startRequest(day: Date) {
    if (!canRequest) { setUpsell(true); return }
    setRequesting(day)
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---- Header ---- */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">What&apos;s on</p>
          <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">Calendar</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-ink-line p-0.5">
            {(['month', 'list'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                  mode === m ? 'bg-gold/12 text-gold-bright' : 'text-cream-muted hover:text-cream'
                )}
              >
                {m === 'month' ? <CalendarDays className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                {m === 'month' ? 'Month' : 'List'}
              </button>
            ))}
          </div>

          <button
            onClick={() => startRequest(new Date())}
            className="btn-gold px-3"
            aria-label="Request a private date"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Request a date</span>
          </button>
        </div>
      </header>

      {mode === 'month' ? (
        <>
          {/* ---- Month nav ---- */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCursor(subMonths(cursor, 1))}
              aria-label="Previous month"
              className="rounded-lg p-2 text-cream-muted transition-colors hover:bg-ink-card hover:text-gold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="font-display text-lg">{format(cursor, 'MMMM yyyy')}</h2>
            <button
              onClick={() => setCursor(addMonths(cursor, 1))}
              aria-label="Next month"
              className="rounded-lg p-2 text-cream-muted transition-colors hover:bg-ink-card hover:text-gold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* ---- Weekday header ---- */}
          <div className="grid grid-cols-7 border-b border-ink-line/60 pb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] uppercase tracking-widest text-cream-muted">
                <span className="hidden sm:inline">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
                <span className="sm:hidden">{d}</span>
              </div>
            ))}
          </div>

          {/* ---- Grid ---- */}
          <AnimatePresence mode="wait">
            <motion.div
              key={format(cursor, 'yyyy-MM')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="grid grid-cols-7 gap-px bg-ink-line/40"
            >
              {grid.map((day) => {
                const dayList = byDay.get(dayKey(day)) ?? []
                const inMonth = isSameMonth(day, cursor)
                const today = isToday(day)
                const free = dayList.length === 0

                return (
                  <div
                    key={day.toISOString()}
                    className={clsx(
                      'group relative min-h-[4.5rem] bg-ink p-1 sm:min-h-[6.5rem] sm:p-2',
                      !inMonth && 'opacity-35'
                    )}
                  >
                    <button
                      onClick={() => (dayList.length ? setSelectedDay(day) : startRequest(day))}
                      className="absolute inset-0 z-0"
                      aria-label={
                        dayList.length
                          ? `${format(day, 'MMMM d')} — ${dayList.length} events`
                          : `${format(day, 'MMMM d')} — request this date`
                      }
                    />

                    <span
                      className={clsx(
                        'relative z-[1] inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                        today ? 'bg-gold font-medium text-ink' : 'text-cream-muted'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="relative z-[1] mt-1 space-y-0.5">
                      {dayList.slice(0, 3).map((e) => {
                        const style = EVENT_STYLES[e.kind]
                        return (
                          <button
                            key={e.id}
                            onClick={() => setOpenId(e.id)}
                            className={clsx(
                              'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-ink-card',
                              style.chip
                            )}
                          >
                            <span className={clsx('h-1 w-1 shrink-0 rounded-full', style.dot)} />
                            <span className="truncate text-[9px] leading-tight sm:text-[10px]">
                              {e.title}
                            </span>
                          </button>
                        )
                      })}
                      {dayList.length > 3 && (
                        <button
                          onClick={() => setSelectedDay(day)}
                          className="relative z-[1] px-1 text-[9px] text-cream-muted hover:text-gold"
                        >
                          +{dayList.length - 3} more
                        </button>
                      )}
                    </div>

                    {free && inMonth && (
                      <span className="pointer-events-none absolute bottom-1 right-1 text-cream-muted opacity-0 transition-opacity group-hover:opacity-60">
                        <Plus className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-cream-muted">
            {Object.entries(EVENT_STYLES).map(([kind, s]) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={clsx('h-1.5 w-1.5 rounded-full', s.dot)} />
                {s.label}
              </span>
            ))}
            <span className="ml-auto hidden sm:inline">
              Tap an open date to request it.
            </span>
          </p>
        </>
      ) : (
        /* ---- List view ---- */
        <div className="space-y-2">
          {upcoming.length === 0 && (
            <div className="card px-6 py-16 text-center text-sm text-cream-muted">
              Nothing scheduled yet.
            </div>
          )}
          {upcoming.map((e) => {
            const style = EVENT_STYLES[e.kind]
            return (
              <button
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="card flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-gold/40"
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                    {format(new Date(e.starts_at), 'MMM')}
                  </p>
                  <p className="font-display text-2xl leading-none">
                    {format(new Date(e.starts_at), 'd')}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider',
                      style.chip
                    )}
                  >
                    {style.label}
                  </span>
                  <p className="mt-1.5 font-display text-base leading-tight">{e.title}</p>
                  <p className="mt-0.5 text-xs text-cream-muted">{whenLabel(e.starts_at)}</p>
                </div>
                {reservations[e.id] && (
                  <span className="shrink-0 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] text-gold">
                    Booked
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ---- Day sheet ---- */}
      <AnimatePresence>
        {selectedDay && dayEvents.length > 0 && (
          <DaySheet
            day={selectedDay}
            events={dayEvents}
            onOpen={(id) => { setSelectedDay(null); setOpenId(id) }}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>

      {/* ---- Event detail ---- */}
      <AnimatePresence>
        {openEvent && (
          <EventDetail
            key={openEvent.id}
            event={openEvent}
            profile={profile}
            seatsTaken={seatsTaken[openEvent.id] ?? 0}
            mySeats={reservations[openEvent.id] ?? 0}
            onReserved={(seats) =>
              setReservations((prev) => ({ ...prev, [openEvent.id]: seats }))
            }
            onCancelled={() =>
              setReservations((prev) => {
                const next = { ...prev }
                delete next[openEvent.id]
                return next
              })
            }
            onClose={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>

      {/* ---- Private date request ---- */}
      <AnimatePresence>
        {requesting && (
          <RequestDateDialog
            memberId={profile.id}
            date={requesting}
            takenDays={new Set([...byDay.keys()])}
            onClose={() => setRequesting(null)}
          />
        )}
        {upsell && <JuniorUpsell memberId={profile.id} onClose={() => setUpsell(false)} />}
      </AnimatePresence>
    </div>
  )
}

function DaySheet({
  day, events, onOpen, onClose,
}: {
  day: Date
  events: EventRow[]
  onOpen: (id: string) => void
  onClose: () => void
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm"
      />
      {/* Centered by the wrapper — see the note in components/ui/Dialog.tsx. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border border-ink-line bg-ink-raised p-5 shadow-vault sm:w-[min(28rem,100%)] sm:rounded-2xl"
      >
        <p className="label">{format(day, 'EEEE')}</p>
        <h2 className="mt-1 font-display text-xl">{format(day, 'MMMM d, yyyy')}</h2>
        <ul className="mt-4 space-y-2">
          {events.map((e) => {
            const style = EVENT_STYLES[e.kind]
            return (
              <li key={e.id}>
                <button
                  onClick={() => onOpen(e.id)}
                  className="card w-full p-3.5 text-left transition-colors hover:border-gold/40"
                >
                  <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider', style.chip)}>
                    {style.label}
                  </span>
                  <p className="mt-1.5 font-display text-base leading-tight">{e.title}</p>
                  <p className="mt-0.5 text-xs text-cream-muted">{whenLabel(e.starts_at)}</p>
                </button>
              </li>
            )
          })}
        </ul>
      </motion.div>
      </div>
    </>
  )
}
