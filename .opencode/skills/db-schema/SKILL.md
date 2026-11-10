---
name: db-schema
description: Designs and modifies the ecommerce database schema for products, categories, orders, and users. Use when the user asks to create or change data models.
---

# Database Schema Rules

When designing schema:

1. Every table has `id`, `created_at`, `updated_at`.
2. Use foreign keys with proper `ON DELETE` behavior (RESTRICT for orders, CASCADE for cart items).
3. Money is stored as integer cents—never floats.
4. Product images and variants are separate tables, not JSON blobs.
5. Orders snapshot product name and price at time of purchase.
6. Add indexes on foreign keys and any column used in filters (slug, email, status).