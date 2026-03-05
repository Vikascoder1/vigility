## Vigility – Self‑Tracking Product Analytics Dashboard

This app is a product analytics dashboard built with **Next.js**.  
It tracks its **own usage**: every filter change and chart click is stored and then visualized.

---

## 1. Run the app locally

### Option A – Simple local setup (SQLite, recommended)

**Prerequisites**

- Node.js 18+

**Environment**

Create `.env` in the `vigility` folder:

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-long-random-secret"
```

**Install, migrate, seed, run**

```bash
cd vigility

npm install
npx prisma migrate dev --name init-sqlite
npm run seed
npm run dev
```

Visit `http://localhost:3000/login`, register a user, and you’ll be redirected to the dashboard.

### Option B – Local against Postgres (same as production)

If you prefer to run locally against a real Postgres instance (e.g. Neon, Vercel Postgres):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"
JWT_SECRET="your-long-random-secret"
```

Then:

```bash
npx prisma migrate dev --name init
npm run seed
npm run dev
```

---

## 2. Architecture overview

- **Frontend**
  - Next.js App Router (`app/`).
  - Login/register page with client‑side validation (Zod) and JWT‑based auth.
  - Dashboard page with:
    - Filters (date range, age, gender) stored in cookies.
    - Recharts bar + line charts that visualize feature usage.
    - Mobile‑first, responsive layout.

- **Backend**
  - Next.js API routes under `app/api/*`.
  - **Prisma + PostgreSQL** for data access.
  - JWT authentication with HTTP‑only cookies.
  - Core endpoints:
    - `POST /api/register` – create user, issue JWT.
    - `POST /api/login` – verify user, issue JWT.
    - `POST /api/track` – store a feature click (e.g. `date_picker`, `filter_age`, `chart_bar`, `filter_gender`).
    - `GET /api/analytics` – aggregate clicks per feature and per day for the charts.

- **Tracking model**
  - Every time a filter or chart is used, `/api/track` inserts a `FeatureClick` row with:
    - `userId`, `featureName`, `timestamp`.
  - `/api/analytics` groups `FeatureClick` by **feature name** (for the bar chart) and by **day** (for the line chart), within the selected date range.

---

## 3. Seeding data

The seed script creates:

- Several demo users with different ages/genders.
- A few months of synthetic click data for:
  - `date_picker`, `filter_age`, `chart_bar`, `filter_gender`.

Run:

```bash
npm run seed
```

You can run this against any database pointed to by `DATABASE_URL`.  
For production, run it once against the live Postgres instance (or disable it after the first run).

---

## 4. Scaling thought experiment – 1M events/minute

If this dashboard had to handle 1 million events per minute, I would stop writing directly into a single Postgres database. Instead, I would first send every event into a fast message queue (like Kafka). From there, multiple worker services would read events in batches and write them into a database that is built for analytics and can be split across many machines (for example ClickHouse, BigQuery, or a sharded Postgres setup). I would not query raw events on every request; instead, background jobs would keep pre‑calculated summaries (per feature, per day/hour) up to date, and the API would read from these summaries, with an extra cache like Redis in front. This way writes stay cheap and scalable, and the dashboard can stay fast even with very high traffic.


