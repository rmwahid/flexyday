# FlexyDay

Cross-border holiday matcher and swapper.

FlexyDay puts two countries' public holidays side by side and lets a remote worker record a
swap: work through a holiday in the company's country, take a holiday in your own country
instead. The resulting schedule can be shared as a read-only link, or exported to JSON and
`.ics`. Holiday data comes from Google Calendar's public ICS feeds, read and cached on the
server.

The primary use case is an Indonesian worker employed by a Hong Kong company, which is why
those two are the defaults, but any of the supported countries can be compared.

## Requirements

- Bun 1.2 or newer (developed with Bun 1.4)

## Getting started

```bash
bun install
bun run dev
```

The dev server runs the Cloudflare platform bindings locally through Wrangler, so the share
link flow works without a Cloudflare account.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Build for Cloudflare Pages |
| `bun run preview` | Preview the production build |
| `bun run check` | Type check with `svelte-check` |
| `bun run test` | Run the unit tests with Vitest |

`bun run check` and `bun run test` must both pass before committing.

## Project structure

```
static/                         Favicon, apple touch icon and the social preview card
src/
├── app.css                     Tailwind theme tokens, including the holiday colours
├── app.d.ts                    Cloudflare binding types
├── app.html                    HTML shell; applies the stored theme before first paint
├── lib/
│   ├── holidays/               Safe to bundle for the browser
│   │   ├── types.ts            Holiday, HolidayKind, SwapPlan, SharePayload
│   │   ├── countries.ts        Supported countries and their verified native locales
│   │   ├── dates.ts            Plain string dates, month grid, Intl formatting
│   │   ├── days.ts             Day classification, chronological sorting, month grouping
│   │   ├── swap.ts             The swap plan model
│   │   ├── share.ts            Validation for untrusted input
│   │   ├── ics-export.ts       .ics generation
│   │   └── api.ts              Typed wrappers over the app's own API
│   ├── server/                 Server only; SvelteKit refuses to bundle this for the client
│   │   ├── ics.ts              ICS parser
│   │   ├── normalize.ts        Raw events to holidays, native name merging
│   │   ├── net.ts              Outbound request guard
│   │   ├── feeds.ts            Country to calendar mapping, guarded fetch
│   │   ├── cache.ts            KV cache with lazy fetch, TTL and hash revalidation
│   │   ├── rate-limit.ts       Fixed-window KV limiter for the share endpoint
│   │   └── share-store.ts      KV storage for share links
│   └── components/             TopBar, CountryPicker, WindowPager, MonthCalendar, Legend,
│                               HolidayList, MarkedList, BalanceCard, DayDrawer, ThemeToggle
└── routes/
    ├── +layout.svelte          Root layout; imports the global stylesheet
    ├── +page.svelte            The combined timeline, swap, share, import and export
    ├── api/holidays/           GET holidays for a country
    ├── api/share/              POST to create a share link
    └── s/[id]/                 Read-only shared schedule, rendered on the server
```

Putting the ICS parser and the KV access under `src/lib/server` is a structural guarantee rather
than a naming convention: SvelteKit will not allow those modules to be imported into client code.
