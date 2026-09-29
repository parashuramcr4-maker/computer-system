# Smart Home Automation System

A responsive, browser-only dashboard for a Smart Home Automation Computer System project. Device controls, sensor readings, energy figures, and camera previews are demonstrations; no physical hardware is connected.

## Features

- Smart device control for 10 demo devices
- Four simulated security camera previews with an accessible modal viewer
- Random, harmless simulated motion events
- Energy monitoring with a vanilla JavaScript seven-day chart
- Climate control, temperature limits, and fan speed
- Room inventory and security dashboard
- Notifications, read/clear controls, and toast messages
- Persistent device, temperature, settings, and notification state with localStorage
- Responsive navigation and layout for desktop, tablet, and mobile
- No build tools, server, API keys, third-party scripts, or external assets

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript

## Run Locally

Open `index.html` directly in a modern browser. The dashboard also works when served from any static file host. If browser privacy settings disable localStorage for `file:` pages, the dashboard still works for the current session; storage persists normally when hosted on GitHub Pages.

## GitHub Pages Deployment

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open repository **Settings**.
4. Open **Pages**.
5. Select **Deploy from a branch**.
6. Select the `main` branch.
7. Select `/(root)` as the folder.
8. Save.
9. Open the generated GitHub Pages URL.

All asset references are relative, so the project also works when published from a repository subpath.
