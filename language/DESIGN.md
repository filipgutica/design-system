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

A new project keeps `tokens.css` unchanged and sets the identity inputs (`--color-project`, `--color-project-dark`, `--font-ui`, `--font-mono`, and `--color-accent-text` when the hue needs it) on `:root` in its own stylesheet. [Component specs](components.md) mark each component Core or Identity, and [decisions](decisions.md) record why each choice was made and which options were rejected. Read both before you build or change a component.

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

- `tokens.css`: the values of the default theme, Graphite Indigo, generated from the token source (`tokens/core.json` and `tokens/themes/graphite-indigo.json`) in `@filipgutica/design-system`. Other themes ship as `themes/<id>.css`, which set only the identity inputs; load one after `tokens.css`, on `:root`. To change a value, edit the JSON there and run `pnpm tokens:build`; do not edit `tokens.css` by hand. The identity inputs sit in one block at the top. Each line's `ui:` comment lists the library variables that carry that value, the line's own name first.
- `components.md`: one spec for each component, with anatomy, states, Do and Don't lines, keyboard and screen-reader behavior, motion, and forced colors. Read it for any component work.
- `components.html`: every component in each of its states, in plain HTML and CSS on `tokens.css`. Copy component markup and styles from there.
- `decisions.md`: the choices behind the components, and the options they replaced.
- `reference.html`: an application example, and a Foundations catalogue (`#foundations`) of every token: type, color with contrast, spacing, shape, borders, elevation, focus, and motion.
- `docs.html`: a balanced documentation shell and compact setup command.
- `product.html`: a restrained product-page hierarchy with illustrative product evidence.
- `DESIGN.md`: selection rules and acceptance criteria. It names tokens rather than repeating their values.

Personal sites import `@filipgutica/ui/themes/graphite-indigo.css` and the shared site helpers. The UI package owns the values and generation procedure.

Token names depend on where the page runs. This file uses the `tokens.css` names, which `@filipgutica/ui` shares.

| Context | Variable names to write |
| --- | --- |
| Standalone HTML | The `tokens.css` names. Import or inline `tokens.css`, and copy component styles from `components.html`. |
| Site on `@filipgutica/ui` | The `tokens.css` names, which the library declares. The exceptions are `--color-nav-current-text` and `--color-segmented-current-text`: the library does not declare them, so write them with the fallback their `ui:` comment shows. Without it, `var()` falls back without an error. The library draws the base focus ring only inside `.fg-site-docs`; elsewhere, write it yourself, exactly `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)`. |
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

- Use `--font-ui` for prose, h3 and below, labels, and controls, and `--font-mono` for code, identifiers, and keys. The identity layer decides where else mono appears.
- Controls and dense application content use `--text-md`; secondary text uses `--text-sm`. Paragraphs and substantial article text use `--text-reading` with `--leading`. Bound reading text with `--measure` and introductory copy to a slightly shorter line.
- Documentation titles use `--text-3xl`; section headings use `--text-xl` and sit above their content. Application titles use `--text-2xl` or smaller, and application section headings use `--font-ui` at `--text-xl` or smaller.
- Use `--weight-regular`, `--weight-medium`, and `--weight-semibold`. Keep the source text's case; never transform it. Sentence case and restrained tracking make hierarchy easier to scan.
- Use `--color-muted` for secondary information and metadata, and `--color-text` for essential labels and instructions.

### Theme and color

