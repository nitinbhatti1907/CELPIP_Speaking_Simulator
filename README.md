# CELPIP Speaking Simulator - Node 16 Static Version

This is a static browser-based speaking simulator designed for local practice and free Netlify deployment.

## Run locally with Node 16

```bash
node server.js
```

Open:

```text
http://localhost:5173
```

## Run with Python

```bash
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Netlify

Deploy the folder as a static site.
- Build command: leave empty
- Publish directory: .

## Notes
- Recording stays local in your browser.
- Microphone permission is required.
- Downloads are available task by task and again from the summary screen.

- Chrome is recommended for live transcript capture and copyable transcripts.
- Each completed task can now show a transcript box, audio download, and copy transcript button.
