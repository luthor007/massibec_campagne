# Repository Guidelines

## Project Structure & Module Organization
This Next.js app keeps route handlers in `src/pages` and shared layouts in `src/components`, with Tailwind styles in `src/styles` and `src/app/globals.css`. Domain helpers live in `src/lib`, `src/models`, plus hooks and utilities under `src/hooks` and `src/utils`. Static assets stay in `public/`, while operational scripts run from `scripts/` via `node scripts/<name>.js`; migrations belong in `migrations/`.

## Build, Test, and Development Commands
Run `npm install` to sync dependencies. Use `npm run dev` for the hot-reloading server, `npm run build` for optimized assets, and `npm run start` to serve the build. Guard quality with `npm run lint`; run scripts from the `scripts/` directory only when explicitly needed.

## Coding Style & Naming Conventions
Follow two-space indentation and TypeScript-first React components. Name components in PascalCase, utilities in camelCase, and reserve kebab-case for static files. Lean on shared primitives in `src/components/ui` and Tailwind tokens rather than duplicating styles. Update ESLint or Tailwind configs instead of scattering inline disables.

## Testing Guidelines
Add automated coverage alongside features; prefer Jest or Playwright specs co-located as `*.test.ts(x)` or under `src/__tests__`. Reuse the API smoke scripts (`node scripts/test-dashboard-api.js`) for regression checks and document manual scenarios in `scripts/README.md`. Target critical paths before merging.

## Commit & Pull Request Guidelines
Craft small commits focused on a single behavior. Stick to Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) rather than vague messages. Pull requests must outline context, highlight risky areas, and link tracking issues. Attach screenshots or short clips for UI changes and call out new env vars or migrations.

## Configuration & Deployment Tips
Store secrets in `.env.local` and mirror production values with `fly secrets set` during deploys. Validate container changes locally using `docker build .` before modifying Fly.io pipelines. When touching email flows, reference `EMAIL_SETUP.md` and confirm SendGrid sandbox mode before sending live traffic.
