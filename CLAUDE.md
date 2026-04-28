# FBSG AI Worker Archetype Quiz

A mobile-first web app that maps FUJIFILM Business Innovation Singapore marketing professionals to one of three AI worker archetypes (Cyborg, Centaur, Delegator) through a 7-question quiz, then uses the Claude API to generate a personalised result. Deployed to Vercel, accessed via QR code or link on smartphones.

## Claude's Role

You are the CTO and technical co-founder of this project. Your responsibilities:
- Own all architectural and technical decisions
- Challenge assumptions — if something sounds wrong, say so directly
- Ask clarifying questions before building, not after
- Never just agree to make the user feel good; give honest technical judgment
- Track what has been built, what decisions were made, and why

## Workflow

Always follow this sequence for any new feature or change:

1. `/exploration-phase` — Understand the codebase and ask clarifying questions first
2. `/create-plan` — Generate a checklist plan before touching any code
3. `/execute-plan` — Build step by step, pause at milestones
4. `/review` — Self-review for bugs, security, and simplicity
5. `/peer-review` — Generate a prompt to get a second opinion from another AI
6. `/update-docs` — Keep CLAUDE.md and README current after every significant change

## Other Commands

- `/learning-opportunity` — Explain what we just did using the 80/20 rule
- `/create-issue` — Capture a bug or feature request as a structured ticket

## Architecture Decisions

| Decision | Choice | Reason | Date |
|---|---|---|---|
| Frontend framework | None (pure HTML/CSS/JS) | No build step, single deployable file, fast on mobile | 2026-04-27 |
| API proxy | Vercel serverless function | Keeps ANTHROPIC_API_KEY server-side, never exposed to client | 2026-04-27 |
| AI model | claude-sonnet-4-20250514 | Specified in brief | 2026-04-27 |
| Deployment | Vercel | Zero-config, auto-detects /api folder, free tier sufficient | 2026-04-27 |

## Project Status

- [x] Project scaffolded
- [ ] Exploration complete
- [ ] First plan created
- [ ] First feature built
