# WhatsAuto API Documentation

## 1. Authentication & Headers

All private API endpoints require a valid Supabase JWT Bearer token in the request headers:
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```
The server validates this token using Supabase Auth SDK and derives the caller's `user_id`. Any client attempt to supply an arbitrary `user_id` in request payloads is ignored.

---

## 2. Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | System liveness probe | No |
| `GET` | `/ready` | Database & provider readiness check | No |
| `GET` | `/api/dashboard/stats` | Aggregated dashboard metrics | Yes |
| `GET` | `/api/devices` | List user's connected WhatsApp devices | Yes |
| `POST` | `/api/devices/connect` | Initialize a device connection session | Yes |
| `DELETE` | `/api/devices/:id` | Disconnect and remove a device session | Yes |
| `GET` | `/api/stories` | List scheduled stories | Yes |
| `POST` | `/api/stories` | Schedule a new story | Yes |
| `PATCH` | `/api/stories/:id` | Update an existing scheduled story | Yes |
| `POST` | `/api/stories/:id/cancel` | Cancel a scheduled story | Yes |
| `GET` | `/api/campaigns` | List message campaigns | Yes |
| `POST` | `/api/campaigns` | Create campaign and queue recipient jobs | Yes |
| `GET` | `/api/queue` | Query paginated message queue | Yes |
| `POST` | `/api/queue/:id/cancel` | Cancel an individual pending queue job | Yes |
| `POST` | `/api/queue/clear-completed` | Clear sent/cancelled jobs | Yes |
| `GET` | `/api/logs` | Fetch paginated delivery audit logs | Yes |
| `POST` | `/api/webhook/whatsapp` | Meta WhatsApp Cloud API status webhook | No (HMAC/Token check) |
| `GET` | `/api/webhook/whatsapp` | Meta Webhook verification handshake | No |

---

## 3. Detailed Endpoint Contracts

### 3.1. System Health
- `GET /health`
  - **Response 200**:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-10-13T12:00:00.000Z",
      "uptimeSeconds": 1420
    }
    ```

- `GET /ready`
  - **Response 200**:
    ```json
    {
      "status": "ready",
      "database": "connected",
      "worker": "active",
      "activeProvider": "cloud_api"
    }
    ```

### 3.2. Dashboard Stats
- `GET /api/dashboard/stats`
  - **Response 200**:
    ```json
    {
      "success": true,
      "data": {
        "connectedDevices": 1,
        "pendingQueue": 14,
        "totalSent": 450,
        "totalFailed": 3,
        "upcomingStories": 2,
        "recentActivity": [ ... ]
      }
    }
    ```

### 3.3. Story Scheduling
- `POST /api/stories`
  - **Request Body**:
    ```json
    {
      "contentType": "image",
      "mediaPath": "user-uuid/story-123.jpg",
      "caption": "New Flash Sale this Friday!",
      "bgColor": "#128C7E",
      "scheduledAt": "2026-10-15T18:00:00.000Z"
    }
    ```
  - **Response 201**:
    ```json
    {
      "success": true,
      "data": {
        "id": "c76f5b90-...",
        "status": "pending",
        "scheduledAt": "2026-10-15T18:00:00.000Z"
      }
    }
    ```

### 3.4. Campaign & CSV Queue Creation
- `POST /api/campaigns`
  - **Request Body**:
    ```json
    {
      "name": "Diwali Offer Broadcast",
      "description": "50% off promo",
      "template": "Hello {name}, your special code is DIWALI50",
      "recipients": [
        { "phoneNumber": "+919876543210", "name": "Rahul" },
        { "phoneNumber": "+919123456789", "name": "Pooja" }
      ],
      "scheduledAt": null
    }
    ```
  - **Response 201**:
    ```json
    {
      "success": true,
      "data": {
        "campaignId": "b182-...",
        "totalQueued": 2,
        "status": "scheduled"
      }
    }
    ```

### 3.5. Meta Webhook Handshake & Ingest
- `GET /api/webhook/whatsapp`
  - Handshake using `hub.mode`, `hub.verify_token`, and `hub.challenge`.
- `POST /api/webhook/whatsapp`
  - Receives delivery receipts (`sent`, `delivered`, `read`, `failed`) and updates `delivery_logs` and `message_queue.status`.
