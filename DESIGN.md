# Design language

A shared visual language for personal products, documentation, tools, mockups, and inline explainers. Claude and Codex follow this file. Take inspiration from the clarity and restraint of [Linear](https://linear.app/), [Codex](https://openai.com/codex/), [Director](https://director.sh/), and [T3 Code](https://t3.codes/): clear hierarchy, a balanced page frame, and real product evidence. Adapt their principles to the task; use original copy and assets.

## Scope and precedence

1. The user's current request wins.
2. A repository's own design system owns its tokens and components.
3. Other personal work follows this language. Use a consistent palette, type family, and component vocabulary across projects.

Interaction, flows, states, interface copy, and accessibility checks follow the `interface-design` skill (`~/.agents/skills/interface-design`). This file owns visual hierarchy and composition.

## Apply the right format

Choose the format before styling. A public product page and an application screen need different density.

| Format | Composition | First useful content |
| --- | --- | --- |
| Product page | Centered wide frame, compact top navigation, expressive heading, left-aligned copy | Product purpose, one primary action, real product image |
| Documentation or CLI tool | Centered frame containing navigation and article; compact heading and readable prose | Setup command or the information needed for the task |
| Lesson or long-form article | Documentation frame; prose at `--measure`, figures may use the full article width | The question the lesson answers, a short contents list, then the first idea |
| Application | Task-sized navigation and content panes; compact controls and rows | Working content and its relevant actions |
| Inline visualization | Fit the conversation width and inherit the host appearance | The comparison, explanation, or interaction itself |

For data-driven charts, filterable reports, or portable HTML artifacts, read [Data visualizations](visualizations.md). It owns measurement consistency, reusable count rendering, filter checks, and inline/standalone delivery. Project-specific source queries stay in the owning project.

Center the **container**, not every sentence. Align header, content, images, and footer to deliberate shared edges. Bound prose with `--measure`; let useful images, tables, and component previews use the available frame.

## Files and examples

- `tokens.css`: generated standalone snapshot of the Terminal folio values (the Graphite Indigo theme) owned by `@filipgutica/ui`. Each line's `ui:` comment names the library variable for that token. Regenerate it when the package values change.
- `reference.html`: application components and token inspection.
- `docs.html`: a balanced documentation shell and compact setup command.
- `product.html`: a restrained product-page hierarchy with illustrative product evidence.
- `DESIGN.md`: selection rules and acceptance criteria. It names tokens rather than repeating their values.

Personal sites import `@filipgutica/ui/themes/graphite-indigo.css` and the shared site helpers. The UI package owns the values and generation procedure.

Token names depend on where the page runs. This file uses the `tokens.css` names.

| Context | Variable names to write |
| --- | --- |
| Standalone HTML | The `tokens.css` names. Import or inline `tokens.css` and copy the matching example's component styles. |
| Site on `@filipgutica/ui` | The library variable in the `ui:` comment beside each `tokens.css` line, such as `--color-muted` for `--text-muted`. Some names are unchanged, such as `--text-sm`. When a comment names several, use the first. A `tokens.css` name that its comment does not list is undefined on a library site, and `var()` falls back without an error. |
| Other repository | That repository's own tokens and components, matched to these roles by meaning. |
| Inline visual | The host's supplied CSS variables and font, with no separate page shell. |

## Character

The look is a **terminal folio**: the products are terminal tools that read Markdown and paths, so their identity comes from that world. Mono type carries identity and structure, a dark terminal plate holds commands and captures, and each project has one hue.

- **Quiet surfaces, clear hierarchy.** Neutral paper and graphite backgrounds, with color reserved for the project hue, links, and meaningful states. Contrast, type, alignment, and proximity carry the structure.
- **Purposeful space.** Compact elements within a group, larger gaps between groups. Every gap should help a reader understand a relationship.
- **Evidence before decoration.** Show the actual product, command, or example. Use restrained framing so the evidence remains the focal point.
- **Fewer competing choices.** Make the next useful action obvious and group secondary destinations separately.
- **Precise and readable.** Consistent edges, measured prose, tabular numbers, comfortable line height, and meaningful text contrast.

## Typography

- Use `--font-mono` (IBM Plex Mono) for identity, page and section headings, navigation rails, metadata, captions, code, identifiers, and keys. Use `--font-sans` (IBM Plex Sans) for prose, h3 and below, labels, and controls. `@filipgutica/ui` self-hosts both; elsewhere the token falls back to the system stack.
- Controls and dense application content use `--text-md`; secondary text uses `--text-sm`. Paragraphs and substantial article text use `--text-reading` with `--leading`. Bound reading text with `--measure` and introductory copy to a slightly shorter line.
- Documentation titles use `--text-3xl` in mono. Section headings use `--text-xl` in mono, preceded by a `##` mark in `--accent` (decorative, so screen readers skip it) and a `--border-subtle` rule above the section. Headings sit above their content. Application titles use `--text-2xl` or smaller.
- Product pages and tool homes may use a mono `--text-display` title, stepping down to `--text-display-sm` on phones. Keep a short heading measure and place supporting copy and the primary action nearby. The first product image should enter the initial desktop viewport.
- Use `--weight-regular`, `--weight-medium`, and `--weight-semibold`. Keep the source text's case; never transform it. Sentence case and restrained tracking make hierarchy easier to scan.
- Use `--text-muted` for secondary information and metadata, and `--text` for essential labels and instructions.

## Theme and color

- Inline visuals inherit the host theme. They do **not** need an independent theme switch.
- Standalone pages follow the OS by default. A visible theme control is optional: include it when the user requests one, the product already has one, or choosing/comparing themes serves the task. Token inspection and UI-library documentation are valid uses; a simple chart or explainer usually is not.
- Existing products retain their theme preferences and persistence contracts. Where a standalone choice is needed, System removes the override and explicit Light/Dark choices set it. Wrap storage access in try/catch.
- Use neutral `--bg`, `--surface`, and `--surface-raised` (paper in light, graphite in dark) to separate regions. Use `--text` and `--text-muted` for the main hierarchy.
- Each project sets one hue as `--project` (with `--project-dark` for the terminal plate), and `--accent` follows it. The hue marks identity and selection: the `~/` header mark, the `##` section mark, current-item bars, the current tab underline, the `$` prompt, and checked or selected controls. It is never a fill for buttons, cards, or wells. Check it at 3:1 for marks and bars and 4.5:1 wherever it colours text, on every surface it sits on. A hue that misses 4.5:1 on a surface does not colour text there.
- Primary actions are ink on paper: a `--text` fill with `--bg` text, and `--text-muted` on hover, in both themes. `--link` and `--focus` identify links and keyboard focus. Underline prose links. Navigation rows use neutral `--row-hover` and persistent `--row-selected` (the raised surface). Mark the current destination with a 2px inset `--accent` bar and medium text weight. Put the bar on the left of vertical route lists and below horizontal project strips. In-page location links use the 2px bar without the fill. Hover on the current destination retains its selected fill. List and table selection uses the same recipe: `--row-selected` fill plus the 2px accent bar on the leading edge. Where color marks a checked or selected state, such as a checkbox, a radio choice, or the selected-row bar, use `--accent`; `--link` and `--focus` never mark one. Selected tabs take a 2px `--accent` underline and `--text`; hover changes only the text colour. A pressed segment is a `--surface-raised` thumb on a `--surface-hover` track. Keep raised-control hover (`--surface-hover`) and keyboard focus separate from navigation states. Keep restrained syntax colors separate from the action palette. Status colors mean state and have a text or icon label. Status surfaces are `--surface-raised` with a status-coloured border, never a tint. Small status labels use the normal text foreground over a neutral raised fill with a status-coloured border. Status foreground colors go on icons; numbers and labels beside them stay in `--text` or `--text-muted`.
- Verify light and dark appearance where supported, regardless of whether a switch is visible. Check text contrast rather than assuming a muted token is accessible at every size.

## Layout and spacing

- Use the `--space-*` rhythm and flex/grid `gap`. Use smaller gaps within a group and larger gaps between groups. Documentation sections use `--space-12`, stepping down to `--space-8` on phones. Product sections use `--space-24` total separation, stepping down to `--space-16` at tablet width. Give each section gap one owner so adjoining padding does not double it.
- Product pages use `--page-wide`; documentation uses `--page-max`, optionally combined with a thin navigation column. Center the combined shell, not only the article inside an edge-pinned sidebar.
- Tool and docs introductions stay compact. Preserve the direct route to install commands and useful captures.
- Use two named breakpoints. Write desktop styles first, then override them at these widths:

  | Name | Media query | What changes |
  | --- | --- | --- |
  | Tablet | `@media (max-width: 800px)` | Multi-column layouts become one content column. Touch controls use `--control-lg`. |
  | Phone | `@media (max-width: 640px)` | Side gutters drop from `--space-6` to `--space-4`, and section gaps take their phone step. |

  Use `@media (min-width: 801px)` only for a rule that applies to desktop alone. One documented exception: the tool-home hero (`.fg-site-hero` in `@filipgutica/ui`) splits at `@media (min-width: 1024px)`, with the title across the top, the lede on the left, and the install block and facts on the right. Below 1024px it stacks in source order. `@filipgutica/ui` also ships 680px rules for its own site header, prose title and definitions (`max-width: 680px`, with `min-width: 681px` for frame padding); they belong to the library, so pages add no viewport breakpoint beyond the table and the hero split. A pane that must collapse at its own width uses a container query, as the detail column in `reference.html` does.
- Navigation can become a drawer or a native scrolling section strip. Keep wide code, tables, and charts scrolling inside their containers.
- Keep main headings, actions, and product evidence visible on load. Scrolling should reveal more content without being required to make existing content appear.

## Surfaces and components

- Start with headings, content, and whitespace. Use a `--border-subtle` divider where it clarifies a boundary.
- Each surface role has one recipe:

  | Role | Use for | Fill | Border | Radius | Shadow |
  | --- | --- | --- | --- | --- | --- |
  | Page | The canvas | `--bg` | None | None | None |
  | Well | Source code, screenshots, figures, and inset previews | `--surface` | `--border-subtle` | `--radius-lg` | None |
  | Panel | Cards, forms, charts, and detail views | `--surface-raised` | `--border-subtle` | `--radius-lg` | None |
  | Floating layer | Menus, popovers, pickers, and dialogs | `--surface-raised` | Included in the shadow | `--radius-lg` | `--shadow-popover` |
  | Terminal plate | Command lines and terminal captures, in both themes | `--terminal` | `--terminal-border` | `--radius-lg` | None |

- `--border` is for control edges only: buttons, inputs, and selects. Panels, wells, and dividers use `--border-subtle`.
- Radii are small and square: `--radius-sm` and `--radius-md` (2px) for inline elements, badges, controls, callouts, and rows; `--radius-lg` (3px) for wells, plates, panels, and floating layers. `--radius-pill` stays at 2px for compatibility; nothing is pill-shaped.
- Avoid nesting panels. Cards are for a few parallel self-contained options that a reader compares. Running prose belongs in open sections. Product screenshots need one frame, not a frame around a frame.
- Shadows belong to floating layers. Modest radii and stable hover states keep normal content quiet.
- Buttons: one clearly primary action per visible decision group; secondary actions are quieter. Touch controls use `--control-lg`.
- Code: commands sit on a terminal plate. A shell command gets a `$` prompt in `--project-dark`, drawn by CSS so it never enters copied or accessible text. Source code sits in a theme-matched well with syntax colours and no prompt; multiline samples may have a small descriptive header and Copy action. Short commands use a headerless compact row with an accessible Copy control. Put useful setup context above the row; omit repeated language labels.
- Steps: a real sequence is an ordered list with mono numbers in `--accent` on a ruled leading column, an h3 title per step, and an optional result note on the last step.
- Lists and properties: align short labels, values, and metadata. Use definition lists for terms and short meanings; use tables for actual comparisons.
- Tabs: underline tabs in the control font with an `--accent` underline on the current tab, or segmented controls, with keyboard support. Tabs on a terminal capture switch to mono. Terminal captures use the terminal plate, with a mono status-line caption below the screen. A screenshot opens at full size when clicked; use a native accessible trigger and restore its focus on close.
- Callouts: short text plus an icon where useful. Status surfaces communicate a real caveat, not decorative emphasis.
- Figures: one quiet frame (`--surface`, subtle border, `--radius-lg`) with the caption below it in `--text-sm` muted text. Number figures when the prose refers to any of them, and then number them all. Place a figure beside the paragraph that explains it, once the terms it uses have been introduced. Let wide figures scroll inside the plate.

## Interaction and motion

- Show visible focus and accessible names. A visual simplification must preserve useful controls, caveats, and keyboard paths.
- Draw keyboard focus as `outline: 2px solid var(--focus); outline-offset: 2px`; the `tokens.css` base sets it. Use an inset offset (`-2px`) only where a scrolling or clipping parent would cut the ring, and add a comment that names that parent. Do not draw focus with `box-shadow`: forced-colors mode removes it. Pointer hover never draws the outline; it appears only for `:focus-visible`. Hover changes a fill, or the text colour where a component says so, such as tabs.
- Personal product sites share a compact static header: a mono `~/name` identity with the `~/` in `--accent`, a project switcher, useful page links, appearance controls, and a solid `--text` rule below. Use the shared project registry for names, order, and destinations. Keep a gallery's existing application navigation structure.
- Keep product navigation distinct from in-page section links. Current-page and current-section indicators serve different purposes. Open sibling project links in the same tab; indicate a new tab only when the link opens one.
- Personal Pages share the built-in System/Light/Dark choice. An explicitly selected custom gallery theme overrides that choice until the reader selects a built-in appearance. Preserve installed themes.
- Use `--duration-fast` for hover/press and `--duration` for menus/panels. Animate opacity or transform only where it explains a state change.
- Keep content visible without reveal effects, entrance sequences, or continuous decorative animation. Honor reduced motion, including anchor scrolling.
- An interactive figure first renders as complete static content, so it reads the same without JavaScript; enhancement adds controls, not information. Give each state a text label and announce live results politely. A lesson needs one interactive figure at most; keep the rest static.
- Data views account for loading, empty, error, and recovery states. Heuristics guide design; browser evidence validates the result.

## Copy and density

- Lead with a plain description and a useful action. Keep one idea per short paragraph. Product pages can explain value without unsupported superlatives or invented statistics.
- Say each point once. Put exact payloads, logs, or long reference text behind a useful disclosure when appropriate.
- Keep table cells short. Put rules, thresholds, and caveats next to what they govern.
- Label illustrative data and demo outcomes clearly. Credit upstream creators when presenting a derivative product.
- Use monochrome line icons sparingly; give an icon a purpose beyond filling space.

## Avoid recurring clutter

- Decorative eyebrows, numbered markers on unordered content, and badge rows that repeat the title.
- Multiple cards around ordinary prose, ornamental grids, glows, gradients, tinted wells, pill shapes, and hover lifts.
- Display typography on dense tool screens, or tiny application typography on a product landing page.
- Large blank gaps that push the action or evidence away from the introduction.
- Centered long paragraphs, excessively faint text, and horizontal page overflow.
- Theme controls added automatically to inline charts and explainers.

## Acceptance

- [ ] The format matches the reader's task, and the next useful action is clear.
- [ ] Header, content, imagery, and footer have deliberate shared edges; wide-screen margins feel balanced.
- [ ] Typography distinguishes title, section, body, and metadata without competing focal points.
- [ ] Product evidence is real or clearly illustrative; factual caveats and attribution remain present.
- [ ] Both supported themes are readable, with theme controls only where useful.
- [ ] At 390, 720, and 1280 px wide there is no horizontal page scroll, and the page's own viewport media queries use only `max-width: 640px`, `max-width: 800px`, `min-width: 801px`, and the documented `min-width: 1024px` hero split.
- [ ] Keyboard, focus, touch, deep links, and reduced motion work across relevant states.
- [ ] Controls and spacing use the owning system's tokens; each panel and visual effect has a purpose.
