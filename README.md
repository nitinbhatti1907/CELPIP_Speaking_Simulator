# 🎙️ CELPIP Speaking Simulator

> **A free, browser-based CELPIP Speaking practice tool — built to help Canadian PR & citizenship candidates prepare without paying hundreds of dollars for test-prep software.**

🌐 **Live Demo:** **[https://celpip-speaking.netlify.app](https://celpip-speaking.netlify.app)**

[![Live on Netlify](https://img.shields.io/badge/Live-celpip--speaking.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://celpip-speaking.netlify.app)
[![Built with](https://img.shields.io/badge/Built%20with-Vanilla%20JS-yellow?style=for-the-badge&logo=javascript)](#)
[![No Dependencies](https://img.shields.io/badge/Dependencies-0-blue?style=for-the-badge)](#)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-purple?style=for-the-badge&logo=shield)](#)

---

## 👋 Hey, Welcome!

I'm **Nitin**, and I built this CELPIP Speaking Simulator because I was getting ready for the CELPIP exam and I just couldn't find a decent free tool that actually mimicked the real test. Every platform out there either wanted me to pay upfront, hide features behind a paywall, or didn't have the proper timing structure that makes the CELPIP speaking section so uniquely stressful.

So one weekend, I sat down and coded exactly what I wished existed — a clean, fast, zero-sign-up simulator that runs all **8 official CELPIP Speaking tasks** with authentic timings, local microphone recording, image support, and even live transcription. No accounts. No tracking. No ads. Nothing fancy — just a practice tool that actually works.

If you're preparing for CELPIP, I really hope this helps you the way building it helped me. 💙

🔗 **Try it right now → [celpip-speaking.netlify.app](https://celpip-speaking.netlify.app)**

---

## 📸 What You Get

When you open the simulator, you walk through the **entire CELPIP speaking flow** from Task 1 to Task 8, just like on exam day:

- 🎯 Task prompts you paste yourself (use any official practice set)
- ⏱️ Accurate prep and speaking timers that auto-transition
- 🖼️ Image upload for picture-based tasks (Tasks 3, 4, 5, 8)
- 🎤 Live microphone recording — everything stays in your browser
- 📝 Real-time transcript (Chrome/Edge only)
- 📊 VU meter so you can see your mic level while speaking
- 💾 Download any task recording afterwards
- 📋 Copy your transcript to clipboard with one click
- ♻️ Session persistence — your setup stays even if you close the tab

---

## ✨ Features Breakdown

### 🎯 **All 8 CELPIP Speaking Tasks**
Every task uses the real CELPIP timing rules, including the two-part flow for Task 5.

### 🎤 **Local Browser Recording**
Uses the native `MediaRecorder` API. Your audio never leaves your device — no servers, no cloud, no uploads.

### 🗣️ **Live Transcription (Chrome / Edge)**
Powered by the **Web Speech API** with `en-CA` locale. Watch your words appear in real time as you speak, then copy the final transcript with one click.

### 🖼️ **Smart Image Handling**
- Upload scene images for Tasks 3, 4, and 8
- **Task 4 special:** re-use the Task 3 image with one button, or upload a new one
- **Task 5 special:** upload two separate option images with titles and descriptions

### 📝 **Persistent Prep Notes**
Type notes during the prep phase, and they **stay visible while you're speaking** — just like in the real test interface.

### 📊 **VU Meter**
A live audio level bar (built with Web Audio API + FFT analysis) so you know the mic is actually picking you up before panicking mid-task.

### ⏱️ **Auto-Transitioning Timers**
- Prep timer starts → countdown → speaking timer begins automatically
- Last 10 seconds? The timer box turns red and pulses (just like CELPIP)
- Task 5 flows through 3 phases automatically: **Choose → Prep → Speak**

### 💾 **LocalStorage Persistence**
Your prompts, notes, images, and transcripts all save to `localStorage`. Close the tab, grab a coffee, come back — your session's still there.

### 📥 **Per-Task Downloads**
After each task, download your `.webm` recording. Also download everything again from the Summary screen at the end.

### 🧹 **One-Click Reset**
"Clear everything" button wipes `localStorage` and resets the app to a fresh state.

### 📱 **Fully Responsive**
Works on desktop, tablet, and mobile — though I'd recommend desktop for the real exam feel.

---

## 📋 All 8 CELPIP Tasks (with Official Timings)

| # | Task Title | Type | Prep Time | Speaking Time | Image? |
|:-:|:-----------|:-----|:---------:|:-------------:|:------:|
| **1️⃣** | Giving Advice | Text prompt | 30 sec | 90 sec | ❌ |
| **2️⃣** | Talking About a Personal Experience | Text prompt | 30 sec | 60 sec | ❌ |
| **3️⃣** | Describing a Scene | Image + prompt | 30 sec | 60 sec | ✅ |
| **4️⃣** | Making Predictions | Image + prompt | 30 sec | 60 sec | ✅ (reuse T3 option) |
| **5️⃣** | Comparing and Persuading | **Two options + two images** | 60s choose + 30s prep | 60 sec | ✅ ×2 |
| **6️⃣** | Dealing with a Difficult Situation | Text prompt | 60 sec | 60 sec | ❌ |
| **7️⃣** | Expressing Opinions | Text prompt | 30 sec | 90 sec | ❌ |
| **8️⃣** | Describing an Unusual Situation | Image + prompt | 30 sec | 60 sec | ✅ |

---

## 🔄 How The App Flow Works

```
┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌─────────┐
│  Welcome    │ ──▶ │  Setup   │ ──▶ │   Prep     │ ──▶ │   Speak  │ ──▶ │ Task    │
│  Screen     │     │  Task N  │     │   Timer    │     │   Timer  │     │ Complete│
└─────────────┘     └──────────┘     └────────────┘     └──────────┘     └────┬────┘
                          ▲                                                    │
                          └────── Next Task (repeats for 8 tasks) ─────────────┘
                                                                               │
                                                                               ▼
                                                                     ┌─────────────────┐
                                                                     │ Summary Screen  │
                                                                     │ (all 8 tasks)   │
                                                                     └─────────────────┘
```

### 🎬 Step-by-Step

1. **Welcome screen** → Click "Start speaking simulator"
2. **Setup screen** → Paste your prompt (and upload image if needed)
3. **Click "Start prep timer"** → Prep countdown begins
4. **Prep ends automatically** → Mic turns on, recording + transcription start
5. **Speaking timer hits zero** → Recording stops, transcript finalizes
6. **Task Complete screen** → Play back, download, copy transcript
7. **Continue to next task** → Repeat for all 8
8. **Summary screen** → Review every task side by side

---

## 🛠️ Tech Stack

Nothing fancy here — that's kind of the point. It's fast because it has zero dependencies.

| Layer | Technology |
|:------|:-----------|
| **Frontend** | Vanilla JavaScript (ES6+) — no React, no Vue, no frameworks |
| **Styling** | Pure CSS3 with CSS variables, Flexbox + Grid |
| **Markup** | Minimal HTML5 |
| **Recording** | `MediaRecorder` API |
| **Transcription** | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |
| **Audio Visualization** | Web Audio API (`AnalyserNode` + FFT) |
| **Storage** | Browser `localStorage` |
| **File Uploads** | `FileReader` API (image → base64 data URL) |
| **Server (local)** | Node.js `http` module (54 lines, no Express) |
| **Hosting (prod)** | Netlify (static site deploy) |

### 📦 Dependencies

```json
{
  "dependencies": {}
}
```

Yep. Zero. No `node_modules`, no `package-lock.json`, no build step, no bundler. It's just three files and a server.

---

## 🚀 Getting Started

### 🌐 Option 1 — Just Use the Live Site (Easiest)

Go to 👉 **[https://celpip-speaking.netlify.app](https://celpip-speaking.netlify.app)** and you're practicing in under 10 seconds.

### 💻 Option 2 — Run Locally with Node.js

You'll need Node.js 16 or higher.

```bash
# 1. Clone the repo
git clone https://github.com/nitinbhatti1907/celpip_speaking_simulator.git

# 2. Enter the folder
cd celpip_speaking_simulator

# 3. Start the server
node server.js
```

Then open 👉 **http://localhost:5173**

Want to change the port?

```bash
PORT=8080 node server.js
```

### 🐍 Option 3 — Run with Python (No Node Needed)

```bash
cd celpip_speaking_simulator
python -m http.server 5173
```

Then open 👉 **http://localhost:5173**

### ⚡ Option 4 — Any Static File Server

Since this is 100% static, you can serve it with:

```bash
npx serve .
# or
npx http-server .
# or anything that serves static files
```

---

## ☁️ Deploy Your Own on Netlify (Free)

Zero build step means Netlify deploys take about 30 seconds:

1. Fork or clone this repo
2. Push it to your own GitHub
3. Go to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
4. Connect your GitHub repo
5. **Build command:** leave blank ✅
6. **Publish directory:** `.` (just a dot) ✅
7. Hit **Deploy site**

Done. You now have your own copy running on the internet for free. That's literally how the live demo site was deployed.

---

## 🌐 Browser Support

| Browser | Recording 🎤 | Transcription 🗣️ | VU Meter 📊 | Recommended? |
|:--------|:------------:|:---------------:|:-----------:|:------------:|
| **Chrome (Desktop)** | ✅ | ✅ | ✅ | ⭐⭐⭐ **Best** |
| **Chromium / Brave** | ✅ | ✅ | ✅ | ⭐⭐⭐ |
| **Microsoft Edge** | ✅ | ✅ | ✅ | ⭐⭐⭐ |
| **Firefox** | ✅ | ❌ | ✅ | ⭐⭐ (no transcript) |
| **Safari (macOS/iOS)** | ⚠️ | ❌ | ✅ | ⭐ (limited) |
| **Opera** | ✅ | ✅ | ✅ | ⭐⭐ |

> 💡 **Pro tip:** If you want the live transcription feature, **use Chrome or Edge**. Firefox doesn't support the Web Speech API, and Safari's support is inconsistent.

---

## 🔒 Privacy & Your Data

This is probably the feature I'm most proud of. Here's exactly what happens to your data:

| Data | Where It Lives | Can I See It? |
|:-----|:---------------|:-------------:|
| 🎤 Audio recordings | Memory (current tab) | ❌ No |
| 📝 Prompts & notes | Browser `localStorage` | ❌ No |
| 🖼️ Uploaded images | Browser `localStorage` (as base64) | ❌ No |
| 🗣️ Transcripts | Browser `localStorage` | ❌ No |
| 🧠 Any of your data | Any server anywhere | ❌ **Never** |

### 🛡️ Technical Privacy Details

- **No analytics** — no Google Analytics, no Mixpanel, no tracking pixels
- **No cookies** — the app doesn't set any cookies at all
- **No server-side code** — the Node/Netlify server only serves static files
- **No API calls** — the app makes zero fetch/XHR requests
- **No CDN dependencies** — fonts, icons, and scripts are all local

Storage key used: `celpip-speaking-simulator-node16`

You can wipe everything with the **"Clear everything"** button, or manually via DevTools:
```javascript
localStorage.removeItem('celpip-speaking-simulator-node16');
```

---

## 📁 Project Structure

```
celpip_speaking_simulator/
│
├── 📄 index.html         # Minimal entry point (13 lines) — just mounts the app
├── 🟨 app.js             # All the logic (~1500 lines, vanilla JS)
│   │
│   ├── TASKS constant    # Defines all 8 CELPIP tasks + timings
│   ├── State management  # loadState, persist, buildDefaultState
│   ├── Recording         # ensureMic, startRecording, stopRecording, MIME detection
│   ├── Transcription     # startTranscription, stopTranscription, finalizeTranscript
│   ├── Timers            # startPrepPhase, startSpeakingPhase, handlePhaseEnd
│   ├── VU Meter          # setupVuMeter, animateVu
│   ├── UI Rendering      # renderWelcome, renderSetup, renderExam, renderSummary
│   └── Event Binding     # bindEvents → all click/input handlers
│
├── 🎨 styles.css         # All styling (~514 lines) — CSS vars, flexbox, grid, responsive
├── 🟢 server.js          # Tiny Node.js static server (~54 lines)
└── 📖 README.md          # This file
```

**Total:** ~2,100 lines of code. You can read the whole app in one sitting. 🍵

---

## 🧩 Task 5 Special Flow (The Tricky One)

Task 5 is the unique two-part "Compare and Persuade" task. Here's how the simulator handles it:

### Part 1 — Choose (60 seconds)
- Both Option A and Option B are displayed side-by-side with images and details
- You click **one option** to select it
- If you don't choose before time runs out → **Option A is auto-selected**
- Your chosen option gets locked in (stored as `choiceMadeAt`)

### Part 2 — Prep (30 seconds)
- Now shows the **other** option on the left, **your** option on the right
- Your prep notes from Part 1 carry over
- You write fresh notes for your persuasion strategy

### Part 2 — Speak (60 seconds)
- Microphone activates automatically
- You persuade the "other supervisor" why your choice is better
- Transcription + recording happen live
- Everything stops automatically at 0:00

---

## ⚠️ Known Limitations

Being honest about what this tool **isn't**:

| Limitation | Why |
|:-----------|:----|
| 🌍 Transcription is Chrome/Edge only | Web Speech API isn't standardized across browsers |
| 🔄 Audio Blobs don't persist on reload | Browser Blob URLs are session-scoped — download before closing! |
| 🧠 No AI scoring | This is practice, not evaluation. Share recordings with a tutor for feedback |
| 📏 Large images may hit storage limits | `localStorage` caps at ~5-10MB; keep images reasonably sized |
| 📱 Mobile mic permissions can be finicky | Especially on iOS Safari — desktop Chrome is most reliable |
| 🔉 No noise cancellation | Uses raw browser mic input. Record in a quiet room |

---

## 💡 Tips for Best Practice

1. 🎧 **Use headphones with a mic** — Built-in laptop mics pick up fan noise
2. 📖 **Use real CELPIP practice prompts** — Google "CELPIP Speaking practice questions" for free sets
3. ⏰ **Do the full 8 tasks in one sitting** — Builds real exam endurance
4. 📝 **Actually use prep notes** — Don't waste the prep time staring at the screen
5. 🔁 **Review your transcripts** — Look for grammar patterns you repeat
6. 💾 **Download your best takes** — So you can share with tutors or track improvement
7. 🪞 **Do mock sessions weekly** — Consistency > cramming

---

## 🤝 Contributing

If you want to improve this, I'd love the help! Some ideas:

- 🔊 Add background noise cancellation
- 📊 Add a speaking pace / words-per-minute tracker
- 🌐 Add multi-language transcript support (French for TEF?)
- 🎨 Add a dark mode toggle
- 📦 Add an "Export session as ZIP" feature
- 🤖 Integrate AI scoring (OpenAI / Claude / Gemini)

Fork it, hack on it, open a PR. I'm friendly. 😄

---

## 🐛 Found a Bug?

Open an issue on GitHub and tell me:
- Which browser + version you're using
- What you did
- What you expected vs. what happened
- Console errors (F12 → Console tab)

---

## 📜 License

This project is **free and open source**. Use it, share it, fork it, deploy your own copy — whatever helps you or someone else pass CELPIP.

If you found it useful, please:
- ⭐ **Star the repo**
- 📣 **Share it** with others preparing for CELPIP
- 🐦 **Tag me** if you pass your exam using it — that would genuinely make my day

---

## 🙏 Final Words

CELPIP prep resources shouldn't cost $300+. They shouldn't require sign-ups, subscriptions, or sketchy privacy policies. Practice tools should be **free, private, and fast** — so that's what I built.

Good luck with your exam. You've got this. 🇨🇦💪

**— Nitin**

🔗 **Live:** [celpip-speaking.netlify.app](https://celpip-speaking.netlify.app)
📂 **Repo:** [github.com/nitinbhatti1907/celpip_speaking_simulator](https://github.com/nitinbhatti1907/celpip_speaking_simulator)
