# PixelPink E-Commerce

PixelPink is a full-stack digital key storefront built with **React + Vite (TypeScript)** and **Django REST Framework**. Buyers sign in with Google OAuth or standard credentials, verify their billing address on an interactive map, pay using wallet credits at checkout, and receive their digital activation keys via Gmail SMTP.

---

## Features

- **Authentication:** Google OAuth 2.0 (GSI) and username/password login with JWT (`djangorestframework-simplejwt`).
- **Storefront & Inventory:** Product catalog, search, multi-variant pricing, and automatic stock decrementing upon purchase.
- **Cart & Credit Wallet:** Persistent shopping cart, credit balance tracking, and idempotent checkout sessions.
- **Billing Address Verification:** Interactive OpenStreetMap (Nominatim) geocoding and Leaflet map on the payment confirmation screen, included in the email receipt.
- **Email Delivery:** Transactional HTML receipts with digital keys sent via Python `smtplib` (`SMTP_SSL` port 465 with `STARTTLS` port 587 fallback).
- **Order History & 3-Day Refund Policy:** Buyers can view orders and request a refund within 72 hours of purchase (returns credits to the wallet, invalidates digital keys, and restores stock).
- **Seller Center:** Full CRUD management for vendor products and nested variations.

---

## 1. Prerequisites

- **Python** 3.10 or newer
- **Node.js** 20.19+ or 22.12+ (required by Vite 8)
- **npm** (included with Node.js)
- **Google OAuth** Client ID & Secret
- **Gmail App Password** (for SMTP email delivery)

The local database uses **SQLite**, so no separate database server is required.

---

## 2. Backend Setup

Open PowerShell in the project root and set up the virtual environment:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Environment Configuration (`backend/.env`)

Ensure `backend/.env` exists. If setting up from scratch, create `backend/.env` with your own values (never commit real secrets or passwords):

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

### Database & Server

Apply migrations, seed demo data, and start the Django server:

```powershell
python manage.py migrate
python manage.py seed
python manage.py runserver
```

> **Note:** `python manage.py seed` is intended for local development and resets the product catalog and digital-key inventory.

Keep this terminal running. The backend API is available at `http://127.0.0.1:8000`.

---

## 3. Frontend Setup

Open a new PowerShell terminal in the project root:

```powershell
npm install
```

### Environment Configuration (`.env.local`)

Ensure `.env.local` exists in the project root with your Google Client ID:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Start the Vite development server:

```powershell
npm run dev
```

Vite runs at [http://localhost:8443](http://localhost:8443) and proxies `/api` requests to Django on port `8000`. (If hosting the API elsewhere, set `PAYMENT_API_PROXY_TARGET` to the API origin.)

---

## 4. How to Test

1. Open [http://localhost:8443](http://localhost:8443).
2. Click **Log in** and sign in with **Continue with Google** (ensure `http://localhost:8443` is an authorized origin in your Google OAuth client) or use a demo account below.
3. Browse the catalog, select a product variant, and click **Buy Now** or add it to your cart and proceed to checkout.
4. On the payment confirmation page, enter an address under **Billing Address Verification** and click **Verify Address** to locate it on the map and populate the billing fields.
5. Click **Confirm and simulate payment**. Credits are deducted, the digital key is generated/claimed, stock is updated, and an HTML receipt (including the verified billing address and 3-day refund policy) is sent to your account email.
6. Visit **My Orders** to view your purchase or test **Request Refund** (available for orders within 72 hours of purchase).
7. Log in as a seller to access the **Seller Center** and test creating, editing, or deleting products and variations.

---

## 5. Demo Accounts (Fallback)

| Role     | Username   | Password      |
|----------|------------|---------------|
| Customer | `customer` | `customer123` |
| Seller   | `gamehub`  | `vendor123`   |
| Seller   | `topup`    | `vendor123`   |
| Seller   | `codevault`| `vendor123`   |
