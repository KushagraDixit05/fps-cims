---
name: Farm Prosperity Solutions
description: Offline-first field operations platform for agricultural field executives.
colors:
  primary: "#1A4A2E"
  primary-mid: "#2A6A44"
  primary-light: "#E1F2E8"
  background: "#F8F6F1"
  surface: "#FFFFFF"
  border: "#E0DDD5"
  border-light: "#F0EDE6"
  text-primary: "#1A3A25"
  text-secondary: "#6A7A6A"
  text-muted: "#8A8A7A"
  good: "#1A8A3A"
  good-bg: "#E1F2E8"
  average: "#C8900A"
  average-bg: "#FEF3DA"
  poor: "#D63333"
  poor-bg: "#FCEBEB"
  info: "#185FA5"
  info-bg: "#E6F1FB"
  error: "#D63333"
  error-bg: "#FCEBEB"
  success: "#1A8A3A"
  warning: "#C8900A"
typography:
  display:
    fontFamily: "System, -apple-system, sans-serif"
    fontSize: "22sp"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "System, -apple-system, sans-serif"
    fontSize: "18sp"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "System, -apple-system, sans-serif"
    fontSize: "15sp"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "System, -apple-system, sans-serif"
    fontSize: "14sp"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "System, -apple-system, sans-serif"
    fontSize: "11sp"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    size: "48px min-height"
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "14px 20px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "13px"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "13px"
  badge-good:
    backgroundColor: "{colors.good-bg}"
    textColor: "{colors.good}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  badge-average:
    backgroundColor: "{colors.average-bg}"
    textColor: "{colors.average}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  badge-poor:
    backgroundColor: "{colors.poor-bg}"
    textColor: "{colors.poor}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
---

# Design System: Farm Prosperity Solutions

## 1. Overview

**Creative North Star: "The Field Commander's Instrument"**

This design system exists for one purpose: to make a field executive in direct sunlight, one hand occupied, moving between farms, feel completely in control. It is not a consumer app. It is not a marketing surface. It is a precision instrument — the kind of tool a professional trusts because it has never let them down. Every visual decision is measured against a single question: does this help a person get their job done faster, with more confidence, in a difficult environment?

The system is clean and deliberate without being sterile. A restrained warm-neutral canvas gives breathing room. The forest-green primary is not decoration — it is a data signal for health and vitality, used sparingly so it retains meaning. Typography is legible at a glance: heavy weights for hierarchy, generous sizes for outdoor readability, tight spacing where density is required. Motion is minimal — state transitions only, nothing choreographed. There is no room for scroll-driven theatrics when you're standing in a field.

This system explicitly rejects: the cluttered density of legacy government software, the saturated green wallpaper of consumer farming apps, the carousel-heavy aesthetics of agri-commerce platforms, and the brochure-style scroll narratives of marketing sites. It rejects dark mode — these screens live in sunlight, not in studios.

**Key Characteristics:**
- Light mode only; optimized for direct sunlight and outdoor glare
- Restrained warm-neutral background with a single, meaningful primary green
- High-contrast text hierarchy: deep forest ink on off-white canvas
- Large touch targets (≥ 48pt) throughout; no precision tapping required
- Color is always semantic: green = health/success, amber = warning, red = error, blue = info
- Elevation is flat-by-default; subtle border + minimal shadow as the only surface treatment
- No gradient text, no glassmorphism, no illustrative decoration

---

## 2. Colors: The Agronomist's Palette

A restrained palette built on one primary signal color and a warm-neutral canvas. Color is never decorative — every hue earns its place by communicating meaning.

### Primary
- **Deep Forest Green** (`#1A4A2E`): The brand anchor. Used for primary actions (buttons, CTAs), active navigation states, key data values (summary counts), and the app header. Its rarity on any given screen is what makes it authoritative.
- **Forest Mid** (`#2A6A44`): A lighter step of the primary, used for pressed/hover states on primary elements and secondary brand accents.
- **Field Mint** (`#E1F2E8`): The tinted surface variant — used as the background for quick-action cards relating to crop operations and as the crop count badge background. Soft and unobtrusive.

