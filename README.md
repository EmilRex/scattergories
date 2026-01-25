# Scattergories Online

A multiplayer web-based Scattergories game with a retro aesthetic. Play with friends in real-time using peer-to-peer connections—no server required.

## How It Works

### Peer-to-Peer Architecture

This game uses [PeerJS](https://peerjs.com/) to establish WebRTC connections between players. The host acts as the game authority, managing state and broadcasting updates to all connected players.

```
┌─────────┐     WebRTC      ┌─────────┐
│ Player  │◄───────────────►│  Host   │
└─────────┘                 └────┬────┘
                                 │
┌─────────┐     WebRTC           │
│ Player  │◄─────────────────────┤
└─────────┘                      │
                                 │
┌─────────┐     WebRTC           │
│ Player  │◄─────────────────────┘
└─────────┘
```

**Key benefits:**

- No backend server needed (uses PeerJS public signaling server)
- Low latency direct connections between players
- Game state stays with the host

### Game Flow

1. **Create or Join** - Host creates a game and shares the code; others join with the code
2. **Lobby** - Host configures rounds, categories, and timer; players ready up
3. **Answer** - A random letter is chosen; players fill in answers for each category
4. **Vote** - All answers revealed; players upvote/downvote each other's answers
5. **Results** - Points awarded based on validity and uniqueness
6. **Repeat** - Continue for configured number of rounds

### Scoring

| Answer Type                       | Points |
| --------------------------------- | ------ |
| Unique valid answer               | 2      |
| Valid answer (shared with others) | 1      |
| Invalid or downvoted              | 0      |

Answers must start with the round's letter and receive net positive votes to count.

## Getting Started

### Play Online

Simply open `index.html` in a browser—no build step required. Share the game code with friends to play together.

### Run Locally

```bash
# Clone the repo
git clone https://github.com/EmilRex/scattergories.git
cd scattergories

# Install dependencies (for development)
npm install

# Open in browser
open index.html
# Or use any local server, e.g.:
npx serve .
```

## Contributing

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

This installs dev dependencies and sets up pre-commit hooks automatically.

### Development Workflow

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically lint and format staged files before each commit.

### CI Pipeline

GitHub Actions runs on every push and pull request to `main`:

- ESLint checks
- Prettier formatting checks
- Full test suite

### Project Structure

```
scattergories/
├── index.html          # Entry point
├── css/                # Stylesheets (main, retro theme, animations)
├── js/
│   ├── main.js         # App initialization
│   ├── config.js       # Game constants and settings
│   ├── game/           # Core game logic (scoring, rounds, timer)
│   ├── network/        # PeerJS networking (host, client, peer-manager)
│   ├── state/          # State management (store, game-state machine)
│   ├── ui/             # UI components and screen renderers
│   └── utils/          # Helpers (storage, URL handling)
└── tests/              # Test suite (unit, integration, mocks)
```

### Code Style

- ES Modules (`import`/`export`)
- No build step—runs directly in browser
- ESLint + Prettier for consistent formatting
- Vitest for testing

## License

MIT
