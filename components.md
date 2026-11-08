# Component specs

One section for each component in the design language. Write any framework's version of a component from its section. [`components.html`](components.html) shows each state as static markup, and [`tokens.css`](tokens.css) holds the values. The [decisions](decisions.md) record why each choice was made. `@filipgutica/ui` is the Vue implementation; the `ui:` line in each section names its component, for comparison only.

Each section has the same parts: anatomy, tokens, states, keyboard and screen reader, motion, and forced colors. Sizes are in CSS pixels. A percentage mix means `color-mix(in srgb, A n%, B)`.

## Layers

| Layer | What it holds | A new project |
| --- | --- | --- |
| Core | Tokens, depth, controls and their states, focus, motion, accessibility, forced colors | Adopts it as is |
| Identity | The terminal folio look: the `~/name` header, the project registry, mono display headings, `##` section marks, terminal plates, captures, and the mono section rail | Replaces it with its own |

The identity layer reads only the identity tokens (`--project`, `--project-dark`, `--font-sans`, `--font-mono`) and the terminal tokens. A core component never depends on an identity component.

## Rules for every control

- **Sizes.** `sm`, `md`, and `lg` use `--control-sm`, `--control-md`, and `--control-lg` for height, with `--text-sm`, `--text-md`, and `--text-lg`. At tablet width (`max-width: 800px`) touch targets use `--control-lg`.
- **Borders.** Every control keeps a 1px border, transparent unless its section says otherwise, so forced colors can draw an edge.
- **Depth.** Each control takes its shadow from the [depth tiers](DESIGN.md#depth).
- **Press.** Only a button has a pressed state; see [Button](#button). A [quiet action](#quiet-action) tints on press without sinking. Other controls have no `:active` treatment: they show their latched state as their section says.
- **Focus.** The ring's colour follows the role. Controls that act or set a value (button, quiet action, checkbox and radio, radio card, switch track, toggle button, segmented option, slider thumb, and dialog and drawer content) show a `2px solid var(--accent)` outline, offset 2px, with no halo or glow. It is drawn over the control's own raise or sink shadow, which does not change. Fields lift instead, as the next rule says. Links, navigation rows, tabs, listbox options, and list rows use the base ring: `2px solid var(--focus)`, offset 2px. Inside a scrolling or clipping parent, the ring is inset (`-2px`), and a comment names the reason. Only `:focus-visible` shows a ring; pointer hover never does.
- **Field focus.** Fields (input, select, textarea) draw no ring. On `:focus-visible` the field lifts out of its well: the fill becomes `--field-focus` (`--control-thumb` by default), the shadow `--shadow-raise`, and the border `--accent` at 35% (`color-mix(in srgb, var(--accent) 35%, transparent)`). A `2px solid transparent` outline at offset 0 is invisible normally and draws as a ring in forced colors. The lifted fill must keep field text and placeholder at 4.5:1, on the page and on a surface. If a theme's field text would fall below that, set `--field-focus` to `--field`: the focused field keeps its resting fill, and the raise shadow and accent hairline still mark focus. An invalid field keeps its `--danger` border while focused, outside forced colors. The lift is below 3:1 against the resting field by choice; see [known gaps](decisions.md#known-gaps).
- **Disabled.** Opacity 0.58, `cursor: not-allowed`, and no hover or press. Buttons drop their shadow; other controls keep theirs. Use the native `disabled` attribute. A link styled as a button has no disabled state: use `<button disabled>`.
- **Invalid.** Fields only: `aria-invalid="true"` and a `--danger` border (not in forced colors; see [field focus](#rules-for-every-control)). Other controls show an invalid state through the [field wrapper](#field-wrapper)'s error text. Link the error text with `aria-describedby` or `aria-errormessage`.
- **Motion.** Hover and press transitions use `--duration-fast` with `--ease-out`. State changes such as a switch knob use `--duration`. Under `prefers-reduced-motion: reduce`, transitions are instant.

## Button

Layer: Core. ui: `UiButton`.

- **Anatomy.** A native `<button>` with a label and an optional 16px leading icon. A link that should look like a button is an `<a>` with the same classes and no underline; in `@filipgutica/ui`, `class="fg-button"` with `data-variant` and `data-size`. Medium weight, `-0.01em` tracking, line height 1.25, `--radius-md` (pill). Horizontal padding is 10px at `sm`, `--space-3` at `md`, and `--space-4` at `lg`.
- **Variants.**

  | Variant | Rest | Hover | Pressed |
  | --- | --- | --- | --- |
  | Primary | `--accent` fill, `--accent-text`, `--shadow-raise` | `--button-hover` | `--button-hover`, `--shadow-sink` |
  | Secondary | `--control-thumb` fill, `--text`, `--shadow-raise` | `--text` 8% into `--control-thumb` | `--field` fill, `--shadow-sink` |
  | Ghost | Transparent, `--text-muted`, no shadow | `--row-hover` fill, `--text` | `--field` fill, `--shadow-sink` |
  | Danger | `--danger-soft` fill, `--danger` mixed 75% with `--text` (85% in dark), `--shadow-raise` | `--danger` 10% into `--danger-soft` | `--danger` 16% into `--danger-soft`, `--shadow-sink` |
  | Text | Transparent, `--link`, underlined, 4px padding | No change | No change |

- **States.** Pressed also moves the button 1px down, for every variant but text, and applies to `aria-pressed="true"`. Busy sets `aria-busy="true"` and `disabled`, so the button takes no hover or press, with `cursor: wait`. It shows a 14px spinner before the label: a 2px `currentColor` ring with a transparent right edge, turning once every 700ms. Keep the label while busy.
- **Danger label.** Check the label at 4.5:1 on the rest, hover, and pressed fills. Where the mix misses, use the first of `--text`, black, and white that reads on all three.
- **Use.** One primary action for each decision group. The hue fill marks that action; every other action is secondary, ghost, or text.
- **Keyboard and screen reader.** Native button behavior: Enter and Space activate it. An icon-only button needs `aria-label`.
- **Motion.** Fill and shadow transition over `--duration-fast`. Reduced motion slows the spinner to 1.4s instead of stopping it, so the busy state stays visible. The `tokens.css` base holds that exception.
- **Forced colors.** The transparent border draws as the system button edge.

## Quiet action

Layer: Core. ui: the `fg-quiet-action` class.

- **Use.** An icon or short text action inside a component: code block and command list Copy, capture Full size, dialog and drawer close, and the project trigger. Use a [button](#button) for an action that stands on its own.
- **Anatomy.** A native `<button>`, or the `<summary>` of a menu. Transparent fill, a transparent 1px border, `--radius-md`, and `--text-muted`. Give the shared recipe zero specificity (`:where()`), so each component sets the action's size, place, and resting colour.
- **States.** Hover turns the text `--text` and fills `currentColor` at 12% over transparent. Pressed fills `currentColor` at 18%, with no sink. Focus-visible is the control ring, inset where the parent clips. An open menu keeps its trigger at the 12% tint, below the press. The code block's Copy keeps the block's text colour on hover. A disabled quiet action follows the shared [disabled](#rules-for-every-control) rule.
- **Keyboard and screen reader.** Native button behavior. An icon-only action needs `aria-label`.
- **Motion.** Fill and colour change over `--duration-fast` with `--ease-out`.
- **Forced colors.** The transparent border draws as the system edge.

## Text input and textarea

Layer: Core. ui: `UiInput`. ui has no textarea; a textarea uses the same field recipe.

- **Anatomy.** A native `<input>` or `<textarea>`. Full width, line height 1.35. Input heights follow the control size, and horizontal padding is about 9px, 10px, or 11px.
- **Tokens.** Fill `--field`, text `--text`, placeholder `--text-muted` at full opacity, corners `--radius-field`, border 1px `--field-edge` (transparent in light, a faint edge in dark), shadow `--shadow-sink`.
- **States.** Rest, focus-visible (the field lift from [field focus](#rules-for-every-control)), disabled, and invalid (`--danger` border, kept while focused). A textarea keeps the same padding at the top and bottom as at the sides, and resizes vertically only.
- **Keyboard and screen reader.** Each field has a visible `<label>`. A field inside a [field wrapper](#field-wrapper) gets its description and error ids from it.
- **Motion.** None.
- **Search.** `type="search"` keeps the native clear button, quieted to a 12px cross drawn with a `mask` (1.5px round strokes) and filled `--text-muted`, with `--space-2` before it. Hover fills it `--text`.
- **Forced colors.** The border draws as the system field edge, and the transparent outline draws the focus ring. The system edge replaces the `--danger` edge, so the invalid state relies on its error text there; see [known gaps](decisions.md#known-gaps).

## Select

Layer: Core. ui: `UiSelect`.

- **Anatomy.** A native `<select>` with the input's field recipe and a chevron on the right. Draw the chevron in `currentColor`, or with an 8px border corner in `--text-muted` turned 45°. Right padding leaves room for it.
- **Picker.** Where `appearance: base-select` is supported, the open list is a floating layer: `--surface-raised`, a transparent 1px border, `--radius-lg`, `--shadow-popover`, 4px padding, at least the select's width, and at most `min(20rem, 50dvh)` tall. Options are at least 32px tall (44px on coarse pointers), with `--space-2` `--space-3` padding and corners of `--radius-lg` minus 4px. Hover fills `--row-hover`. An `--accent` check at the end marks the checked option. The check carries the state: the option's `--row-selected` fill equals `--surface-raised`. Keyboard focus is an inset `--focus` ring, because the list scrolls. Other browsers keep the native picker.
- **States.** Rest, focus-visible, disabled, and invalid, as for the input.
- **Keyboard and screen reader.** Native select behavior. A visible `<label>`.
- **Motion.** None.
- **Forced colors.** Native.

## Field wrapper

Layer: Core. ui: `UiField`.

- **Anatomy.** A grid with a 6px gap: label, control, then a description or an error. The error replaces the description.
- **Tokens.** Label `--text-sm` semibold `--text`. Description `--text-sm` `--text-muted`. Error `--text-sm` `--danger`.
- **Keyboard and screen reader.** The label's `for` names the control. The control points `aria-describedby` at the description, and `aria-errormessage` at the error with `aria-invalid="true"`.

## Checkbox and radio

Layer: Core. ui: `UiCheckbox`. ui has no standalone radio; radio cards cover radio choices there.

- **Anatomy.** A `<label>` around the box and its text, with a gap of about 9px. The box is 16px at `sm`, 18px at `md`, and 20px at `lg`. Checkbox corners are `--radius-sm`; a radio is round. The row is at least the control height.
- **Tokens.** Unchecked: `--surface-raised` fill and a 1px `--border` edge. Checked: `--accent` fill and edge, with a check mark in `--accent-text`. A checked radio shows a 5px `--accent` ring around a `--surface-raised` centre.
- **States.** Rest, checked, focus-visible (the control ring on the box), and disabled.
- **Keyboard and screen reader.** Native `<input type="checkbox">` or `type="radio"`. Space toggles a checkbox. Arrow keys move between radios in a named `radiogroup` or `<fieldset>`.
- **Forced colors.** Native inputs keep system colors. A custom-drawn box redraws in `Highlight` when checked.

## Radio card group

Layer: Core. ui: `UiRadioCardGroup`, `UiRadioCard`.

- **Anatomy.** A grid of cards (`repeat(auto-fit, minmax(160px, 1fr))`, `--space-3` gap). Each card is a `<label>` with a title, an optional muted description, and a 16px round indicator in the top right corner. The native radio stays inside the card.
- **Tokens.** Unselected: `--surface-raised`, `--shadow-raise`, transparent border, `--radius-lg`, `--space-3` padding. Hover: `--surface-hover` 45% into `--surface-raised`. Selected: `--field` fill and `--shadow-sink`, with the indicator filled `--accent` and an `--accent-text` check. The selected card has no accent ring.
- **States.** Rest, hover, selected, focus-visible (the control ring over the card's raise or sink), and disabled.
- **Keyboard and screen reader.** One Tab stop for the group; arrow keys change the selection. Name the group.
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The selected indicator uses `Highlight` with `HighlightText`.

## Switch

Layer: Core. ui: `UiSwitch`.

- **Anatomy.** A `<button role="switch" aria-checked>` that contains the track, and a separate `<label for>` with an optional description. The button's hit area is at least 32px wide and the control height tall. The track is 44×22 with a pill radius; the knob is 18px, inset 2px. `sm` scales both by 0.8 and `lg` by 1.2.
- **Tokens.** Off track: `--border` 90% into `--field`, `--shadow-sink`, transparent 1px border. Knob: `--surface-raised` with `--shadow-raise`. On: `--accent` track, `--accent-text` knob moved 22px to the right.
- **States.** Off, on, focus-visible (the control ring goes on the track, not the hit area), and disabled.
- **Keyboard and screen reader.** Space and Enter toggle it. The label names it; the description is linked with `aria-describedby`.
- **Motion.** The knob's transform and the track's fill change over `--duration` with `--ease-out`.
- **Forced colors.** Track: `ButtonText` edge on `Canvas`, with a `ButtonText` knob. On: `Highlight` track with a `HighlightText` knob.

## Toggle button

Layer: Core. ui: `UiToggleButton`.

- **Anatomy.** A `<button aria-pressed>` with a switch track at the start, then a label and an optional `--text-xs` muted description. `--radius-field` corners (a labelled card, so wrapped labels sit square), `--space-2` `--space-3` padding, `--surface-raised` fill, a 1px `--border-subtle` edge, and no shadow. The visible edge and the missing raise are a named exception; see [decisions](decisions.md).
- **States.** Rest, hover (`--border` edge), pressed (the track turns on as in the switch and carries the state; the card takes `--accent` at 8% over `--surface-raised` and a hairline of `--accent` at 35%), focus-visible, and disabled.
- **Keyboard and screen reader.** A native button; Space and Enter toggle `aria-pressed`.
- **Motion.** The card's fill and edge change over `--duration-fast` with `--ease-out`; the track moves as the switch does.
- **Forced colors.** As for the switch track.

## Segmented control

Layer: Core. ui: `UiSegmentedControl`.

- **Use.** Two to five short options that apply at once, such as a view mode or the System, Light, and Dark appearance choice. Use a select for longer lists and radio cards for options that need descriptions.
- **Anatomy.** A `role="group"` with an accessible name, containing one `<button aria-pressed>` for each option. The track is undivided: `--field` fill, `--shadow-sink`, a transparent 1px border, and `--radius-md`. Each button is the full control height with `--space-3` padding (square when icon-only). Its thumb is a `::before` layer inset 2px inside the button, behind the label.
- **Tokens.** Labels are `--text-muted`. The pressed option's thumb is `--control-thumb` with `--shadow-raise` and no ring. Its label is `--segmented-current-text`: `--accent` where it reaches 4.5:1 on the thumb, on the page and on a surface, and otherwise the first of `--text`, black, and white that does. An icon-only option needs 3:1. Hover on an unpressed option shows the thumb at 45% and turns the label `--text`.
- **States.** Rest, hover, pressed, focus-visible (an inset ring, so it hugs the thumb instead of crossing into the next option), and disabled.
- **Keyboard and screen reader.** Each option is its own Tab stop; Space and Enter press it. Icon-only options use the label as `aria-label` and `title`.
- **Motion.** Hover fades the label colour over `--duration-fast` with `--ease-out`. When the reader changes the choice, one thumb glides from the old option to the new one. Start the new thumb's left and right edges where the old thumb was, then animate each edge home with CSS `ease`. The leading edge takes 260ms and the trailing edge 300ms, so the thumb stretches a little on the way. Labels cross-fade their colour over 260ms. If a glide is cut short, start the next one from the thumb's current position. There is no motion on first render, on a value restored from storage, or on a theme change: allow glides only after the first frame. Reduced motion moves the thumb at once.
- **Forced colors.** The pressed option draws `Highlight` behind `HighlightText`. Its focus ring is `CanvasText`: the option opts out of adjustment, and the ring sits on the track.

## Slider

Layer: Core. ui: `UiSlider`.

- **Anatomy.** A 6px track with `--radius-sm` and `--surface-hover`, an `--accent` range, and a round thumb (16px, 18px, or 20px) with a 2px `--accent` edge and a `--surface-raised` fill.
- **States.** Rest, dragging (`cursor: grabbing`), focus-visible on the thumb, and disabled.
- **Keyboard and screen reader.** The thumb has `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and a name. Arrow keys step; Home and End jump to the ends. A native `<input type="range">` styled to match is acceptable.
- **Forced colors.** The range redraws in `Highlight` with `forced-color-adjust: none`. The thumb keeps the system colours.

## Progress

Layer: Core. ui: `UiProgress`.

- **Anatomy.** A track about 9px tall with a 1px `--border-subtle` edge, `--radius-sm`, and `--surface-hover`, holding an `--accent` indicator moved with `translateX`.
- **Keyboard and screen reader.** `role="progressbar"` with a name and `aria-valuenow`, or a native `<progress>`.
- **Motion.** The indicator's transform moves over `--duration-fast` with `--ease-out`.
- **Forced colors.** The indicator redraws in `Highlight` with `forced-color-adjust: none`.

## Score

Layer: Core. ui: `UiScore`.

- **Anatomy.** A row of 8px pips with 3px gaps, then the value in medium weight and `/max` in muted regular weight, in tabular numbers. Empty pips have a 1px `--border` edge; filled pips are `--accent`.
- **Keyboard and screen reader.** The pips are `aria-hidden`; the text value carries the score.
- **Forced colors.** Filled pips redraw in `Highlight` with `forced-color-adjust: none`.

## Tabs

Layer: Core. ui: `UiTabs`.

- **Anatomy.** A `role="tablist"` with no rule below it and a 12px gap below it. It scrolls sideways when needed, and a 24px mask fades each clipped edge. Scrolling clips on every side, so the list has 4px (`--space-1`) padding all round: it keeps the selected tab's shadow whole and its fill off the frame edge. Each tab is a borderless button at least `--control-md` tall (`--control-lg` on phones), with `--space-2` `--space-3` padding, `--radius-field` corners, medium weight, and `--text-muted`.
- **States.** Hover fills `--row-hover` and turns the text `--text`. The selected tab takes the [navigation row](#navigation-list)'s current-page recipe: `--nav-current` fill and `--shadow-nav-current`, with no underline. Its text is `--nav-current-text`: the first of `--accent`, `--text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Focus-visible is an inset `--focus` ring, because the list scrolls.
- **Motion.** Fill, colour, and shadow change as on a [navigation row](#navigation-list).
- **Keyboard and screen reader.** Roving `tabindex`: arrow keys move between tabs, Home and End go to the ends, and focus selects the tab. Each tab has `aria-controls` and `aria-selected`; each panel has `role="tabpanel"`. Without JavaScript, show every panel under its own heading. Apply the tab roles and hide the headings and unselected panels only when the script enhances the markup.
- **Forced colors.** The fill and shadow drop, so the selected tab takes a 2px `Highlight` border, and its padding shrinks by 2px to keep its size.

## Badge

Layer: Core. ui: `UiBadge`.

- **Anatomy.** An inline pill: `--radius-pill`, about 3px by 9px padding, `--text-xs`, medium weight, and a transparent 1px border.
- **Tokens.** Neutral: `--surface-hover` fill, `--text-muted`, no dot. Status tones (success, warning, danger, info): the tone at 22% over `--surface-raised`, text of the tone mixed 75% with `--text` in light and 85% in dark, and a leading 6px dot in `currentColor`.
- **Keyboard and screen reader.** Static text; the label carries the meaning, never the colour alone.

## Alert

Layer: Core. ui: `UiAlert`.

- **Anatomy.** An optional 16px icon and short text. `--space-3` `--space-4` padding, `--radius-lg`, and a transparent 1px border.
- **Tokens.** Neutral: `--surface`. Status tones use their `--*-soft` tint with `--text`; the icon takes the status colour.
- **Keyboard and screen reader.** Static content. Use `role="status"` or `role="alert"` only for a message that appears while the reader works.

## Surface and card

Layer: Core. ui: `UiSurface`, `UiCard`.

- **Anatomy.** A panel: `--surface-raised`, transparent 1px border, `--radius-lg`, and `--shadow-surface`. A card adds a header (title in `--text-md` medium weight, with actions at the end), a body, and an optional footer above a `--border-subtle` rule in `--text-sm` muted text. Header and body padding is `--space-4`; padding is compact (`--space-3`) or default (`--space-4`).
- **Use.** A few parallel, self-contained options that a reader compares. Do not nest panels.

## Figure

Layer: Core. ui: `UiFigure`.

- **Anatomy.** A well (`--surface`, 1px `--border-subtle`, `--radius-lg`, `--space-5` padding, or `--space-4` on phones) with a caption below it in `--text-sm` muted text. Wide content scrolls inside the well. A figure number is `--text` in medium weight.
- **Identity.** On folio sites the caption is mono.

## Dialog

Layer: Core. ui: `UiDialog`.

- **Anatomy.** A floating layer centred on an `--overlay` backdrop, at most 512px wide and 672px tall. It has a header (title in 18px semibold with an optional muted description, and a 44px close button), a body that scrolls, and an optional footer on `--surface` with its actions at the end. Rules between the parts are `--border-subtle`. On phones it becomes a bottom sheet with rounded top corners.
- **Tokens.** `--surface-raised`, a transparent 1px border, `--radius-lg`, `--shadow-popover`. The close button is a [quiet action](#quiet-action).
- **Keyboard and screen reader.** `role="dialog"`, `aria-modal="true"`, named by its title. Focus moves in on open and is trapped. Escape closes it, and focus returns to the trigger. A native `<dialog>` opened with `showModal()` provides most of this.
- **Motion.** None by default.

## Drawer

Layer: Core. ui: `UiDrawer`.

- **Anatomy.** A dialog fixed to the left edge, full height, `min(--sidebar + 48px, 100vw - 48px)` wide, with a header (title and close button) and a body that scrolls on its own. It is a floating layer with square corners: `--surface-raised`, a transparent 1px border, and `--shadow-popover`. The close button is a [quiet action](#quiet-action).
- **Keyboard and screen reader.** As for the dialog. Following an in-page link inside the drawer closes it and moves focus to the link's destination (given `tabindex="-1"` if it is not focusable), not back to the trigger. Modified clicks (a new tab or window) leave it open.
- **Motion.** It slides in over `--duration` and out over `--duration-fast`, with `--ease-out`, while the overlay fades. Reduced motion shows and hides it at once.

## Navigation list

Layer: Core. The mono font on rail rows is identity. ui: the rows in `UiSiteNav` and the project menu.

- **Anatomy.** A `<nav>` with a name, holding links in rows: at least `--row` tall (`--control-lg` at tablet width), `0 --space-3` padding, `--radius-field` corners, `--text-sm`, and `--text-muted`. Groups have a `--text-xs` semibold muted label and 2px gaps between rows.
- **States.** Hover: `--row-hover` fill and `--text`. Current page (`aria-current="page"`): `--nav-current` fill, `--shadow-nav-current`, `--nav-current-text`, and medium weight; hover keeps that fill. `--nav-current` is a faint accent tint: `--accent` at 8% over `--surface-raised` in light, and `--accent` at 14% over transparent in dark. `--nav-current-text` is the first of `--accent`, `--text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Selected tabs use the same fill and rule. Current location in the page (`aria-current="location"`): `--text` in medium weight, with a 3×14 `--accent` pip at the leading edge, inset 4px, and no fill. Focus-visible: an inset `--focus` ring, because the rail and the drawer scroll.
- **Phone.** At tablet width a section rail becomes a drawer. Its trigger is a secondary button at `--control-lg` with a three-line menu glyph (14×10, 1.5px lines) before the label. Without JavaScript the list opens in place, so the trigger is a `<details>` summary with the secondary button classes and a chevron after the label. Only the chevron is local.
- **Horizontal strip.** A section strip laid out in a row uses these rows and states unchanged, the location pip included.
- **Keyboard and screen reader.** Plain links in Tab order.
- **Motion.** Fill, colour, and shadow change over `--duration-fast` with `--ease-out`.
- **Forced colors.** Fills and shadows drop. Only the current page (`aria-current="page"`) takes a 2px `Highlight` border on its leading edge. The location pip keeps its shape with `forced-color-adjust: none` and a `Highlight` fill, so page and location still differ.
- **List selection.** A 2px inset `--accent` bar on the leading edge and medium weight mark a selected row in a list or table, with `aria-selected="true"`. The bar carries the state: the row's `--row-selected` fill equals `--surface-raised`. Forced colors replace the bar with a `Highlight` border.

## Code block

Layer: Core. ui: `UiCodeBlock`.

- **Anatomy.** A source code well: `--code-bg`, transparent 1px border, `--radius-lg`, `--shadow-surface`. An optional header (at least 40px, `--surface-raised`, `--text-xs`, a `--border-subtle` rule below) holds the title in semibold, the language in muted text, and a Copy button. The `<pre>` has `--space-4` padding, scrolls in both directions, is at most 32rem tall, and sets `--font-mono` at `--text-code` with a line height of 1.65. Line numbers are muted and right-aligned. Syntax uses the `--code-*` tokens. A compact variant puts the code and the Copy button on one row, with no header.
- **Phone text.** Set `text-size-adjust: 100%` (and `-webkit-text-size-adjust`) on the block, and align each line's items to the baseline, so iOS Safari does not enlarge one line.
- **Copy.** Copies the code text only: no line numbers or prompts, and one line per row joined with newlines. A [quiet action](#quiet-action) at least 44×44 with an accessible name. Announce the result in a polite live region; in the compact variant the success message is visually hidden.
- **Keyboard and screen reader.** The `<pre>` is focusable when it scrolls. Its focus ring and the Copy button's ring are inset, because the block clips its content.
- **In an example.** Inside an [example](#example) the block has no header, radius, border, or shadow, and spans the frame's width.

## Example

Layer: Core. ui: `UiExample`.

- **Use.** Documentation that shows a live component above the code that makes it. Use a [code block](#code-block) for code with no live result, and a [figure](#figure) for a static picture.
- **Anatomy.** One frame: a `<figure>` with a 1px `--border-subtle` edge, `--radius-lg`, no shadow, and its content clipped to the corners. The stage comes first and holds the live preview, centred, at least 8rem tall, with `--space-8` padding. The source follows directly below the stage, after one `--border-subtle` hairline. There is no header row and no language label. An optional caption follows the frame, as a [figure](#figure) caption does.
- **Tokens.** Frame edge `--border-subtle` and corners `--radius-lg`. Stage `--bg`. Hairline `--border-subtle`. Source `--code-bg` and the `--code-*` syntax tokens.
- **Stage.** The stage sits on the page background, not in a well or a panel. This is a named exception to the container [depth](DESIGN.md#depth) tier: a preview shows each component on the surface it sits on in a page; see [decisions](decisions.md).
- **Source.** A [code block](#code-block) with its padding and type. Inside the frame it has no radius, border, or shadow of its own, and it spans the frame's full width, not `--measure`.
- **Copy.** The [code block](#code-block)'s Copy, icon-only and named "Copy code", in the source's top right corner. It comes before the `<pre>` in DOM order, so the reader reaches it before the code.
- **States.** The frame has no states. Components on the stage show their own states, and Copy shows the quiet action's states.
- **Long code.** The `<pre>` scrolls inside the code block's 32rem maximum height, and sideways for long lines. It is focusable and named (for example, "Example source") when it scrolls.
- **Keyboard and screen reader.** Tab order is the stage's controls, then Copy, then the `<pre>`. Focus rings on Copy and the `<pre>` are inset, because the frame clips its content.
- **Motion.** None of its own.
- **Responsive.** The frame takes its container's width. The stage stays above the source at every width. On phones the stage padding is `--space-6` by `--space-4`. Wide content scrolls inside the stage or the `<pre>`, never the page.
- **Forced colors.** The frame edge and the hairline draw in the system colour. Copy's transparent border draws as the system button edge.

## Command plate

Layer: Identity. ui: `UiCodeBlock` with a shell language or the compact variant.

- **Anatomy.** A code block for a shell command, drawn as a dark plate in both themes: `--command-bg` with a `--command-border` edge (transparent in light). Text, syntax, and the caption all use `--terminal-text` or `--terminal-caption-text`. Each line starts with a `$ ` prompt in `--project-dark`, drawn with `content: "$ " / ""` and `user-select: none`, so copied and spoken text omit it. Focus rings on the plate use `--project-dark`, the control ring on Copy included.
- **Contrast.** Plate text at least 4.5:1 and the prompt at least 3:1 on `--command-bg`, for each project hue.

## Terminal capture

Layer: Identity. ui: `UiCapture`.

- **Anatomy.** A panel whose header holds mono tabs (one for each capture) and a Full size [quiet action](#quiet-action) at the end. The screen is the neutral `--terminal` plate, and a mono status-line caption sits below it on `--terminal-caption` with `--terminal-caption-text`. Full size opens the capture in a dialog.
- **Keyboard and screen reader.** Tabs follow the tabs spec. Full size opens the selected capture in a modal dialog named after it, and focus returns to the button when the dialog closes. Without JavaScript the button is hidden. Focus rings are inset, because the panel clips its content. Without JavaScript, every capture is listed under its own heading.
- **Header.** The whole panel, header included, is the `--terminal` plate in both page appearances, with a 1px `--terminal-border` edge. It scopes its own palette so the tabs read on it: current fill `--project-dark` at 14% over transparent, with a `--terminal-shadow-nav-current` lift, hover `--terminal-text` at 4%, selected text, accent, and focus `--project-dark`, text `--terminal-text`, muted text `--terminal-caption-text`, and dividers `--terminal-border`. The tab list keeps its 4px block padding, and the Full size control stays centred on the tab row.

## Site header

Layer: Identity. ui: `UiSiteHeader`, `UiSiteAppearancePicker`.

- **Anatomy.** A static header at least 64px tall on `--bg` with a solid 1px `--text` rule below it. At the start is the project switcher: a `<details>` whose summary, a [quiet action](#quiet-action), shows the mono, semibold project name after a `~/` mark in `--project` (drawn by CSS, so it is not read), then a chevron. Its menu is a floating layer, with the dialog's tokens, listing the shared project registry in the order it defines, as navigation rows, with the current project marked `aria-current="page"`. At the end are the site links (`--text-muted`, at least 44px tall, `--text` on hover) and the appearance picker: an icon-only segmented control at `lg`.
- **Phone.** With three or more links, the links take a second row.
- **Keyboard and screen reader.** The summary is named "Project: <name>". Escape closes the menu and returns focus to the summary; moving focus out of it closes it. The chevron turns 180° while the menu is open, over `--duration-fast` with `--ease-out`.

## Folio type and page helpers

Layer: Identity. ui: `site.css` helpers.

- **Headings.** Page titles (`--text-3xl`) and section headings (`--text-xl`) use `--font-mono`. A section heading starts with a `## ` mark in `--accent`, drawn with `content: "## " / ""`, and has a `--border-subtle` rule above the section. A product page or tool home may use a mono `--text-display` title (`--text-display-sm` on phones).
- **Steps.** An ordered list in which each step hangs from a mono number in `--accent` on a ruled leading column, with an h3 title per step.
- **Definitions.** A definition list of terms and short meanings: medium-weight terms and muted meanings in two columns, one column on phones. Flags such as `--all` do not break.
- **Skip link.** The first focusable element, hidden above the page until it takes focus, then shown as a floating layer with the base focus ring.
- **Facts.** A mono definition list of short labels and values, such as a repository path. Values wrap anywhere.
- **Command list.** A table of commands (mono) and descriptions (muted), with a Copy [quiet action](#quiet-action) for each row. On phones each row becomes a two-column grid.
- **Footer.** Mono, with an attribution link at the start and project links at the end.
