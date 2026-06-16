# Bundled India boundary GeoJSON

These files drive the India-only Agri Intelligence Map (`/map`). They are served
statically from `/geo/*.geojson` and consumed by:

- `src/lib/indiaMask.ts` — loads `india-outline.geojson` to build the fog mask + glow border.
- `src/components/map/hooks/useDeckLayers.ts` — loads `india-districts.geojson` for the choropleth.

## Files

| File | Geometry | Props | Size | Purpose |
|------|----------|-------|------|---------|
| `india-outline.geojson` | 1 × MultiPolygon | `name` | ~13 KB | National border → inverse fog mask + luminous outline |
| `india-districts.geojson` | 759 × Polygon | `district`, `state` | ~450 KB | District choropleth fill (matched to `/api/geo/aggregate/` by district name) |

Bundling locally (vs an external GitHub URL) makes the map offline, fast, and not
dependent on third-party uptime.

## Source & official-boundary note

Derived from **[udit-001/india-maps-data](https://github.com/udit-001/india-maps-data)**
(`geojson/india.geojson`, Census-2011 districts), which models India's official
post-2019 administrative geography — Jammu & Kashmir and Ladakh as separate UTs,
full northern extent to ~37°N.

Processed with mapshaper:

```bash
# districts: simplify, rename st_nm -> state, drop unused fields
mapshaper india.geojson \
  -each 'state=st_nm, delete st_code, delete dt_code, delete year, delete st_nm' \
  -simplify 18% keep-shapes \
  -o format=geojson india-districts.geojson

# national outline: dissolve all districts, simplify, tag name=India
mapshaper india.geojson \
  -dissolve -simplify 8% keep-shapes -each 'name="India"' \
  -o format=geojson india-outline.geojson
```

> **Swappable:** For a Survey-of-India-certified boundary (or to add full Andaman &
> Nicobar / Lakshadweep extent), replace `india-outline.geojson` with a single
> MultiPolygon `FeatureCollection` and `india-districts.geojson` with polygons
> carrying a `district` property — no code changes required. The simplified outline
> here covers mainland + J&K/Ladakh; far-southern island detail is dropped (no
> agricultural data there).
