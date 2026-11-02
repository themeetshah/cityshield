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

Police stations: superadmin can sync real stations from OpenStreetMap
(`POST /api/safety/sync-facilities/`), or import a CSV of real stations:
`python manage.py import_police_stations --csv stations.csv`
(columns: `name, latitude, longitude[, address, city, state, contact_number]`).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID
npm run dev                     # http://localhost:5174
```

### Tests and checks
```bash
cd backend && python manage.py test        # 131 tests
cd frontend && npm run lint && npm run build
```

## Production notes

- Set `DJANGO_DEBUG=false`, a strong `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.
- Serve `media/` (public report evidence) from your web server. **Never** serve
  `private_media/` - SOS videos are only streamed through signed, expiring API URLs.
- Use PostgreSQL and a shared cache (Redis) instead of SQLite / local-memory cache.

## Technologies

React 19, Vite 7, Tailwind CSS 4, React Router 7, React Leaflet 5, Leaflet Routing Machine,
Recharts, Framer Motion · Django 6, Django REST Framework, SimpleJWT (rotating refresh tokens
with blacklist), Google Identity Services (server-verified ID tokens), OpenStreetMap
(Nominatim, Overpass).

## Contribute

Contributions are welcome - open a [pull request](https://github.com/themeetshah/cityshield/pulls)
or [an issue](https://github.com/themeetshah/cityshield/issues).
