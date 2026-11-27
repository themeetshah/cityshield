# CityShield - Your Safety, Your City, Your Voice

CityShield is a React + Django platform that connects citizens, volunteers and city
departments (Police, Municipal, Fire & Rescue, Medical/EMS) for emergency response
and incident reporting.

## Features

- **SOS alerts** - one tap (with a 5-second cancel window), works without an account.
  Live GPS tracking during the emergency, plus 10-second camera/microphone segments
  uploaded to responders in the background (recorded segments, not a live stream).
  Nearby verified volunteers and the responsible department are notified automatically.
- **Incident reports** - with photo/video evidence, optional anonymity, routed to the
  right department by type (crime/harassment/safety -> Police, infrastructure -> Municipal,
  fire hazard -> Fire, medical -> Medical).
- **Operations dashboard** for department staff - SOS queue, video review, report triage
  with status notes, incident map, official alerts, patrol-team dispatch (police).
- **Safety map** - reported incidents, nearby police stations/hospitals (OpenStreetMap),
  a heuristic incident-density risk layer and routing to the nearest safe place.
- **Community** - official alerts, nearby reports, volunteer responses to SOS.
- **Notifications** stored per user (report status changes, volunteer decisions, SOS updates).

All numbers shown in the UI are computed from stored data; nothing is simulated.

## Roles and access

| Role | How the account is created | Can |
|---|---|---|
| `superadmin` | `python manage.py createsuperuser` (or by another superadmin) | Everything, incl. Django admin, creating department admins |
| `police_admin`, `municipal_admin`, `fire_admin`, `medical_admin` | **Only by a superadmin** (Staff page) | Manage their department's staff and data |
| `police`, `municipal_officer`, `firefighter`, `paramedic` | By their department admin or a superadmin | Work their department's SOS alerts and reports |
| `volunteer` | Citizen applies; approved by the police department | Respond to nearby SOS alerts |
| `citizen` | Self sign-up (email/password or Google) | Report incidents, raise SOS, community features |

Access is enforced by the API (`backend/users/roles.py`, `backend/users/permissions.py`);
the frontend only hides what a role cannot use. Police staff are scoped to their station.

## Project structure

```
backend/
  cityshield_backend/   settings, urls, shared geo / throttle / error helpers
  users/                accounts, roles, staff management, notifications, volunteers
  sos/                  SOS alerts, location trail, private video segments
  reports/              incident reports + media
  safety/               police stations, hospitals, safety zones, risk analysis
  police/               operations API (stats, dispatch, patrol teams, official alerts)
frontend/src/
  auth/ context/ hooks/ services/
  components/  (auth, common, dashboard/{citizen,operations}, map, sos, landing)
  pages/       (admin, community, profile, reports, safety-map)
```

## Setup

Prerequisites: Python 3.12+, Node.js 20.19+.

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit: SECRET_KEY, GOOGLE_CLIENT_ID, ...
python manage.py migrate
python manage.py createsuperuser   # asks only for email + password -> superadmin
python manage.py runserver
```

Police stations & hospitals come from OpenStreetMap and are stored in the database
(map pages never call OpenStreetMap directly):

```bash
python manage.py sync_facilities                 # places in FACILITY_SYNC_PLACES (default: Ahmedabad)
python manage.py sync_facilities Ahmedabad Gandhinagar
python manage.py sync_facilities --around 23.03,72.51 --radius 10000
```

Each run adds new facilities, updates ones that moved or were renamed (matched by
OpenStreetMap id) and hides ones removed from OpenStreetMap. Schedule it daily/weekly
(Windows Task Scheduler or cron). Areas without data are also synced automatically in
the background the first time someone opens the map there, and refreshed every
`FACILITY_REFRESH_DAYS` (7). Superadmins can trigger a sync via
`POST /api/safety/sync-facilities/` (`{"place": "Ahmedabad"}`) and check `GET /api/safety/sync-status/`.
Missing stations should be added to OpenStreetMap (or imported by CSV:
`python manage.py import_police_stations --csv stations.csv`).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID
npm run dev                     # http://localhost:5174
```

### Tests and checks
```bash
cd backend && python manage.py test        # 141 tests
cd frontend && npm run lint && npm run build
```

### Supabase (database + media storage)

Without any Supabase settings the backend uses SQLite and the local `media/` and
`private_media/` folders. To use Supabase instead:

1. Create a Supabase project.
2. **Database** - *Connect* -> copy the **Session pooler** URI into `DATABASE_URL`
   (replace `[YOUR-PASSWORD]`), then run `python manage.py migrate`.
3. **Storage** - create two buckets:
   - `report-media` - **Public** (report photos/videos)
   - `sos-videos` - **private** (SOS recordings; never public)
4. *Storage -> S3 Configuration* -> create an access key and fill in `SUPABASE_URL`,
   `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY` and `SUPABASE_S3_REGION`.

Report media then gets public Supabase URLs. SOS videos stay in the private bucket and are
only streamed through the backend's signed, expiring URLs. The test suite always runs on
SQLite with local folders (set `TEST_DATABASE_URL` to run it against Postgres).

## Production notes

- Set `DJANGO_DEBUG=false`, a strong `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.
- Serve `media/` (public report evidence) from your web server. **Never** serve
  `private_media/` - SOS videos are only streamed through signed, expiring API URLs.
- Use PostgreSQL (e.g. Supabase, above) and a shared cache (Redis) instead of SQLite / local-memory cache.

## Technologies

React 19, Vite 7, Tailwind CSS 4, React Router 7, React Leaflet 5, Leaflet Routing Machine,
Recharts, Framer Motion · Django 6, Django REST Framework, SimpleJWT (rotating refresh tokens
with blacklist), Google Identity Services (server-verified ID tokens), OpenStreetMap
(Nominatim, Overpass) · Supabase (PostgreSQL + Storage via django-storages).

## Contribute

Contributions are welcome - open a [pull request](https://github.com/themeetshah/cityshield/pulls)
or [an issue](https://github.com/themeetshah/cityshield/issues).