- Inline visuals inherit the host theme. They do **not** need an independent theme switch.
- Standalone pages follow the OS by default. A visible theme control is optional: include it when the user requests one, the product already has one, or choosing/comparing themes serves the task. Token inspection and UI-library documentation are valid uses; a simple chart or explainer usually is not.
- Existing products retain their theme preferences and persistence contracts. Where a standalone choice is needed, System removes the override and explicit Light/Dark choices set it. Wrap storage access in try/catch.
- Use neutral `--color-bg`, `--color-surface`, and `--color-surface-raised` (paper in light, graphite in dark) to separate regions. Use `--color-text` and `--color-muted` for the main hierarchy.
- Each project sets one hue, and `--color-accent` follows it. The hue fills the one primary action in each decision group, and marks identity and selection: current items, the selected tab's text, and checked or selected controls. It is never a fill for secondary buttons, cards, or wells. Check it at 3:1 for marks and bars, and at 4.5:1 wherever it colours text, on every surface it sits on. `--color-accent-text` on an `--color-accent` fill must reach 4.5:1 for each hue; a hue that misses does not colour text or carry a label there.
- `--color-link` identifies links; underline prose links. `--color-focus` is the accent (`--color-accent`) and outlines keyboard focus on every role but fields, which turn their edge the accent instead (see [focus](components.md#rules-for-every-control)). Where color marks a checked or selected state, use `--color-accent` as a fill, tint, or mark; `--color-link` never marks one, and a focus ring marks only focus, never selection.
- Navigation and selection: the current page, the selected tab, and a selected list row take the same quiet lifted fill, tinted with the accent, with accent text where it reaches 4.5:1 on that fill (another readable colour otherwise), and no underline or bar. An in-page location takes a short accent pip without a fill in strips and contents lists; in a section rail it takes the current page's fill instead. Keep raised-control hover and keyboard focus separate from these states. [Component specs](components.md#navigation-list) give the values.
- Status colors mean state and have a text or icon label. Status surfaces are soft tints of their status color (the `--color-*-surface` tokens). Outside badges, the danger button label, and field error text, status foreground colors go on icons; numbers and labels beside them stay in `--color-text` or `--color-muted`. Keep restrained syntax colors separate from the action palette.
- Verify light and dark appearance where supported, regardless of whether a switch is visible. Check text contrast rather than assuming a muted token is accessible at every size.

### Layout and spacing

- Use the `--space-*` rhythm and flex/grid `gap`. Use smaller gaps within a group and larger gaps between groups. Documentation sections use `--space-12`, stepping down to `--space-8` on phones. Product sections use `--space-24` total separation, stepping down to `--space-16` at tablet width. Give each section gap one owner so adjoining padding does not double it.
- Size type, spacing, and controls in rem through the `--text-*`, `--space-*`, and `--control-*` tokens, so text and controls follow the reader's font-size setting. A literal that sizes text, padding, a gap, or a line height is rem too (pixels ÷ 16). Keep hairlines, focus rings, shadows, and breakpoints in px.
- Product pages use `--page-wide`; documentation uses `--page-max`, optionally combined with a thin navigation column. Center the combined shell, not only the article inside an edge-pinned sidebar.
- Tool and docs introductions stay compact. Preserve the direct route to install commands and useful captures.
- Use two named breakpoints. Write desktop styles first, then override them at these widths:

  | Name | Media query | What changes |
  | --- | --- | --- |
  | Tablet | `@media (max-width: 800px)` | Multi-column layouts become one content column. Touch controls use `--control-lg`. |
  | Phone | `@media (max-width: 640px)` | Side gutters drop from `--space-6` to `--space-4`, and section gaps take their phone step. |

  Use `@media (min-width: 801px)` only for a rule that applies to desktop alone. One documented exception: the tool-home hero (`.fg-site-hero` in `@filipgutica/ui`) splits at `@media (min-width: 1024px)`, with the title across the top, the lede on the left, and the install block and facts on the right. Below 1024px it stacks in source order. `@filipgutica/ui` also ships 680px rules for its own site header, prose title and definitions (`max-width: 680px`, with `min-width: 681px` for frame padding); they belong to the library, so pages add no viewport breakpoint beyond the table and the hero split. A pane that must collapse at its own width uses a container query, as the detail column in `reference.html` does.
- Density: an application screen has one size for each place, not a range. Toolbar controls (buttons, segmented filters, and search fields) are `sm`, `--control-sm` tall. Rows in a table or list, such as the console's monitor list, and rail and navigation rows, are `--row` tall. Other controls keep the default `md` (`--control-md`). At tablet width every touch target grows to `--control-lg`. The console in `reference.html` uses these sizes.
- [Navigation](#navigation) is a strip of 6 links or fewer, or a section rail that moves into a drawer at tablet width. A sticky side rail taller than the window scrolls its link list, not the element that draws its divider, so an overlay scrollbar sits clear of the line; `UiSiteNav` does this. Keep wide code, tables, and charts scrolling inside their containers.
- Keep main headings, actions, and product evidence visible on load. Scrolling should reveal more content without being required to make existing content appear.

### Surfaces

- Start with headings, content, and whitespace. Use a `--color-border-subtle` divider where it clarifies a boundary.
- Each surface role has one recipe:

  | Role | Use for | Fill | Border | Radius | Shadow |
  | --- | --- | --- | --- | --- | --- |
  | Page | The canvas and example stages | `--color-bg` | None | None | None |
  | Well | Screenshots, figures, and inset previews other than example stages | `--color-surface` | `--color-border-subtle` | `--radius-panel` | None |
  | Code block | Source code: a frame that holds the header, with the source in an inset panel | Frame: `--color-surface-raised`; panel: `--color-code` | Frame: `--color-border-subtle`; panel: transparent 1px | Frame: `--radius-panel`; panel: `calc(var(--radius-panel) - var(--space-1))` | Frame: `--shadow-surface`; panel: none |
  | Panel | Cards, forms, charts, and detail views | `--color-surface-raised` | Transparent 1px | `--radius-panel` | `--shadow-surface` |
  | Field | Inputs, selects, textareas, and search fields | `--color-field-bg`; disabled: `--color-well` | `--color-field-edge` | `--radius-field` | `--shadow-field`; disabled: none |
  | Track | Segmented and switch tracks, and selected radio cards | `--color-well` | Transparent 1px | Segmented tracks: `--radius-control`; switch tracks: `--radius-pill`; radio cards: `--radius-panel` | `--shadow-sink` |
  | Floating layer | Menus, popovers, pickers, and dialogs | `--color-surface-raised` | Transparent 1px; the shadow's ring draws the edge | `--radius-panel` | `--shadow-dialog` |

- Borders stay 1px and transparent on buttons, quiet actions, tracks, panels, and radio cards, so forced colors can draw them. Fields keep `--color-field-edge`. `--color-border` keeps unchecked checkbox and radio edges visible. The toggle card is a named exception: a visible `--color-border-subtle` edge and no rest raise. Invalid fields show a `--color-error` edge, except in forced colors, where the system edge wins. Figures, example frames, code block frames, and dividers use `--color-border-subtle`.
- Shape follows role. A pill acts, or sets a value in place; a rectangle is a place, or holds content. Pick a new component's radius from its role in this table, not from the component it looks like.

  | Role | Shape | Token | Members |
  | --- | --- | --- | --- |
  | Acts, or sets a value in place with every option shown, on one line | Pill | `--radius-control` | Buttons other than the labelled contents trigger and its no-JavaScript summary, quiet actions other than the project-menu trigger, and segmented controls with their thumbs |
  | Small state mark | Pill | `--radius-pill` | Status badges, switch tracks and knobs, slider and progress tracks, score pips, and the in-page location pip |
  | A place, or a row you pick | 6px | `--radius-inline` | Navigation rows outside a floating menu, group labels, breadcrumb links, the site name link, tabs, list rows, checkboxes, and keyboard keys |
  | Something you type in, a control whose label wraps, or a one-line control that is not an action | 10px | `--radius-field` | Inputs, textareas, search fields, toggle cards, pager links, and one-line controls that are not actions: the select, the project-menu trigger, the labelled contents trigger and its no-JavaScript summary, and the skip link |
  | Holds other things | 16px | `--radius-panel` | Wells, plates, panels, cards, radio cards, alerts, code blocks, example frames, and floating layers |

  - A pill never holds text that can wrap. A control whose label can wrap, such as a toggle card or a radio card, is a rectangle.
  - Nested rectangles are concentric: a rectangle that sits closer to a rounded container's edge than the container's radius takes that radius minus the gap. Option rows in a select picker, the rows of a floating menu, such as the project menu, and a code block's source panel, each `--space-1` inside a 16px container, take `calc(var(--radius-panel) - var(--space-1))`, 12px. A shape with more room than that, such as a field in a dialog, keeps the radius of its role.
  - Round marks (radios, slider thumbs, badge dots, and the busy spinner) take `50%`, a fill inside a shape inherits its corners, and an edge that meets another shape takes `0`. A page writes no other literal radius.
- Avoid nesting panels. Cards are for a few parallel self-contained options that a reader compares. Running prose belongs in open sections. Product screenshots need one frame, not a frame around a frame.
- [Depth](#depth) gives each role its shadow. Stable hover states keep normal content quiet.

### Depth

Each depth tier has one token. [`tokens.css`](tokens.css) holds every shadow value, including the dark ones. Pages and components use the tokens and write no shadow of their own. Only zero-blur lines in a token colour are exempt: focus rings and dividers. A focused field's inset line is a token too (`--shadow-field-focus`, `--shadow-field-focus-invalid`).

| Tier | Token | Use for |
| --- | --- | --- |
| Control | `--shadow-raise` | Idle buttons, unselected radio cards, switch knobs, and segmented thumbs |
| Container | `--shadow-surface` | Panels, cards, source code (not inside an example frame), command plates, and terminal captures |
| Pressed or well | `--shadow-sink` | Tracks, pressed buttons, selected radio cards, and fields in dark (through `--shadow-field`; light fields take none) |
| Selected row | `--shadow-nav-current` | The current navigation row, the selected tab, and a selected list row |
| Floating | `--shadow-dialog` | Menus, popovers, pickers, and dialogs |

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
- Source code sits in a theme-matched panel with syntax colours, inset in the code block's frame; multiline samples may have a small descriptive header and Copy action. Put useful setup context above a command; omit repeated language labels.
- Examples: show a live component on a stage above its code, in one frame, with Copy in the code's corner. The stage sits on the page background. See [code block with a live example](components.md#with-a-live-example).
- A screenshot opens at full size when clicked; use a native accessible trigger and restore its focus on close.

### Navigation

[`components.md`](components.md) specifies each navigation component. These rules decide which one a page uses and how they agree.

- **Levels.** Each level has one component and one marker.

  | Level | Answers | Component | Marker |
  | --- | --- | --- | --- |
  | Global | Which site? | Site header and project switcher | `aria-current="page"` on the registry row |
  | Local | Which page of this site? | Section rail, or a navigation strip of 6 links or fewer | `aria-current="page"`: the lifted fill |
  | In-page | Where am I on this page? | Section rail rows that point to `#id` | `aria-current="location"`: the lifted fill in a rail, a pip in strips and contents lists |
  | Sequential | What comes next? | Pager | `rel="prev"` and `rel="next"` |
  | Path | How do I get back up? | Breadcrumbs above the page title, on every page below the site's home page; never in the header | The current page as text with `aria-current="page"` |
  | Find | Where is X? | Find field that filters the rail | A live match count |

- **`aria-current`.**
  - `page` goes on the link whose path matches the URL, ignoring the hash, and on one link in each landmark at most.
  - `location` goes on the in-page link for the section in view.
  - A link carries one marker, and page outranks location. Never put `page` on a link to `#id`.
  - Use `step` for wizards and `true` for other sets.
- **Choosing a component.**
  - A link (a navigation row or a strip) when the destination has its own URL.
  - Tabs for panels about one object when no URL changes.
  - A segmented control when the choice changes how the same content shows.
  - Never mix URL-changing items and panel items in one set, and never give links `role="tab"`.
- **Landmarks.**
  - Give every `<nav>` a unique name, and leave "navigation" out of it, because screen readers add that word.
  - Order: skip link, banner (the header), local navigation, `main`, contentinfo. Focus follows that order. At tablet width the Find and Menu buttons come before `main`.
- **Scroll offset.**
  - One offset: `html { scroll-padding-top }`, equal to any sticky bar plus `--space-4`. Sections do not set `scroll-margin-top`.
  - Use `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`.
- **Location tracking.**
  - The current section is the last tracked heading, in page order, whose top has passed the scroll-padding inset. At the bottom of the page, the last tracked heading is current.
  - After a jump (a click, a hash change, or a deep link), the target stays current until the reader scrolls away from where it landed.
  - A group heading counts as its group's first row.
- **Single-key shortcuts.**
  - Allowed only with an off switch, saved in storage and wrapped in `try`/`catch` (WCAG 2.1.4).
  - Ignored while focus is in an editable element or a modal dialog is open.
  - Shown with a visible [keyboard key](components.md#keyboard-key) hint and `aria-keyshortcuts`.
  - The only shortcut is `/`, which focuses Find.
- **No command palette.** Find covers a single-page catalogue and a small site; see [decisions](decisions.md).

### Interaction and motion

- Show visible focus and accessible names. A visual simplification must preserve useful controls, caveats, and keyboard paths.
- Every focusable element but a field draws one ring, `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)`, with no glow, over its own raise or sink shadow. The `tokens.css` base sets it. `--color-focus` is the accent, which reaches 3:1 on `--color-bg`, `--color-surface`, and `--color-surface-raised` in both themes; a dark plate sets `--color-focus: var(--color-project-dark)`. Do not give a role its own ring colour. Fields (input, select, textarea, search) draw no ring: focus turns the edge `--color-accent` with a 2px inset line (`--shadow-field-focus`), and the fill stays. [Component specs](components.md#rules-for-every-control) give the values. Use an inset offset (`calc(var(--focus-width) * -1)`) only where a scrolling or clipping parent would cut the ring, or inside a segmented control; add a comment that names the reason. Keep the focus default in `@layer base`, so a component's own focus rule can refine it. Pointer hover never draws the outline.
- Keep product navigation distinct from in-page section links. Current page and current section are different markers (`aria-current="page"` and `"location"`); see [Navigation](#navigation). Open sibling project links in the same tab; indicate a new tab only when the link opens one.
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

- **Mono identity.** `--font-mono` (IBM Plex Mono) sets identity, the page titles and section headings of documentation, CLI tool, article, and product pages, navigation rails, metadata, captions, and the footer. `@filipgutica/ui` self-hosts IBM Plex; elsewhere the tokens fall back to the system stack.
- **Headings.** Documentation, CLI tool, article, and product page titles are mono; application titles are `--font-ui`. Page-level section headings (h2) on documentation, CLI tool, article, and product pages are mono, start with a `##` mark in `--color-accent` (decorative, so screen readers skip it), and have a `--color-border-subtle` rule above the section. Application and inline-visualization section headings, and every h3 or lower, are plain `--font-ui` with no mark. Product pages and tool homes may use a mono `--text-display` title, stepping down to `--text-display-sm` on phones; keep a short heading measure, place supporting copy and the primary action nearby, and let the first product image enter the initial desktop viewport.
- **Hue marks.** The hue also draws the `~/` header mark, the `##` mark on documentation, CLI tool, article, and product section headings, step numbers, and the `$` prompt.
- **Header.** Personal product sites share a compact static header: a mono `~/name` identity with the `~/` in `--color-accent`, a project switcher, useful page links, appearance controls, and a solid `--color-text` rule below. Use the shared project registry for names, order, and destinations. The identity is the same on every page, and the links sit at the same x on every page; the page's path goes in [breadcrumbs](components.md#breadcrumbs) above its title. Keep a gallery's existing application navigation structure.
- **Appearance.** Personal pages share the built-in System/Light/Dark choice, through the header's picker. An explicitly selected custom gallery theme overrides that choice until the reader selects a built-in appearance. Preserve installed themes.
- **Terminal plates.** Commands sit on a dark plate tinted with the project hue (`--color-command-bg`), in both themes. A shell command gets a `$` prompt in `--color-project-dark`, drawn by CSS so it never enters copied or accessible text. Short commands use a headerless compact row with an accessible Copy control. Terminal captures keep the neutral `--color-terminal` plate, with a mono status-line caption below the screen; tabs on a capture switch to mono.
- **Steps.** A real sequence is an ordered list with mono numbers in `--color-accent` on a ruled leading column, an h3 title per step, and an optional result note on the last step.

## Avoid recurring clutter

- Decorative eyebrows, numbered markers on unordered content, and badge rows that repeat the title.
- Multiple cards around ordinary prose, ornamental grids, glows, gradients, pill-shaped cards, and hover lifts.
- Tinted wells or panels used for decoration. The hue-tinted command plate is the one tinted surface, because it carries the project's identity.
- Display typography on dense tool screens, or tiny application typography on a product landing page.
- The `##` mark on every section of an application screen, where it repeats down the page and competes with the data.
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
