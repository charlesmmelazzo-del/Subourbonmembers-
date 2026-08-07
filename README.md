# Subourbon — Members Portal

The members side of [subourbon.bar](https://subourbon.bar): the spirits list, the
calendar, lockers, fittings, messages, plus an admin panel and a concierge view
for the floor.

Deploys as its own Railway service, separate from the public site. Nothing here
touches subourbon.bar — add a "Members" link there when you're ready.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Railway

---

## What's in it

**For members**
- **The List** — the whole backbar, searchable by name, producer, region, or a
  word in the description. Every bottle opens a sheet with the full technical
  spec sheet for its category (mash bill and entry proof for a bourbon, agave
  species and cooking method for a mezcal, marque and ester count for a Jamaican
  rum), the producer's story, embedded photos and video, and every date that
  member has ordered it.
- **My Collection** — favorites, custom lists, tasting notes, order history, and
  anything other members have shared. All of it searchable, including the words
  inside your own notes.
- **Calendar** — month and list views, event sheets with booking for tastings and
  ticketing for concerts, and a plus button to request a private date. Junior
  members who reach for that get an explanation and an offer.
- **My Locker** — bottles in and out with fill levels, full history, requests for
  us to source something, and fitting bookings.
- **Messages** — one thread list covering everything they've ever asked us.
- **Membership** — their own details, and up to three co-members for seniors.

**For staff**
- **Concierge** — type a name, get everything. Built for a phone during service.
- **Admin** — members, flags, chits, Toast sales import, the message centre,
  locker requests, the fittings board, catalog management with bottle scanning,
  and events.

---

## Getting it running

### 1. Supabase

Create a project, then run the two migrations in order from the SQL editor:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
```

The first builds the schema; the second locks it down. **Run both** — without
`0002` every member can read every other member's data.

Copy `.env.example` to `.env.local` and fill in the three Supabase values from
Project Settings → API.

### 2. Install and seed

```bash
npm install
npm run seed
```

The seed builds a complete demo: 35 members across both tiers with contact
details, spend history and visit logs, ~75 real bottles with real technical
specs across every category, a calendar of tastings and concerts and private
closures, lockers with contents, open requests, fittings mid-flight, and message
threads. It's safe to re-run — it clears what it seeded first.

It prints sign-in details when it finishes.

### 3. Run it

```bash
npm run dev
```

---

## Deploying to Railway

1. Push to GitHub, then create a Railway service from the repo.
2. Set the variables from `.env.example` — Railway provides `PORT` itself.
3. Railway detects Next.js and runs `npm run build` then `npm start`.
4. In Supabase → Authentication → URL Configuration:
   - **Site URL** → the Railway domain, e.g.
     `https://subourbonmembers-production.up.railway.app`
   - **Redirect URLs** → add `<that domain>/auth/callback`, plus
     `http://localhost:3000/auth/callback` for local work.

   Sign-in links and member invitations fail silently without these.

Nothing in the code hardcodes a domain — redirects are built from the incoming
request's own origin, so the app works on the Railway domain and on a custom
domain without a code change. **If you later add a custom domain, the only
change needed is adding its callback URL to that same Supabase list.**

---

## How a few things work

**Roles.** `member` sees only their own data. `manager` sees every member and
can do everything on the floor. `admin` adds member deletion and settings.
Enforced in Postgres by row-level security, not just in the UI — a member
hitting the API directly still can't read another member's notes.

**Co-members.** Senior members invite up to three people, capped by a database
trigger rather than a form check. Co-members get their own sign-in and share the
senior's locker.

**86'd bottles.** Never appear in browse or search, but stay in member history
and in the dedicated 86 list, so a member can still pull up their notes on
something we no longer pour.

**Staff notes.** Anything marked staff-only — thread notes, request notes,
fitting prep notes — is filtered server-side before it reaches a member's
browser. Row-level security is row-scoped, not column-scoped, so this is done in
the data layer; see the comments in `app/(portal)/locker/page.tsx`.

**Toast import.** Column names vary between Toast reports, so the importer
matches headers by keyword rather than demanding an exact schema. Members are
matched by email, then phone, then name; line items are matched against the
catalog by a normalized name so they show up in each member's bottle history.
Rows it can't match are counted and reported rather than silently dropped.

**Bottle scanning.** Scan a barcode (or type the name) and Claude researches the
bottle with web search, then fills in the spec sheet for that category. It is
told never to infer a spec from category norms — anything it can't find a source
for comes back listed as unverified rather than guessed. The draft opens in the
editor with its sources; nothing publishes until a manager saves it.

---

## Still to wire up

- **Email and SMS notifications.** In-app notifications work throughout. Email
  goes out for auth and invitations via Supabase. The event and fitting notices
  currently write in-app only — `RESEND_API_KEY` is read but the send is not
  hooked up.
- **Payment.** Concert tickets record an amount against the member; there's no
  card capture. They're settled on the night.
- **Event image uploads.** Events pick from the four venue photos; there's no
  uploader yet.
