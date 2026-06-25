# Change Request Analysis: Mandi Updates UI Redesign

**Date:** 25 June 2026  
**Requested by:** Client  
**Reference:** `UI designs/ui change request.jpeg`  
**Prepared by:** FPS Engineering Team  
**Module affected:** Market Intelligence (Mandi)

---

## 1. What the Change Request Proposes

The submitted mockup proposes replacing the current **5-step multi-wizard Mandi Arrival form** with a **single-page "Mandi Updates" screen**. Key new UI elements include:

| New Element | Description |
|---|---|
| Chip/pill crop selector | Replace SmartDropdown with horizontal chip buttons (Teja, 334, 341, Armor, + अन्य) |
| Chip quality selector | Replace dropdown with pill buttons (Deluxe, Medium, Fatki, Fatki AC, + अन्य) |
| 2-tier pricing | Min Price + Max Price — replaces current 3-tier (Top / Mostly Sales / Bottom) |
| Dynamic entry table | In-page table showing added entries (Variety / Quality / Min / Max / Remove) |
| Market Trend indicator | New feature: Tej (High) / Stable / Low pill indicators |
| Voice input for remarks | Microphone icon on remarks field |
| Full bilingual UI | All labels shown in Hindi + English simultaneously |
| New header design | Notification bell icon + user avatar circle (R) replacing current header |
| Single-submit flow | "SUBMIT TODAY'S RATES" replacing the per-step wizard flow |

---

## 2. Magnitude of Work

**Overall Magnitude: MAJOR**

This is not a cosmetic update. It requires:

- Replacing a 6-file multi-step wizard with a completely different single-page component architecture
- Changing the data model (price fields)
- Adding two brand-new features (Market Trend, Voice Input)
- Implementing a full i18n/localization system across the entire app
- Updating navigation flow and hook/state logic
- Updating backend models, serializers, migrations, and API responses

It touches every layer of the stack: **mobile UI → navigation → state management → API → database schema → migrations**.

---

## 3. Screens Directly Affected

| Screen / File | Change Required | Effort |
|---|---|---|
| `screens/mandiArrival/MandiArrivalFormScreen.tsx` | Complete rewrite — wizard shell removed, replaced with single-page | High |
| `screens/mandiArrival/Step1_MandiDetails.tsx` | Absorbed into single page — file effectively deprecated | High |
| `screens/mandiArrival/Step2_CropVarieties.tsx` | Redesigned — 3-tier rate → 2-tier, dropdown → chip selectors | High |
| `screens/mandiArrival/Step3_SourceRemark.tsx` | Merged into single page | Medium |
| `screens/mandiArrival/Step4_Photos.tsx` | Not visible in new design — may be deprecated or hidden | Medium |
| `screens/mandiArrival/Step5_Location.tsx` | Not visible in new design — may be deprecated or hidden | Medium |
| `screens/mandiArrival/ReviewScreen.tsx` | Removed — no review step in new design | Low |
| `screens/mandiArrival/SuccessScreen.tsx` | May be retained, needs style update | Low |
| `screens/MandiListScreen.tsx` | Needs header + style update for consistency | Medium |
| `screens/MandiDetailScreen.tsx` | Needs header + style update for consistency | Medium |
| `screens/MandiEntryFormScreen.tsx` | Effectively replaced by the new single-page form | High |

**Total: 11 screens directly impacted**, 5 of which require complete rewrites.

---

## 4. Screens Indirectly Affected (Consistency Cascade)

The new design introduces a **new design language** (chip selectors, new header style, bilingual labels, voice input). If the Mandi module adopts this language, all other modules must follow for UI consistency. This creates a cascade effect:

| Module / Screen | Why Affected |
|---|---|
| `screens-v2/HomeScreen.tsx` | Header design change (bell icon + avatar) must be consistent |
| `screens-v2/SidebarContent.tsx` | Sidebar style update required |
| `screens/cropMonitoring/CropMonitoringFormScreen.tsx` + 3 steps | Same chip/pill pattern would be expected on crop selectors |
| `screens/cropMonitoring/CropMonitoringListScreen.tsx` | Header consistency |
| `screens/cropMonitoring/ReviewScreen.tsx`, `SuccessScreen.tsx` | Style consistency |
| `screens/productDemo/ProductDemoFormScreen.tsx` + 4 steps | Same chip pattern on crop/product selectors |
| `screens/productDemo/ProductDemoListScreen.tsx` | Header consistency |
| `screens/productDemo/ReviewScreen.tsx`, `SuccessScreen.tsx` | Style consistency |
| `screens-v2/LoginScreen.tsx`, `SignupScreen.tsx` | If design system updates, these must follow |
| `screens/ReportsScreen.tsx` | Header + tab consistency |
| `screens/ProfileScreen.tsx` | Header consistency |