### Neutral
- **Off-White Canvas** (`#F8F6F1`): The app background. A warm, slightly tinted off-white — not cream, not paper, not sand. It is the breathing room between content surfaces. Never used for interactive elements.
- **Pure White Surface** (`#FFFFFF`): Cards, form containers, input fields, the summary strip. The primary content layer that floats above the canvas.
- **Stone Border** (`#E0DDD5`): All separators, card borders (0.5pt), input strokes. A hairline-weight neutral.
- **Pale Divider** (`#F0EDE6`): Lighter divider for within-surface separation.
- **Forest Ink** (`#1A3A25`): Primary text. A deep green-tinted near-black — warmer and less harsh than pure black, but with headroom for outdoor readability.
- **Sage Secondary** (`#6A7A6A`): Secondary text, field labels, location metadata.
- **Muted Fieldwork** (`#8A8A7A`): Timestamps, helper text, muted metadata. Never used for body content.

### Semantic (Status Signals)
- **Healthy Green / Good** (`#1A8A3A`) on `#E1F2E8`: Crop condition "Good", sync success, confirmed states.
- **Harvest Amber / Average** (`#C8900A`) on `#FEF3DA`: Crop condition "Average", pending sync, cautionary states.
- **Alert Red / Poor** (`#D63333`) on `#FCEBEB`: Crop condition "Poor", errors, destructive actions.
- **Field Blue / Info** (`#185FA5`) on `#E6F1FB`: Informational callouts, links, My Visits category.

### Named Rules
**The Semantic Color Rule.** Green, amber, and red are reserved exclusively for data status signals (crop condition, sync state, error/success). They are never used as decorative accents or brand splashes. A field executive reads color the way a doctor reads a chart — it means something specific, and that meaning must never be corrupted.

**The One Voice Rule.** The Deep Forest primary appears in ≤3 places per screen: the header, one primary action, and one key data value. Its authority depends on its scarcity.

---

## 3. Typography

**Display Font:** System default (SF Pro on iOS, Roboto on Android)
**Body Font:** System default
**Label Font:** System default, uppercase with tracking

**Character:** The system uses a single-family approach — the device's native system font at carefully calibrated weights. This is a functional choice: native fonts render at maximum legibility on each platform, load instantly, and feel native to the OS. The hierarchy is achieved entirely through weight contrast (800/700/600/400) and size steps, not through typeface variety.

### Hierarchy
- **Display** (800 weight, 22sp, line-height 1.2): Hero numbers in summary tiles. Dashboard KPI values. The largest, most authoritative number on any screen.
- **Headline** (700 weight, 18sp, line-height 1.3): Screen titles, section headers, farmer names in cards. The primary reading entry point for any content block.
- **Title** (600 weight, 15sp, line-height 1.4): Card titles, form section headers, button labels. Mid-weight anchor text.
- **Body** (400 weight, 14sp, line-height 1.5): All descriptive text, form field input, location metadata, visit descriptions.
- **Label** (700 weight, 11sp, 0.06em tracking, uppercase): Section eyebrows ("QUICK ACTIONS", "RECENT VISITS"). Used sparingly — only where the uppercase affordance is genuinely needed to separate content zones. Maximum once per screen section.

### Named Rules
**The 14sp Floor Rule.** No text in the production UI renders below 14sp for body content, or 12sp for supporting metadata. The outdoor environment demands it. Any label smaller than 12sp is effectively invisible in glare.

**The Uppercase Restraint Rule.** All-caps labels appear only as section-zone markers ("QUICK ACTIONS", "RECENT VISITS") and status labels in badges. Never in body copy, form labels, or button text. A field exec scanning a form does not read labels that look like WARNINGS.

---

## 4. Elevation

