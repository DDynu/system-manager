# System Manager Dashboard - Implementation Plan

## Context
Build a modern, data-driven dashboard for system monitoring with metrics, charts, and status indicators. No backend required—use hardcoded mock data.

## Tech Stack
- **Framework**: React 19.2.4 + Vite 8
- **Styling**: Tailwind CSS 4.2.2 (CSS-first, no config file)
- **Charts**: Recharts (React-native, simple API)
- **Icons**: Heroicons (Tailwind's icon set)
- **Existing Design Tokens**: Reuse `--text`, `--text-h`, `--accent`, `--border` from `src/index.css`

## Implementation Summary

### Phase 1: Dependencies Installed
```bash
pnpm add recharts @heroicons/react
```
- `recharts 3.8.1` - Charting library
- `@heroicons/react 2.2.0` - Icon library

### Phase 2: Vite Config Fixed
**File**: `vite.config.js`
- Added `import tailwindcss from '@tailwindcss/vite'`
- Config now properly imports Tailwind CSS plugin

### Phase 3: Tailwind CSS Imported
**File**: `src/index.css`
- Added `@import "tailwindcss";` at top of file

### Phase 4: Directory Structure Created
```
src/
├── components/
│   ├── Layout.jsx
│   ├── MetricsGrid.jsx
│   └── ChartsSection.jsx
└── data/
    └── mockData.js
```

### Phase 5: Components Created

#### `src/data/mockData.js`
Mock data for dashboard:
- `mockMetrics` - Current system stats (CPU, memory, disk, uptime, temperature, network)
- `cpuHistory` - 24h CPU usage time series
- `memoryHistory` - 24h memory usage time series
- `diskIOHistory` - 12h disk read/write activity
- `processes` - Sample running processes list
- `alerts` - System alert notifications

#### `src/components/Layout.jsx`
Sidebar navigation layout:
- Fixed sidebar with navigation items (Overview, CPU, Storage, Network, Analytics, Settings)
- Active state styling with accent color
- System status indicator (green pulse)
- Responsive main content area
- Uses Heroicons for nav icons

#### `src/components/MetricsGrid.jsx`
6 stat cards displaying:
- CPU Usage (45%)
- Memory (12.4 / 32 GB, 39% used)
- Disk (245 / 1000 GB, 25% used)
- Uptime (14d 3h 22m)
- Temperature (62°C)
- Network (45.2 / 12.5 MB/s)

Features:
- Color-coded icons (blue, purple, green, amber, orange, cyan)
- Trend indicators (up/down with color)
- Hover border accent on cards
- Responsive grid (1/2/3 columns)

#### `src/components/ChartsSection.jsx`
3 chart sections using Recharts:
1. **CPU Usage Line Chart** (24h) - Blue line, peak indicator
2. **Memory Usage Line Chart** (24h) - Purple line, average indicator
3. **Disk I/O Bar Chart** (12h) - Dual bars for read/write activity

Features:
- Responsive containers
- Custom tooltips with theme colors
- Cartesian grid with border color
- Smooth monotone curves for line charts
- Rounded bar corners
- Legend for disk I/O chart

### Phase 6: Next Steps (Pending)
1. Update `src/App.jsx` to render dashboard
2. Import and compose components in App.jsx
3. Remove old counter demo code
4. Test with `pnpm run dev`

## File Changes Summary
| File | Action |
|------|--------|
| `package.json` | Added recharts, @heroicons/react |
| `vite.config.js` | Added tailwindcss import |
| `src/index.css` | Added @import "tailwindcss" |
| `src/data/mockData.js` | Created - mock data |
| `src/components/Layout.jsx` | Created - sidebar layout |
| `src/components/MetricsGrid.jsx` | Created - stat cards |
| `src/components/ChartsSection.jsx` | Created - charts |

## Design Approach
- **Layout**: Sidebar (left) + Header (top) + Grid content
- **Color**: Purple accent (`--accent: #aa3bff`) consistent with existing theme
- **Dark mode**: Automatic via `prefers-color-scheme`
- **Charts**: Responsive, smooth animations, tooltips on hover
- **Stat cards**: Large numbers, subtle borders, status colors

## Mock Data Structure
```js
{
  cpu: 45,
  memory: { used: 12.4, total: 32, unit: 'GB', percent: 39 },
  disk: { used: 245, total: 1000, unit: 'GB', percent: 25 },
  uptime: '14d 3h 22m',
  temperature: 62,
  network: { upload: 12.5, download: 45.2, unit: 'MB/s' },
  processes: [...],
  alerts: [...]
}
```

## Verification Steps
1. Run `pnpm run dev`
2. Verify dashboard loads with:
   - Sidebar navigation visible
   - 6 metric cards with values
   - 3 charts rendering with mock data
   - Responsive layout on resize
3. Test dark mode toggle (system preference)
