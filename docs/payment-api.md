# Credit Payment API

The payment API is implemented as the `apps.payments` Django app in the existing commerce backend. It reuses Django users and the store's `ProductVariant` records; it has its own wallet, session, order, webhook, and delivery models. It is an API/module boundary in the current monolith, not a separately deployed process or database.

## First Run

Run migrations, then seed the local payment demo account and products:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py seed_payments
```

Demo login: `credits-demo` / `credits123`, with 5,000 credits. The seed command adds Starter Digital Key (100 credits) and Premium Digital Key (250 credits). New Django users receive a 5,000-credit wallet at account creation; the migration backfills existing users and writes a seed ledger entry.

Credit prices are server-owned. Existing variant prices migrate at one credit per whole PHP, rounded up. New variants use the same conversion. Checkout accepts a variant ID as `productId`; the client cannot submit a price or balance.

## Configuration

The default provider is `custom`. Set these variables in the backend environment:

```dotenv
PAYMENT_PROVIDER=custom
GATEWAY_WEBHOOK_SECRET=<random-secret>
EMAIL_API_BASE_URL=https://email-api.example
EMAIL_API_KEY=<service-token>
DIGITAL_KEY_ENCRYPTION_KEY=<Fernet-url-safe-base64-key>
```

Generate a Fernet key with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. If the encryption key is omitted, the implementation derives one from Django's `SECRET_KEY`; production deployments should set a dedicated key and protect it independently.

For PayMongo test mode:

```dotenv
PAYMENT_PROVIDER=paymongo
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...
```

The app refuses to start with a live PayMongo key. The checkout uses PayMongo Hosted Checkout v2 and returns its hosted URL directly. Register the webhook at `{BACKEND_PUBLIC_URL}/api/webhooks/payment/paymongo/` for `checkout_session.payment.paid` and payment-failed events. The request-signature verifier expects `Paymongo-Signature` with `t` and `te`/`li` components.

The local database defaults to SQLite. Set `DATABASE_ENGINE=postgres` and the `DATABASE_*` variables in `core/settings.py` for PostgreSQL. SQLite does not provide `SELECT FOR UPDATE`; use PostgreSQL to rely on row locks under concurrent webhook delivery.

For local development, the frontend calls same-origin `/api` routes and Vite proxies them to `PAYMENT_API_PROXY_TARGET`, defaulting to `http://127.0.0.1:8000`. Run the Django API on that port, or set `PAYMENT_API_PROXY_TARGET` to its actual address. For a deployed frontend/API split, set `VITE_API_BASE_URL` to the deployed API base URL and configure its CORS policy to allow the frontend origin and `Idempotency-Key` header.

## Email API

No separate Email API client or deployed-service contract was present in the repository. The client therefore uses the contract from the implementation request: `POST {EMAIL_API_BASE_URL}/api/emails/send`, bearer authorization, an `Idempotency-Key` header, and the same `idempotencyKey` in JSON. The raw key is decrypted only to construct this outbound request; it is not included in API responses or logs. Email errors are recorded after the payment transaction and can be retried without another credit debit.

The external Email API must honor that idempotency key to deduplicate delivery. One encrypted key is generated per purchased unit and all keys are included in one order-level email. When the Email API URL/key are absent, delivery falls back to the existing Gmail SMTP integration using `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` on SSL port 465, with STARTTLS port 587 as fallback. If neither transport is configured or both fail, the order remains paid and delivery is recorded as failed; resend retries delivery without charging credits again.

## Endpoints

- `GET /api/products/` includes `price_credits` for active variants.
- `GET /api/wallet/` returns the authenticated user's credit balance.
- `POST /api/checkout/` takes `{ "productId": <variantId>, "quantity": 1 }` and requires `Idempotency-Key` and a bearer access token.
- `GET /api/checkout/{sessionId}/` returns an owner-only session summary.
- `POST /api/webhooks/payment/{provider}/` verifies and deduplicates provider events.
- Custom gateway: `GET /api/gateway/sessions/{sessionId}/` and `POST /api/gateway/sessions/{sessionId}/simulate-payment/`.
- `GET /api/orders/{orderId}/` returns order and delivery status, never the raw key.
- `POST /api/orders/{orderId}/resend-key-email/` retries failed email delivery with the original idempotency key.

Each checkout session represents one product variant and quantity. The existing cart UI starts a separate checkout for one cart line at a time; remaining lines stay in the cart.

## Tests

Run payment, account, and legacy-order tests with:

```powershell
..\venv\Scripts\python.exe manage.py test apps.payments.tests apps.accounts.tests apps.orders.tests
```

The provider flow tests mock PayMongo HTTP and Email API delivery. The concurrent webhook test is skipped on SQLite and runs on a database with `SELECT FOR UPDATE` support.