This system is flat-by-default. Surfaces are differentiated by color, not by depth. The background (`#F8F6F1`) is the lowest layer. Cards and form containers (`#FFFFFF`) float above it by color contrast alone, reinforced by a hairline border (`0.5pt`, `#E0DDD5`). Heavy drop shadows are absent from the visual language — they add rendering cost and visual noise without field-readability benefit.

Shadow is used in one mode only: as a light structural cue on cards to subtly lift them from the page on platforms where it is expected (iOS box-shadow; Android elevation). These values are kept at the absolute minimum.

### Shadow Vocabulary
- **Card ambient** (`elevation: 2` Android / `shadowOpacity: 0.06, shadowRadius: 4` iOS): Applied to all Card components. Diffuse, barely perceptible. Its job is to separate surface from canvas, not to impress.
- **Form container ambient** (`elevation: 2` Android / `shadowOpacity: 0.06, shadowRadius: 6` iOS): Applied to the Login form card and modal containers. Slightly stronger to reinforce containment.

### Named Rules
**The Flat-By-Default Rule.** No element gets a shadow unless it is a Card, a modal, or a floating overlay. Decorative shadows on buttons, navigation elements, or list items are prohibited. If something needs depth, use border + background color contrast.

**The Anti-Ghost-Card Rule.** Never pair a 0.5pt border AND a drop shadow on the same element for decorative effect. The card uses a border as its primary surface definition; the shadow is the secondary subtle cue. Stack them only at the minimum values defined above.

---

## 5. Components

### Buttons
Tactile, full-width by default, and built for confident one-tap actions.
- **Shape:** Gently rounded corners (12px radius). Not pill-shaped; not squared. Firm and functional.
- **Primary:** Deep Forest Green (`#1A4A2E`) fill, white text, 14–15sp at weight 600. Padding: 14pt vertical, 20pt horizontal. Minimum height: 48pt. Full-width in forms.
- **Disabled state:** Same dimensions, 55% opacity. The form field retains its label — the button dimness alone communicates unavailability.
- **Secondary:** White surface, Forest Green border (1.5pt), Forest Green text. Same dimensions as primary. Used when primary would be too dominant (multi-action screens).
- **Danger:** Alert Red (`#D63333`) fill, white text. Reserved for destructive confirms (delete, clear). Never used as a default action.
- **Loading state:** `ActivityIndicator` replaces label. Spinner color matches text color of the variant.

### Condition Badges (Signature Component)
The Condition Badge is the most data-critical component in the system. It communicates crop health at a glance and must be unambiguous in any lighting.
- **Shape:** Rounded corners (8px standard, 6px compact variant). Bordered pill with a 1pt colored border.
- **Good:** `#1A8A3A` text + border on `#E1F2E8` background.
- **Average:** `#C8900A` text + border on `#FEF3DA` background.
- **Poor:** `#D63333` text + border on `#FCEBEB` background.
- **Typography:** 13sp weight 600 (standard); 11sp weight 600 (compact). Never smaller.
- **Rule:** Color is never the only differentiator. The label text ("Good", "Average", "Poor") always accompanies the color treatment. Color-blind field executives cannot rely on hue alone.

### Cards / Containers
The primary content surface. Used for visit entries, quick-action tiles, form sections.
- **Corner Style:** Gently rounded (14px radius for content cards; 16px for action tiles).
- **Background:** Pure White (`#FFFFFF`).
- **Border:** Hairline (`0.5pt`, `#E0DDD5`). Always present; never omitted.
- **Shadow:** Card ambient (see Elevation). Never stronger than defined.
- **Internal Padding:** 14pt standard. Quick-action tiles: 16pt.
- **Bottom Margin:** 8–10pt between cards. Never stacked with zero gap.

### Inputs / Fields
- **Style:** 1pt stroke border (`#E0DDD5`), white background, 12px radius. Padding 13pt. Font 14–15sp.
- **Focus:** Border color shifts to the primary (`#1A4A2E`). No glow, no shadow added. The border change is the signal.
- **Error:** Border shifts to Alert Red (`#D63333`). Error text (12sp, red) appears below the field. The field itself does not change background color.
- **Label:** 13sp, Sage Secondary (`#6A7A6A`), weight 500. 6pt below label, above field.
- **Placeholder:** Muted Fieldwork (`#8A8A7A`). Always present to guide first-time entry.
- **Disabled:** 55% opacity on the entire field wrapper.

