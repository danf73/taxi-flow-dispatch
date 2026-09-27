# TaxiFlow Dispatch

TaxiFlow is a real-time taxi dispatch prototype built with Node.js, Express, WebSockets, and vanilla JavaScript. It gives reception staff a central dispatch dashboard, drivers a mobile-friendly job workflow, and managers a live analytics view.

This project is intended for learning, portfolio demonstration, and local development. Operational data is stored in memory, while staff accounts and sessions are persisted in a local SQLite database.

## Features

- Reception dashboard for creating, assigning, monitoring, and reviewing jobs
- Driver workflow: start a shift, accept or decline jobs, update trip status, and record ratings
- Live updates across dashboards through WebSockets
- Leaflet and OpenStreetMap maps for pickup, dropoff, driver, and route views
- Customer history and autocomplete for repeat bookings
- Dynamic fare estimates based on distance, vehicle type, time, and simulated weather conditions
- Analytics for revenue, job status, driver performance, and fleet availability
- Demo support for sedan, SUV, van, luxury, and wheelchair-accessible vehicles

## Tech Stack

- Node.js
- Express
- `ws` WebSockets
- Vanilla HTML, CSS, and JavaScript
- Leaflet with OpenStreetMap tiles
- In-memory storage for jobs, customers, drivers, and analytics
- SQLite with bcrypt-backed staff accounts and persistent sessions
- Optional GitHub OAuth for staff sign-in and account provisioning

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- An internet connection for map tiles and CDN assets

### Install

```bash
npm install
```

### Configure authentication

Copy `.env.example` to `.env` and set a strong local admin password. The first run creates that account in `data/taxiflow.sqlite`; the database directory is ignored by git.

To enable GitHub sign-in:

1. Create an OAuth App in GitHub under **Settings -> Developer settings -> OAuth Apps**.
2. Set the callback URL to `http://localhost:3000/api/auth/github/callback` for local development.
3. Copy the client ID and client secret into `.env` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
4. Start the server and choose **Continue with GitHub** on the staff login form.

The first GitHub user is created as a staff account. Later sign-ins reuse that account by GitHub ID. GitHub OAuth credentials belong in `.env` and must never be committed.

### Run

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

The server runs on `http://localhost:3000` by default.

## Application Views

| View | URL | Purpose |
| --- | --- | --- |
| Reception | `http://localhost:3000/` | Create and dispatch jobs |
| Driver | `http://localhost:3000/driver` | Manage shifts and trips |
| Analytics | `http://localhost:3000/analytics` | Review operational metrics |

Open the reception and driver views in separate browser tabs to see the real-time workflow. Create a booking from Reception, start a driver shift, accept the job, and move it through the trip status flow.

## Job Lifecycle

```text
Pending -> Accepted -> Arrived -> Picked Up -> Completed
                                      |
                                  Cancelled
```

Fare estimates start with a base fare and distance rate, then apply vehicle, time, and simulated weather multipliers. The pricing configuration lives in `server.js`.

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/jobs` | List current jobs |
| `GET` | `/api/jobs/history` | List completed jobs |
| `POST` | `/api/jobs` | Create a job |
| `POST` | `/api/jobs/:id/accept` | Accept a job for a driver |
| `POST` | `/api/jobs/:id/decline` | Decline a job |
| `PUT` | `/api/jobs/:id/status` | Update a job status |

The WebSocket server runs on the same port and broadcasts job, driver, and analytics updates to connected dashboards.

## Account Management

Staff accounts are created in one of two ways:

- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `.env` before the first run.
- Sign in through GitHub OAuth; the GitHub identity is stored in SQLite and can sign in again without a local password.

The current app exposes authentication for the dashboard and keeps the account database local to the deployment. For a multi-user hosted deployment, add an admin-only account management screen and use a hosted database with HTTPS, CSRF protection, rate limiting, and secure cookie sessions.

## Project Structure

```text
.
├── server.js             # Express server, API, WebSocket events, and demo data
├── package.json          # Scripts and dependencies
├── QUICKSTART.md         # Short walkthrough for trying the demo
└── public/
    ├── reception.html    # Reception dashboard
    ├── reception.js
    ├── driver.html       # Driver dashboard
    ├── driver.js
    ├── analytics.html    # Analytics dashboard
    ├── analytics.js
    └── login.html
```

## Configuration and Customization

- Change the default map center in `public/reception.js` and `public/driver.js`.
- Update vehicle multipliers, fare rates, and surge rules in `server.js`.
- Add or edit seeded demo drivers in the `drivers` array in `server.js`.
- Replace the simulated weather function with a real weather provider before using external data.

## Important Limitations

- Jobs, customers, and analytics reset when the server restarts; staff accounts and sessions do not.
- Driver PINs are still demo data in `server.js` and should be migrated to the account database before deployment.
- Password hashing, OAuth settings, authorization, validation, and rate limiting need production hardening.
- Payment processing is represented by payment method labels only; no payment data is collected.
- OpenStreetMap tiles and third-party CDN assets require network access.

## Roadmap Ideas

- Persist data with PostgreSQL or MongoDB
- Add secure authentication with role-based authorization
- Add environment-based configuration and structured logging
- Integrate real routing, weather, notifications, and payment providers
- Add automated tests and deployment configuration

## License

This project is released under the MIT License.
