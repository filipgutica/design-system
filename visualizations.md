# Data visualizations

Turn retrieved data into an inspectable snapshot and a readable visualization. Keep source queries, measurement semantics, and presentation separate.

## Establish the measurement

1. Read any supplied dashboard's live query definition and freeze its exact time bounds. State the population, grouping, unit, aggregation, sampling, and denominator before collecting a large dataset. Honor the team's chosen source: raw events, distinct entities, and aggregate counters answer different questions.
2. Discover the available source and its schema. Keep source-specific retrieval rules in the owning project. Use aggregate queries for counts and rankings; raw samples support inspection, not totals.
3. Retrieve every requested filter combination. Use one measurement contract throughout each view, including Total, every category, and Other. Reconcile grouped counts against an independent aggregate when available. Record unavailable checks rather than inferring zero or silently changing the source.

Proceed when the source and scope are explicit and the retrieved coverage supports the requested view. A discrepancy is a measurement investigation before it is a visual-design problem. Never fix a discrepancy with an unexplained multiplier.

## Build the view

Follow the repository's design system, or `~/design-language/DESIGN.md` when present. Inline views inherit host fonts and theme; standalone exports use the same design language's tokens. Use semantic success/warning/error colors with text labels. Preserve readability when fitting overview and detail together; relax height before shrinking table text below 12px or hiding requested rows.

- For additive count breakdowns with a group filter and a time picker, use the bundled renderer and [snapshot contract](visualizations/count-snapshots.md). It derives totals and percentages from the same cells, rejects incomplete or inconsistent input, and uses one render function for initial and interactive states.
- For latency, distributions, time series, or non-additive estimates, choose the appropriate chart and retain the same measurement and delivery checks. Do not force these into the count renderer or add percentile values together.

The count renderer accepts a normalized JSON snapshot; it does not query a provider:

```sh
node ~/design-language/visualizations/build-count-report.mjs snapshot.json report-inline.html --mode inline
node ~/design-language/visualizations/build-count-report.mjs snapshot.json report.html --mode standalone --tokens ~/design-language/tokens.css
```

Choose readable density for the actual number of items. Keep the overview and requested detail together without hiding important categories on narrow screens. The count-table layout and responsive behavior are described in the snapshot contract. Exact codes and category classes must have different labels.

## Verify and deliver

Read [delivery guidance](visualizations/delivery.md) for inline rendering, portable export, and the Claude UX brief.

Check the actual generated file in light and dark at desktop and mobile widths. Exercise every group/time combination present in the snapshot: summary totals, row coverage, percentage denominators, zero/empty states, and status colors must remain correct. Check initial DOM and accessibility text before scripts run as well as after changing filters.

Use a Claude UX subagent when requested, or when the host's design delegation rules require one. Give it the exact artifact and a way to render the full file; a reconstructed subset is not a review of the artifact. Report whether controls were exercised or only inferred. Apply concrete findings and recheck affected behavior; use another judging round only when requested or unresolved findings justify it.

Return the requested inline view and, when requested, a clickable standalone HTML file ready to attach elsewhere. Show the captured UTC window and snapshot behavior. Use synthetic data in reusable templates and public examples. Keep credentials out of exports and store live snapshots only in authorized destinations outside public repositories. Do not upload or publish an artifact merely because an export was requested.
