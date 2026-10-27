# Maintenance vs trial expiration

## `/api/internal/maintenance`

Daily ops route (header `x-maintenance-secret`). Runs AI credit reset, cache cleanup, meeting reminders, social reconcile, lifecycle nudges, email outbox, and daily stats.

It does **not** expire trials or subscriptions. Lifecycle email sends therefore never trigger trial expiration in the same run.

## `/api/internal/subscription-expiration`

Separate, explicit route for `expireSubscriptionsJob`. Same `MAINTENANCE_SECRET` / `x-maintenance-secret` auth. Requires `confirm=expire-trials` in the JSON body or query string (otherwise `400`).

Schedule this only when you intentionally want to expire grandfather trials. **No scheduler/cron is enabled by this change** — call it manually or wire an external cron yourself.
