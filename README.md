# Fantasy Premier League Leaderboard

A modern web application to view and track Fantasy Premier League (FPL)
leaderboards with detailed team statistics and player information.

## <a href="https://ui.shadcn.com/" target="_blank">Shadcn/ui</a> + <a href="https://nextjs.org/" target="_blank">Next.js</a> + <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> + <a href="https://tailwindcss.com/" target="_blank">Tailwind CSS</a>

## Features

### Core Features

- [x] **League Leaderboard Display** - View any FPL league standings by League
      ID
- [x] **Live Player Picks** - Click on any manager to see their current gameweek
      team
- [x] **Team Formation View** - Visual football pitch layout showing player
      positions
- [x] **Real-time Points** - Live scoring data with captain/vice-captain
      multipliers
- [x] **Team Statistics** - Special stats for Vntrip team members (87 Team, 89
      Team, 3T Team)
- [x] **Responsive Design** - Works perfectly on desktop and mobile devices
- [x] **Dark/Light Mode** - Theme switching support

### Technical Features

- [x] **CORS Proxy** - Built-in API routes to handle Fantasy Premier League API
      calls
- [x] **TypeScript Support** - Full type safety throughout the application
- [x] **Modern UI Components** - Built with Shadcn/ui component library
- [x] **Error Handling** - Graceful error handling with user-friendly messages
- [x] **Loading States** - Skeleton loaders for better user experience

## API Routes

The application includes several API routes to proxy Fantasy Premier League
data:

- `/api/fantasy-leaderboard` - Fetch league standings
- `/api/fantasy-picks` - Get manager's team picks for specific gameweek
- `/api/fantasy-bootstrap` - Player and team data
- `/api/fantasy-live` - Live scoring data for current gameweek

## Project Structure

```
├── app/
│   ├── api/                    # API routes for FPL data
│   ├── globals.css            # Global styles and theme variables
│   ├── layout.tsx             # Root layout component
│   └── page.tsx               # Main page component
├── components/
│   ├── fantasy-leaderboard.tsx # Main leaderboard component
│   ├── layout/                # Layout components (navbar, theme)
│   └── ui/                    # Shadcn/ui components
├── lib/
│   └── utils.ts               # Utility functions
└── public/                    # Static assets
```

## Installation

1. Clone this repository:

```bash
git clone https://github.com/tuannt591/fpl-vntrip.git
```

2. Navigate to project directory:

```bash
cd fpl-vntrip
```

3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Viewing League Standings

1. The app loads with the default Vntrip league (ID: 1405297)
2. Enter any Fantasy Premier League ID in the input field and click "Tải" to
   view other leagues
3. The table shows rank, manager name, team name, gameweek points, and total
   points

### Viewing Team Details

1. Click on any manager name in the leaderboard
2. A modal will open showing their current gameweek team formation
3. Players are displayed on a football pitch with their positions
4. Points are shown with captain/vice-captain multipliers applied
5. Bench players are displayed separately below the main formation

### Team Statistics (Vntrip League Only)

When viewing the Vntrip league, additional team statistics are shown:

- **87 Team**: Members with specific entry IDs
- **89 Team**: Members with specific entry IDs
- **3T Team**: Members with specific entry IDs

Each team shows total points, best rank, and member details.

## Configuration

### Team Configuration

To modify team groupings, edit the `TEAMS` constant in
[`components/fantasy-leaderboard.tsx`](components/fantasy-leaderboard.tsx):

```typescript
const TEAMS: TeamConfig[] = [
  {
    name: 'Your Team Name',
    entries: [123456, 789012], // FPL entry IDs
    color: 'bg-blue-500', // Tailwind color class
  },
];
```

### Default League

Change the default league by modifying `VNTRIP_LEAGUE_ID` in
[`components/fantasy-leaderboard.tsx`](components/fantasy-leaderboard.tsx).

## Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern React component library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Next Themes** - Theme switching

## API Data Source

This application uses the official Fantasy Premier League API:

- Base URL: `https://fantasy.premierleague.com/api/`
- No authentication required for public league data
- Rate limiting may apply

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Acknowledgments

- Fantasy Premier League for providing the API
- Shadcn for the excellent UI component library
- The FPL community for inspiration and feedback
