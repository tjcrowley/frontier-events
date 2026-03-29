# Frontier Events

Event ticketing and management platform for [Frontier Tower Makerspace](https://frontiertower.io). Built to replace Luma for internal community events.

![Frontier Tower](public/logo-white.svg)

---

## Features

- **Public event listings** — anyone can browse and RSVP to public events
- **Citizen-only events** — members-only events visible only to authenticated Frontier Tower citizens
- **Ticketing** — free and paid tickets via Stripe, QR code generation, email confirmation
- **RSVP system** — Going / Maybe / Not Going with live attendance counts
- **Waitlist** — automatic queue when events sell out, admin can notify next in line
- **Recurring events** — weekly, bi-weekly, or monthly recurrence with bulk instance generation
- **Calendar view** — month-view calendar at `/calendar` with event pills per day
- **Email blasts** — send targeted messages to RSVPs and ticket holders from the admin panel
- **QR check-in scanner** — camera-based scanner for hosts at the door
- **Dual auth** — Frontier OS wallet authentication (for citizens) + standard email/password

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | [Frontier SDK](https://github.com/BerlinhouseLabs/frontier-sdk) + JWT (jose) + bcryptjs |
| Payments | Stripe Checkout |
| Email | SendGrid (`@sendgrid/mail`) |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js 24 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally
- (Optional) Stripe account for paid tickets
- (Optional) SendGrid account for email

### Install

```bash
git clone https://github.com/tjcrowley/frontier-events.git
cd frontier-events
npm install
```

### Configure

Copy the env template and fill in values:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Random 32+ char secret for signing JWTs |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL (e.g. `https://events.frontiertower.io`) |
| `STRIPE_SECRET_KEY` | Paid tickets | Stripe secret key (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Paid tickets | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | Email | SendGrid API key (`SG.xxx`) |
| `SENDGRID_FROM_EMAIL` | Email | Verified sender address |
| `SEED_ADMIN_WALLET` | Optional | Frontier wallet address to auto-grant admin on first login |

### Database

Create the database and run migrations:

```bash
createdb frontier_events
DATABASE_URL=postgresql://localhost/frontier_events npm run db:migrate
```

### Seed (optional)

```bash
npx tsx src/db/seed.ts
```

This creates a sample org and a demo event so you have something to look at.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication

### Frontier OS (Citizens)

The app is designed to run inside the [Frontier Wallet PWA](https://os.frontiertower.io) as a registered app. When opened inside the wallet:

1. `FrontierProvider` initializes the SDK automatically
2. `getVerifiedAccessControls()` returns a cryptographically signed identity payload
3. Your wallet address + subscription status are verified server-side
4. A JWT is issued and stored in `sessionStorage` + cookie

**Active subscribers** (`subscriptionStatus: "active"`) get full citizen access:
- Can view citizens-only events
- Can create events via `/events/new` (submitted as draft, reviewed by admin)
- `network-society` plan subscribers are automatically granted admin

**To register the app with Frontier OS:** contact the Frontier dev team with your app metadata and public URL. See [frontier-kickstarter](https://github.com/BerlinhouseLabs/frontier-kickstarter) for the deployment guide.

### Email Auth

Anyone can create an account with email + password at `/signup`. Email users can:
- Browse and RSVP to public events
- Purchase tickets
- View their orders

Email users **cannot** create events — that requires Frontier wallet auth.

---

## Roles

| Role | Who | Can do |
|---|---|---|
| `member` | Any logged-in user | RSVP, buy tickets, view citizen events |
| `host` | Added to `event_hosts` for a specific event | Access `/scanner` for their event |
| `admin` | `network-society` plan OR `SEED_ADMIN_WALLET` | Everything — create/publish events, message attendees, manage waitlists |

---

## Event Lifecycle

```
draft → published → (archived)
```

- Citizens submit events as **draft** — admins review and publish
- Admins can publish immediately from `/admin/events/[id]`
- Recurring events: set `recurringType` on a parent event, then use "Generate Instances" to bulk-create all future occurrences

---

## Email

All emails are stubbed in development (logged to console). To enable:

1. Add a real `SENDGRID_API_KEY` (starts with `SG.`) to `.env.local`
2. Set `SENDGRID_FROM_EMAIL` to a verified sender

Emails sent:
- **Order confirmation** — tickets + QR codes on purchase
- **Newsletter welcome** — on opt-in
- **Event messages** — admin-triggered blasts to RSVPs / ticket holders
- **Waitlist notification** — when a spot opens up

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Public homepage
│   ├── calendar/             # Month-view calendar
│   ├── e/[slug]/             # Event detail + checkout
│   ├── events/new/           # Citizen event creation
│   ├── admin/                # Admin dashboard (admin only)
│   ├── scanner/              # QR check-in (hosts + admins)
│   ├── login/ signup/        # Email auth
│   ├── account/              # User profile
│   ├── citizens-only/        # Gate page for non-citizens
│   └── api/
│       ├── auth/             # Frontier + email auth routes
│       ├── events/           # Public event API (RSVP, waitlist)
│       ├── admin/events/     # Admin event management
│       ├── checkout/         # Stripe checkout
│       └── check-in/        # Ticket validation
├── components/
│   ├── FrontierProvider.tsx  # SDK context + auth
│   ├── NavBar.tsx            # Top navigation
│   ├── RSVPButtons.tsx       # Going/Maybe/Not Going
│   ├── WaitlistForm.tsx      # Join waitlist
│   ├── EventMessaging.tsx    # Admin email blast UI
│   └── NewsletterModal.tsx   # First-login opt-in
├── db/
│   ├── schema.ts             # Drizzle table definitions
│   ├── relations.ts          # Drizzle relations
│   └── seed.ts               # Dev seed data
└── lib/
    ├── email.ts              # SendGrid helpers
    ├── stripe.ts             # Stripe client
    ├── tickets.ts            # QR code generation
    └── communities.ts        # Floor/community map
```

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Set all env vars in the Vercel dashboard. Use [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres) for the database.

After deploy, run migrations:

```bash
DATABASE_URL=<prod_url> npm run db:migrate
```

### Other platforms

Any Node.js 20+ host works. The app is a standard Next.js server — `npm run build && npm start`.

---

## Development

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run db:migrate   # Run pending migrations
npm run db:studio    # Open Drizzle Studio (DB browser)
```

---

## License

MIT — Frontier Tower Makerspace
