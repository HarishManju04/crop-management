from main import Base, User, engine, SessionLocal, pwd, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
from sqlalchemy import select

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# The admin account is intentionally synchronized with ADMIN_* when seed.py is run.
admin_email = ADMIN_EMAIL.lower().strip()
admin = db.scalar(select(User).where(User.email == admin_email))
if not admin:
    admin = User(
        name=ADMIN_NAME,
        email=admin_email,
        password_hash=pwd.hash(ADMIN_PASSWORD),
        role="admin",
    )
    db.add(admin)
    print(f"Created admin: {admin_email}")
else:
    admin.name = ADMIN_NAME
    admin.password_hash = pwd.hash(ADMIN_PASSWORD)
    admin.role = "admin"
    print(f"Reset admin credentials: {admin_email}")

farmer_email = "farmer@smartcrop.com"
farmer = db.scalar(select(User).where(User.email == farmer_email))
if not farmer:
    db.add(User(
        name="Demo Farmer",
        email=farmer_email,
        password_hash=pwd.hash("user123"),
        role="user",
    ))
    print(f"Created user: {farmer_email}")

db.commit()
db.close()

print("\nDemo accounts ready.")
print(f"Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
print("User : farmer@smartcrop.com / user123")
