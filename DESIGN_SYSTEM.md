# Landing Page Design System — IndicBot

Reference for replicating the Linear-inspired light theme used on the IndicBot landing, login, and register pages. Copy the tokens and patterns below into any Vite + React + Tailwind project.

---

## 1. Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (core utilities only — no custom plugin needed)
- **framer-motion** for scroll + entrance animations
- **lucide-react** for icons
- **Inter** font (variable weight, loaded from Google Fonts)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Root wrapper:
```tsx
<div className="font-sans antialiased">...</div>
```
Set `font-family: 'Inter', sans-serif` in your Tailwind config under `theme.fontFamily.sans`.

---

## 2. Color Palette

The entire system runs on Tailwind's slate scale plus one accent. No custom colors.

| Role | Token | Use |
|---|---|---|
| Canvas (pure) | `bg-white` | Base pages (Hero, Capabilities grid) |
| Canvas (soft) | `bg-[#FAFAFA]` | Alternating section backgrounds (Pricing, Capabilities) |
| Dark panel | `bg-slate-950` | CTA cards, brand panels, auth sidebars |
| Primary text | `text-slate-950` | Headings (H1, H2) |
| Secondary text | `text-slate-900` | Body emphasis, logo wordmark |
| Body text | `text-slate-600` | Descriptions, paragraphs |
| Meta text | `text-slate-500` | Labels, helper text |
| Muted text | `text-slate-400` | Eyebrow text, footer meta |
| Hairline border | `border-slate-900/[0.08]` | Cards, inputs (primary) |
| Ultra-hairline | `border-slate-900/[0.06]` | Section dividers, subtle outlines |
| Accent | `text-indigo-600` / `bg-indigo-600` | Eyebrows, primary links, "popular" badge |
| Accent glow | `rgba(99,102,241,0.35)` | Radial gradient glows on dark panels |
| Success | `text-emerald-600` / `bg-emerald-50 text-emerald-700` | Checkmarks, "live" indicators |
| Error | `border-rose-400` / `text-rose-500` | Form validation errors |

---

## 3. Typography

All headings use `tracking-[-0.02em]` (slight negative letter-spacing). Eyebrows use `tracking-[0.18em]` uppercase.

### Heading sizes

```tsx
/* H1 — hero */
<h1 className="text-[40px] sm:text-6xl lg:text-[76px] font-semibold leading-[1.02] tracking-[-0.03em] text-slate-950">

/* H2 — section */
<h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">

/* H3 — card title */
<h3 className="text-[15px] font-semibold tracking-tight text-slate-950">

/* Auth page title */
<h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
```

### Body & meta

```tsx
/* Lead paragraph */
<p className="text-base text-slate-600 leading-relaxed">

/* Small body */
<p className="text-[13.5px] text-slate-500">

/* Eyebrow (section label) */
<div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
    <span className="w-6 h-px bg-indigo-600" /> Platform
</div>

/* Trust row / microcopy */
<span className="text-[12px] text-slate-500">

/* Uppercase meta (footer legal, credit legends) */
<p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
```

---

## 4. Layout

### Container
```tsx
<div className="max-w-[1200px] mx-auto px-5 sm:px-8">
```
Use `max-w-[1280px]` for the header nav to give breathing room at the edges.

### Section padding
```tsx
<section className="py-24 sm:py-32">       {/* Standard */}
<section className="py-14">                 {/* Compact (Compliance) */}
```

### Section dividers
Hairline at the top for subtle section separation:
```tsx
<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
```

---

## 5. Buttons

### Primary (dark, CTA)
```tsx
<button className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-slate-900 text-white text-[14px] font-medium hover:bg-slate-800 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_24px_-6px_rgba(79,70,229,0.25)]">
    Get started
    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
</button>
```

### Secondary (outlined, light)
```tsx
<button className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-white border border-slate-900/10 text-slate-900 text-[14px] font-medium hover:bg-slate-50 hover:border-slate-900/20 transition-all">
    View demo
</button>
```

### Small (nav, compact actions)
```tsx
<button className="inline-flex items-center h-9 px-4 rounded-md bg-slate-900 text-white text-[13px] font-medium tracking-tight hover:bg-slate-800 transition-colors">
```

### On dark panel (inverted)
```tsx
<button className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-white text-slate-950 text-[14px] font-medium hover:bg-slate-100 transition-all">
```

**Rule:** use `h-9` for nav, `h-10` for form submit, `h-11` for hero/CTA.

---

## 6. Cards

