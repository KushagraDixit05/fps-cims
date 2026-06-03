# Product

## Register

product

## Users

**Primary:** Agricultural field executives, survey officers, and rural operations staff. They are the app's sole day-to-day operators — traveling village-to-village, logging farmer visits, capturing GPS coordinates and photos, and collecting crop and market data in the field.

**Secondary:** Regional managers, supervisors, analytics reviewers, and admin users who consume the data collected upstream.

**Usage context:** The app is used outdoors in direct sunlight, on Android handsets, while standing or walking through farms. One-handed usage is common. Sessions are long. Network connectivity is unreliable or completely absent. The environment is physically demanding — dusty, warm, high-glare — which makes every pixel of readability and every extra tap a cost.

## Product Purpose

Farm Prosperity Solutions (FPS) is an offline-first field operations platform. Its core job is to let agricultural field executives collect, record, and sync structured agricultural intelligence data — crop monitoring, farmer visits, Mandi market prices, GPS location, photos — with confidence that nothing is ever lost, whether online or off.

**Success looks like:** A field executive opens the app in direct sunlight, immediately sees their sync status, navigates to a workflow without guessing, submits a full crop monitoring form in under three minutes with no confusion, and leaves knowing the data is safe.

## Brand Personality

Modern Agri-Tech enterprise productivity app. Calm, precise, and trustworthy — like Linear or Notion brought to a rural field context. It does not shout; it performs.

Three words: **Efficient. Confident. Grounded.**

Design references (specific reasons listed):
- **Linear** — information density without clutter; precise typographic hierarchy
- **Uber Driver** — speed-first mobile UX for field workers; real-time operational clarity
- **Material 3** — systematic component language; tonal color semantics
- **Stripe** — reliable, premium data interfaces with zero decorative noise
- Subtle agriculture-inspired branding: organic tones as data-role accents, not as wallpaper

## Anti-references

- **Old enterprise software** (SAP, gov portals) — cluttered, visually heavy, low contrast, overwhelming.
- **Flashy promotional farming apps** — large illustrations, bright saturated greens, decorative elements that add nothing to usability.
- **E-commerce marketplaces** — discount-badge aesthetics, carousel-heavy, sale-mode energy.
- **Brochure-style agricultural websites** — scroll-driven, marketing-oriented, brand-over-function.
- **Overwhelming green-heavy UI** — using saturated green as a wallpaper color is an anti-pattern. Green is meaningful here (crop health status); it must remain a data signal, not a background.
- **Dark mode** — not appropriate for outdoor, bright-sunlight usage context.

## Design Principles

1. **Uncompromising Field Usability.** Every tap target must be reachable one-handed. Every label must be readable in direct sunlight. Aesthetic choices never compromise these non-negotiables.
2. **Confidence in Connectivity.** Offline and sync state is never hidden. The user must always know: is my data safe? Is it synced? This context belongs in persistent, always-visible UI — not buried in a settings screen.
3. **Low Cognitive Load.** Long, multi-step forms must feel simple through progressive disclosure. The user should never have to think about where they are, what comes next, or whether they did something wrong.
4. **Premium Operational Polish.** The UI should feel as reliable and well-crafted as top-tier SaaS tools. Precision spacing, clear type hierarchy, and purposeful micro-states signal quality — even in a field context.
5. **Data Integrity Above All.** Submission states, loading states, error recovery, and empty states are first-class design problems — not afterthoughts. A field executive submitting a form in a remote village cannot afford ambiguity.

## Accessibility & Inclusion

- **High contrast mandatory:** Body text ≥ 4.5:1 against background; interactive elements ≥ 3:1. Outdoor readability requires even more headroom — aim for 7:1 on primary text.
- **Large tap targets:** All interactive elements ≥ 48pt × 48pt. Buttons and form fields at 48–56pt height minimum.
- **Reduced motion:** State-change animations only; no scroll-driven choreography. Field users are not watching the screen for delight — they are completing tasks.
- **Font size floor:** Body text minimum 14sp. Labels minimum 12sp. Nothing smaller — the environment degrades readability further than a controlled setting.
