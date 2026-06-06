# <YOUR_APP_NAME>

Built with [Wasp](https://wasp.sh), based on the [Open Saas](https://opensaas.sh) template.

## Development

### Running locally

- Make sure you have the `.env.client` and `.env.server` files with correct dev values in the root of the project.
- Run the database with `wasp start db` and leave it running.
- Run `wasp start` and leave it running.
- [OPTIONAL]: If this is the first time starting the app, or you've just made changes to your entities/prisma schema, also run `wasp db migrate-dev`.

## Database

> ⚠️ **CRITICAL:** Never run `npx prisma db push` or any other native Prisma CLI migration command directly. The Wasp framework manages its own internal authentication tables (`Auth`, `AuthIdentity`, `Session`) that are **not** defined in `schema.prisma`. Running native Prisma commands will **drop these tables**, breaking all user authentication and requiring recovery via `fix-auth.sh`.
>
> **Always use `wasp db migrate-dev`** for all database schema changes and migrations.
