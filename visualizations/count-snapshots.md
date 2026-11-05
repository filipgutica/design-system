# Count snapshot contract

The bundled renderer is for additive, nonnegative integer counts. It is not a general chart schema. Convert provider results into this shape after checking their source semantics and coverage.

```json
{
  "schemaVersion": 1,
  "title": "Example API responses (synthetic)",
  "filterLabel": "Region",
  "dimensionLabel": "Endpoint",
  "capturedAt": "2026-01-08T12:05:00Z",
  "source": {
    "provider": "synthetic",
    "dataset": "example traces",
    "basis": "Spans -> Count",
    "unit": "retained spans",
    "sampling": "Synthetic fixture; no live data",
    "scope": "POST query endpoints only",
    "query": "Example aggregate grouped by region, endpoint, HTTP code"
  },
  "categories": [
    {"key": "200", "label": "200", "tone": "success"},
    {"key": "408", "label": "408", "tone": "warning"},
    {"key": "500", "label": "500", "tone": "danger"},
    {"key": "other", "label": "Other", "tone": "neutral"}
  ],
  "defaultWindow": "hour",
  "windows": [{
    "key": "hour", "label": "Last hour",
    "from": "2026-01-08T11:00:00Z", "to": "2026-01-08T12:00:00Z",
    "complete": true,
    "referenceCounts": {"200": 90, "408": 7, "500": 1, "other": 2},
    "rows": [{"region": "example-east", "endpoint": "POST /query",
      "counts": {"200": 90, "408": 7, "500": 1, "other": 2}}]
  }]
}
```

`source` is one measurement contract for the entire report. Use separate reports for different bases or populations. `query` records the base query plus a description of time/grouping substitutions; `url` is an optional HTTP(S) verification link. Avoid secret-bearing or tenant-sensitive URLs in exports intended for wider sharing.

Each category is mutually exclusive and the categories exhaust the included population. Normalize remaining values into Other when needed. The renderer derives Total by summing categories, never from a separately sourced denominator. It validates required provenance, UTC bounds, exact category coverage, duplicate group/item cells, safe integers, completeness, and optional aggregate reconciliation. This cannot prove the inputs came from the declared source; inspect the raw query results too.

`complete: true` means all applicable groups/pages were retrieved. Missing data, errors, capped results, or unknown coverage cannot be represented by zero. A confirmed zero has an explicit `0`. An empty `rows` list means a verified empty population and displays an empty state.

`referenceCounts`, when supplied, contains an independently retrieved aggregate for the same source/scope/window and must match exactly. When unavailable, omit it; the report visibly states that no independent aggregate was supplied. Investigate discrepancies rather than overwriting reference counts to force a pass. If live queries cannot share a stable snapshot, record the limitation and choose a reproducible capture before presenting reconciled values.

Each row has a filter group in `region` and a row item in `endpoint`; the field names are fixed, and `filterLabel` (default "Group") and `dimensionLabel` (default "Item") name them for readers. One row is one group/item pair per window. Different windows can contain different items. All windows end at or before `capturedAt`; time labels are exact UTC bounds, not live relative queries. Last hour/day/2 days/week are useful presets when requested, not universal defaults.

The initial view and picker updates use the same rendering function. Overall percentages divide by the selected group/window's total; row percentages divide by that item's total in the selection. Empty denominators display an em dash. Exact 100% is reserved for a complete share; tiny positive percentages remain visible.

Keep counts with row-specific percentages beside them on desktop, align numeric columns, mute zeros, and wrap item labels at `/` and `.`. On narrow screens the renderer presents each row with all categories visible and percentages below counts; it does not require scrolling sideways to reach errors. Both layouts use the same cells and percentage function.
