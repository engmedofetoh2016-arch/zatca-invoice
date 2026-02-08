# ZATCA Invoice

## Development

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill values.

Required:
- `JWT_SECRET`
- `DATABASE_URL`
- `APP_URL`

Optional:
- `CRON_SECRET` (recommended for protected cron calls)
- SMTP / ZATCA variables in `.env.example`

## Health Check (Coolify)

Set the health check path to `/api/health`.

## ZATCA Queue Cron (Coolify)

Create a cron job that calls:
- `POST /api/zatca/process`

If you set `CRON_SECRET`, include header:
- `x-cron-secret: <your secret>`

## Security (Required)

Rotate any leaked secrets (JWT/SMTP) and set them in Coolify Environment Variables.
Avoid storing real secrets in `.env` on shared machines.
