# WhatsAuto Security Architecture & Policies

## 1. Authentication & Tenant Isolation
- **Client Identity Verification**: The backend server uses the Supabase Auth Admin API to cryptographically verify every request's JWT (`supabase.auth.getUser(token)`). The resulting verified `user.id` is attached to `req.user`.
- **Zero Client Trust**: All SQL queries and storage operations strictly parameterize `user_id = req.user.id`. The backend never accepts a `user_id` passed in query parameters, request bodies, or route params.
- **Database RLS as Defense in Depth**: All Postgres tables enforce Row Level Security (`auth.uid() = user_id`). Even if a raw query were made by a direct client connection using the anon key, rows belonging to other users are completely inaccessible.

---

## 2. Secrets Management & Credential Protection
- **No Client Secrets**: The Supabase Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) and Meta WhatsApp Access Tokens (`WHATSAPP_ACCESS_TOKEN`) are strictly confined to backend `.env` files.
- **Frontend Bundle Sanitization**: The frontend Vite configuration only reads variables prefixed with `VITE_` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`). The Vite production build is inspected to ensure zero server secrets are compiled into the client bundle.
- **Session Credentials**: Session files or pairing tokens from experimental adapters are stored in encrypted or restricted-access server directories (`sessions/` in `.gitignore`), never in public cloud storage or public tables.

---

## 3. Storage Security (`status-media` bucket)
- **Private by Default**: The storage bucket is marked `public = false`.
- **Ownership-Isolated Path Hierarchy**: All uploaded media must follow the pattern: `{user_id}/{filename}`.
- **Storage Policies**: An authenticated user can only perform `INSERT`, `SELECT`, and `DELETE` on objects where the root path matches their `auth.uid()`.
- **Presigned URLs**: Access to media by background workers and preview players uses short-lived Presigned Signed URLs (valid for 15-60 minutes).

---

## 4. Network & Input Sanitization
- **Rate Limiting**: `express-rate-limit` is configured across all API endpoints (e.g. 100 requests per 15 minutes per IP; stricter limits for campaign creation and pairing initiation).
- **Helmet**: Secures HTTP headers against MIME sniffing, clickjacking, and XSS.
- **CORS Policy**: Configured to accept requests strictly from authorized frontend origins (`CORS_ORIGIN`).
- **Sanitized Logging**: Loggers strip phone numbers (masking to `+9198****1210`), access tokens, passwords, and sensitive request payloads before writing to disk or database.
- **Opt-Out Compliance**: Recipient phone numbers marked as opted out in `delivery_logs` or blacklist are systematically excluded before queue processing.
