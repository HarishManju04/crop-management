# Smart Crop PostgreSQL Integration

## 1. Backend environment
Copy `backend/.env.example` to `backend/.env` and replace `YOUR_POSTGRES_PASSWORD` with the password for your local PostgreSQL `postgres` user.

Example:
`DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/smart_crop`

## 2. Database
The database must contain the `public.crop_records` table populated with `Smart_Crop_PostgreSQL_Cleaned.csv`.
You can also run `database/schema.sql` to create the table and lookup index.

## 3. Backend
From `backend`:

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Check: `http://127.0.0.1:8000/health`

## 4. Frontend
From `frontend`:

```bash
npm install
npm run dev
```

The frontend uses `VITE_API_URL=http://127.0.0.1:8000`.

## 5. New application flow
The Village field has been removed. The dashboard now uses:

**District → Taluk → Year → Crop → PostgreSQL record**

The selected record is displayed in the dashboard and can be exported as a Word report using the **Generate Word Report** button.

## 6. ML leakage protection
`taluk_avg_yield_kg_ha` remains in PostgreSQL for reporting, but it is intentionally not used by the dashboard's database API as an ML feature. Keep it excluded when training the yield model unless it is recomputed using training-only data.

## 7. Farmer dashboard updates
Administrators can create, edit, publish/unpublish, and delete announcements from **Admin Dashboard → Updates**. Updates are stored in the PostgreSQL `updates` table (also created automatically when the backend starts). To create it manually, run `database/schema.sql`.

Published updates appear in **Updates for Farmers** on the signed-in user dashboard. Drafts are only visible to administrators. Admin write operations require an administrator login; farmers can only read published updates.

## 8. Bhumi survey link and disease prevention
The Disease Risk & Prevention card links to [Karnataka Land Records Service 2](https://landrecords.karnataka.gov.in/Service2/) and shows general prevention tips for supported crops selected in the dashboard. It also displays an approximate taluk-level weather indicator using current humidity and rainfall. This is not parcel-level survey data or a disease diagnosis. The portal opens in a separate tab; the app does not import survey records, since no public API or authorized data feed is configured.

## 9. Farmer field mapping and crop history
Open **Field Mapping** in the farmer dashboard to draw a plot boundary on the map or upload a GeoJSON Polygon, register its farm/grower, plot name, location, and current crop season, and view a calculated area in hectares. Add later crop seasons to maintain a rotation history. Plot boundaries and records are stored in PostgreSQL and are private to the owning farmer account. The `field_plots` and `plot_seasons` tables are created automatically by the backend; `database/schema.sql` also defines them for manual setup. Map-drawn acreage is an estimate and is not an official cadastral/survey boundary.
