# Smart Crop - Admin Login Fixed & Upgraded

## Admin login fix

The previous version could show `admin@smartcrop.com` but still reject the password when an older PostgreSQL row already existed with a different password. This version adds an explicit admin credential reset script.

### 1. Create `backend/.env`

Copy `backend/.env.example` to `backend/.env` and set your PostgreSQL password.

Use these development admin credentials unless you change them:

- **Admin ID:** `admin@smartcrop.com`
- **Password:** `Admin@2026`

Do not put quotes around the values.

### 2. Install backend packages

Open Command Prompt in the `backend` folder:

```bat
python -m pip install -r requirements.txt
```

### 3. Reset/create the admin account

Run this once whenever you need to create or recover the administrator login:

```bat
python reset_admin.py
```

It will create the account if missing, or reset the existing admin password and role.

Expected output includes:

```text
ADMIN ACCOUNT READY
Admin ID : admin@smartcrop.com
Password : Admin@2026
Role     : admin
```

### 4. Start the backend

```bat
python -m uvicorn main:app --reload
```

Check:

`http://127.0.0.1:8000/health`

It should return a database-connected response.

### 5. Start the frontend

In a second Command Prompt:

```bat
cd ..\frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

`http://localhost:5173`

Select **Admin Login** and enter:

- Email: `admin@smartcrop.com`
- Password: `Admin@2026`

## If you changed the password

The Admin Dashboard has **Security → Change administrator password**. After changing it, log in using the new password.

If you forget the new password, run:

```bat
cd backend
python reset_admin.py
```

That restores the credentials configured in `backend/.env`.

## Important

`seed.py` now also synchronizes the configured admin password when you intentionally run:

```bat
python seed.py
```

The normal backend startup does **not** reset an administrator password, so a password changed from the Admin Dashboard will remain changed across restarts.

The password is stored as a bcrypt hash; the API does not return the plaintext password.

## Farmer account

- Email: `farmer@smartcrop.com`
- Password: `user123`

Registration creates normal farmer/user accounts only.
