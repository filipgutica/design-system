# Design language

A shared visual language for personal products, applications, documentation, tools, mockups, artifacts, dashboards, charts, and inline explainers. Claude and Codex follow this file. Take inspiration from the clarity and restraint of [Linear](https://linear.app/), [Codex](https://openai.com/codex/), [Director](https://director.sh/), and [T3 Code](https://t3.codes/): clear hierarchy, a balanced page frame, and real product evidence. Adapt their principles to the task; use original copy and assets.

## Scope and precedence

1. The user's current request wins.
2. A repository's own design system owns its tokens and components.
3. Other personal work follows this language. Use a consistent palette, type family, and component vocabulary across projects.

Interaction, flows, states, interface copy, and accessibility checks follow the `interface-design` skill. This file owns visual hierarchy and composition.

## Two layers

The language has a reusable core and a replaceable identity layer.

| Layer | What it holds | A new project |
| --- | --- | --- |
| Core | Tokens, depth, controls and their states, focus, motion, accessibility, and forced colors | Adopts it as is |
| Identity | The terminal folio look of the personal sites: the `~/name` header, the project registry, mono display headings, `##` section marks, and terminal plates | Replaces it with its own |

A new project keeps `tokens.css` unchanged and sets the identity inputs (`--color-project`, `--color-project-dark`, `--font-ui`, `--font-mono`, and `--color-accent-text`, `--color-nav-current-text`, and `--color-segmented-current-text` when the hue cannot carry them at 4.5:1) on `:root` in its own stylesheet, or loads a theme file. A theme file sets the last two for it; its hue must carry `--color-accent-text` itself, which the contrast tests check for every shipped theme. [Component specs](components.md) mark each component Core or Identity, and [decisions](decisions.md) record why each choice was made and which options were rejected. Read both before you build or change a component.

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

- `tokens.css`: the values of the default theme, Graphite Indigo, generated from the token source (`tokens/core.json` and `tokens/themes/graphite-indigo.tokens.json`) in `@filipgutica/design-system`. Other themes ship as `themes/<id>.css`, which set only a theme's inputs: its hue pair, and any fonts or neutrals it brings; load one after `tokens.css`, on `:root`. To change a value, edit the JSON there and run `pnpm tokens:build`; do not edit `tokens.css` by hand. The identity inputs sit in one block at the top.
- `ui-sdk.css`: experimental. Draws ui-sdk's headless parts as the component specs do; see [ui-sdk](#ui-sdk-experimental).
- `components.md`: one spec for each component, with anatomy, states, Do and Don't lines, keyboard and screen-reader behavior, motion, and forced colors. Read it for any component work.
- `components.html`: every component in each of its states, in plain HTML and CSS on `tokens.css`. Copy component markup and styles from there.
- `decisions.md`: the choices behind the components, and the options they replaced.
- `reference.html`: an application example, and a Foundations catalogue (`#foundations`) of every token: type, color with contrast, spacing, shape, borders, elevation, focus, and motion.
- `docs.html`: a balanced documentation shell and compact setup command.
- `product.html`: a restrained product-page hierarchy with illustrative product evidence.
- `DESIGN.md`: selection rules and acceptance criteria. It names tokens rather than repeating their values.

Token names depend on where the page runs. This file uses the `tokens.css` names.

| Context | Variable names to write |
| --- | --- |
| Standalone HTML | The `tokens.css` names. Import or inline `tokens.css`, and copy component styles from `components.html`. |
| Site on a component library built on this design language | The `tokens.css` names that the library declares. The library's own documentation lists any it lacks and any helper behaviour. |
| Other repository | That repository's own tokens and components, matched to these roles by meaning. |
| Inline visual | The host's supplied CSS variables and font, with no separate page shell. |

## Core

### Character

Controls use quiet depth and familiar shapes: borderless surfaces with one tight shadow at rest that sink when pressed or filled in.

- **Minimal by default.** Start from less: fewer words, boxes, and controls, and larger evidence. See [Minimal by default](#minimal-by-default).
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

  Use `@media (min-width: 801px)` only for a rule that applies to desktop alone. One documented exception: the tool-home hero splits at `@media (min-width: 1024px)`, with the title across the top, the lede on the left, and the install block and facts on the right. Below 1024px it stacks in source order. Pages add no viewport breakpoint beyond the table and the hero split. A pane that must collapse at its own width uses a container query, as the detail column in `reference.html` does.
- Density: an application screen has one size for each place, not a range. Toolbar controls (buttons, segmented filters, and search fields) are `sm`, `--control-sm` tall. Rows in a table or list, such as the console's monitor list, and rail and navigation rows, are `--row` tall. Other controls keep the default `md` (`--control-md`). At tablet width every touch target grows to `--control-lg`. The console in `reference.html` uses these sizes. This density is control size; how much a screen shows is [Minimal by default](#minimal-by-default).
- [Navigation](#navigation) is a strip of 6 links or fewer, or a section rail that moves into a drawer at tablet width. A sticky side rail taller than the window scrolls its link list, not the element that draws its divider, so an overlay scrollbar sits clear of the line. Keep wide code, tables, and charts scrolling inside their containers.
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
  | A place, or a row you pick | 6px | `--radius-inline` | Navigation rows outside a floating menu, group labels, breadcrumb links, the package catalogue's site name, tabs, list rows, checkboxes, and keyboard keys |
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
- A page's own element rules, such as its heading, paragraph, and image type, go in `@layer base`, so a component's rules outrank them. An unlayered `h2` rule outranks every layered rule and restyles the title of a dialog, drawer, or viewer as a page heading.
- One clearly primary action per visible decision group, filled with the hue. Other actions are secondary, ghost, or text buttons.
- Use a segmented control for two to five short options that apply at once, a select for longer lists, and radio cards for options that need descriptions.
- Callouts carry a real caveat, not decorative emphasis.
- Lists and properties: align short labels, values, and metadata. Use definition lists for terms and short meanings; use tables for actual comparisons.
- Figures: number them when the prose refers to any of them, and then number them all. Place a figure beside the paragraph that explains it, once the terms it uses have been introduced.
- Source code sits in a theme-matched panel with syntax colours, inset in the code block's frame; multiline samples may have a small descriptive header and Copy action. Put useful setup context above a command; omit repeated language labels.
- Examples: show a live component on a stage above its code, in one frame, with Copy in the code's corner. The stage sits on the page background. See [code block with a live example](components.md#with-a-live-example).
- A screenshot opens at full size in a [viewer](components.md#viewer) when clicked; use a native accessible trigger and restore its focus on close.

### ui-sdk (experimental)

[ui-sdk](https://ui-sdk.dev) gives headless, accessible components that an agent can read and operate through its agent bridge. `ui-sdk.css` draws their parts as this file and [`components.md`](components.md) specify. Use ui-sdk only where no owning library covers the framework or the component, such as a React app or a control that `@filipgutica/ui` lacks; where an owning library has the component, use the library's.

- Pin every `@ui-sdk/*` package to the exact version `ui-sdk.css` names, `0.1.0-beta.5`. Do not load `@ui-sdk/core/web.css`, its `--ui-*` variables, or the unversioned `https://ui-sdk.dev/web.js`.
- Load a stylesheet that starts with `@layer ui-sdk, base, components;` first, then `tokens.css` and `ui-sdk.css`. ui-sdk adds the little CSS its behaviour needs to `@layer ui-sdk` at run time, so the declaration keeps it below the design system, and `ui-sdk.css` sits in `components`, above the base as the [component rule](#components) requires. With Tailwind, put the declaration above `@import "tailwindcss"`, so Tailwind's utilities still outrank the components.
- Supported components, with each variant, size, and state of its [component spec](components.md). `ui-sdk.css` draws the composition given for each; where ui-sdk's own examples differ, such as a choice card's `data-slot="stack"` and `"hint"` spans or a text `DialogClose`, follow the composition here:
  - [Button](components.md#button): no `data-variant` is primary; `data-variant="secondary"`, `"ghost"`, `"danger"`, or `"text"` picks another, and `data-size="sm"` or `"lg"` a size. A button whose `onClick` returns a promise is busy until it settles: it dims and shows the spinner, so do not add ui-sdk's `data-show="pending"` content. A button rendered as a link (`render={<a href=… />}`) keeps the button's look.
  - [Field wrapper](components.md#field-wrapper) and [Text input and textarea](components.md#text-input-and-textarea): `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Input`, and `Textarea`, with `data-size="sm"` or `"lg"` on an `Input`.
  - [Checkbox and radio](components.md#checkbox-and-radio): each `Checkbox` or `Radio` as a direct child of a `<label data-slot="label">` with its text, and radios inside a `RadioGroup`. `data-size="sm"` or `"lg"` goes on the label.
  - [Radio card group](components.md#radio-card-group): a `RadioGroup` of `<label data-slot="card">` cards, each holding a `<strong>` title, an optional `<span>` description, and the `Radio`.
  - [Switch](components.md#switch): a `Switch` with its `SwitchThumb`, as a direct child of a `<label data-slot="label">` with its text, so the whole row toggles it. `data-size="sm"` or `"lg"` goes on the label.
  - [Toggle button](components.md#toggle-button): a `Toggle` whose first child is an empty `ToggleIcon`, drawn as the switch track, then a `<span>` with the label and an optional `<small>` description. `data-size="sm"` or `"lg"` goes on the `Toggle`.
  - [Select](components.md#select): `Select`, `SelectTrigger` with `SelectValue`, `SelectContent`, and `SelectItem`, inside a `Field` for the label and error. `data-size="sm"` or `"lg"` goes on the trigger. The item draws the check, so `SelectItemIndicator` is optional.
  - [Dialog](components.md#dialog): `DialogBackdrop` and `DialogContent`. The content holds a `<header>` (a `<div>` with `DialogTitle` and `DialogDescription`, then an icon `DialogClose` with an `aria-label`), the body in one element, and an optional `<footer>` whose actions are `Button`s, such as `<DialogClose render={<Button data-variant="secondary" />}>`. On phones it is a bottom sheet.
- At tablet width and below, unsized buttons, inputs, select triggers, toggle buttons, and choice and switch rows grow to `--control-lg` for touch, as the catalogue's do.
- Any other ui-sdk component or part is unsupported: it renders unstyled. That includes `InputGroup`, `InputClear`, a mixed (indeterminate) checkbox, a `Toggle` with an icon, `ToggleGroup`, the switch choice card, the select's search, groups, and clear button, `presentation="sheet"` on a select or dialog (ui-sdk places the sheet, and its panel is not drawn), a `DialogClose` outside the dialog's `<header>` that is not rendered as a `Button`, `AlertDialog`, and the dialog [viewer](components.md#viewer). Use the owning library's component or the [`components.html`](components.html) recipe, or add a spec and its `ui-sdk.css` rules first. Do not style an unsupported part on a page.
- This file owns the look and the load order. The ui-sdk skill and the docs in the installed `@ui-sdk/*` package own which component to use, composition, `render`, ARIA, and the agent bridge. `interface-design` owns states and copy. The repository's own testing rules apply, not the ui-sdk skill's `test.fails` advice.
- To let an agent operate the page, create the bridge with `createAgent()` before the app renders; the agent reads with `snapshot()` and acts with `act()`. The app decides whether to expose it, through `createAgent` or WebMCP, and which actions to allow.

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
  - Order: skip link, banner (the header), local navigation, `main`, contentinfo. Focus follows that order. At tablet width the section rail's labelled trigger comes before `main`.
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
- Every focusable element but a field draws one ring, `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)`, with no glow, over its own raise or sink shadow. The `tokens.css` base sets it. `--color-focus` is the accent, which reaches 3:1 on `--color-bg`, `--color-surface`, and `--color-surface-raised` in both themes; a terminal capture sets `--color-focus: var(--color-project-dark)`. Do not give a role its own ring colour. Fields (input, select, textarea, search) draw no ring: focus turns the edge `--color-accent` with a 2px inset line (`--shadow-field-focus`), and the fill stays. [Component specs](components.md#rules-for-every-control) give the values. Use an inset offset (`calc(var(--focus-width) * -1)`) only where a scrolling or clipping parent would cut the ring, or inside a segmented control; add a comment that names the reason. Keep the focus default in `@layer base`, so a component's own focus rule can refine it. Pointer hover never draws the outline.
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

### Minimal by default

Every interface built with this language starts minimal: application screens, mockups, artifacts, dashboards, charts, and the interface parts of documentation and product pages. Prose in lessons, documentation, and product pages keeps the [copy rules](#copy-and-density). A word, box, or control stays only when it changes what the reader knows or can do; remove anything that repeats what is already in view. Give the space that frees to the evidence, such as a chart or a key value, not to more items.

- **Status in one sentence.** A view's summary sentence carries its status, the numbers behind it, and a status icon. Use an [alert](components.md#alert) only for a caveat or an action the summary cannot carry: one per view at most, and never one that repeats a sentence, badge, or heading in view.
- **One meta line.** Context, such as who ran it, the scope, the size, and liveness ("still running"), sits on one muted line under the title, joined with " · ". Its details sit behind a disclosure on that line.
- **One-line rows.** Data rows in a table or list are one line, `--row` tall. Show a direction, trend, or unit as a glyph (↑ or ↓) and put the words in the accessible name. Secondary detail goes in the selected row's detail or a disclosure.
- **Mark the exceptions.** Status columns, badges, and status icons show only the values that differ from the default. The default has no mark, and one key line names it. Drop an icon that repeats a badge or label in the same row.
- **Primary action in reach.** A row or card shows its primary next action as a button, plus either one secondary button or, for two or more secondary actions, one [overflow menu](components.md#overflow-menu) trigger. A failed or blocked item keeps its recovery action, such as Retry, Resume, or Reconnect, visible.
- **Forms.** A field takes a description only for a format, limit, or consequence its label does not state. No intro sentence restates the fields. A sticky action bar sits on the page background with a hairline divider, without a panel or shadow.
- **Containers group.** Never nest a panel, card, or well in another. A component's own parts, as its spec draws them, are fine, such as a code block's source panel. So are controls and alerts inside a container or a dialog. A figure is a well, so it sits on the page, not in a card. Grid cells and stat tiles take a fill or nothing, not a border each.
- **Explanations on request.** Method notes, "How to read this", and multiple-comparison caveats go in a closed disclosure next to what they explain.

Never cut these:

- Accessible names that keep the full words: verdict, direction, and status.
- A second signal beside colour.
- Safety, cost, and consent text, and the confirmation of a destructive action.
- Recovery paths, and an error's fix.
- Uncertainty cues: intervals, provisional and partial marks, sample sizes, and "may be chance". They may be faint; they stay.
- Labels on illustrative data.
- Loading, empty, and error states.
- Keyboard paths, visible focus, and target sizes.

Measure each screen you build or revise. Count its words, boxes, and controls with `interface-design`'s `ui-check.mjs --count`, at 1280px wide, for the whole page and the tool's first screen, and report the counts before and after. A count that rises needs a reason. There is no fixed budget.

- Words are visible text tokens. The count leaves out screen-reader-only text, so cutting visible words never means cutting accessible names.
- For the count, a box is any element with three or more visible borders, or any shadow, so raised buttons count too.
- Controls are buttons, links, fields, selects, and summaries.

## Identity layer: terminal folio

The personal sites are terminal tools that read Markdown and paths, so their identity comes from that world. A new project replaces this section with its own identity and keeps the core.

- **Mono identity.** `--font-mono` (IBM Plex Mono) sets identity, the page titles and section headings of documentation, CLI tool, article, and product pages, navigation rails, metadata, captions, and the footer. `fonts.css` self-hosts IBM Plex; without it, the tokens fall back to the system stack.
- **Headings.** Documentation, CLI tool, article, and product page titles are mono; application titles are `--font-ui`. Page-level section headings (h2) on documentation, CLI tool, article, and product pages are mono, start with a `##` mark in `--color-accent` (decorative, so screen readers skip it), and have a `--color-border-subtle` rule above the section. Application and inline-visualization section headings, and every h3 or lower, are plain `--font-ui` with no mark. Product pages and tool homes may use a mono `--text-display` title, stepping down to `--text-display-sm` on phones; keep a short heading measure, place supporting copy and the primary action nearby, and let the first product image enter the initial desktop viewport.
- **Hue marks.** The hue also draws the `~/` header mark, the `##` mark on documentation, CLI tool, article, and product section headings, step numbers, and the `$` prompt.
- **Header.** Personal product sites share a compact static header: a mono `~/name` identity with the `~/` in `--color-accent`, a project switcher, useful page links, appearance controls, and a solid `--color-text` rule below. Use the shared project registry for names, order, and destinations; the design-system site's header starts with the same switcher. The identity is the same on every page, and the links sit at the same x on every page; the page's path goes in [breadcrumbs](components.md#breadcrumbs) above its title. Keep a gallery's existing application navigation structure.
- **Appearance.** Personal pages share the built-in System/Light/Dark choice, through the header's picker. An explicitly selected custom gallery theme overrides that choice until the reader selects a built-in appearance. Preserve installed themes.
- **Terminal plates.** Commands use the normal code block and its source well (`--color-code`) in light and dark. A shell command gets a `$` prompt in `--color-accent`, drawn by CSS so it never enters copied or accessible text. Short commands use a headerless compact row with an accessible Copy control. Terminal captures keep the neutral `--color-terminal` plate, with a mono status-line caption below the screen; tabs on a capture switch to mono.
- **Steps.** A real sequence is an ordered list with mono numbers in `--color-accent` on a ruled leading column, an h3 title per step, and an optional result note on the last step.

## Avoid recurring clutter

- Decorative eyebrows, numbered markers on unordered content, and badge rows that repeat the title.
- Multiple cards around ordinary prose, ornamental grids, glows, gradients, pill-shaped cards, and hover lifts.
- Tinted wells or panels used for decoration.
- Display typography on dense tool screens, or tiny application typography on a product landing page.
- The `##` mark on every section of an application screen, where it repeats down the page and competes with the data.
- Large blank gaps that push the action or evidence away from the introduction.
- Centered long paragraphs, excessively faint text, and horizontal page overflow.
- Theme controls added automatically to inline charts and explainers.
- An alert that repeats the summary sentence, or a status icon beside a badge that says the same.
- A bordered box around each grid cell, or a sticky bar drawn as a panel with a shadow.
- Helper text that restates its label.
- A row of secondary buttons on every list row.

## Acceptance

- [ ] The format matches the reader's task, and the next useful action is clear.
- [ ] Header, content, imagery, and footer have deliberate shared edges; wide-screen margins feel balanced.
- [ ] Typography distinguishes title, section, body, and metadata without competing focal points.
- [ ] Product evidence is real or clearly illustrative; factual caveats and attribution remain present.
- [ ] Both supported themes are readable, with theme controls only where useful.
- [ ] At 390, 720, and 1280 px wide there is no horizontal page scroll, and the page's own viewport media queries use only `max-width: 640px`, `max-width: 800px`, `min-width: 801px`, and the documented `min-width: 1024px` hero split.
- [ ] Keyboard, focus, touch, deep links, and reduced motion work across relevant states.
- [ ] Every control is the owning system's component or class, never a local copy built from its tokens; spacing uses its tokens; each panel and visual effect has a purpose.
- [ ] Each status sits in one sentence or one alert, and nothing in view repeats it.
- [ ] Rows are one line, and each item shows its primary action plus one secondary button or one menu trigger at most.
- [ ] Words, boxes, and controls are counted before and after, and nothing on the never-cut list is gone.
- [ ] Control states match between `components.html`, the example pages, and the owning library: hover, press, focus, disabled, busy, invalid, and forced colors.
