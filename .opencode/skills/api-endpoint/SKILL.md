---
name: api-endpoint
description: Generates REST API endpoints for the ecommerce backend with validation, error handling, and consistent response shapes. Use when the user asks to create or modify an API route.
---

# API Endpoint Generation

When creating any API endpoint:

1. Validate all request body fields and return 400 with field-level errors if invalid.
2. Use parameterized queries or the ORM—never string-concatenate SQL.
3. Return responses in the shape `{ success: boolean, data?: any, error?: string }`.
4. Use correct HTTP status codes: 200, 201, 400, 401, 403, 404, 500.
5. Never hardcode secrets—read from `process.env`.
6. Add JSDoc or TypeScript types for request and response.