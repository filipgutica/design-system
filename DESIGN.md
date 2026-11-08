# Design language

A shared visual language for personal products, documentation, tools, mockups, and inline explainers. Claude and Codex follow this file. Take inspiration from the clarity and restraint of [Linear](https://linear.app/), [Codex](https://openai.com/codex/), [Director](https://director.sh/), and [T3 Code](https://t3.codes/): clear hierarchy, a balanced page frame, and real product evidence. Adapt their principles to the task; use original copy and assets.

## Scope and precedence

1. The user's current request wins.
2. A repository's own design system owns its tokens and components.
3. Other personal work follows this language. Use a consistent palette, type family, and component vocabulary across projects.

Interaction, flows, states, interface copy, and accessibility checks follow the `interface-design` skill (`~/.agents/skills/interface-design`). This file owns visual hierarchy and composition.

## Two layers

The language has a reusable core and a replaceable identity layer.

| Layer | What it holds | A new project |
| --- | --- | --- |
| Core | Tokens, depth, controls and their states, focus, motion, accessibility, and forced colors | Adopts it as is |
| Identity | The terminal folio look of the personal sites: the `~/name` header, the project registry, mono display headings, `##` section marks, and terminal plates | Replaces it with its own |

A new project keeps `tokens.css` unchanged and sets the identity inputs (`--project`, `--project-dark`, `--font-sans`, `--font-mono`, and `--accent-text` when the hue needs it) on `:root` in its own stylesheet. [Component specs](components.md) mark each component Core or Identity, and [decisions](decisions.md) record why each choice was made and which options were rejected. Read both before you build or change a component.

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

- `tokens.css`: a standalone snapshot of the values (the Graphite Indigo theme) owned by `@filipgutica/ui`. The identity inputs sit in one block at the top. Each line's `ui:` comment names the library variable for that token. Update it when the package values change.
- `components.md`: one spec for each component, with anatomy, tokens, states, keyboard and screen-reader behavior, motion, and forced colors. Read it for any component work.
- `components.html`: every component in each of its states, in plain HTML and CSS on `tokens.css`. Copy component markup and styles from there.
- `decisions.md`: the choices behind the components, and the options they replaced.
- `reference.html`: an application example, and a Foundations catalogue (`#foundations`) of every token: type, color with contrast, spacing, shape, borders, elevation, focus, and motion.
- `docs.html`: a balanced documentation shell and compact setup command.
- `product.html`: a restrained product-page hierarchy with illustrative product evidence.
- `DESIGN.md`: selection rules and acceptance criteria. It names tokens rather than repeating their values.

Personal sites import `@filipgutica/ui/themes/graphite-indigo.css` and the shared site helpers. The UI package owns the values and generation procedure.

Token names depend on where the page runs. This file uses the `tokens.css` names.

| Context | Variable names to write |
| --- | --- |
| Standalone HTML | The `tokens.css` names. Import or inline `tokens.css`, and copy component styles from `components.html`. |
| Site on `@filipgutica/ui` | The library variable in the `ui:` comment beside each `tokens.css` line, such as `--color-muted` for `--text-muted`. Some names are unchanged, such as `--text-sm`. When a comment names several, use the first. A `tokens.css` name that its comment does not list is undefined on a library site, and `var()` falls back without an error. The library draws the base focus ring only inside `.fg-site-docs`; elsewhere, write it yourself, exactly `outline: 2px solid var(--color-focus); outline-offset: 2px`. |
| Other repository | That repository's own tokens and components, matched to these roles by meaning. |
| Inline visual | The host's supplied CSS variables and font, with no separate page shell. |

## Core

### Character

Controls use quiet depth and familiar shapes: borderless surfaces with one tight shadow at rest that sink when pressed or filled in.

- **Quiet surfaces, clear hierarchy.** Neutral paper and graphite backgrounds, with color reserved for the project hue, links, and meaningful states. Contrast, type, alignment, and proximity carry the structure.
- **Purposeful space.** Compact elements within a group, larger gaps between groups. Every gap should help a reader understand a relationship.
- **Evidence before decoration.** Show the actual product, command, or example. Use restrained framing so the evidence remains the focal point.
- **Fewer competing choices.** Make the next useful action obvious and group secondary destinations separately.
- **Precise and readable.** Consistent edges, measured prose, tabular numbers, comfortable line height, and meaningful text contrast.

### Typography

- Use `--font-sans` for prose, h3 and below, labels, and controls, and `--font-mono` for code, identifiers, and keys. The identity layer decides where else mono appears.
- Controls and dense application content use `--text-md`; secondary text uses `--text-sm`. Paragraphs and substantial article text use `--text-reading` with `--leading`. Bound reading text with `--measure` and introductory copy to a slightly shorter line.
- Documentation titles use `--text-3xl`; section headings use `--text-xl` and sit above their content. Application titles use `--text-2xl` or smaller.
- Use `--weight-regular`, `--weight-medium`, and `--weight-semibold`. Keep the source text's case; never transform it. Sentence case and restrained tracking make hierarchy easier to scan.
- Use `--text-muted` for secondary information and metadata, and `--text` for essential labels and instructions.

### Theme and color

- Inline visuals inherit the host theme. They do **not** need an independent theme switch.
- Standalone pages follow the OS by default. A visible theme control is optional: include it when the user requests one, the product already has one, or choosing/comparing themes serves the task. Token inspection and UI-library documentation are valid uses; a simple chart or explainer usually is not.
- Existing products retain their theme preferences and persistence contracts. Where a standalone choice is needed, System removes the override and explicit Light/Dark choices set it. Wrap storage access in try/catch.
- Use neutral `--bg`, `--surface`, and `--surface-raised` (paper in light, graphite in dark) to separate regions. Use `--text` and `--text-muted` for the main hierarchy.
- Each project sets one hue, and `--accent` follows it. The hue fills the one primary action in each decision group, and marks identity and selection: current items, the selected tab's text, and checked or selected controls. It is never a fill for secondary buttons, cards, or wells. Check it at 3:1 for marks and bars, and at 4.5:1 wherever it colours text, on every surface it sits on. `--accent-text` on an `--accent` fill must reach 4.5:1 for each hue; a hue that misses does not colour text or carry a label there.
- `--link` identifies links; underline prose links. `--focus` outlines keyboard focus on links, navigation rows, tabs, listbox options, and list rows; controls that act or set a value focus in `--accent` (see [focus](components.md#rules-for-every-control)). Where color marks a checked or selected state, use `--accent`; `--link` and `--focus` never mark one.
- Navigation and selection: the current page and the selected tab take the same quiet lifted fill, tinted faintly with the accent, with accent text where it reaches 4.5:1 on that fill (another readable colour otherwise), and no underline; an in-page location takes a short accent pip without a fill; a selected list row takes a 2px accent bar on its leading edge. Keep raised-control hover and keyboard focus separate from these states. [Component specs](components.md#navigation-list) give the values.
- Status colors mean state and have a text or icon label. Status surfaces are soft tints of their status color (the `--*-soft` tokens). Outside badges and the danger button label, status foreground colors go on icons; numbers and labels beside them stay in `--text` or `--text-muted`. Keep restrained syntax colors separate from the action palette.
- Verify light and dark appearance where supported, regardless of whether a switch is visible. Check text contrast rather than assuming a muted token is accessible at every size.

### Layout and spacing

- Use the `--space-*` rhythm and flex/grid `gap`. Use smaller gaps within a group and larger gaps between groups. Documentation sections use `--space-12`, stepping down to `--space-8` on phones. Product sections use `--space-24` total separation, stepping down to `--space-16` at tablet width. Give each section gap one owner so adjoining padding does not double it.
- Product pages use `--page-wide`; documentation uses `--page-max`, optionally combined with a thin navigation column. Center the combined shell, not only the article inside an edge-pinned sidebar.
- Tool and docs introductions stay compact. Preserve the direct route to install commands and useful captures.
- Use two named breakpoints. Write desktop styles first, then override them at these widths:

  | Name | Media query | What changes |
  | --- | --- | --- |
  | Tablet | `@media (max-width: 800px)` | Multi-column layouts become one content column. Touch controls use `--control-lg`. |
  | Phone | `@media (max-width: 640px)` | Side gutters drop from `--space-6` to `--space-4`, and section gaps take their phone step. |

  Use `@media (min-width: 801px)` only for a rule that applies to desktop alone. One documented exception: the tool-home hero (`.fg-site-hero` in `@filipgutica/ui`) splits at `@media (min-width: 1024px)`, with the title across the top, the lede on the left, and the install block and facts on the right. Below 1024px it stacks in source order. `@filipgutica/ui` also ships 680px rules for its own site header, prose title and definitions (`max-width: 680px`, with `min-width: 681px` for frame padding); they belong to the library, so pages add no viewport breakpoint beyond the table and the hero split. A pane that must collapse at its own width uses a container query, as the detail column in `reference.html` does.
- Navigation can become a drawer or a native scrolling section strip. A sticky side rail taller than the window scrolls its link list, not the element that draws its divider, so an overlay scrollbar sits clear of the line; `UiSiteNav` does this. Keep wide code, tables, and charts scrolling inside their containers.
- Keep main headings, actions, and product evidence visible on load. Scrolling should reveal more content without being required to make existing content appear.

### Surfaces

- Start with headings, content, and whitespace. Use a `--border-subtle` divider where it clarifies a boundary.
- Each surface role has one recipe:

  | Role | Use for | Fill | Border | Radius | Shadow |
  | --- | --- | --- | --- | --- | --- |
  | Page | The canvas and example stages | `--bg` | None | None | None |
  | Well | Source code, screenshots, figures, and inset previews other than example stages | `--surface` | Source code: transparent 1px; figures: `--border-subtle` | `--radius-lg` | Source code: `--shadow-surface`; figures: none |
  | Panel | Cards, forms, charts, and detail views | `--surface-raised` | Transparent 1px | `--radius-lg` | `--shadow-surface` |
  | Field | Inputs, selects, textareas, segmented and switch tracks, and selected radio cards | `--field` | `--field-edge` for fields; transparent 1px otherwise | Fields: `--radius-field`; tracks: `--radius-md`; radio cards: `--radius-lg` | `--shadow-sink` |
  | Floating layer | Menus, popovers, pickers, and dialogs | `--surface-raised` | Transparent 1px; the shadow's ring draws the edge | `--radius-lg` | `--shadow-popover` |

- Borders stay 1px and transparent on buttons, quiet actions, tracks, panels, and radio cards, so forced colors can draw them. Fields keep `--field-edge`. `--border` keeps unchecked checkbox and radio edges visible. The toggle card is a named exception: a visible `--border-subtle` edge and no rest raise. Invalid fields show a `--danger` edge, except in forced colors, where the system edge wins. Figures, example frames, and dividers use `--border-subtle`.
- Radii: `--radius-sm` for inline elements and checkboxes; `--radius-field` for fields, navigation rows, tabs, and toggle cards; `--radius-md` (a pill) for buttons and segmented controls; `--radius-lg` for wells, example frames, plates, panels, radio cards, alerts, and floating layers; `--radius-pill` for badges and switch tracks. Inner menu rows take the panel radius minus `--space-1`.
- Avoid nesting panels. Cards are for a few parallel self-contained options that a reader compares. Running prose belongs in open sections. Product screenshots need one frame, not a frame around a frame.
- [Depth](#depth) gives each role its shadow. Stable hover states keep normal content quiet.

### Depth

Each depth tier has one token. [`tokens.css`](tokens.css) holds every shadow value, including the dark ones. Pages and components use the tokens and write no shadow of their own. Only zero-blur lines in a token colour are exempt: focus rings, dividers, and selection bars.

| Tier | Token | Use for |
| --- | --- | --- |
| Control | `--shadow-raise` | Idle buttons, unselected radio cards, switch knobs, segmented thumbs, and focused fields |
| Container | `--shadow-surface` | Panels, cards, source code (not inside an example frame), command plates, and terminal captures |
| Pressed or well | `--shadow-sink` | Fields, tracks, pressed buttons, and selected radio cards |
| Selected row | `--shadow-nav-current` | The current navigation row and the selected tab |
| Floating | `--shadow-popover` | Menus, popovers, pickers, and dialogs |

- Idle controls and containers take no outer light highlight and no blur wider than 2px. In dark mode, controls take a faint inset top edge and containers a faint 1px ring, so no halo shows.
- A pressed button sinks and moves 1px down; see [Button](components.md#button).

### Components

[`components.md`](components.md) specifies each component and [`components.html`](components.html) shows its states. These composition rules apply across them:

- Build each control from the owning library's component or class, and style a link that acts as a button with the button's classes. A page adds layout only: size, spacing, and position. A local copy of a control drifts from the library, even when it uses the same tokens.
- One clearly primary action per visible decision group, filled with the hue. Other actions are secondary, ghost, or text buttons.
- Use a segmented control for two to five short options that apply at once, a select for longer lists, and radio cards for options that need descriptions.
- Callouts carry a real caveat, not decorative emphasis.
- Lists and properties: align short labels, values, and metadata. Use definition lists for terms and short meanings; use tables for actual comparisons.
- Figures: number them when the prose refers to any of them, and then number them all. Place a figure beside the paragraph that explains it, once the terms it uses have been introduced.
- Source code sits in a theme-matched well with syntax colours; multiline samples may have a small descriptive header and Copy action. Put useful setup context above a command; omit repeated language labels.
- Examples: show a live component on a stage above its code, in one frame, with Copy in the code's corner. The stage sits on the page background. See [example](components.md#example).
- A screenshot opens at full size when clicked; use a native accessible trigger and restore its focus on close.

### Interaction and motion

- Show visible focus and accessible names. A visual simplification must preserve useful controls, caveats, and keyboard paths.
- Controls draw one `--accent` ring (2px, 2px offset) with no glow, over their own raise or sink shadow. Fields (input, select, textarea) draw no ring: they lift out of their well onto the control surface, which is below 3:1 by choice (see [known gaps](decisions.md#known-gaps)). Both keep a ring in forced colors. Links, navigation rows, tabs, listbox options, and list rows keep `outline: 2px solid var(--focus); outline-offset: 2px`, which the `tokens.css` base sets. [Component specs](components.md#rules-for-every-control) give the values. Use an inset offset (`-2px`) only where a scrolling or clipping parent would cut the ring, or inside a segmented control; add a comment that names the reason. Keep page-wide defaults in `@layer base`, so a component's own focus rule can refine them. Pointer hover never draws the outline.
- Keep product navigation distinct from in-page section links. Current-page and current-section indicators serve different purposes. Open sibling project links in the same tab; indicate a new tab only when the link opens one.
- Use `--duration-fast` for hover/press and `--duration` for menus/panels. Animate opacity or transform only where it explains a state change. A component spec may set its own timing, as the segmented control's glide does.
- Keep content visible without reveal effects, entrance sequences, or continuous decorative animation. Honor reduced motion, including anchor scrolling.
- An interactive figure first renders as complete static content, so it reads the same without JavaScript; enhancement adds controls, not information. Give each state a text label and announce live results politely. A lesson needs one interactive figure at most; keep the rest static.
- Data views account for loading, empty, error, and recovery states. Heuristics guide design; browser evidence validates the result.

### Copy and density

- Lead with a plain description and a useful action. Keep one idea per short paragraph. Product pages can explain value without unsupported superlatives or invented statistics.
- Say each point once. Put exact payloads, logs, or long reference text behind a useful disclosure when appropriate.
- Keep table cells short. Put rules, thresholds, and caveats next to what they govern.
- Label illustrative data and demo outcomes clearly. Credit upstream creators when presenting a derivative product.
- Use monochrome line icons sparingly; give an icon a purpose beyond filling space.

## Identity layer: terminal folio

The personal sites are terminal tools that read Markdown and paths, so their identity comes from that world. A new project replaces this section with its own identity and keeps the core.

- **Mono identity.** `--font-mono` (IBM Plex Mono) sets identity, page and section headings, navigation rails, metadata, captions, and the footer. `@filipgutica/ui` self-hosts IBM Plex; elsewhere the tokens fall back to the system stack.
- **Headings.** Documentation titles and section headings are mono. A section heading starts with a `##` mark in `--accent` (decorative, so screen readers skip it), with a `--border-subtle` rule above the section. Product pages and tool homes may use a mono `--text-display` title, stepping down to `--text-display-sm` on phones; keep a short heading measure, place supporting copy and the primary action nearby, and let the first product image enter the initial desktop viewport.
- **Hue marks.** The hue also draws the `~/` header mark, the `##` section mark, step numbers, and the `$` prompt.
- **Header.** Personal product sites share a compact static header: a mono `~/name` identity with the `~/` in `--accent`, a project switcher, useful page links, appearance controls, and a solid `--text` rule below. Use the shared project registry for names, order, and destinations. Keep a gallery's existing application navigation structure.
- **Appearance.** Personal pages share the built-in System/Light/Dark choice, through the header's picker. An explicitly selected custom gallery theme overrides that choice until the reader selects a built-in appearance. Preserve installed themes.
- **Terminal plates.** Commands sit on a dark plate tinted with the project hue (`--command-bg`), in both themes. A shell command gets a `$` prompt in `--project-dark`, drawn by CSS so it never enters copied or accessible text. Short commands use a headerless compact row with an accessible Copy control. Terminal captures keep the neutral `--terminal` plate, with a mono status-line caption below the screen; tabs on a capture switch to mono.
- **Steps.** A real sequence is an ordered list with mono numbers in `--accent` on a ruled leading column, an h3 title per step, and an optional result note on the last step.

## Avoid recurring clutter

- Decorative eyebrows, numbered markers on unordered content, and badge rows that repeat the title.
- Multiple cards around ordinary prose, ornamental grids, glows, gradients, pill-shaped cards, and hover lifts.
- Tinted wells or panels used for decoration. The hue-tinted command plate is the one tinted surface, because it carries the project's identity.
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
- [ ] Every control is the owning system's component or class, never a local copy built from its tokens; spacing uses its tokens; each panel and visual effect has a purpose.
- [ ] Control states match between `components.html`, the example pages, and the owning library: hover, press, focus, disabled, busy, invalid, and forced colors.
