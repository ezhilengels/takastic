# Taskastic Repository

This repository contains multiple app slices. The active product is the Expo/React Native mobile app.

## Primary Documentation

- Mobile app full documentation: [`mobile/README.md`](./mobile/README.md)

## Repository Overview

- `mobile/` - Active Taskastic mobile app (Expo + React Native)
- `cloudflare-worker.js` - Cloudflare Worker proxy to Supabase
- `migrations/` - SQL schema/migration files
- `client/` - Older web client (legacy)
- `server/` - Older Node/Express server (legacy)

## Quick Start (Mobile)

```bash
cd mobile
npm install
npm start
```

Run Android locally:

```bash
npm run android
```

For architecture, auth flow, offline sync, release process, and troubleshooting, use:
- [`mobile/README.md`](./mobile/README.md)

