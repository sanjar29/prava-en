# Prava EN

The Uzbekistan driving theory exam, in English — a Telegram bot plus a Telegram Mini App.

Every existing option (Oson Prava, Prava Plus, the official terminals) is Uzbek or Russian only.
This is for the English-speaking people living in Uzbekistan who need a licence and can't read the
question bank.

## Demo Video on Youtube 🎥 Click on the Image Below

[![Watch the demo](https://img.youtube.com/vi/8lLjjLheCaM/maxresdefault.jpg)](https://youtu.be/8lLjjLheCaM)

## What's in it

- **78 original questions** across 12 topics, written from the Traffic Rules of the Republic of
  Uzbekistan (29 chapters, as amended 12 April 2022). Every question carries an explanation and a
  reference to the chapter it comes from.
- **Mock exam in real conditions** — 20 questions, 25 minutes, no more than 2 mistakes, pass at 18.
  Questions are spread across all 12 topics so no single one dominates the paper.
- **Practice mode** — untimed, answer revealed immediately with the explanation.
- **Weak-spot drilling** — questions you've got wrong come back first.
- **Progress tracking** — per-topic accuracy, exam history, study streak. Local to the device.
- **Bot** — question of the day, streaks, `/stats`, and the button that opens the Mini App.

## Layout

```
data/questions.json     the question bank — shared by the app and the bot
webapp/                 React + Vite Mini App (static, deploys anywhere)
bot/                    Telegraf bot, long polling, JSON file store
```

Both halves read the same `data/questions.json`, so adding a question updates the app and the bot at
once.

## Running it

### 1. The Mini App

```bash
cd webapp
npm install
npm run dev      # http://localhost:5173 — works in a plain browser too
npm run build    # → webapp/dist
```

It runs standalone outside Telegram (useful for development); inside Telegram it picks up the user's
theme, haptics and back button.

### 2. Host the built app

Telegram requires **HTTPS**. Any of these are free:

- **GitHub Pages** — a workflow is included at `.github/workflows/deploy.yml`. Push to `main`, then
  enable Pages → Source: GitHub Actions. Your URL will be
  `https://sanjar29.github.io/<repo>/`.
- **Cloudflare Pages / Netlify / Vercel** — build command `npm run build`, output directory
  `webapp/dist`.

### 3. The bot

```bash
cd bot
npm install
cp .env.example .env    # fill in BOT_TOKEN and WEBAPP_URL
npm start
```

Get `BOT_TOKEN` from [@BotFather](https://t.me/BotFather) with `/newbot`. Then, still in BotFather:

- `/setmenubutton` → pick your bot → paste your `WEBAPP_URL` → this puts a permanent
  **Open app** button next to the message box.
- `/setdescription` and `/setabouttext` are worth filling in — they're what people see before they
  hit Start.

The bot uses long polling, so it needs no public URL and no webhook. It runs on any always-on box —
a free-tier VM, a Raspberry Pi, or your own machine while you're testing.

## Adding questions

Append to `data/questions.json`:

```json
{
  "id": "speed-10",
  "category": "speed",
  "question": "…",
  "options": ["…", "…", "…", "…"],
  "answer": 2,
  "explanation": "…",
  "rule": "Ch. 11 — Speed of movement"
}
```

`answer` is the zero-based index of the correct option. `category` must match one of the ids in the
`categories` array. Keep exactly one correct option per question — the real exam is single-answer.

## Where this could go next

Roughly in order of how much they'd move the needle:

1. **Road-sign images.** The biggest gap right now — a good chunk of the real exam is
   "what does this sign mean", and the current bank can only describe signs in words.
2. **Situation diagrams** for intersection priority questions. Same reason.
3. **More questions.** 78 is enough to practise with; the real bank is far larger. Aim for 300+.
4. **A backend.** Progress is per-device today. A small server keyed on the Telegram user id would
   sync progress across devices and let you see which questions everybody fails.
5. **Uzbek/Russian toggle.** English is the wedge, but bilingual would widen the audience — and
   showing the same question in two languages is genuinely useful for someone learning the local
   terminology.
6. **Practical-exam and paperwork guide.** Expats' real pain isn't only the theory: it's knowing
   which documents, which medical certificate, which office. Nobody has written that in English.

## Disclaimer

A study aid, not an official government product, and not affiliated with the traffic authorities.
The rules change; verify against the current official text before your exam.
