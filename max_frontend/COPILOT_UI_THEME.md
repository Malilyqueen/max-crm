# MaCréa UI Theme Documentation

## Overview
This document outlines the MaCréa neon theme implementation for the M.A.X. admin interface, providing a cohesive visual identity with consistent styling across all components.

## Color Palette

### Primary Colors
- **Neon**: `#00fefb` - Used for highlights, active states, and key UI elements
- **Rose**: `#aa65b3` - Used for accents and secondary highlights
- **Background**: `#0c0f12` - Dark base background
- **Card Background**: `rgba(12,15,18,.7)` - Semi-transparent card backgrounds
- **Text**: `#ffffff` - Primary text color
- **Muted Text**: `#888888` - Secondary/muted text

### Border & Lines
- **Line**: `rgba(0,254,251,.3)` - Subtle neon borders for consistency

## Tailwind Configuration

### Custom Classes
```css
/* Base theme classes */
.macrea-bg: #0c0f12
.macrea-bg2: rgba(12,15,18,.8)
.macrea-card: rgba(12,15,18,.7)
.macrea-neon: #00fefb
.macrea-rose: #aa65b3
.macrea-line: rgba(0,254,251,.3)
.macrea-text: #ffffff
.macrea-mute: #888888

/* Effects */
.shadow-inset: inset shadow for depth
.shadow-glow: neon glow on hover
```

## Component Library

### Card System
```tsx
import { Card, CardTitle, CardValue } from './ui/Card';

// Basic card
<Card>
  <CardTitle>Section Title</CardTitle>
  <CardValue>42</CardValue>
</Card>
```

**Styling**: Rounded corners, semi-transparent background, neon border, hover glow effect.

### Badge Components
```tsx
// BadgeTenant
<span className="badge-chip">tenant • role • live</span>
{preview && <span className="badge-chip text-[.8rem]">Preview</span>}
{useMocks && <span className="badge-chip text-[.8rem]">Mock data</span>}
```

### Form Elements
```tsx
// Buttons
<button className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow">
  Action
</button>

// Inputs
<input className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text" />

// Selects
<select className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text">
```

### Typography
```tsx
// Primary titles
<h3 className="text-macrea-text">Main Title</h3>

// Secondary titles
<div className="text-macrea-mute uppercase text-sm">Section Title</div>

// Body text
<div className="text-macrea-text">Content</div>

// Muted text
<div className="text-macrea-mute">Secondary info</div>
```

## Layout Patterns

### App Shell
- Backdrop blur background
- Max-width container
- Rounded content areas
- Sticky header with neon accents

### Dashboard
- Responsive KPI grid (1/2/4 columns)
- Card-wrapped metrics with neon values
- Styled timeline with progress bars

### Tables & Lists
- Wrapped in Card components
- Consistent border styling
- Hover states with background changes

## Implementation Guidelines

### ✅ Do's
- Use only visual classes/containers
- Maintain X-Tenant/X-Role/X-Preview headers
- Keep all hooks and logic intact
- Follow established component patterns

### ❌ Don'ts
- Rename props or change component APIs
- Move business logic between components
- Modify API endpoints or request patterns
- Introduce heavy JavaScript dependencies

## Testing Checklist

### Build
- [x] `npm run dev` runs without blocking warnings
- [x] Pages load without console errors

### Dashboard
- [x] 4 KPI cards visible with neon styling
- [x] Timeline displays with progress bars
- [x] Preview/Mock badges show when applicable

### Navigation
- [x] Automation, MAX, CRM sections render without regression
- [x] All interactive elements maintain functionality

### Modals & Forms
- [x] Action modal styles applied
- [x] Form inputs and buttons styled consistently
- [x] Logic unchanged (preview:false forced on confirm)

## Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| BadgeTenant | ✅ Complete | badge-chip implementation |
| ModeSwitch | ✅ Complete | Button-based with active states |
| DashboardPanel | ✅ Complete | Card-wrapped KPIs + timeline |
| WorkflowList | ✅ Complete | Card wrapper + muted titles |
| WorkflowDetail | ✅ Complete | Card wrapper + button styling |
| ImportWizard | ✅ Complete | Form styling applied |
| SegmentBuilder | ✅ Complete | All inputs/buttons styled |
| ActionModal | ✅ Complete | Form elements updated |
| TaskTray | ✅ Complete | Card container + muted text |

## Future Enhancements

- Consider adding more Card variants (compact, elevated)
- Implement theme toggle if needed
- Add animation transitions for state changes
- Create additional form components (checkboxes, radio buttons)