### Standard content card
```tsx
<div className="p-7 rounded-xl bg-white border border-slate-900/[0.08] hover:border-slate-900/20 hover:shadow-[0_12px_30px_-20px_rgba(15,23,42,0.15)] transition-all">
```

### Featured card (selected / highlighted)
```tsx
<div className="p-7 rounded-xl bg-white border border-slate-900 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]">
```

### Grid-divided cards (Capabilities pattern)
A 4-column grid with hairline dividers between cells, wrapped in one rounded container:
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-900/[0.06] rounded-xl overflow-hidden bg-white">
    {items.map(item => (
        <div className="p-8 border-r border-b border-slate-900/[0.06] hover:bg-slate-50/70 transition-colors">
            {/* cell */}
        </div>
    ))}
</div>
```

### Dark CTA card
```tsx
<div className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950 px-6 sm:px-14 py-20 sm:py-28 text-center">
    {/* grid bg + radial glow (see §8) */}
    <h2 className="text-white ...">
</div>
```

---

## 7. Forms & Inputs

### Input (standard)
```tsx
<input
    className="w-full h-10 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-all"
/>
```

### Label
```tsx
<label className="text-[12.5px] font-medium text-slate-700">Email address</label>
```

### Input with inside-right icon (eye toggle, etc)
```tsx
<div className="relative">
    <input className="... pr-10" />
    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
        <Eye className="w-4 h-4 text-slate-400" />
    </div>
</div>
```

### Error state
```tsx
<input className="... border-rose-400" />
<p className="text-[11.5px] text-rose-500">Error message</p>
```

### Checkbox
```tsx
<input
    type="checkbox"
    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0"
/>
```

### OTP / code input
```tsx
<input
    inputMode="numeric"
    maxLength={6}
    className="w-full h-14 px-3 rounded-md bg-white border border-slate-900/[0.08] text-center text-2xl tracking-[0.5em] font-semibold text-slate-900"
/>
```

---

## 8. Decorative Effects

### Grid background (on dark panels)
```tsx
<div
    aria-hidden
    className="absolute inset-0 opacity-[0.15]"
    style={{
        backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 30% 40%, black 40%, transparent 75%)',
    }}
/>
```

On light backgrounds, use `rgba(15,23,42,0.04)` instead of white.

### Radial glow (hero accent)
```tsx
<div
    aria-hidden
    className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 60%)' }}
/>
```

### Hero halo (above product preview)
```tsx
<div
    aria-hidden
    className="absolute left-1/2 -translate-x-1/2 top-[-160px] w-[900px] h-[900px] -z-10 rounded-full opacity-60 blur-3xl"
    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)' }}
/>
```

### Browser-chrome mockup (product preview wrapper)
```tsx
<div className="relative rounded-xl border border-slate-900/10 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.15),0_0_0_1px_rgba(15,23,42,0.04)] overflow-hidden">
    <div className="flex items-center gap-2 px-4 h-9 border-b border-slate-900/5 bg-slate-50/60">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
    </div>
    {/* content */}
</div>
```

---

## 9. Motion

Uses `framer-motion`. Standard easing curve: `[0.16, 1, 0.3, 1]` (ease-out-expo feel).

### Scroll-triggered entrance (cards, sections)
```tsx
import { motion } from 'framer-motion';

<motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.45, delay: i * 0.05, ease: 'easeOut' }}
>
```
`delay: i * 0.05` gives a subtle staggered cascade for grids.

### Page load entrance (hero, forms)
```tsx
<motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
```

### Product preview (scale + slide)
```tsx
<motion.div
    initial={{ opacity: 0, y: 24, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
```

### Hover transforms
Arrow icons shift on button hover:
```tsx
<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
```

---

## 10. Icons

**Library:** `lucide-react` — stroke-based, matches the hairline aesthetic.

- Default stroke width: `1.75` for decorative, `2.5` for checkmarks
- Sizes: `w-3.5 h-3.5` (inline), `w-4 h-4` (labels), `w-5 h-5` (card), `w-7 h-7` inside logo badge

```tsx
<Check className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
<Zap className="w-5 h-5 text-slate-900" strokeWidth={1.75} />
```

---

## 11. Logo Mark Pattern

Reuse in header, footer, auth pages:

```tsx
/* Light bg variant */
<div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shadow-sm">
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
</div>
<span className="text-[15px] font-semibold tracking-tight text-slate-900">BrandName</span>

/* Dark bg variant — swap the two colors */
```

Pick your own 3-line SVG (layers, box, compass) — keep it geometric.

---

## 12. Composition Patterns

### Section anatomy
Every content section follows the same rhythm:

```tsx
<section className="py-24 sm:py-32 bg-white">
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Header block */}
        <div className="max-w-2xl mb-16">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                <span className="w-6 h-px bg-indigo-600" /> Eyebrow
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                Section title that's a full sentence.
            </h2>
            <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                A subtitle that explains the promise in one line.
            </p>
        </div>

        {/* Content (grid / list / chart / form) */}
    </div>
</section>
```

### Split-layout auth page
```tsx
<div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans antialiased">
    <BrandPanel />       {/* hidden on mobile, dark bg, value props */}
    <FormColumn />       {/* centered narrow form */}
</div>
```

### Trust row (below hero CTA)
```tsx
<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-slate-500">
    <span className="inline-flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5 text-emerald-600" /> No card required
    </span>
    {/* more */}
</div>
```

---

## 13. Spacing Rules

- Between eyebrow and H2: `mb-5`
- Between H2 and subtitle: `mt-5`
- Between header block and content grid: `mb-16` (standard) or `mb-20` (for dense grids)
- Between cards: `gap-4` (tight, pricing) / `gap-5` (standard) / `gap-6+` (spacious)
- Around icons in cards: `mb-5` from icon to title
- Form field vertical gap: `space-y-5`

---

## 14. Accessibility & Polish

- Always `aria-hidden` on decorative background divs
- Focus rings on inputs use `focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60` — subtle halo, not harsh
- Links in text: `font-medium text-slate-900 hover:text-indigo-600 transition-colors`
- Group hover for buttons with arrows: wrap both button and arrow in `group` class, arrow uses `group-hover:translate-x-0.5`
- Smooth transitions: `transition-colors` for solid-state swaps, `transition-all` for multi-prop changes

---

## 15. Do / Don't

**Do**
- Hairline borders (`border-slate-900/[0.08]`) over heavy borders
- Near-black (`slate-950`), never pure black (`#000`)
- Rounded-md for interactive elements, rounded-xl for content cards
- Inter font everywhere, no mixing
- One accent color (indigo) used sparingly on eyebrows and links

**Don't**
- Drop shadows with high alpha — use large blur + low alpha instead (`shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]`)
- Gradients in text or backgrounds except radial glows on dark panels
- More than 3 font sizes in one section
- Borders on every element — use spacing and hairlines over boxed-in cells

---

## 16. File Structure (for reference)

```
src/
├── components/
│   └── landing/
│       ├── Header.tsx        — fixed nav, scroll detection
│       ├── Hero.tsx          — headline + product preview + trust row
│       ├── Capabilities.tsx  — 8-cell divided grid
│       ├── Process.tsx       — 3 numbered steps with connecting line
│       ├── Industries.tsx    — 6 cards with metric badges
│       ├── Compliance.tsx    — honest security promises strip
│       ├── Pricing.tsx       — 4-tier card ladder
│       ├── CTASection.tsx    — dark slate card with radial glow
│       └── Footer.tsx        — 5-column layout
└── pages/
    ├── Index.tsx             — composes the landing sections
    ├── Login.tsx             — split layout (brand + form)
    └── Register.tsx          — split layout (brand + form)
```

---

## 17. Quick-Start Snippets

Copy these into any new project to match the vibe:

**Section scaffold:**
```tsx
<section className="py-24 sm:py-32 bg-white">
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-16">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                <span className="w-6 h-px bg-indigo-600" /> Eyebrow
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                Your section title.
            </h2>
        </div>
    </div>
</section>
```

**Card:**
```tsx
<div className="p-7 rounded-xl bg-white border border-slate-900/[0.08] hover:border-slate-900/20 hover:shadow-[0_12px_30px_-20px_rgba(15,23,42,0.15)] transition-all">
    <Icon className="w-5 h-5 text-slate-900 mb-5" strokeWidth={1.75} />
    <h3 className="text-[15px] font-semibold tracking-tight text-slate-950 mb-2">Title</h3>
    <p className="text-[13.5px] text-slate-600 leading-relaxed">Description.</p>
</div>
```

**Primary CTA:**
```tsx
<button className="group inline-flex items-center gap-2 h-11 px-6 rounded-md bg-slate-900 text-white text-[14px] font-medium hover:bg-slate-800 transition-colors">
    Get started
    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
</button>
```

That's the whole system. No component library dependency required — just Tailwind utilities and one framer-motion + one lucide-react import.
