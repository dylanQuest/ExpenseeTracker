# Expens.ee

A simple expense tracker web app — log income, add expenses, and organize them by category.

## Tech Stack

- **[Remix](https://remix.run/)** — full-stack web framework (routing, loaders/actions, server rendering)
- **[React](https://react.dev/)** + **TypeScript** — UI components
- **CSS Modules** — component-scoped styling (no CSS framework)
- **Node.js** — runtime
- **Prisma** — database management

## Features

- User accounts with session-based authentication (login / signup)
- Set and update income
- Add expenses with description, amount, and category
- Create new categories on the fly, with custom colors

## Getting Started

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

- `app/routes/` — Remix routes (pages, loaders, actions)
- `app/Components/` — shared, reusable UI components (Form, Menu, etc.)
- `app/models/` — data access (e.g. user, expense, category)
- `app/session.server.ts` — authentication/session helpers