# Fantasy Premier League Leaderboard – FPL Vntrip

A modern web application to view and track Fantasy Premier League (FPL)
leaderboards with detailed team statistics, live player information, and weekly
team win/loss tracking.

## Tech Stack

[Shadcn/ui](https://ui.shadcn.com/) · [Next.js 14](https://nextjs.org/) · [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS](https://tailwindcss.com/) · [Radix UI](https://www.radix-ui.com/)

## Features

### Core Features

- **League Leaderboard** – View any FPL league standings (default: Vntrip league `1405297`)
- **Gameweek Selector** – Switch between any gameweek to view historical data
- **Live GW Points** – Real-time scoring with captain / vice-captain multiplier handling
- **Auto-Sub Logic** – Automatic substitution simulation following official FPL rules (GK ↔ GK, outfield order)
- **Bonus Points** – Real-time BPS-based bonus calculation for in-progress matches; official bonus for finished matches
- **Team Statistics** – Dedicated cards for **87 Team** and **89 Team** showing total points, played count, and W/L record
- **Weekly Win/Loss Tracking** – Per-gameweek team comparison with win/loss/draw results and historical dialog
- **Player Picks Accordion** – Expand any manager row to see their full squad, captain, transfers, chips, and per-player breakdown
- **Transfer Details** – View player-in / player-out transfers for the current gameweek
- **Chip Detection** – Display active chips (Wildcard, Free Hit, Bench Boost, Triple Captain)
- **Dark/Light Mode** – Theme switching via `next-themes`
- **Responsive Design** – Mobile-first layout with sticky header
- **Excluded Entries** – Configurable list of entries to hide from the leaderboard

### Technical Highlights

- **Unified API Route** – Single `/api/fantasy-vntrip` endpoint aggregates all FPL data (league, picks, live, fixtures, bootstrap, transfers)
- **In-Memory Caching** – Bootstrap data cached in RAM with configurable TTL (`CACHE_DURATION`)
- **CORS Support** – Built-in CORS headers for cross-origin access
- **Centralized Config** – All FPL constants managed in `lib/fpl-config.ts`
- **TypeScript Types** – Full type definitions in `types/fantasy.ts`
- **Graceful Error Handling** – Per-entry null checks, 502 responses for upstream failures, and user-friendly error UI
- **Skeleton Loaders** – Loading states for better UX

## API Route

The application exposes a single API route that acts as a proxy and data aggregator for the official FPL API:

### `GET /api/fantasy-vntrip`

| Parameter  | Default     | Description                                |
| ---------- | ----------- | ------------------------------------------ |
| `leagueId` | `314`       | FPL league ID                              |
| `phase`    | `1`         | Season phase (1 = overall)                 |
| `gw`       | `0` (current) | Gameweek number (0 = auto-detect current) |

**Response** includes:

```json
{
  "entries": [ /* manager data with picks, GW points, transfers, team, etc. */ ],
  "leagueName": "Vntrip FPL",
  "currentGW": 35,
  "teamWeeklyData": { /* win/loss records and weekly results */ }
}
```

Internally, this route calls the following FPL endpoints:

- `bootstrap-static` – Player metadata, teams, current event (cached)
- `leagues-classic/{id}/standings` – League standings
- `entry/{id}/event/{gw}/picks` – Manager's picks per GW
- `event/{gw}/live` – Live player stats
- `fixtures?event={gw}` – Fixture data for bonus calculation
- `entry/{id}/history` – Entry history for weekly team results
- `entry/{id}/transfers` – Transfer history

## Project Structure

```
├── app/
│   ├── api/
│   │   └── fantasy-vntrip/
│   │       └── route.ts           # Unified API route (all FPL data)
│   ├── globals.css                # Global styles & theme variables
│   ├── head.tsx                   # HTML head configuration
│   ├── layout.tsx                 # Root layout (Navbar, ThemeProvider, SEO)
│   └── page.tsx                   # Home page → FantasyLeaderboard
├── components/
│   ├── fantasy-leaderboard.tsx    # Main leaderboard + team stats + GW selector
│   ├── icons/                     # Social icons (GitHub, Discord, LinkedIn, X)
│   ├── layout/
│   │   ├── navbar.tsx             # Top navigation bar
│   │   ├── theme-provider.tsx     # next-themes provider
│   │   └── toogle-theme.tsx       # Dark/light mode toggle
│   └── ui/
│       ├── accordion.tsx          # Radix accordion primitive
│       ├── badge.tsx              # Badge component
│       ├── button.tsx             # Button variants (CVA)
│       ├── card.tsx               # Card component
│       ├── dialog.tsx             # Radix dialog primitive
│       ├── manager-accordion-list.tsx  # Manager row with picks detail
│       └── skeleton.tsx           # Skeleton loader
├── lib/
│   ├── fpl-config.ts              # FPL constants (teams, league ID, cache, etc.)
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
├── types/
│   └── fantasy.ts                 # TypeScript type definitions
├── public/                        # Static assets (images, SVGs)
├── next.config.mjs                # Next.js config (standalone, compress)
├── tailwind.config.ts             # Tailwind config with custom theme
├── tsconfig.json                  # TypeScript config
└── package.json                   # Dependencies & scripts
```

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/tuannt591/fpl-vntrip.git

# 2. Navigate to project directory
cd fpl-vntrip

# 3. Install dependencies
yarn install

# 4. Run the development server
yarn dev

# 5. Open http://localhost:3000 in your browser
```

## Configuration

All FPL-related constants are centralized in [`lib/fpl-config.ts`](lib/fpl-config.ts):

```typescript
export const FPL_API_BASE = 'https://fantasy.premierleague.com/api';

// Team groupings (team name → array of FPL entry IDs)
export const TEAMS_CONFIG: { [key: string]: number[] } = {
  '87': [2195023, 6293111, 6291846, 6400474],
  '89': [4565469, 4550400, 5005626, 6425684],
};

// Win/Loss records counted from this GW onwards
export const WIN_LOSS_START_GW = 32;

// Entries excluded from the leaderboard
export const EXCLUDED_ENTRIES = [3024127];

// Bootstrap data cache duration (ms)
export const CACHE_DURATION = 60 * 1000;

// Default league
export const VNTRIP_LEAGUE_ID = '1405297';
export const CURRENT_PHASE = 1;
```

### Team UI Config

Team colors for the leaderboard are configured in
[`components/fantasy-leaderboard.tsx`](components/fantasy-leaderboard.tsx):

```typescript
const TEAMS: TeamConfig[] = [
  { name: '87 Team', entries: [...], color: 'text-red-500' },
  { name: '89 Team', entries: [...], color: 'text-violet-500' },
];
```

## Build & Deploy

```bash
# Build for production (standalone output)
yarn build

# Start production server
yarn start

# Lint code
yarn lint
```

The app is configured with `output: 'standalone'` in `next.config.mjs` for
optimized Docker / serverless deployments (e.g. Vercel).

## Technologies Used

| Technology              | Purpose                          |
| ----------------------- | -------------------------------- |
| **Next.js 14**          | React framework (App Router)     |
| **TypeScript**          | Type safety                      |
| **Tailwind CSS 3**      | Utility-first styling            |
| **Shadcn/ui**           | UI component library             |
| **Radix UI**            | Accessible primitives (Accordion, Dialog) |
| **Lucide React**        | Icon library                     |
| **next-themes**         | Dark / Light mode switching      |
| **class-variance-authority** | Component variant management |
| **clsx + tailwind-merge** | Conditional class merging      |

## API Data Source

This application uses the official Fantasy Premier League API:

- Base URL: `https://fantasy.premierleague.com/api/`
- No authentication required for public league data
- Rate limiting may apply (the app returns 502 when upstream is unavailable)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file
for details.
