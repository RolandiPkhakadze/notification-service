# Notification Service

A production-grade multi-channel notification REST API built with NestJS. Sends emails, SMS, and push notifications through a single unified API, using BullMQ + Redis for queue-based processing, PostgreSQL for persistence, and webhook delivery tracking.

## Architecture

```
HTTP Request
     │
     ▼
NestJS Controller
     │
     ▼
NotificationsService ──► Save to DB (status: pending)
     │
     ▼
BullMQ Queue (Redis)
     │
     ▼
NotificationProcessor
     │
     ├──► EmailService (SendGrid)
     ├──► SmsService (Twilio)
     └──► PushService (Firebase FCM)
               │
               ▼
        Update DB (status: sent / failed)
               │
               ▼
        SendGrid Webhook ──► Update DB (status: delivered / failed)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Node.js 20) |
| Language | TypeScript |
| Database | PostgreSQL + TypeORM |
| Queue | BullMQ + Redis |
| Email | SendGrid |
| SMS | Twilio |
| Push | Firebase Admin SDK (FCM) |
| Docs | Swagger / OpenAPI |
| Containers | Docker + Docker Compose |

## Project Structure

```
src/
├── notifications/          # Core module — all notification endpoints
│   ├── dto/                # Request DTOs with validation
│   ├── notifications.controller.ts
│   └── notifications.service.ts
├── channels/
│   ├── email/              # SendGrid integration
│   ├── sms/                # Twilio integration
│   └── push/               # Firebase FCM integration
├── queues/
│   ├── notification.queue.ts       # Job constants and payload types
│   └── notification.processor.ts  # BullMQ worker (retries + backoff)
├── templates/              # Notification template CRUD + rendering
├── webhooks/               # SendGrid event webhooks + signature verification
├── database/
│   └── entities/           # TypeORM entities
└── common/
    └── filters/            # Global exception filter
```

## Database Schema

**users** — `id`, `email`, `phone`, `fcmToken`, `createdAt`

**notifications** — `id`, `userId`, `channel`, `status`, `provider`, `providerMessageId`, `bulkId`, `errorMessage`, `metadata`, `createdAt`, `updatedAt`

**notification_templates** — `id`, `name`, `channel`, `subject`, `body`, `createdAt`

**Channels:** `email` | `sms` | `push`

**Statuses:** `pending` → `sent` → `delivered` / `failed`

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

### 3. Start infrastructure

```bash
docker compose up postgres redis -d
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
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port (default: 6379) |
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Verified sender email |
| `SENDGRID_WEBHOOK_SECRET` | Webhook signing secret for signature verification |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key (with `\n` escaped) |

## API Endpoints

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications/email` | Send a single email |
| `POST` | `/notifications/email/template` | Send email using a saved template |
| `POST` | `/notifications/sms` | Send a single SMS |
| `POST` | `/notifications/push` | Send a push notification |
| `POST` | `/notifications/bulk` | Send to multiple users at once |
| `GET` | `/notifications/bulk/:bulkId/status` | Get bulk send progress |
| `GET` | `/notifications/:id` | Get notification status |
| `GET` | `/notifications/user/:userId` | Get user notification history |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/templates` | Create a notification template |
| `GET` | `/templates` | List all templates |
| `GET` | `/templates/:id` | Get template by ID |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks/sendgrid` | Receive SendGrid delivery events |

## Example Requests

**Send email**
```json
POST /notifications/email
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "html": "<h1>Hello, welcome aboard!</h1>",
  "userId": "optional-user-uuid"
}
```

**Send SMS**
```json
POST /notifications/sms
{
  "to": "+14155552671",
  "body": "Your verification code is 123456"
}
```

**Send push notification**
```json
POST /notifications/push
{
  "token": "device-fcm-token",
  "title": "New message",
  "body": "You have a new message from John"
}
```

**Bulk send**
```json
POST /notifications/bulk
{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "channel": "email",
  "subject": "Flash sale!",
  "message": "<p>50% off today only</p>"
}
```

**Create template**
```json
POST /templates
{
  "name": "welcome_email",
  "channel": "email",
  "subject": "Welcome, {{name}}!",
  "body": "<h1>Hi {{name}}, thanks for signing up.</h1>"
}
```

**Send with template**
```json
POST /notifications/email/template
{
  "to": "user@example.com",
  "templateName": "welcome_email",
  "variables": { "name": "John" }
}
```

## Queue & Retry Logic

Every notification request is:
1. Saved to the database with status `pending`
2. Added to a BullMQ queue
3. Processed asynchronously by the worker

Failed jobs are retried automatically with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 second |
| 2nd retry | 5 seconds |
| 3rd retry | 30 seconds |

After 3 failures the notification is permanently marked `failed` in the database.

## Webhook Delivery Tracking

SendGrid webhooks update notification status automatically:

| Event | Status |
|-------|--------|
| `delivered` | `delivered` |
| `bounce` / `blocked` / `dropped` | `failed` |
| `open` | metadata updated |
| `click` | metadata updated |

Each webhook request is verified against the SendGrid signing secret before processing.

## Testing

**SendGrid** — enable sandbox mode in your SendGrid account (API calls succeed without sending real emails).

**Twilio** — use [test credentials](https://www.twilio.com/docs/iam/test-credentials) with magic phone numbers.

**Firebase FCM** — use a real device token or the Firebase emulator.

Use Swagger at `/api/docs` to test all endpoints interactively.

## Deployment (AWS)

Recommended stack:

- **ECS Fargate** — run the app container
- **RDS PostgreSQL** — managed database
- **ElastiCache Redis** — managed Redis for BullMQ
- **ECR** — Docker image registry
- **S3** — static assets if needed

Steps:
1. Build and push image to ECR
2. Create ECS task definition with all env vars
3. Deploy service on Fargate
4. Point ECS to RDS and ElastiCache endpoints
5. Set `NODE_ENV=production` (disables TypeORM `synchronize` — run migrations instead)