**Total: ~18 additional screens indirectly affected** if UI consistency is maintained.

**Combined total: ~29 screens touched.**

---

## 5. Impact on Navigation Routes

Current navigation (`AppNavigatorV2.tsx`) has dedicated routes for each wizard step and sub-screen:

```
MandiArrivalForm → Step1 → Step2 → Step3 → Step4 → Step5 → Review → Success
```

The proposed single-page design collapses this entire flow. Required navigation changes:

| Change | Detail |
|---|---|
| Remove step routes | Step1–5 routes removed from `RootStackParamList` |
| Remove progress bar logic | `useMandiArrivalForm` hook rewritten or replaced |
| Single form route | `MandiArrivalForm` becomes a single-screen route |
| Possible new routes | Market Trend detail view (if expanded), Voice capture screen |
| Type file update | `navigation/types.ts` `RootStackParamList` must be updated |

The hook `useMandiArrivalForm` (which manages step state, field persistence, validation per step) will need **complete rewrite** — this is significant shared logic.

---

## 6. Impact on Database and Backend

### Database Schema Changes

| Table / Model | Current Field | Change |
|---|---|---|
| `MandiArrival` | — | Add `market_trend` (enum: Tej/Stable/Low) |
| `CropVarietyDraft` / `MandiVariety` | `top_rate`, `mostly_sales_rate`, `bottom_rate` | **Remove** and replace with `min_price`, `max_price` |
| `MandiArrival` | `source` (trader/farmer/official) | May be removed (not shown in new UI) |

**Breaking migration:** Removing `top_rate`, `mostly_sales_rate`, `bottom_rate` and replacing with `min_price`, `max_price` is a **destructive migration**. All existing records will need a backfill strategy or the old fields must be preserved for historical data integrity.

### Backend File Changes

| File | Change Required |
|---|---|
| `backend/mandi/models.py` | Add `market_trend` field, change rate fields |
| `backend/mandi/serializers.py` | Update to reflect new field structure |
| `backend/mandi/views.py` | Update validation logic, response shape |
| `backend/mandi/migrations/` | New migration files (at least 2) |
| `backend/mandi/admin.py` | Update admin list/detail views |
| Admin portal dashboard | Market Trend data may need to surface here |

### i18n / Localization Backend

The bilingual display (Hindi + English simultaneously) shown in the mockup suggests backend string responses may also need localization:
- Error messages
- Crop/variety names (stored in English, displayed in Hindi)
- Mandi location names

---

## 7. The Multilingual UI Problem (Critical)

The change request shows **all UI labels in both Hindi and English simultaneously** — this is not a language toggle, it is bilingual label display throughout the entire form.

Implementing this requires:

1. **i18n library** — add `react-i18next` (or equivalent) to the mobile app
2. **Extract all string literals** — every label, button, placeholder, and error message across all screens
3. **Create translation files** — `en.json` + `hi.json` (+ other regional languages shown in mockup)
4. **Update every screen** — replace hardcoded strings with `t('key')` calls
5. **Backend localization** — crop names, mandi names, error messages

This is **a separate project in itself**, estimated at 8–12 developer days minimum, and it affects **every single screen in the app** — not just Mandi.

If multilingual support is a firm requirement of this change, the scope expands to an **app-wide rewrite of all string handling**.

---

## 8. New Features Requiring Fresh Development

None of these exist anywhere in the current codebase:

| Feature | Complexity | Notes |
|---|---|---|
| **Market Trend Indicator** | Medium | New DB field + UI component + backend logic to compute/store |
| **Voice Input for Remarks** | Medium | Requires `expo-speech` or `react-native-voice`, new permissions, UI |
| **Dynamic In-page Entry Table** | Medium | Real-time list management within a single form (no wizard) |
| **Chip/Pill Selector Component** | Low-Medium | New reusable component needed for crop + quality selection |
| **Bilingual label display** | High | Full i18n system (see Section 7) |

---

## 9. UI Consistency: The Cascade Obligation

If the Mandi module is redesigned with this new design language (chips, inline tables, voice, bilingual labels, new header), **the rest of the app will look inconsistent** unless it is also updated.

The app currently has:
- Crop Monitoring module (3-step wizard with similar form patterns)
- Product Demo module (4-step wizard with similar form patterns)
- Screens-v2 auth + home screens (already partially redesigned)

Leaving Mandi with the new design while Crop Monitoring and Product Demo retain the old design creates a **fragmented UX** — users switching between modules will feel like they are in two different apps.

