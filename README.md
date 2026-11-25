# PixelPink E-Commerce

PixelPink is a full-stack digital key storefront built with **React + Vite (TypeScript)** and **Django REST Framework**. Buyers sign in with Google OAuth or standard credentials, verify their billing address on an interactive map, pay using wallet credits at checkout, and receive their digital activation keys via Gmail SMTP.

---

## Features

- **Authentication:** Google OAuth 2.0 (GSI), custom registration (Customer / Seller), and JWT (`djangorestframework-simplejwt`).
- **Storefront & Inventory:** Product catalog, search, multi-variant pricing, and automatic stock decrementing upon purchase.
- **Cart & Credit Wallet:** Persistent shopping cart, credit balance tracking, and idempotent checkout sessions.
- **Billing Address Verification:** Interactive OpenStreetMap (Nominatim) geocoding and Leaflet map on the payment confirmation screen, included in the email receipt.
- **Email Delivery:** Transactional HTML receipts with digital keys sent via Python `smtplib` (`SMTP_SSL` port 465 with `STARTTLS` port 587 fallback).
- **Order History & 3-Day Refund Policy:** Buyers can view orders and request a refund within 72 hours of purchase (returns credits to the wallet, invalidates digital keys, and restores stock).
- **Seller Center:** Full CRUD management for vendor products and nested variations.

---

## 1. Prerequisites (On the Target Machine / VM)

- **Python** 3.10 or newer (with `pip` and `venv`)
- **Node.js** 20.19+ or 22.12+ (required by Vite 8)
- **npm** (included with Node.js)
- **Google OAuth** Client ID & Secret
- **Gmail App Password** (for SMTP email delivery)

The database is **SQLite** (`backend/db.sqlite3`), so no external database server (PostgreSQL/MySQL) is required.

---

## 2. Transferring Everything to Another Device / Virtual Machine

To clone your exact setup (all users, vendors, products, digital keys, orders, and wallet balances) onto a VM or another PC:

1. **Stop the running servers** (`Ctrl + C` in both terminals) on the source machine so `backend/db.sqlite3` is cleanly flushed.
2. **Copy the project folder** to the VM (via USB, shared folder, `scp`, or Git + manual file copy), **excluding** `backend/venv/` and `node_modules/` (these must be reinstalled on the target OS).
3. **Copy these 3 untracked/local files** into the exact same paths on the VM:
   - `backend/db.sqlite3` *(your entire SQLite database)*
   - `backend/.env` *(backend secrets & API keys)*
   - `.env.local` *(frontend Google Client ID)*

> **Never commit** `.env`, `.env.local`, or real passwords/API keys to a public repository.

---

## 3. Backend Setup (On the VM)

### Windows (PowerShell)
```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Linux / Ubuntu VM (Bash)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

### Environment Configuration (`backend/.env`)

If you did not copy `backend/.env` from the source machine, create it with your own values:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

### Database Options

- **Option A — Keep Existing Data (Recommended for VM Transfer):**
  If you copied `backend/db.sqlite3` from the original device, simply run `migrate` (to ensure schema is up to date) and **do not** run `seed`:
  ```bash
  python manage.py migrate
  ```

- **Option B — Fresh Demo Database:**
  If starting with an empty database on the new device, run migrations and seed the default catalog/accounts:
  ```bash
  python manage.py migrate
  python manage.py seed
  ```
  > **Warning:** `python manage.py seed` resets the product catalog and digital-key inventory.

- **Option C — Export/Import via JSON Fixtures (Alternative):**
  On the source device: `python manage.py dumpdata --exclude auth.permission --exclude contenttypes --indent 2 > backup.json`
  On the VM: `python manage.py migrate` then `python manage.py loaddata backup.json`.

### Start the Backend Server
```bash
python manage.py runserver 127.0.0.1:8000
```
Keep this terminal running. The backend API is available at `http://127.0.0.1:8000` and Django Admin at `http://127.0.0.1:8000/admin/`.

---

## 4. Frontend Setup (On the VM)

Open a **second terminal** in the project root:

```bash
npm install
```

### Environment Configuration (`.env.local`)

If you did not copy `.env.local` from the source machine, create it in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Start the Frontend Dev Server
```bash
npm run dev
```

Vite runs at [http://localhost:8443](http://localhost:8443) and proxies `/api` requests to Django on port `8000`. (If hosting the API elsewhere, set `PAYMENT_API_PROXY_TARGET` to the API origin.)

> **VM Browser Note:** Open the app inside the VM's browser at `http://localhost:8443` so Google OAuth recognizes the authorized origin (`localhost:8443`).

---

## 5. How to Test

1. Open [http://localhost:8443](http://localhost:8443).
2. Click **Log in** to sign in with **Continue with Google**, use a demo account below, or click **Sign Up** to register a new Customer or Seller account.
3. Browse the catalog, select a product variant, and click **Buy Now** or add it to your cart and proceed to checkout.
4. On the payment confirmation page, enter an address under **Billing Address Verification** and click **Verify Address** to locate it on the map and populate the billing fields.
5. Click **Confirm and simulate payment**. Credits are deducted, the digital key is generated/claimed, stock is updated, and an HTML receipt (including the verified billing address and 3-day refund policy) is sent to your account email.
6. Visit **My Orders** to view your purchase or test **Request Refund** (available for orders within 72 hours of purchase).
7. Log in as a seller to access the **Seller Center** and test creating, editing, or deleting products and variations.

---

## 6. Demo Accounts (Seeded Fallback)

| Role     | Username    | Password      |
|----------|-------------|---------------|
| Customer | `customer`  | `customer123` |
| Seller   | `gamehub`   | `vendor123`   |
| Seller   | `topup`     | `vendor123`   |
| Seller   | `codevault` | `vendor123`   |
| Admin    | `admin`     | `admin123`    |
