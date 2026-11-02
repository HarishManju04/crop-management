# Smart Crop Management System

Smart Crop is a web application for exploring crop records and farm information. It includes a farmer dashboard, field mapping, historical crop data, reports, and an administrator area for managing farmer announcements.

## Features

- Browse crop records by district, taluk, year, and crop.
- View land and water information, weather, crop and fertilizer recommendations, and disease-prevention guidance.
- Review historical crop data and generate Word reports.
- Draw or upload a field boundary, estimate its area, and keep crop-season history for a field.
- Register farmer accounts and publish announcements to signed-in farmers.
- Manage users and announcements from the administrator dashboard.

Weather and disease-risk information is informational, not a diagnosis. Mapped field areas are estimates and are not official survey boundaries.

## Requirements

- Python 3.10 or later
- Node.js and npm
- PostgreSQL

## Local setup

### 1. Create the PostgreSQL database

Create a database named `smart_crop` in your local PostgreSQL instance. The backend creates its application tables automatically; `database/schema.sql` is available if you prefer to create the tables manually.

### 2. Configure and start the backend

Create `backend/.env` and set your PostgreSQL connection string and local application secrets:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<your-postgres-password>@localhost:5432/smart_crop
JWT_SECRET=<a-long-random-secret>
ADMIN_EMAIL=admin@smartcrop.com
ADMIN_PASSWORD=<choose-a-strong-password>
```

Replace the placeholder values. URL-encode special characters in the PostgreSQL password if needed. The backend has development defaults for these settings, but you should set your own values, especially `JWT_SECRET` and `ADMIN_PASSWORD`, before using the application beyond local development.

In a terminal, run:

```bat
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

On its first startup, the backend creates the configured administrator account if it does not already exist. It also creates the application tables and loads `Smart_Crop_PostgreSQL_Cleaned.csv` when the `crop_records` table is empty. The PostgreSQL database itself must exist before starting the backend.

Verify the backend at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). Interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Start the frontend

In a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173). The frontend uses `http://127.0.0.1:8000` as its API URL by default. To change it, set `VITE_API_URL` in the frontend environment.

## Accounts

- The administrator email and password are configured with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`. The configured administrator is created on backend startup if it does not exist. A password changed in the app is not reset on subsequent startups.
- Farmers can create accounts through registration.
- To create the optional local demo farmer account, run `python seed.py` from `backend`. This script also resets the administrator password to the configured `ADMIN_PASSWORD`; do not run it if you need to preserve an administrator password changed in the app.
- To explicitly create or reset the administrator account, run `python reset_admin.py` from `backend`. This uses the configured credentials unless command-line options are supplied.

## Weather configuration

The frontend uses Open-Meteo by default and does not require an API key. To configure another supported weather provider, set the Vite environment variables `VITE_WEATHER_API_URL` and, if required, `VITE_WEATHER_API_KEY`.
