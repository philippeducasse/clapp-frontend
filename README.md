# Clapp Frontend

[![Tests](https://github.com/philippeducasse/clapp_frontend/actions/workflows/test.yml/badge.svg)](https://github.com/philippeducasse/clapp_frontend/actions/workflows/test.yml)
[![Deploy](https://github.com/philippeducasse/clapp_frontend/actions/workflows/deploy.yml/badge.svg?branch=production)](https://github.com/philippeducasse/clapp_frontend/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

A personal assistant application for managing careers in the performance arts. Built with Next.js 15, React 19, TypeScript, Redux Toolkit, and TailwindCSS.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TailwindCSS 4, shadcn/ui |
| State | Redux Toolkit |
| Forms | react-hook-form + Zod |
| Tables | TanStack React Table |
| Testing | Vitest |
| Error tracking | Sentry |
| AI | MistralApi |


## Getting Started

```bash
npm install
npm run dev       # http://localhost:3020
```

Requires a running backend at `NEXT_PUBLIC_BACKEND_URL` (default: `http://localhost:8000`).

## Scripts

```bash
npm run dev          # Dev server (port 3020)
npm run build        # Production build
npm run lint         # ESLint
npm run type         # TypeScript check
npm run test         # Vitest (watch)
npm run test:run     # Vitest (single run)
npm run test:e2e:run # E2E tests
```

## Project Structure

```
src/
├── app/              # Next.js App Router (route groups: (main), (auth))
├── components/
│   ├── common/       # Shared components (tables, forms, detail views)
│   ├── page-components/  # Entity-specific components
│   └── ui/           # shadcn/ui primitives
├── redux/            # Store, slices, shared reducers
├── api/              # API service layer (auto camelCase ↔ snake_case)
├── interfaces/       # TypeScript types
└── helpers/          # Form helpers, serializer, utilities
```

## CI/CD

- **`tests` workflow** — runs on every push/PR (except `production`): spins up the Django backend in Docker, installs deps, runs Vitest.
- **`deploy` workflow** — runs on push to `production`: runs tests, builds and pushes the Docker image, then deploys to the server via SSH.