**To avoid this, the redesign must either:**
1. Be applied consistently to ALL modules (massive scope expansion), or
2. Be postponed until all modules are redesigned together as a unified effort.

There is no middle ground that results in a professional, consistent product.

---

## 10. Deployment Risk

The app is currently at **near-deployment stage**:
- v2 auth + home screens are live
- Mandi Arrival, Crop Monitoring, Product Demo modules are functionally complete
- Backend is deployed on Render
- QA / testing has been done on the current design

Introducing this change now creates the following risks:

| Risk | Severity |
|---|---|
| Breaking existing Mandi forms mid-QA | High |
| Database migration failure on production data | High |
| Navigation regression across modules | High |
| Introducing untested i18n code pre-deployment | High |
| UI inconsistency if only Mandi is updated | Medium |
| Delay to release date | High |
| Scope creep if consistency cascade is honoured | Critical |

**The app is close enough to deployment that any schema migration or wizard-collapse carries a real risk of breaking the codebase in ways that are non-trivial to reverse.**

---

## 11. Magnitude Classification

| Dimension | Rating |
|---|---|
| UI change | **Major** — new design language, chip selectors, bilingual labels |
| Navigation change | **Major** — wizard flow removed, route types change |
| State/hook logic change | **Major** — wizard hook complete rewrite |
| Backend change | **Major** — schema changes, new fields, migrations |
| Database change | **Major** — destructive field removals, backfill needed |
| New features introduced | **5 brand-new features** |
| Screens directly changed | **11** |
| Screens indirectly changed | **~18** |
| Total screens touched | **~29** |
| **Overall magnitude** | **MAJOR — near full-module rework with app-wide cascade** |

This is closer to **refreshing / reworking the app** than to a feature addition. It effectively proposes a v2.0 of the Mandi module, with side effects that force a v2.0 of the entire app's design system.

---

## 12. Time Estimate

| Work Item | Estimated Days |
|---|---|
| Mandi single-page form redesign (UI only) | 4–5 days |
| Chip/pill selector component (new reusable component) | 1–2 days |
| Dynamic in-page entry table | 2–3 days |
| Market Trend indicator (UI + backend) | 2–3 days |
| Voice input for remarks | 1–2 days |
| Backend schema changes + migrations | 2–3 days |
| Navigation refactor (remove wizard routes) | 1–2 days |
| Mandi list + detail screen updates | 1–2 days |
| i18n system setup (library + translation files) | 3–4 days |
| i18n text extraction — all screens | 5–7 days |
| Consistency updates — Crop Monitoring module | 3–5 days |
| Consistency updates — Product Demo module | 3–5 days |
| Consistency updates — Auth + Home screens | 1–2 days |
| QA and regression testing | 4–6 days |

| Scenario | Total Days | Total Weeks |
|---|---|---|
| **Mandi only** (no i18n, no consistency cascade) | **~14–20 days** | **3–4 weeks** |
| **Full scope** (i18n + app-wide consistency) | **~33–51 days** | **7–11 weeks** |

---

## 13. Summary Assessment

| Question | Answer |
|---|---|
| Is this closer to a redesign or a tweak? | **Redesign / rework** of the Mandi module |
| Does it affect only Mandi? | No — cascades to ~29 screens if consistency is maintained |
| Is the change major or minor? | **Major** |
| Is the app close to deployment? | Yes — high-risk timing |
| Does it break the database? | Yes — destructive field changes require careful migration |
| Does it introduce new features? | Yes — 5 new features not in the codebase |
| Could it break the codebase? | Yes — wizard hook rewrite, route type changes, schema migration all carry regression risk |
| Should it be implemented now (pre-deployment)? | **Not recommended** |
| Minimum safe version? | Mandi-only redesign (no i18n, no cascade) in a dedicated post-v1 sprint |

---

## 14. Recommendation

**Defer the full change request to a post-v1.0 release sprint.**

The product is at a stage where stability and shipping should take priority over redesign. The proposed change is architecturally significant enough that it warrants a planned sprint — not an inline modification to a near-complete codebase.

### If the client insists on something before deployment:

The lowest-risk cosmetic subset (2–3 days, no schema changes):
1. Visual polish — update colors, chip-style button variants, typography
2. Header avatar/bell icon visual update

### Do NOT attempt pre-deployment:
- Schema/database changes (`top_rate` → `min_price` migration)
- i18n/multilingual system
- Wizard-to-single-page collapse
- Market Trend feature
- Voice input

### Recommended path:
Plan a dedicated **v2.0 Mandi + Design System sprint** after v1.0 ships and is stable. Redesign all modules together with a consistent design system, and implement i18n as a first-class project — not as an afterthought bolted onto a single screen.
