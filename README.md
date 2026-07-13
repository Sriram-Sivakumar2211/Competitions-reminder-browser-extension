# HackTrack

A Chrome/Edge (Manifest V3) browser extension to save and track hackathons, competitions, and contests — with dates, countdowns, reminders, and JSON export/import.

## Features
- **Save events**: name, type (Hackathon / Competition / Contest / Other), date, link, notes, and a reminder lead-time (days before).
- **Countdowns**: shows days left / days ago, color-coded (green = upcoming, amber = ≤3 days, red = past).
- **Reminders**: a browser notification is fired the configured number of days before the event.
- **Filters**: All / Upcoming / Past.
- **Export / Import**: back up or transfer your list as JSON.

## Install (load unpacked)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `HackTrack` folder.
4. Click the puzzle icon and pin **HackTrack** for quick access.

## Usage
- Click the extension icon to open the popup.
- Fill in the form and click **Add Event**.
- Use **Edit** / **Delete** on each card.
- **⭳** exports your events to JSON; **⭱** imports and merges them.

## Files
- `manifest.json` — MV3 config
- `popup.html` / `popup.css` / `popup.js` — UI and logic
- `background.js` — alarms + notifications service worker
- `icons/` — extension icons

## Notes
- Data is stored locally via `chrome.storage.local`.
- Reminders rely on the extension's service worker; keep the extension installed and enabled.
