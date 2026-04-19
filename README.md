# CELPIP Speaking Simulator

I built this tool because I was preparing for the CELPIP exam and couldn't find a free, no-signup practice environment that actually mimicked the real thing. Everything I found was either paywalled, clunky, or missing the timing structure that makes CELPIP speaking so stressful. So I made my own.

This is a fully browser-based CELPIP speaking practice simulator — all 8 tasks, official timings, local recording, and optional live transcription. No accounts, no servers, no data leaving your device.

---

## What It Does

The simulator walks you through all 8 official CELPIP speaking tasks in order, just like the real exam:

| Task | Topic | Prep Time | Speaking Time |
|------|-------|-----------|---------------|
| 1 | Giving Advice | 30 sec | 90 sec |
| 2 | Talking About a Personal Experience | 30 sec | 60 sec |
| 3 | Describing a Scene | 30 sec | 60 sec |
| 4 | Making Predictions | 30 sec | 60 sec |
| 5 | Comparing & Persuading | 60 sec (choose) + 30 sec (prep) | 60 sec |
| 6 | Dealing with a Difficult Situation | 60 sec | 60 sec |
| 7 | Expressing Opinions | 30 sec | 90 sec |
| 8 | Dealing with an Unusual Situation | 30 sec | 60 sec |

Each task:
- Shows your custom prompt and any image you've uploaded
- Counts down through the prep phase, then auto-transitions to speaking
- Records your microphone locally in your browser
- (Chrome only) Transcribes your speech live as you talk
- Lets you download your recording after each task

After all 8 tasks, you land on a summary page where you can review every recording and transcript side by side.

---

## Features

- **Accurate CELPIP timings** — prep and speaking phases match the real exam
- **Local-only recording** — your audio never leaves your browser, no server upload
- **Paste your own prompts** — bring in official practice questions for any task
- **Image support** — upload scene/situation images for Tasks 3, 4, 5, and 8
- **Task 5 dual-image flow** — compare two options with proper two-part timing
- **Live transcription** — see your words appear in real time (Chrome/Chromium only, uses Web Speech API)
- **Prep notes** — write notes during prep that stay visible while you speak
- **VU meter** — see your mic level so you know you're being picked up
- **Per-task audio downloads** — download recordings individually or from the summary
- **Session persistence** — everything saves to localStorage, so you can close the tab and come back
- **Full reset** — one button clears everything and starts fresh

---

## Getting Started

### Option 1 — Node.js (recommended)

You need Node.js 16 or later.

```bash
git clone https://github.com/nitinbhatti1907/celpip_speaking_simulator.git
cd celpip_speaking_simulator
node server.js
```

Then open **http://localhost:5173** in your browser.

To use a different port:

```bash
PORT=8080 node server.js
```

### Option 2 — Python (no Node.js needed)

```bash
cd celpip_speaking_simulator
python -m http.server 5173
```

Then open **http://localhost:5173**.

### Option 3 — Any static file server

This is a fully static project. No build step, no compilation. Serve the project root with any static server you like and it'll work.

---

## Deploying to Netlify

Since there's no backend, deploying to Netlify is dead simple:

1. Push the repo to GitHub
2. Go to [netlify.com](https://netlify.com) and connect your GitHub repo
3. Leave the build command blank
4. Set the publish directory to `.`
5. Hit deploy

That's it. Your simulator will be live at a Netlify URL in under a minute.

---

## Browser Support

| Browser | Recording | Transcription | Notes |
|---------|-----------|---------------|-------|
| Chrome / Chromium | Yes | Yes | Best experience, use this |
| Firefox | Yes | No | Web Speech API not supported |
| Edge (Chromium) | Yes | Yes | Works well |
| Safari | Partial | No | May have mic permission quirks |

If you're serious about practicing with transcription feedback, use Chrome. It's the only browser with a reliable Web Speech API implementation.

---

## How the Setup Works

Before you start the exam, there's a setup screen where you can:

- Paste in text prompts for each task
- Upload images for tasks that require them (Tasks 3, 4, 5, 8)
- Write any prep notes you want visible during the task

You don't have to fill everything in — if you leave a prompt blank, the task will still run with empty content. But to simulate the real exam properly, I'd recommend using actual CELPIP practice prompts.

---

## Your Data Stays With You

Everything — your prompts, notes, images, recordings, and transcripts — is stored in your browser's `localStorage`. Nothing is sent to any server. The Node.js server in this repo just serves the static files; it has no API, no database, no logging.

The localStorage key is `celpip-speaking-simulator-node16`. If you want to nuke everything and start fresh, use the "Clear everything" button in the app, which wipes localStorage and reloads.

---

## Project Structure

```
celpip_speaking_simulator/
├── index.html      # Entry point — minimal, just loads the app
├── app.js          # All application logic (~1500 lines, vanilla JS)
├── styles.css      # All styling (CSS variables, flexbox/grid)
├── server.js       # Simple Node.js static file server
└── README.md       # This file
```

There are no external dependencies, no npm packages, no build tools. It's plain HTML, CSS, and JavaScript — the way the web was meant to work. You can open `app.js` and read it top to bottom without needing to understand a framework.

---

## Why I Built This

CELPIP prep resources are expensive and often incomplete. The speaking section is particularly hard to practice because you need timed conditions — you can't just read tips and hope for the best. I wanted something that:

1. Reproduced the actual timing pressure of the real test
2. Kept my recordings private (no uploading to some third-party service)
3. Was free and required no sign-up
4. Worked offline once the files were on your machine

This simulator does all of that. I hope it helps you prepare.

---

## Known Limitations

- **Transcription is Chrome-only.** The Web Speech API is not standardized across browsers. Firefox and Safari don't support it.
- **Recordings are session-based.** While prompts, notes, and transcripts persist in localStorage, audio recordings (Blobs) are recreated each session. If you want to keep your recordings, download them before closing the tab.
- **No scoring.** This is a practice tool, not an AI evaluator. It replicates the conditions of the exam, but you'll need to self-evaluate or share recordings with a teacher/tutor for feedback.
- **Image size.** Very large images are stored as base64 in localStorage, which can hit storage limits. Keep uploaded images reasonably sized.

---

## License

This project is open source and free to use. If you find it helpful, feel free to share it with others preparing for CELPIP.
