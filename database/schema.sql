CREATE TABLE IF NOT EXISTS crop_records (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    season VARCHAR(50),
    irrigation VARCHAR(100),
    farming_type VARCHAR(100),
    area_ha NUMERIC(12,2),
    rainfall_mm NUMERIC(12,2),
    temperature_c NUMERIC(8,2),
    humidity NUMERIC(8,2),
    soil_type VARCHAR(100),
    net_irrigated_area NUMERIC(12,2),
    groundwater_pre NUMERIC(12,2),
    groundwater_post NUMERIC(12,2),
    recommended_n NUMERIC(12,2),
    recommended_p NUMERIC(12,2),
    recommended_k NUMERIC(12,2),
    yield_kg_ha NUMERIC(12,2),
    taluk_avg_yield_kg_ha NUMERIC(12,2)
);
CREATE INDEX IF NOT EXISTS idx_crop_records_lookup ON crop_records (district, taluk, year, crop);

CREATE TABLE IF NOT EXISTS updates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS field_plots (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_name VARCHAR(120) NOT NULL,
    plot_name VARCHAR(120) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    boundary JSON NOT NULL,
    area_ha DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_field_plots_owner ON field_plots (owner_id);

CREATE TABLE IF NOT EXISTS plot_seasons (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES field_plots(id) ON DELETE CASCADE,
    crop VARCHAR(100) NOT NULL,
    season VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plot_seasons_plot ON plot_seasons (plot_id);
