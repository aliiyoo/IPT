# PixelPink E-Commerce

PixelPink is a React/Vite storefront backed by Django REST Framework. Buyers sign in with Google, use wallet credits at checkout, and receive digital keys by email after a simulated payment is confirmed.

## 1. Prerequisites

- Python 3.10 or newer.
- Node.js 20.19 or newer (or 22.12 or newer). This project uses Vite 8, which does not support Node 18 even though older Vite versions did.
- npm, included with Node.js.
- Google OAuth credentials supplied with the project configuration.

The local database is SQLite, so no separate database server is required.

## 2. Backend Setup

Open PowerShell in the project root and run:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Verify the supplied backend environment file is present. It contains the project’s Gmail and Google OAuth configuration; do not create or edit it as part of setup.

```powershell
Test-Path .env
```

The command should return `True`. If it returns `False`, the provided environment file is missing from this checkout; restore the supplied file before testing Google login or email delivery. Do not put its secret values in this README or share them in logs.

Apply the database migrations and load the demo catalog and accounts:

```powershell
python manage.py migrate
python manage.py seed
```

> `seed` is intended for a local development database. It resets the product catalog and digital-key inventory.

Start Django on port 8000:

```powershell
python manage.py runserver
```

Keep this terminal running. The API is available at `http://127.0.0.1:8000`.

## 3. Frontend Setup

Open a new PowerShell terminal in the project root:

```powershell
npm install
```

Verify the supplied frontend environment file exists. It contains the Google Client ID; do not create or edit it during setup.

```powershell
Test-Path .env.local
```

The command should return `True`. Start the Vite development server:

```powershell
npm run dev
```

Vite runs at `http://localhost:8443` and proxies `/api` requests to Django on port 8000. If the API is hosted elsewhere, set `PAYMENT_API_PROXY_TARGET` for the Vite process to the API origin.

## 4. How to Test

1. Open [http://localhost:8443](http://localhost:8443).
2. Select **Log in** and continue with Google. The local origin must be authorized for the project’s Google OAuth client.
3. Browse the catalog, open a product, then click **Buy Now** or add it to the cart and check out. The payment page displays the signed-in account name, email, and available credits before confirmation. Creating a checkout session does not deduct credits.
4. Click **Confirm and simulate payment**. The signed webhook processes the payment, deducts credits once, creates the order and digital key, and then attempts email delivery. No real money is charged by the local simulation.
5. Check the Django terminal for the result and the logged-in account’s inbox for the digital key. Gmail delivery uses Python `smtplib` with SSL on port 465 and STARTTLS fallback on port 587 when the external Email API is not configured. If the Email API is configured, it is tried first; failed delivery can be retried from the order page without another credit deduction.

The local payment provider defaults to `CustomProvider`, which simulates the hosted checkout and webhook. If the supplied backend configuration selects PayMongo, use Test Mode keys only; live keys are rejected by the application.

## 5. Demo Accounts (Fallback)

| Role      | Username  | Password      |
|-----------|-----------|---------------|
| Customer  | `customer`| `customer123` |
| Seller    | `gamehub` | `vendor123`   |
| Admin     | `admin`   | `admin123`    |
