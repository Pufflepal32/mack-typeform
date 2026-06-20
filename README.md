# Mack Typeform — Carpenter / Home Builder Business Intake

A clean, modern, Typeform-style business intake questionnaire for carpenters and
custom home builders. One question per screen, progress bar, back/next, mobile-first.
Built as a single self-contained HTML file — no build step, no dependencies.

Built by [Figgle Media](https://figglemedia.com).

## What it collects

A full marketing brief: business basics, services (with per-service follow-ups),
ideal customer, local SEO, proof/trust, brand positioning, offers, project details,
sales process, website content, FAQs, competitors, and final notes.

Every question that could block the user includes an **"I'm not sure"** option so the
form is never a dead end.

## Features

- One question per card (Typeform-style) with auto-advance on choices
- Progress bar + `X / N` counter
- Conditional logic (e.g. pick **Decks** → deck-specific questions appear; each major
  service spawns its own follow-ups)
- Answers autosave to the browser (`localStorage`)
- Review screen with inline edit links before submitting
- **Copy answers (JSON)**, **Download JSON**, and **Generate strategy prompt** buttons

## Run locally

Just open `index.html` in a browser. No server needed.

## Deploy to Netlify

This is a static site — `index.html` at the repo root is the entry point.

1. Go to [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Connect GitHub and pick this repo.
3. Leave **build command** blank and **publish directory** as `.` (root).
4. Deploy.

Or drag-and-drop the folder into the Netlify dashboard for an instant deploy.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The form (entry point Netlify serves) |
| `carpenter-intake.html` | Identical copy / original filename |
| `netlify.toml` | Netlify config |
