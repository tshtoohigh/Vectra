# PolyTrack

Academic deadline tracking and workload prioritisation for polytechnic and university students.

A calendar tells you *when* something is due. PolyTrack works out *what to do about it* — combining
grade weighting, time remaining, effort left and current progress into a single ranked list, and
always showing the reasoning behind its recommendation.

---

## Running it

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

The app opens on a marketing homepage. Click **Try the live demo** (or go straight to `/app`) and
you land on a dashboard pre-populated with realistic sample data — four modules and eight deadlines,
including an overloaded week — so every feature is usable immediately without signing up.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

---

## What it does

**Explainable prioritisation.** Every task gets a score. Nothing is a black box — the dashboard's
focus card states the actual numbers behind its recommendation.

```
        Weighting          Effort × (1 − Progress)
P =  ─────────────────  ×  ( 1 + ───────────────────── )
      TimeRemaining + 1                  10
```

- **Weighting** — percent of the module grade
- **TimeRemaining** — hours until the deadline
- **Effort** — estimated hours of work
- **Progress** — completion from 0 to 1

Scores map to Critical (≥ 8), High (≥ 4), Medium (≥ 2) and Low. Overdue tasks are always Critical.
See [`src/utils/priorityMath.js`](src/utils/priorityMath.js).

**Overload detection.** Set your realistic daily study hours in Settings. Any day where the work due
exceeds that capacity is flagged on the dashboard and calendar, days in advance — with an option to
ask for a rebalanced plan.

**Three ways to add a deadline.** Type it manually, paste a sentence in plain English
("web dev assignment worth 30% due next Wednesday 11:59pm, about 8 hours"), or upload the assignment
brief as a PDF or photo. Extracted fields are always shown for review before anything is saved.

**Milestone breakdown.** Turn an 18-hour project into 3–5 concrete steps with their own mini
deadlines. Ticking them off updates the parent task's progress, which feeds back into its priority.

**Reminders that stay quiet.** Alerts only fire when a task is genuinely at risk: heavily weighted,
close to due, and behind on progress.

---

## AWS architecture

Eight services, each with one job. Every integration lives in `src/services/aws/` behind a small
client module, so swapping a mock for the real SDK call is a contained change.

| Service | Module | Role |
| --- | --- | --- |
| Cognito | `cognitoAuth.js` | Sign-up, sign-in, JWT-backed sessions |
| API Gateway | `apiGateway.js` | Single REST surface for the client |
| Lambda | *(server-side)* | Task CRUD, priority scoring, scheduled sweeps |
| DynamoDB | `dynamoClient.js` | Single-table store keyed `USER#<id>` / `TASK#<id>` |
| Bedrock | `bedrockClient.js` | Language parsing, milestone breakdown, priority reasoning, rebalancing |
| Textract | `textractClient.js` | Pulls module, type and weighting out of uploaded briefs |
| EventBridge | `eventBridgeScheduler.js` | Scheduled rule that re-checks what is now at risk |
| SNS / SES | `snsNotifier.js` | Urgent push alerts and the morning digest |

**How one deadline flows through the system**

```
Student adds a task  →  API Gateway  →  Lambda  →  Bedrock enriches it
                                                        ↓
                        SNS / SES  ←  EventBridge  ←  DynamoDB
                        (only when at risk)   (scheduled re-check)
```

### Running without AWS

Every client module ships a working mock, so the app is fully functional offline — useful for
development and for demoing. To connect real infrastructure, copy `.env.example` to `.env` and fill
in `VITE_API_URL` plus the Cognito values. `apiGateway.js` returns `null` when `VITE_API_URL` is
blank, which is the signal the app uses to fall back to local state.

State is held in `src/context/AppContext.jsx` and persisted to `localStorage` per user, so the
demo survives a refresh.

---

## Project structure

```
src/
├── App.jsx                  Route table
├── main.jsx                 Entry point, wraps app in BrowserRouter
├── index.css                Design tokens and component classes
├── pages/
│   ├── LandingPage.jsx      Marketing site
│   ├── AuthPage.jsx         Login / signup
│   ├── AppShell.jsx         Sidebar + topbar + modal host, provides AppContext
│   ├── DashboardPage.jsx
│   ├── TasksPage.jsx        List and board views
│   ├── CalendarPage.jsx     Month grid and agenda
│   ├── ModulesPage.jsx      Per-module grade rollups
│   └── SettingsPage.jsx     Profile, capacity, reminders, appearance
├── components/
│   ├── ui/                  Design system: Button, Modal, Badge, Icon set, …
│   ├── landing/             Marketing sections
│   ├── layout/              Sidebar, Topbar
│   ├── dashboard/           FocusCard, WorkloadChart, StatCards, …
│   └── tasks/               TaskItem, TaskFields + the four modals
├── context/
│   ├── AppContext.jsx       Tasks, modules, notifications, all mutations
│   └── ThemeContext.jsx     Light / dark
├── services/aws/            One client module per AWS service
└── utils/
    ├── priorityMath.js      Scoring, workload and overload calculations
    ├── demoData.js          Sample modules, tasks and user
    ├── format.js            Date and countdown helpers
    └── theme.js
```

### Design system

Light-first, dark via a `.dark` class on `<html>`. Reusable classes (`surface`, `field`, `nav-item`,
`heading-card`, …) are defined in `src/index.css`; the brand palette and shadows live in
`tailwind.config.js`.

Icons are inline SVGs in `src/components/ui/Icons.jsx` — used as `<Icon.Calendar />`. There are no
emoji or icon-font dependencies in the interface.

---

## Deploying

### Netlify

`netlify.toml` is included and needs no changes.

- Build command: `npm run build`
- Publish directory: `dist`

The SPA redirect (`/*` → `/index.html`, status 200) is the important part — without it, loading or
refreshing a deep link like `/app/tasks` would 404 at the CDN before React Router ever runs. It is
configured in both `netlify.toml` and `public/_redirects`.

### Anywhere else

Any static host works. Run `npm run build` and serve `dist/`, making sure unknown paths fall back to
`index.html`.

---

## Verification

`npm install` is not required for these — they run on the source directly.

```bash
node scripts/check-context-keys.mjs     # every useApp() key is actually provided
node scripts/check-unused-imports.mjs   # no dead imports
```
