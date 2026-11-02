import argparse
from sqlalchemy import select
from main import Base, User, engine, SessionLocal, pwd, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME

Base.metadata.create_all(bind=engine)

parser = argparse.ArgumentParser(description="Create or reset the Smart Crop administrator account.")
parser.add_argument("--email", default=ADMIN_EMAIL, help="Administrator email")
parser.add_argument("--password", default=ADMIN_PASSWORD, help="Administrator password")
parser.add_argument("--name", default=ADMIN_NAME, help="Administrator display name")
args = parser.parse_args()

email = args.email.lower().strip()
if len(args.password) < 6:
    raise SystemExit("Admin password must contain at least 6 characters.")

db = SessionLocal()
try:
    u = db.scalar(select(User).where(User.email == email))
    if u is None:
        u = User(
            name=args.name.strip() or "System Admin",
            email=email,
            password_hash=pwd.hash(args.password),
            role="admin",
        )
        db.add(u)
        action = "created"
    else:
        u.name = args.name.strip() or u.name
        u.password_hash = pwd.hash(args.password)
        u.role = "admin"
        db.add(u)
        action = "reset"

    db.commit()
    db.refresh(u)
    print("\nADMIN ACCOUNT READY")
    print(f"Action   : {action}")
    print(f"Admin ID : {u.email}")
    print(f"Password : {args.password}")
    print(f"Role     : {u.role}")
    print("\nYou can now log in from the Admin Login page.")
finally:
    db.close()
