# modulo-world-backend

NestJS + TypeScript API for [ModuloWorld](https://moduloworld.com).

Part of a three-repository project:

| Repository | Purpose |
|---|---|
| [modulo-world-frontend](https://github.com/gislamog/modulo-world-frontend) | SvelteKit UI, game implementations |
| **modulo-world-backend** | NestJS API, Prisma, PostgreSQL *(this repo)* |
| [modulo-world-infrastructure](https://github.com/gislamog/modulo-world-infrastructure) | Docker Compose, Nginx, deployment |

Issues and user stories for the whole project are tracked in the frontend repository.

## Prerequisites

- Node.js 24 LTS or newer
- npm 10+
- PostgreSQL (normally supplied by the infrastructure repository's Docker Compose setup)

## Setup

```bash
npm install
cp .env.example .env
npm run start:dev
```

The API listens on port 3000 and is served under the `/api` prefix.

In normal development the full stack runs through Docker Compose from the infrastructure
repository, which puts the frontend and API on a single origin behind Nginx.

## Commands

| Command | Purpose |
|---|---|
| `npm run start:dev` | Development server with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Rewrite files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm test` | Run unit tests once |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |

## Conventions

**All routes are served under `/api`.** Nginx routes `/api` here and `/` to the frontend,
so the browser sees a single origin. This removes the need for CORS and allows auth
cookies to use `SameSite=Strict`.

**A global `ValidationPipe` is registered in `src/main.ts`** with `whitelist` and
`forbidNonWhitelisted` enabled. Every endpoint that accepts a body must define a DTO with
`class-validator` decorators; undecorated properties are rejected.

## Tooling note

The Nest CLI now generates projects with **oxlint** and **Vitest** rather than ESLint and
Jest. Both defaults are kept: oxlint is significantly faster, and using Vitest here means
one test framework across the frontend and backend rather than two.
