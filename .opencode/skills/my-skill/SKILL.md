---
name: my-skill
description: Enforces coding standards and reviews ecommerce API endpoints for quality, security, and consistency. Use when the user asks for a code review or wants to check API code.
---

# Ecommerce Code Review Workflow

When reviewing code for this ecommerce project, always check:

1. **Input validation**: All API inputs are validated (no trusting raw request bodies).
2. **Error handling**: Every endpoint returns proper HTTP status codes (400, 401, 404, 500).
3. **Secrets**: No API keys or passwords are hardcoded—they come from environment variables.
4. **Database queries**: No raw SQL string concatenation (use parameterized queries / ORM).
5. **Consistency**: Response shapes follow the pattern `{ success, data, error }`.

Report findings as a numbered list with the file and line number.