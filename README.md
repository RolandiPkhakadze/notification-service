# Notification Service

A multi-channel notification REST API built with NestJS. Sends emails, SMS, and push notifications through a single unified API with automatic retries, status tracking, and template support.

## Architecture

```
HTTP Request
     |
     v
NestJS Controller
     |
     v
NotificationsService --> Save to DB (status: pending)
     |
     v
NotificationSender (async, fire-and-forget)
     |
     |-- EmailService (SendGrid)
     |-- SmsService (Twilio)
     +-- PushService (Firebase FCM)
              |
              v
       Update DB (status: sent / failed)
              |
              v
       SendGrid Webhook --> Update DB (status: delivered / failed)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Node.js 20) |
| Language | TypeScript |
| Database | PostgreSQL + TypeORM |
| Email | SendGrid |
| SMS | Twilio |
| Push | Firebase Admin SDK (FCM) |
| Docs | Swagger / OpenAPI |
| Containers | Docker + Docker Compose |
| Deployment | AWS ECS Fargate + RDS + CloudFront |

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker + Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your credentials (see [Environment Variables](#environment-variables) below).

### 3. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 4. Start the app

```bash
pnpm start:dev
```

The app runs at `http://localhost:3000`.
Swagger docs at `http://localhost:3000/api/docs`.

### Run with Docker (all services)

```bash
docker compose up --build
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | App port (default: 3000) |
| `CORS_ORIGIN` | Comma-separated allowed origins (default: `*`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `DB_SSL` | Enable SSL for database (set `true` for AWS RDS) |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Verified sender email |
| `SENDGRID_WEBHOOK_SECRET` | Webhook signing secret |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key (with `\n` escaped) |

## API Endpoints

### Notifications

#### `POST /notifications/email` — Send a single email

```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "html": "<h1>Hello, welcome aboard!</h1>",
  "userId": "optional-user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string (email) | Yes | Recipient email address |
| `subject` | string | Yes | Email subject line |
| `text` | string | No | Plain text body |
| `html` | string | No | HTML body |
| `userId` | UUID | No | Associate with a user for tracking |

---

#### `POST /notifications/email/template` — Send email using a saved template

```json
{
  "to": "user@example.com",
  "templateName": "welcome_email",
  "variables": { "name": "John" },
  "userId": "optional-user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string (email) | Yes | Recipient email address |
| `templateName` | string | Yes | Name of a saved template |
| `variables` | object | No | Key-value pairs to replace `{{placeholders}}` in the template |
| `userId` | UUID | No | Associate with a user for tracking |

---

#### `POST /notifications/sms` — Send a single SMS

> **Note:** Twilio trial accounts can only send SMS to verified phone numbers. The screenshots below demonstrate this endpoint working with a verified number.

```json
{
  "to": "+14155552671",
  "body": "Your verification code is 123456",
  "userId": "optional-user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Phone number in E.164 format (e.g. `+1415...`) |
| `body` | string | Yes | SMS message content |
| `userId` | UUID | No | Associate with a user for tracking |

<!-- ![SMS endpoint screenshot](screenshots/sms-send.png) -->

---

#### `POST /notifications/push` — Send a push notification

Either `token` (single device) or `topic` (broadcast) is required.

```json
{
  "token": "device-fcm-token",
  "title": "New message",
  "body": "You have a new message from John",
  "data": { "orderId": "123" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Conditional | FCM device token (required if no `topic`) |
| `topic` | string | Conditional | FCM topic name (required if no `token`) |
| `title` | string | Yes | Notification title |
| `body` | string | Yes | Notification body |
| `data` | object | No | Custom key-value payload |
| `userId` | UUID | No | Associate with a user for tracking |

The Swagger UI at `/api/docs` includes a built-in **Push Notification Tester** that lets you obtain an FCM token and receive push notifications directly in the browser (requires HTTPS).

---

#### `POST /notifications/bulk` — Send notifications to multiple users

```json
{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "channel": "email",
  "subject": "Flash sale!",
  "message": "<p>50% off today only</p>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userIds` | UUID[] | Yes | Array of user IDs to notify |
| `channel` | enum | Yes | `email`, `sms`, or `push` |
| `message` | string | Yes | Notification content |
| `subject` | string | No | Subject line (used for email/push) |
| `data` | object | No | Custom data payload (push only) |

---

#### `GET /notifications/:id` — Get notification status

Returns the current status and delivery details of a single notification.

#### `GET /notifications/user/:userId` — Get user's notification history

Returns all notifications for a user, sorted by newest first.

#### `GET /notifications/bulk/:bulkId/status` — Get bulk send progress

Returns a summary with counts per status:

```json
{
  "bulkId": "...",
  "total": 3,
  "sent": 2,
  "delivered": 0,
  "failed": 1,
  "pending": 0
}
```

---

### Templates

#### `POST /templates` — Create a notification template

```json
{
  "name": "welcome_email",
  "channel": "email",
  "subject": "Welcome, {{name}}!",
  "body": "<h1>Hi {{name}}, thanks for signing up.</h1>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique template identifier |
| `channel` | enum | Yes | `email`, `sms`, or `push` |
| `subject` | string | No | Template subject (supports `{{variables}}`) |
| `body` | string | Yes | Template body (supports `{{variables}}`) |

#### `GET /templates` — List all templates

#### `GET /templates/:id` — Get template by ID

---

### Webhooks

#### `POST /webhooks/sendgrid` — SendGrid delivery events

Receives delivery status updates from SendGrid. Requires valid webhook signature headers. Updates notification status automatically:

| SendGrid Event | Notification Status |
|----------------|-------------------|
| `delivered` | `delivered` |
| `bounce` / `blocked` / `dropped` | `failed` |
| `open` / `click` | metadata updated |

---

### Health

#### `GET /health` — Service health check

```json
{
  "status": "ok",
  "database": { "status": "up" },
  "firebase": { "status": "up", "projectId": "..." }
}
```

Returns `"ok"` when all services are healthy, `"degraded"` if any check fails. Firebase status is cached for 60 seconds.

## Retry Logic

Every notification is processed asynchronously with automatic retries:

1. Saved to the database with status `pending`
2. Sent in the background (fire-and-forget)
3. On failure, retried with exponential backoff

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 second |
| 2nd retry | 2 seconds |
| 3rd retry | 4 seconds |

After 3 failures the notification is marked `failed` in the database.

## Database Schema

**users** — `id`, `email`, `phone`, `fcmToken`, `createdAt`

**notifications** — `id`, `userId`, `channel`, `status`, `provider`, `providerMessageId`, `bulkId`, `errorMessage`, `metadata`, `createdAt`, `updatedAt`

**notification_templates** — `id`, `name`, `channel`, `subject`, `body`, `createdAt`

**Statuses:** `pending` -> `sent` -> `delivered` / `failed`

## Deployment (AWS)

This service is deployed on:

- **ECS Fargate** — runs the app container
- **RDS PostgreSQL** — managed database
- **ECR** — Docker image registry
- **CloudFront** — HTTPS termination + CDN

Steps:
1. Build and push Docker image to ECR
2. Create ECS task definition with environment variables
3. Deploy service on Fargate with an ALB
4. Point task definition to your RDS endpoint
5. Create a CloudFront distribution in front of the ALB for HTTPS
6. Set `NODE_ENV=production` (disables TypeORM `synchronize`)