### Navigation
- **App Header:** Full-width Deep Forest Green (`#1A4A2E`) background. White text: greeting at 13sp (75% opacity), role name at 18sp weight 700, region at 12sp (70% opacity). Profile button: 40×40pt circle, 20% white overlay.
- **Summary Strip:** White surface, dividers between tiles, primary green for KPI values (22sp 800 weight).
- **Tab / Bottom Nav (if present):** Forest Green active state; Sage Secondary for inactive. 48pt hit area minimum per tab.

### Quick-Action Tiles
The Home screen's primary navigation affordance. 2-column grid, ~47% width each.
- **Shape:** 16px radius, 0.5pt border (`#E0DDD5`).
- **Background:** Category-tinted — each action type has its semantic tint (crop: Field Mint; Mandi: amber-tinted; visits: info-blue; reports: lavender-tinted).
- **Minimum height:** 110pt. Never smaller — the tile must be comfortable to tap with a thumb while walking.
- **Typography:** Emoji icon (28sp), title (14sp weight 600), subtitle (11sp secondary).

---

## 6. Do's and Don'ts

### Do:
- **Do** use Deep Forest Green (`#1A4A2E`) for all primary actions, active states, and key KPI values.
- **Do** render all text at or above 14sp for body, 12sp for metadata, outdoors-optimized.
- **Do** show sync status and offline state in a persistent, always-visible location — never hide it in settings.
- **Do** use 48pt minimum touch targets on all interactive elements, buttons, and navigation items.
- **Do** use semantic color roles: green for success/good, amber for warning/average, red for error/poor, blue for informational. Every instance of these colors must carry that meaning.
- **Do** use the card pattern (white surface + hairline border + subtle shadow) consistently for all content containers.
- **Do** write button labels as verb + object: "Log Visit", "Submit Form", "Sync Now", not "OK" or "Submit".
- **Do** use progressive disclosure for multi-step forms: one step at a time, clear progress indication.
- **Do** place destructive actions (delete, clear, discard) behind a confirmation step and render them in danger red.
- **Do** use uppercase tracking labels ("QUICK ACTIONS", "RECENT VISITS") only as section zone markers, maximum once per distinct content zone.

### Don't:
- **Don't** use dark mode or dark backgrounds. This app is used in direct sunlight; dark surfaces create glare and reduce readability outdoors.
- **Don't** use saturated green as a wallpaper, background, or decorative surface color. Green is a data signal here (crop health, success). Overusing it destroys its semantic meaning.
- **Don't** make the UI look like old enterprise software (SAP, government portals) — cluttered rows, low-contrast grays, dense tables with no whitespace.
- **Don't** make it look like a consumer farming app — large illustrative imagery, bright saturated greens on every surface, decorative plant/crop illustrations.
- **Don't** use gradient text (`background-clip: text`). It is decorative and meaningless here.
- **Don't** use glassmorphism, blur effects, or translucent overlays as surface treatments. They reduce readability outdoors.
- **Don't** use border-left stripe accents (colored left border > 1px on cards or callouts) as decoration. The error banner uses a left-border stripe as an inherited pattern that should be migrated to a full border or background tint approach.
- **Don't** use border-radius above 16px on cards. 14px (cards) and 16px (tiles) are the ceiling.
- **Don't** render text below 12sp anywhere in the production UI.
- **Don't** use scrolling choreography, entrance animations, or staggered reveals. State transitions (button press, form submit, loading) are the only motion permitted. A field worker is not watching animations.
- **Don't** rely on color alone to communicate status. Always pair color with a text label or icon (the ConditionBadge pattern is the reference).
- **Don't** design empty states as afterthoughts. Every list that can be empty (no visits, no Mandi entries, no results) needs a clear, actionable empty state with a call to action.
