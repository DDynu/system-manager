# System Manager Dashboard - Implementation

## Project Structure
```
frontend/
  src/
    components/
      Layout.jsx
      MetricsGrid.jsx
      PowerControls.jsx
    App.jsx
    index.css
  package.json
  vite.config.js
backend/
  (to be created)
```

## Tech Stack
- React 19.2.4 + Vite
- Tailwind CSS 4.2.2 (CSS-first, no config file)
- Recharts for charts
- Oswald font from Google Fonts

## Current State

### Layout Structure
- Single-page dashboard (no sidebar navigation)
- Dark theme with high contrast
- Cards have 2px borders with hover accent effect

### Color Scheme
```css
--text: #9ca3af          /* Body text */
--text-h: #f3f4f6        /* Headings */
--bg: #1f2937            /* Card background */
--border: #4b5563        /* Card borders */
--accent: #a855f7        /* Purple accent */
--accent-border: rgba(168, 85, 247, 0.8) /* Hover state */
```

### Components

**src/App.jsx**
- Composes Layout, MetricsGrid, PowerControls
- Removed ChartsSection

**src/components/Layout.jsx**
- Header with "System Manager" h1
- Dark background #1a1b26
- Single page layout

**src/components/MetricsGrid.jsx**
- PC Status card (full width, shows name and Online/Offline)
- 6 metric cards: CPU Usage, Memory, Disk, Uptime, Temperature, Network
- Removed trend indicators (+12%, -5%, etc.)
- 2px borders with hover effect

**src/components/PowerControls.jsx**
- 4 buttons: Shutdown, Reboot, Sleep, Wake
- 3D effect with bottom borders
- Active press animation (border disappears, button moves down 1px)

**src/index.css**
- Oswald font at 700 weight for h1
- Gradient text effect (purple to white)
- Removed system-ui fallback
- Font-face declarations for Oswald

## File Locations
- `src/App.jsx` - Main app composition
- `src/components/Layout.jsx` - Layout wrapper
- `src/components/MetricsGrid.jsx` - Metrics and PC status
- `src/components/PowerControls.jsx` - Power buttons
- `src/index.css` - Global styles and fonts

## To Do
- Wire PowerControls to backend API for actual power actions
- Implement PC status polling/update mechanism
- Add chart visualizations (optional)
