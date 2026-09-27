# TaxiFlow Dispatch

TaxiFlow is a real-time taxi dispatch prototype built with Node.js, Express, WebSockets, and vanilla JavaScript. It gives reception staff a central dispatch dashboard, drivers a mobile-friendly job workflow, and managers a live analytics view.

This project is intended for learning, portfolio demonstration, and local development. It is not production-ready: data is stored in memory and authentication is deliberately simple.

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

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- An internet connection for map tiles and CDN assets

### Install

```bash
npm install
```

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

- All application data resets when the server restarts.
- Demo authentication and seeded credentials must be replaced before deployment.
- Password hashing, sessions, authorization, validation, and rate limiting need production hardening.
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
