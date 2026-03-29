# Frontier Events

Event ticketing and management platform for [Frontier Tower Makerspace](https://frontiertower.io). Built to replace Luma for internal community events — with Frontier OS wallet auth, citizen-only access control, and two-way Luma sync.

---

## Features

- **Public event listings** — anyone can browse and RSVP to public events
- **Citizen-only events** — members-only events gated to authenticated Frontier Tower citizens
- **Ticketing** — free and paid tickets via Stripe, QR code generation, email confirmation
- **RSVP system** — Going / Maybe / Not Going with live attendance counts on every event page
- **Waitlist** — automatic queue when events sell out; admin notifies next in line
- **Recurring events** — weekly, bi-weekly, or monthly recurrence with bulk instance generation
- **Calendar view** — month-view calendar at `/calendar` with per-day event pills
- **Email blasts** — admin sends targeted messages to RSVPs / ticket holders from the event editor
- **QR check-in scanner** — camera-based scanner at `/scanner` for hosts at the door
- **Dual auth** — Frontier OS wallet auth (citizens) + standard email/password (public)
- **Luma two-way sync** — publishing an event auto-creates it on Luma; Luma RSVPs flow back into contacts and RSVP counts automatically

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | [Frontier SDK](https://github.com/BerlinhouseLabs/frontier-sdk) + JWT (jose) + bcryptjs |
| Payments | Stripe Checkout |
| Email | SendGrid (`@sendgrid/mail`) |
| Syndication | Luma API (`https://public-api.luma.com`) |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js 20+ |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### Install

```bash
git clone https://github.com/tjcrowley/frontier-events.git
cd frontier-events
npm install
```

### Configure

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random 32+ char secret (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL e.g. `https://events.frontiertower.io` |
| `STRIPE_SECRET_KEY` | Paid tickets | Stripe secret key (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Paid tickets | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | Email | SendGrid API key (`SG.xxx`) |
| `SENDGRID_FROM_EMAIL` | Email | Verified sender address |
| `SEED_ADMIN_WALLET` | Optional | Frontier wallet address to auto-grant admin on first login |
| `LUMA_API_KEY` | Luma sync | From Luma dashboard → Settings → API (requires Luma Plus) |
| `LUMA_CALENDAR_ID` | Luma sync | Your org's Luma calendar ID |
| `LUMA_WEBHOOK_SECRET` | Luma sync | From Luma dashboard → Webhooks |

### Database

```bash
createdb frontier_events
DATABASE_URL=postgresql://localhost/frontier_events npm run db:migrate
```

### Seed (optional)

```bash
npx tsx src/db/seed.ts
```

Creates a sample org and demo event.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication

### Frontier OS (Citizens)

The app runs inside the [Frontier Wallet PWA](https://os.frontiertower.io) as a registered iframe app. On load:

1. `FrontierProvider` initializes the SDK
2. `getVerifiedAccessControls()` returns a cryptographically signed identity payload
3. Wallet address + subscription status verified server-side
4. JWT issued and stored in `sessionStorage` + cookie

**Active subscribers** (`subscriptionStatus: "active"`) get citizen access:
- View and RSVP to citizens-only events
- Create events via `/events/new` (submitted as draft, reviewed by admin)
- `network-society` plan → auto-granted admin

**Non-wallet visitors** still see public events and can RSVP / buy tickets — they just can't create events or see citizens-only content.

**To register with Frontier OS:** contact the Frontier dev team with your app's public URL and permissions list. See [frontier-kickstarter](https://github.com/BerlinhouseLabs/frontier-kickstarter) for the deployment guide.

### Email Auth

Anyone can sign up at `/signup` with email + password. Email users can browse public events, RSVP, and buy tickets. They cannot create events.

---

## Roles

| Role | How assigned | Capabilities |
|---|---|---|
| `member` | Any authenticated user | RSVP, buy tickets, view citizen events |
| `host` | Added to `event_hosts` table for a specific event | Access `/scanner` for that event |
| `admin` | `network-society` plan OR wallet matches `SEED_ADMIN_WALLET` | Full access — publish events, message attendees, manage waitlists, approve citizen submissions |

---

## Event Lifecycle

```
draft → published → (archived)
```

- **Citizens** submit events as `draft` via `/events/new` — admins review and publish
- **Admins** can create and publish directly from `/admin/events/new`
- On publish: event is automatically pushed to Luma (if configured)
- **Recurring events:** set `recurringType` on a parent event, set an end date, click "Generate Instances" — all future occurrences are bulk-created

---

## Luma Sync

Two-way integration with [Luma](https://lu.ma) (requires Luma Plus subscription).

### Outbound (Frontier Events → Luma)
- Publishing an event auto-creates it on Luma and adds it to your calendar
- The admin event editor shows sync status (`✓ Luma` / `→ Luma`) with a manual push button
- Event updates can be re-synced via the manual button

### Inbound (Luma → Frontier Events)
- Luma sends `guest_registered` and `guest_updated` webhooks to `/api/webhooks/luma`
- Each Luma registrant is upserted into your contacts table
- Their RSVP status syncs into the event's RSVP count

### Setup (once you have a Luma Plus account)
1. Get your API key: Luma dashboard → Settings → API
2. Get your calendar ID: `curl -H "x-luma-api-key: YOUR_KEY" https://public-api.luma.com/v1/user/get-self`
3. Add both to `.env.local`
4. In Luma → Webhooks, add endpoint `https://events.frontiertower.io/api/webhooks/luma`, select `guest_registered` + `guest_updated`, paste signing secret as `LUMA_WEBHOOK_SECRET`

---

## Email

All emails are console-stubbed in development. To enable, add a real `SENDGRID_API_KEY` (starts with `SG.`).

| Email | Trigger |
|---|---|
| Order confirmation | Ticket purchase (free or paid) |
| Newsletter welcome | First-login opt-in |
| Event message blast | Admin sends from event editor |
| Waitlist notification | Admin clicks "Notify Next" |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Public homepage
│   ├── calendar/                     # Month-view calendar
│   ├── e/[slug]/                     # Event detail + checkout
│   ├── events/new/                   # Citizen event creation (Frontier auth required)
│   ├── admin/                        # Admin dashboard + event management
│   ├── scanner/                      # QR check-in (hosts + admins only)
│   ├── login/ signup/                # Email auth
│   ├── account/                      # User profile + newsletter toggle
│   ├── citizens-only/                # Gate page (redirected non-citizens)
│   ├── auth-required/                # Gate page (redirected unauthenticated)
│   └── api/
│       ├── auth/frontier/            # Frontier SDK auth → JWT
│       ├── auth/email/               # Email signup + login
│       ├── auth/newsletter/          # Newsletter opt-in
│       ├── events/[slug]/rsvp/       # RSVP counts + submission
│       ├── events/[slug]/waitlist/   # Join waitlist
│       ├── events/create/            # Citizen event creation (server-side)
│       ├── admin/events/             # Admin event CRUD
│       ├── admin/events/[id]/messages/      # Event messaging
│       ├── admin/events/[id]/waitlist/      # Waitlist management
│       ├── admin/events/[id]/generate-instances/  # Recurring event generation
│       ├── checkout/                 # Stripe checkout
│       ├── check-in/[code]/          # Ticket validation
│       └── webhooks/
│           ├── stripe/               # Stripe payment confirmation
│           └── luma/                 # Luma RSVP sync
├── components/
│   ├── FrontierProvider.tsx          # Frontier SDK context + JWT auth
│   ├── NavBar.tsx                    # Top navigation (server component)
│   ├── RSVPButtons.tsx               # Going/Maybe/Not Going (client)
│   ├── WaitlistForm.tsx              # Join waitlist (client)
│   ├── EventMessaging.tsx            # Admin email blast UI (client)
│   └── NewsletterModal.tsx           # First-login newsletter opt-in
├── db/
│   ├── schema.ts                     # All Drizzle table definitions
│   ├── relations.ts                  # Drizzle relations
│   └── seed.ts                       # Dev seed data
└── lib/
    ├── email.ts                      # SendGrid (order confirmation, blasts, waitlist)
    ├── luma.ts                       # Luma API client + webhook verification
    ├── stripe.ts                     # Stripe client
    ├── tickets.ts                    # QR code generation
    └── communities.ts                # Floor/community slug map
```

---

## Deployment

### Vercel + Neon (recommended)

```bash
# 1. Create a Neon Postgres database at neon.tech
# 2. Run migrations against it
DATABASE_URL=<neon_url> npm run db:migrate

# 3. Deploy
npm i -g vercel
vercel --prod
```

Set all env vars in the Vercel dashboard. Add a CNAME for `events.frontiertower.io` pointing to `cname.vercel-dns.com`.

After deploy, register a Stripe webhook at `https://events.frontiertower.io/api/webhooks/stripe` (event: `checkout.session.completed`).

### Other platforms

Any Node.js 20+ host. `npm run build && npm start`.

---

## Scripts

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build + type check
npm run db:migrate   # Apply pending migrations
npm run db:generate  # Generate migration from schema changes (requires TTY)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

---

## License

MIT — Frontier Tower Makerspace
