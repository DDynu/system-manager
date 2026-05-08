# PWA Implementation Plan

## Context

Convert the system-manager frontend into a Progressive Web App so users can:
- Install it as a standalone app on desktop/mobile
- Launch it from their home screen with app-like experience
- Have static assets cached for faster load times
- API calls always hit the network (real-time metrics required)

## User Decisions

- **Icons**: Generate placeholder PNG icons programmatically
- **Caching**: Static assets only (HTML/CSS/JS/images), API calls always network-first
- **Display mode**: Standalone (hides browser chrome)

## Implementation Steps

### 1. Install PWA plugin
```bash
cd frontend && pnpm add -D vite-plugin-pwa
```

### 2. Update `vite.config.js` — add PWA plugin with manifest and service worker config
- Register `VitePWA` plugin
- Configure manifest with app name, description, icons, display: standalone
- Configure service worker: register automatically, cache static assets only
- Workbox strategy: cacheFirst for static assets, networkFirst for API

### 3. Create placeholder icons in `public/icons/`
- Generate 192x192 and 512x512 PNG icons programmatically using Node.js script
- Orange/purple gradient to match app theme

### 4. Update `index.html`
- Add `<link rel="manifest" href="/manifest.json">`
- Add `<meta name="theme-color" content="#1f2937">`
- Add `<meta name="apple-mobile-web-app-capable" content="yes">`

### 5. Create `public/manifest.json`
- App name: "System Manager"
- Short name: "SysMgr"
- Icons: reference generated PNG files
- Start URL: `/`
- Display: standalone
- Background color: #1f2937

### 6. Register service worker in `main.jsx`
- Check for `navigator.serviceWorker` support
- Register `/sw.js` on mount
- Handle activation for cache updates

## Files Modified
- `frontend/vite.config.js`
- `frontend/index.html`
- `frontend/src/main.jsx`

## Files Created
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/public/icons/icon-192.png`
- `frontend/public/icons/icon-512.png`
- `frontend/generate-icons.js` (one-time script, can delete after)

## Verification
1. Run `pnpm build` — verify no errors
2. Check browser DevTools Application tab — manifest and service worker should be registered
3. Lighthouse audit — should show PWA installable
4. Test offline — static UI should load, API calls will fail (expected)
5. Test install — "Add to Home Screen" prompt should appear on desktop
