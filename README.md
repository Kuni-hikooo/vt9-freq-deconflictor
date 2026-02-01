# VT-9 Freq Deconflictor

Airspace, TACAN channel, and ChatterMark frequency deconfliction tool for VT-9 Tigers daily flight schedules.

---

## Quick Start (First-Time Setup)

You only need to do this once.

### 1. Install Node.js

Go to https://nodejs.org and download the **LTS** version (the green button). Install it with all defaults.

### 2. Clone This Repo

Open a terminal:
- **Mac:** Search "Terminal" in Spotlight (Cmd + Space)
- **Windows:** Search "PowerShell" in the Start menu

Then run these three commands, one at a time, hitting Enter after each:

```
git clone https://github.com/Kuni-hikooo/vt9-freq-deconflictor.cd vt9-freq-deconflictor
npm install
```

### 3. Run Locally (Optional)

To see it on your own machine before deploying:

```
npm run dev
```

Open your browser and go to: **http://localhost:3000**

Press `Ctrl + C` in the terminal to stop it when you're done.

---

## Deploy to Vercel (Make It Live)

1. Go to https://vercel.com and sign up with your GitHub account.
2. Click **"New Project"**
3. Click **"Import"** next to your `vt9-freq-deconflictor` repo
4. Leave all settings as default and click **"Deploy"**
5. You're live. Vercel will give you a URL like `https://vt9-freq-deconflictor-xxxx.vercel.app`

From now on, every time code is pushed to the repo, Vercel auto-deploys. No action needed.

---

## How It Works

1. **Pick a date** from the dropdown (defaults to today)
2. Click **FETCH & RUN** — it pulls the VT-9 schedule PDF from CNATRA automatically
3. If the fetch fails (CNATRA is down, or no schedule exists for that date), download the PDF manually from the CNATRA site and drag it onto the upload zone
4. The app parses the schedule, groups flights into sections/divisions/singles, and runs the deconfliction engine
5. Results show in the timeline (visual) and assignment table (detailed)
6. Any conflicts are flagged in red at the bottom with full detail

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main app (orchestrates everything)
├── components/
│   ├── DatePicker.tsx      # Date selection dropdown
│   ├── UploadZone.tsx      # Drag-and-drop PDF upload
│   ├── SummaryBar.tsx      # Day stats at a glance
│   ├── Timeline.tsx        # Visual timeline of flights
│   ├── AssignmentTable.tsx # Detailed assignment grid
│   └── ConflictPanel.tsx   # Conflict detail view
├── config/
│   └── vt9Config.ts        # All VT-9 rules (airspace, TACAN, freqs)
├── lib/
│   ├── types.ts            # TypeScript types
│   ├── pdfLoader.ts        # PDF fetch + text extraction
│   ├── parser.ts           # Schedule text → structured flights
│   └── deconflict.ts       # The deconfliction engine
└── styles/
    └── globals.css         # App-wide styles
```

**Key design decisions:**
- Everything runs in the browser. No backend server needed.
- All VT-9 rules live in `src/config/vt9Config.ts` — if anything changes (new MOA, new frequencies), that's the only file to edit.
- The deconfliction engine is in `src/lib/deconflict.ts` and is completely independent of the UI. It can be tested or swapped without touching the frontend.
