import os
from math import sin
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name(".env"))

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, String, DateTime, Integer, Text, Boolean, Float, ForeignKey, JSON, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, sessionmaker
from io import BytesIO

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/smart_crop",
)
JWT_SECRET = os.getenv("JWT_SECRET", "smart-crop-dev-secret-change-me")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@smartcrop.com").lower().strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@2026")
ADMIN_NAME = os.getenv("ADMIN_NAME", "System Admin")
origins = [
    x.strip()
    for x in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if x.strip()
]

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class Update(Base):
    __tablename__ = "updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class FieldPlot(Base):
    __tablename__ = "field_plots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    farm_name: Mapped[str] = mapped_column(String(120), nullable=False)
    plot_name: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    taluk: Mapped[str] = mapped_column(String(100), nullable=False)
    boundary: Mapped[dict] = mapped_column(JSON, nullable=False)
    area_ha: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class PlotSeason(Base):
    __tablename__ = "plot_seasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("field_plots.id", ondelete="CASCADE"), index=True, nullable=False)
    crop: Mapped[str] = mapped_column(String(100), nullable=False)
    season: Mapped[str] = mapped_column(String(50), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


Base.metadata.create_all(bind=engine)

# Ensure the crop table exists even when schema.sql has not been run manually.
with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS crop_records (
            id SERIAL PRIMARY KEY, year INTEGER NOT NULL, district VARCHAR(100) NOT NULL,
            taluk VARCHAR(100) NOT NULL, crop VARCHAR(100) NOT NULL, season VARCHAR(50),
            irrigation VARCHAR(100), farming_type VARCHAR(100), area_ha NUMERIC(12,2),
            rainfall_mm NUMERIC(12,2), temperature_c NUMERIC(8,2), humidity NUMERIC(8,2),
            soil_type VARCHAR(100), net_irrigated_area NUMERIC(12,2), groundwater_pre NUMERIC(12,2),
            groundwater_post NUMERIC(12,2), recommended_n NUMERIC(12,2), recommended_p NUMERIC(12,2),
            recommended_k NUMERIC(12,2), yield_kg_ha NUMERIC(12,2), taluk_avg_yield_kg_ha NUMERIC(12,2)
        )
    """))

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)
app = FastAPI(title="Smart Crop API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class UpdateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    body: str = Field(min_length=1, max_length=5000)
    category: str = Field(default="General", min_length=1, max_length=50)
    is_published: bool = True


class PlotCreateRequest(BaseModel):
    farm_name: str = Field(min_length=2, max_length=120)
    plot_name: str = Field(min_length=2, max_length=120)
    district: str = Field(min_length=2, max_length=100)
    taluk: str = Field(min_length=2, max_length=100)
    boundary: dict
    crop: str = Field(min_length=1, max_length=100)
    season: str = Field(min_length=1, max_length=50)
    year: int = Field(ge=1900, le=2200)
    notes: str | None = Field(default=None, max_length=2000)


class PlotSeasonRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=100)
    season: str = Field(min_length=1, max_length=50)
    year: int = Field(ge=1900, le=2200)
    notes: str | None = Field(default=None, max_length=2000)


def db_dep():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def token_for(u):
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": str(u.id), "role": u.role, "exp": exp},
        JWT_SECRET,
        algorithm="HS256",
    )


def current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(db_dep),
):
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(
            creds.credentials, JWT_SECRET, algorithms=["HS256"]
        )
        uid = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(401, "Invalid or expired token")

    u = db.get(User, uid)
    if not u:
        raise HTTPException(401, "User not found")
    return u


def ensure_admin_account():
    """Create the configured admin account if it does not exist.

    This runs whenever the API starts, so a fresh database does not require
    manually running seed.py before Admin Login can work.
    """
    db = SessionLocal()
    try:
        email = ADMIN_EMAIL
        admin = db.scalar(select(User).where(User.email == email))
        if not admin:
            db.add(
                User(
                    name=ADMIN_NAME,
                    email=email,
                    password_hash=pwd.hash(ADMIN_PASSWORD),
                    role="admin",
                )
            )
            db.commit()
            print(f"Admin account created: {email}")
        elif admin.role != "admin":
            # Protect against an existing user row with the configured admin email.
            admin.role = "admin"
            db.commit()
            print(f"Existing account promoted to admin: {email}")
    finally:
        db.close()


def ensure_crop_data():
    """Load the bundled CSV automatically when a fresh database has no crop rows."""
    csv_path = Path(__file__).resolve().parents[1] / "Smart_Crop_PostgreSQL_Cleaned.csv"
    if not csv_path.exists():
        return
    db = SessionLocal()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM crop_records")).scalar() or 0
        if count > 0:
            return
        import csv
        numeric = {
            "year": int, "area_ha": float, "rainfall_mm": float, "temperature_c": float,
            "humidity": float, "net_irrigated_area": float, "groundwater_pre": float,
            "groundwater_post": float, "recommended_n": float, "recommended_p": float,
            "recommended_k": float, "yield_kg_ha": float, "taluk_avg_yield_kg_ha": float,
        }
        rows = []
        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                for key, caster in numeric.items():
                    if row.get(key, "") == "":
                        row[key] = None
                    else:
                        row[key] = caster(row[key])
                rows.append(row)
        if rows:
            db.execute(text("""
                INSERT INTO crop_records
                (year,district,taluk,crop,season,irrigation,farming_type,area_ha,rainfall_mm,temperature_c,humidity,soil_type,
                 net_irrigated_area,groundwater_pre,groundwater_post,recommended_n,recommended_p,recommended_k,yield_kg_ha,taluk_avg_yield_kg_ha)
                VALUES
                (:year,:district,:taluk,:crop,:season,:irrigation,:farming_type,:area_ha,:rainfall_mm,:temperature_c,:humidity,:soil_type,
                 :net_irrigated_area,:groundwater_pre,:groundwater_post,:recommended_n,:recommended_p,:recommended_k,:yield_kg_ha,:taluk_avg_yield_kg_ha)
            """), rows)
            db.commit()
            print(f"Loaded {len(rows)} crop records from {csv_path.name}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.on_event("startup")
def startup():
    ensure_admin_account()
    ensure_crop_data()


@app.get("/health")
def health(db: Session = Depends(db_dep)):
    db.execute(select(User).limit(1))
    return {"status": "ok", "database": "connected"}


@app.get("/")
def root():
    return {"message": "Smart Crop FastAPI is running"}


@app.post("/register")
def register(data: RegisterRequest, db: Session = Depends(db_dep)):
    name = data.name.strip()
    email = data.email.lower().strip()
    if len(name) < 2:
        raise HTTPException(400, "Name is required")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must contain at least 6 characters")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    u = User(
        name=name,
        email=email,
        password_hash=pwd.hash(data.password),
        role="user",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"message": "Account created successfully", "id": u.id, "role": "user"}


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(db_dep)):
    email = data.email.lower().strip()
    u = db.scalar(select(User).where(User.email == email))
    if not u or not pwd.verify(data.password, u.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {
        "access_token": token_for(u),
        "token_type": "bearer",
        "role": u.role,
        "user": {
            "id": u.id,
            "name": u.name,
            "email": u.email,
        },
    }


@app.get("/me")
def me(u=Depends(current_user)):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}


@app.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if not pwd.verify(data.current_password, u.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(400, "New password must be different from the current password")
    u.password_hash = pwd.hash(data.new_password)
    db.add(u)
    db.commit()
    return {"message": "Password changed successfully. Please log in again."}


@app.get("/admin/users")
def admin_users(
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "admin":
        raise HTTPException(403, "Admin access required")
    users = db.scalars(select(User).order_by(User.id)).all()
    return {
        "users": [
            {
                "id": x.id,
                "name": x.name,
                "email": x.email,
                "role": x.role,
                "created_at": x.created_at.isoformat() if x.created_at else None,
            }
            for x in users
        ]
    }


def update_response(item: Update):
    return {
        "id": item.id,
        "title": item.title,
        "body": item.body,
        "category": item.category,
        "is_published": item.is_published,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@app.get("/admin/updates")
def admin_updates(
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "admin":
        raise HTTPException(403, "Admin access required")
    items = db.scalars(select(Update).order_by(Update.created_at.desc(), Update.id.desc())).all()
    return {"updates": [update_response(item) for item in items]}


@app.post("/admin/updates")
def create_update(
    data: UpdateRequest,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "admin":
        raise HTTPException(403, "Admin access required")
    item = Update(
        title=data.title.strip(),
        body=data.body.strip(),
        category=data.category.strip(),
        is_published=data.is_published,
    )
    if len(item.title) < 3 or not item.body or not item.category:
        raise HTTPException(400, "Title, content, and category are required")
    db.add(item)
    db.commit()
    db.refresh(item)
    return update_response(item)


@app.put("/admin/updates/{update_id}")
def edit_update(
    update_id: int,
    data: UpdateRequest,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "admin":
        raise HTTPException(403, "Admin access required")
    item = db.get(Update, update_id)
    if not item:
        raise HTTPException(404, "Update not found")
    title = data.title.strip()
    body = data.body.strip()
    category = data.category.strip()
    if len(title) < 3 or not body or not category:
        raise HTTPException(400, "Title, content, and category are required")
    item.title = title
    item.body = body
    item.category = category
    item.is_published = data.is_published
    db.commit()
    db.refresh(item)
    return update_response(item)


@app.delete("/admin/updates/{update_id}")
def delete_update(
    update_id: int,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "admin":
        raise HTTPException(403, "Admin access required")
    item = db.get(Update, update_id)
    if not item:
        raise HTTPException(404, "Update not found")
    db.delete(item)
    db.commit()
    return {"message": "Update deleted successfully"}


@app.get("/updates")
def published_updates(
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    if u.role != "user":
        raise HTTPException(403, "User access required")
    items = db.scalars(
        select(Update)
        .where(Update.is_published.is_(True))
        .order_by(Update.created_at.desc(), Update.id.desc())
    ).all()
    return {"updates": [update_response(item) for item in items]}


def validated_plot_boundary(boundary: dict) -> tuple[dict, float]:
    if boundary.get("type") != "Polygon":
        raise HTTPException(400, "Field boundary must be a GeoJSON Polygon")
    rings = boundary.get("coordinates")
    if not isinstance(rings, list) or len(rings) != 1 or not isinstance(rings[0], list):
        raise HTTPException(400, "Field boundary must contain one exterior polygon ring")

    ring = rings[0]
    if len(ring) < 4 or len(ring) > 1002:
        raise HTTPException(400, "Draw a boundary with at least 3 and no more than 1000 points")
    normalized = []
    for point in ring:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            raise HTTPException(400, "Each boundary point must contain longitude and latitude")
        try:
            longitude, latitude = float(point[0]), float(point[1])
        except (TypeError, ValueError):
            raise HTTPException(400, "Boundary coordinates must be numeric")
        if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            raise HTTPException(400, "Boundary coordinates are outside valid longitude/latitude ranges")
        normalized.append([longitude, latitude])

    if normalized[0] != normalized[-1]:
        raise HTTPException(400, "Field boundary polygon must be closed")
    if len({(point[0], point[1]) for point in normalized[:-1]}) < 3:
        raise HTTPException(400, "Field boundary must have at least 3 distinct points")

    radius = 6378137
    area_square_meters = abs(sum(
        (normalized[(index + 1) % (len(normalized) - 1)][0] - point[0])
        * 0.017453292519943295
        * (
            2
            + sin(point[1] * 0.017453292519943295)
            + sin(
                normalized[(index + 1) % (len(normalized) - 1)][1] * 0.017453292519943295
            )
        )
        for index, point in enumerate(normalized[:-1])
    ) * radius * radius / 2)
    area_hectares = area_square_meters / 10000
    if not 0.001 <= area_hectares <= 100000:
        raise HTTPException(400, "Boundary area must be between 0.001 and 100,000 hectares")
    return {"type": "Polygon", "coordinates": [normalized]}, round(area_hectares, 4)


def field_plot_response(plot: FieldPlot, db: Session):
    seasons = db.scalars(
        select(PlotSeason).where(PlotSeason.plot_id == plot.id)
        .order_by(PlotSeason.year.desc(), PlotSeason.id.desc())
    ).all()
    return {
        "id": plot.id,
        "farm_name": plot.farm_name,
        "plot_name": plot.plot_name,
        "district": plot.district,
        "taluk": plot.taluk,
        "boundary": plot.boundary,
        "area_ha": plot.area_ha,
        "created_at": plot.created_at.isoformat() if plot.created_at else None,
        "updated_at": plot.updated_at.isoformat() if plot.updated_at else None,
        "seasons": [
            {
                "id": season.id,
                "crop": season.crop,
                "season": season.season,
                "year": season.year,
                "notes": season.notes,
                "recorded_at": season.recorded_at.isoformat() if season.recorded_at else None,
            }
            for season in seasons
        ],
    }


def require_farmer(user):
    if user.role != "user":
        raise HTTPException(403, "Farmer account required")


@app.get("/plots")
def list_field_plots(
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    require_farmer(u)
    plots = db.scalars(
        select(FieldPlot).where(FieldPlot.owner_id == u.id).order_by(FieldPlot.created_at.desc())
    ).all()
    return {"plots": [field_plot_response(plot, db) for plot in plots]}


@app.post("/plots")
def create_field_plot(
    data: PlotCreateRequest,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    require_farmer(u)
    boundary, area_ha = validated_plot_boundary(data.boundary)
    plot = FieldPlot(
        owner_id=u.id,
        farm_name=data.farm_name.strip(),
        plot_name=data.plot_name.strip(),
        district=data.district.strip(),
        taluk=data.taluk.strip(),
        boundary=boundary,
        area_ha=area_ha,
    )
    if min(len(plot.farm_name), len(plot.plot_name), len(plot.district), len(plot.taluk)) < 2:
        raise HTTPException(400, "Farm, plot, district, and taluk names are required")
    db.add(plot)
    db.flush()
    crop_history = PlotSeason(
        plot_id=plot.id,
        crop=data.crop.strip(),
        season=data.season.strip(),
        year=data.year,
        notes=data.notes.strip() if data.notes and data.notes.strip() else None,
    )
    if not crop_history.crop or not crop_history.season:
        raise HTTPException(400, "Crop and season are required")
    db.add(crop_history)
    db.commit()
    db.refresh(plot)
    return field_plot_response(plot, db)


@app.post("/plots/{plot_id}/seasons")
def add_plot_season(
    plot_id: int,
    data: PlotSeasonRequest,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    require_farmer(u)
    plot = db.scalar(
        select(FieldPlot).where(FieldPlot.id == plot_id, FieldPlot.owner_id == u.id)
    )
    if not plot:
        raise HTTPException(404, "Field plot not found")
    season = PlotSeason(
        plot_id=plot.id,
        crop=data.crop.strip(),
        season=data.season.strip(),
        year=data.year,
        notes=data.notes.strip() if data.notes and data.notes.strip() else None,
    )
    if not season.crop or not season.season:
        raise HTTPException(400, "Crop and season are required")
    db.add(season)
    db.commit()
    db.refresh(plot)
    return field_plot_response(plot, db)


@app.delete("/plots/{plot_id}")
def delete_field_plot(
    plot_id: int,
    u=Depends(current_user),
    db: Session = Depends(db_dep),
):
    require_farmer(u)
    plot = db.scalar(
        select(FieldPlot).where(FieldPlot.id == plot_id, FieldPlot.owner_id == u.id)
    )
    if not plot:
        raise HTTPException(404, "Field plot not found")
    db.delete(plot)
    db.commit()
    return {"message": "Field plot and crop history deleted successfully"}


# ============================================================
# CROP DATA / POSTGRESQL ENDPOINTS
# ============================================================

CROP_TABLE = "crop_records"


def _rows(db: Session, sql: str, params: dict | None = None):
    result = db.execute(text(sql), params or {})
    return [dict(row._mapping) for row in result]


@app.get("/crop/districts")
def crop_districts(db: Session = Depends(db_dep)):
    return {"districts": [r["district"] for r in _rows(
        db, "SELECT DISTINCT district FROM crop_records WHERE district IS NOT NULL ORDER BY district"
    )]}


@app.get("/crop/taluks")
def crop_taluks(district: str, db: Session = Depends(db_dep)):
    return {"taluks": [r["taluk"] for r in _rows(
        db,
        "SELECT DISTINCT taluk FROM crop_records WHERE district = :district AND taluk IS NOT NULL ORDER BY taluk",
        {"district": district},
    )]}


@app.get("/crop/years")
def crop_years(district: str, taluk: str, db: Session = Depends(db_dep)):
    return {"years": [r["year"] for r in _rows(
        db,
        "SELECT DISTINCT year FROM crop_records WHERE district = :district AND taluk = :taluk ORDER BY year DESC",
        {"district": district, "taluk": taluk},
    )]}


@app.get("/crop/crops")
def crop_crops(district: str, taluk: str, year: int, db: Session = Depends(db_dep)):
    return {"crops": [r["crop"] for r in _rows(
        db,
        "SELECT DISTINCT crop FROM crop_records WHERE district = :district AND taluk = :taluk AND year = :year AND crop IS NOT NULL ORDER BY crop",
        {"district": district, "taluk": taluk, "year": year},
    )]}


@app.get("/crop/data")
def crop_data(district: str, taluk: str, year: int, crop: str, db: Session = Depends(db_dep)):
    rows = _rows(
        db,
        """SELECT year, district, taluk, crop, season, irrigation, farming_type,
                  area_ha, rainfall_mm, temperature_c, humidity, soil_type,
                  net_irrigated_area, groundwater_pre, groundwater_post,
                  recommended_n, recommended_p, recommended_k,
                  yield_kg_ha, taluk_avg_yield_kg_ha
           FROM crop_records
           WHERE district = :district AND taluk = :taluk AND year = :year AND crop = :crop
           LIMIT 1""",
        {"district": district, "taluk": taluk, "year": year, "crop": crop},
    )
    if not rows:
        raise HTTPException(404, "No crop record found for the selected District, Taluk, Year and Crop")
    return rows[0]


@app.get("/crop/history")
def crop_history(
    district: str | None = None,
    taluk: str | None = None,
    crop: str | None = None,
    start_year: int | None = None,
    end_year: int | None = None,
    db: Session = Depends(db_dep),
):
    """Return the complete historical crop dataset for the selected filters."""
    clauses = ["1=1"]
    params = {}
    if district:
        clauses.append("district = :district"); params["district"] = district
    if taluk:
        clauses.append("taluk = :taluk"); params["taluk"] = taluk
    if crop:
        clauses.append("crop = :crop"); params["crop"] = crop
    if start_year is not None:
        clauses.append("year >= :start_year"); params["start_year"] = start_year
    if end_year is not None:
        clauses.append("year <= :end_year"); params["end_year"] = end_year
    rows = _rows(db, f"""
        SELECT id, year, district, taluk, crop, season, irrigation, farming_type,
               area_ha, rainfall_mm, temperature_c, humidity, soil_type,
               net_irrigated_area, groundwater_pre, groundwater_post,
               recommended_n, recommended_p, recommended_k, yield_kg_ha,
               taluk_avg_yield_kg_ha
        FROM crop_records WHERE {' AND '.join(clauses)}
        ORDER BY year DESC, district, taluk, crop
    """, params)
    return {"count": len(rows), "history": rows}

@app.get("/crop/report")
def crop_report(district: str, taluk: str, year: int, crop: str, db: Session = Depends(db_dep)):
    """Generate a Word report from the selected PostgreSQL crop record."""
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(500, "python-docx is not installed. Run: pip install python-docx")

    rows = _rows(
        db,
        """SELECT year, district, taluk, crop, season, irrigation, farming_type,
                  area_ha, rainfall_mm, temperature_c, humidity, soil_type,
                  net_irrigated_area, groundwater_pre, groundwater_post,
                  recommended_n, recommended_p, recommended_k,
                  yield_kg_ha, taluk_avg_yield_kg_ha
           FROM crop_records
           WHERE district = :district AND taluk = :taluk AND year = :year AND crop = :crop
           LIMIT 1""",
        {"district": district, "taluk": taluk, "year": year, "crop": crop},
    )
    if not rows:
        raise HTTPException(404, "No crop record found for the selected values")

    record = rows[0]
    doc = Document()
    doc.add_heading("Smart Crop Management System", 0)
    doc.add_paragraph("Agricultural Data Report")
    doc.add_heading("Selected Location and Crop", level=1)
    table = doc.add_table(rows=0, cols=2)
    table.style = "Table Grid"
    for key in ["district", "taluk", "year", "crop"]:
        cells = table.add_row().cells
        cells[0].text = key.replace("_", " ").title()
        cells[1].text = str(record[key])

    doc.add_heading("Agricultural Details", level=1)
    details = [
        ("Season", record["season"]), ("Irrigation", record["irrigation"]),
        ("Farming Type", record["farming_type"]), ("Area (ha)", record["area_ha"]),
        ("Rainfall (mm)", record["rainfall_mm"]), ("Temperature (°C)", record["temperature_c"]),
        ("Humidity", record["humidity"]), ("Soil Type", record["soil_type"]),
        ("Net Irrigated Area", record["net_irrigated_area"]),
        ("Groundwater Pre", record["groundwater_pre"]), ("Groundwater Post", record["groundwater_post"]),
        ("Recommended N", record["recommended_n"]), ("Recommended P", record["recommended_p"]),
        ("Recommended K", record["recommended_k"]), ("Yield (kg/ha)", record["yield_kg_ha"]),
        ("Taluk Average Yield (kg/ha)", record["taluk_avg_yield_kg_ha"]),
    ]
    table2 = doc.add_table(rows=0, cols=2)
    table2.style = "Table Grid"
    for label, value in details:
        cells = table2.add_row().cells
        cells[0].text = label
        cells[1].text = "" if value is None else str(value)

    doc.add_paragraph("Generated from the Smart Crop PostgreSQL agricultural dataset.")
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    filename = f"Smart_Crop_{district}_{taluk}_{year}_{crop}.docx".replace(" ", "_")
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
