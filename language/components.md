# Component specs

One section for each component in the design language. Write any framework's version of a component from its section. [`components.html`](components.html) shows each state as static markup, and [`tokens.css`](tokens.css) holds the values. The [decisions](decisions.md) record why each choice was made. `@filipgutica/ui` is the Vue implementation; the `ui:` line in each section names its component, for comparison only.

Each section has these parts: anatomy, states, then Do and Don't, keyboard and screen reader, motion, and forced colors. A part that does not apply says "None", with the reason. Do names the choice to make, and Don't names the mistake to avoid; neither repeats the spec. A section may add tokens and parts of its own. Sizes are in CSS pixels at the default 16px root font size. Type, spacing, and control sizes are set in rem (pixels ÷ 16), so they follow the reader's font-size setting; borders, focus rings, and shadows stay in pixels. A percentage mix means `color-mix(in srgb, A n%, B)`.

## Layers

| Layer | What it holds | A new project |
| --- | --- | --- |
| Core | Tokens, depth, controls and their states, focus, motion, accessibility, forced colors | Adopts it as is |
| Identity | The terminal folio look: the `~/name` header, the project registry, mono display headings, `##` section marks, terminal plates, captures, and the mono section rail | Replaces it with its own |

The identity layer reads only the identity tokens (`--color-project`, `--color-project-dark`, `--font-ui`, `--font-mono`) and the terminal tokens. A core component never depends on an identity component.

## Groups

The sections follow the catalogue's purpose groups, in this order. Each component keeps its layer.

| Group | Components |
| --- | --- |
| Actions | Button, quiet action |
| Selection | Checkbox and radio, radio card group, switch, toggle button, segmented control |
| Inputs | Text input and textarea, select, field wrapper, slider |
| Feedback and status | Progress, score, badge, alert |
| Containers and overlays | Surface and card, figure, dialog, drawer |
| Navigation | Navigation list, section rail, find field, breadcrumbs, pager, tabs, skip link, keyboard key |
| Code and examples | Code block |
| Identity | Command plate, terminal capture, site header, page type and helpers |

A control's **States** line names each interactive state it has. In `components.html` each control section lists the same states in `data-states`, and the Control states table shows them; a test checks the three agree.

## Rules for every control

- **Sizes.** `sm`, `md`, and `lg` use `--control-sm`, `--control-md`, and `--control-lg` for height, with `--text-sm`, `--text-md`, and `--text-lg`. At tablet width (`max-width: 800px`) touch targets use `--control-lg`.
- **Borders.** Every control keeps a 1px border, transparent unless its section says otherwise, so forced colors can draw an edge.
- **Depth.** Each control takes its shadow from the [depth tiers](DESIGN.md#depth).
- **Hover.** Hover fills apply only where the pointer can hover. Put every `:hover` rule that sets a background, shadow, border colour, or text colour in `@media (hover: hover)`, because a touch screen keeps `:hover` on the last element tapped. The pressed tint stays outside the query: it shows only while a finger is down.
- **Press.** Only a button has a pressed state; see [Button](#button). A [quiet action](#quiet-action) tints on press without sinking. Other controls have no `:active` treatment: they show their latched state as their section says.
- **Focus.** One ring for every role but fields: `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)` (2px, 3px), with no halo or glow. `--color-focus` is the accent (`--color-accent`), which reaches 3:1 on `--color-bg`, `--color-surface`, and `--color-surface-raised` in both themes. It sits around primary, danger, and selected controls too. Do not give a role its own ring colour; where a variant must recolour the ring, set only `outline-color`. The ring is drawn over the control's own raise or sink shadow, which does not change. It goes on the visible part of a composite control: the switch track, the radio card, and the slider thumb. A dark plate (command plate, terminal capture) sets `--color-focus: var(--color-project-dark)`, the dark-theme accent, which reaches 3:1 on the plate in both page themes. In forced colors, a control that opts out of adjustment (a checked box, the switch track, a pressed segmented option) sets `outline-color: CanvasText`. Inside a scrolling or clipping parent, the ring is inset (`outline-offset: calc(var(--focus-width) * -1)`), and a comment names the reason. Only `:focus-visible` shows a ring; pointer hover never does.
- **Field focus.** Fields (input, select, textarea, and the search wrapper) draw no ring. On `:focus-visible` (the search wrapper uses `:has(input:focus-visible)`) the 1px edge turns `--color-accent`, and `--shadow-field-focus` (`inset 0 0 0 2px`, the accent at 18% over transparent) draws a muted accent line inside it, with `outline: none`. The fill does not change in either theme. An invalid field keeps its `--color-error` edge while focused, and its inset line is `--shadow-field-focus-invalid` (`--color-error` at 18%). Forced colors drop the inset line, so a focused field there draws `outline: var(--focus-width) solid Highlight; outline-offset: -1px`.
- **Disabled.** Opacity 0.58, `cursor: not-allowed`, and no hover or press. Buttons drop their shadow. Fields drop theirs and fill with the `--color-well` well (the grey well in light; the same as rest in dark). Other controls keep theirs. Use the native `disabled` attribute. A link styled as a button has no disabled state: use `<button disabled>`.
- **Invalid.** Fields only: `aria-invalid="true"` and a `--color-error` border (not in forced colors; see [field focus](#rules-for-every-control)). Other controls show an invalid state through the [field wrapper](#field-wrapper)'s error text. Link the error text with `aria-describedby` or `aria-errormessage`.
- **Motion.** Hover and press transitions use `--duration-fast` with `--ease-out`. State changes such as a switch knob use `--duration`. Under `prefers-reduced-motion: reduce`, transitions are instant.

## Button

Layer: Core. ui: `UiButton`.

- **Anatomy.** A native `<button>` with a label and an optional 16px leading icon. A link that should look like a button is an `<a>` with the same classes and no underline; in `@filipgutica/ui`, `class="fg-button"` with `data-variant` and `data-size`. Medium weight, `-0.01em` tracking, line height 1.25, `--radius-control` (pill). Horizontal padding is 10px at `sm`, `--space-3` at `md`, and `--space-4` at `lg`.
- **Variants.**

  | Variant | Rest | Hover | Pressed |
  | --- | --- | --- | --- |
  | Primary | `--color-accent` fill, `--color-accent-text`, `--shadow-raise` | `--color-button-hover` | `--color-button-hover`, `--shadow-sink` |
  | Secondary | `--color-control-thumb` fill, `--color-text`, `--shadow-raise` | `--color-text` 8% into `--color-control-thumb` | `--color-well` fill, `--shadow-sink` |
  | Ghost | Transparent, `--color-muted`, no shadow | `--color-row-hover` fill, `--color-text` | `--color-well` fill, `--shadow-sink` |
  | Danger | `--color-error-surface` fill, `--color-error` mixed 75% with `--color-text` (85% in dark), `--shadow-raise` | `--color-error` 10% into `--color-error-surface` | `--color-error` 16% into `--color-error-surface`, `--shadow-sink` |
  | Text | Transparent, `--color-link`, underlined, 4px padding | No change | No change |

- **States.** Rest, hover, pressed, focus-visible, disabled, and busy. Pressed also moves the button 1px down, for every variant but text, and applies to `aria-pressed="true"`. Busy sets `aria-busy="true"` and `disabled`, so the button takes no hover or press, with `cursor: wait`. It shows a 14px spinner before the label: a 2px `currentColor` ring with a transparent right edge, turning once every 700ms. Keep the label while busy.
- **Do.** One primary button in each decision group, labelled with a verb for its result, such as "Save changes". Every other action in the group is secondary, ghost, or text.
- **Don't.** The danger variant on an action the reader can undo. Danger marks an action that destroys something.
- **Danger label.** Check the label at 4.5:1 on the rest, hover, and pressed fills. Where the mix misses, use the first of `--color-text`, black, and white that reads on all three.
- **Keyboard and screen reader.** Native button behavior: Enter and Space activate it. An icon-only button needs `aria-label`.
- **Motion.** Fill and shadow transition over `--duration-fast`. Reduced motion slows the spinner to 1.4s instead of stopping it, so the busy state stays visible. The `tokens.css` base holds that exception.
- **Forced colors.** The transparent border draws as the system button edge.

## Quiet action

Layer: Core. ui: the `fg-quiet-action` class.

- **Anatomy.** A native `<button>`, or the `<summary>` of a menu. Transparent fill, a transparent 1px border, `--radius-control`, and `--color-muted`. The project trigger overrides the corner with `--radius-field`, because it opens a menu and does not act (see [Site header](#site-header)). The content is centred in the box. An icon-only action holds an SVG icon, never a text glyph such as ×, because a font draws a glyph's ink off the centre of its box. Give the shared recipe zero specificity (`:where()`), so each component sets the action's size, place, and resting colour.
- **States.** Hover turns the text `--color-text` and fills `currentColor` at 6% over transparent, only where the pointer can hover (`@media (hover: hover)`). Pressed fills `currentColor` at 12%, with no sink. Focus-visible is the focus ring, inset where the parent clips. An open menu keeps its trigger at the 6% hover tint, below the press. The code block's Copy is `--color-muted` at rest and takes the block's text colour (`--color-code-text`) on hover and while its tick shows. A disabled quiet action follows the shared [disabled](#rules-for-every-control) rule.
- **Do.** Use it for an action inside a component: Copy in a code block or command list, close in a dialog or drawer, Full size on a capture, and the project trigger.
- **Don't.** An action that stands on its own in the page, such as Save or Next. That is a button.
- **Keyboard and screen reader.** Native button behavior. An icon-only action needs `aria-label`.
- **Motion.** Fill and colour change over `--duration-fast` with `--ease-out`.
- **Forced colors.** The transparent border draws as the system edge.

## Checkbox and radio

Layer: Core. ui: `UiCheckbox`. ui has no standalone radio; radio cards cover radio choices there.

- **Anatomy.** A `<label>` around the box and its text, with a gap of about 9px. The box is 16px at `sm`, 18px at `md`, and 20px at `lg`. Checkbox corners are `--radius-inline`; a radio is round. The row is at least the control height of its size, and the label takes that size's text: `--text-sm` at `sm`, `--text-md` at `md`, and `--text-lg` at `lg`.
- **Tokens.** Unchecked: `--color-surface-raised` fill and a 1px `--color-border` edge. Checked: `--color-accent` fill and edge, with a check mark in `--color-accent-text`. A checked radio shows a 5px `--color-accent` ring around a `--color-surface-raised` centre.
- **States.** Rest, checked, focus-visible (the focus ring on the box), and disabled.
- **Do.** Checkboxes for options the reader can pick in any combination. Radios for one choice from a short list that stays in view.
- **Don't.** A label written as a question, such as "Send updates?", or as a negative, such as "Don't email me". Name the option: "Email me updates".
- **Keyboard and screen reader.** Native `<input type="checkbox">` or `type="radio"`. Space toggles a checkbox. Arrow keys move between radios in a named `radiogroup` or `<fieldset>`.
- **Motion.** None: the box fills and the mark appears at once, as a native input's do.
- **Forced colors.** Native inputs keep system colors. A custom-drawn box redraws in `Highlight` when checked.

## Radio card group

Layer: Core. ui: `UiRadioCardGroup`, `UiRadioCard`.

- **Anatomy.** A grid of cards (`repeat(auto-fit, minmax(160px, 1fr))`, `--space-3` gap). Each card is a `<label>` with a title, an optional muted description, and a 16px round indicator in the top right corner. The native radio stays inside the card.
- **Tokens.** Unselected: `--color-surface-raised`, `--shadow-raise`, transparent border, `--radius-panel`, `--space-3` padding. Hover: `--color-surface-muted` 45% into `--color-surface-raised`. Selected: `--color-well` fill and `--shadow-sink`, with the indicator filled `--color-accent` and an `--color-accent-text` check. The selected card has no accent ring.
- **States.** Rest, hover, selected, focus-visible (the focus ring over the card's raise or sink), and disabled.
- **Do.** Use radio cards when the reader chooses by a description, such as plans or deploy modes. Give each card a title and one line on what differs.
- **Don't.** Radio cards for options that a title alone explains. Use radios.
- **Keyboard and screen reader.** One Tab stop for the group; arrow keys change the selection. Name the group.
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The selected indicator uses `Highlight` with `HighlightText`.

## Switch

Layer: Core. ui: `UiSwitch`.

- **Anatomy.** A `<button role="switch" aria-checked>` that contains the track, and a separate `<label for>` with an optional description. The button's hit area is at least 32px wide and the control height tall. The track is 44×22 with a pill radius; the knob is 18px, inset 2px. `sm` scales both by 0.8 and `lg` by 1.2.
- **Tokens.** Off track: `--color-border` 90% into `--color-well`, `--shadow-sink`, transparent 1px border. Knob: `--color-surface-raised` with `--shadow-raise`. On: `--color-accent` track, `--color-accent-text` knob moved 22px to the right.
- **States.** Off, on, focus-visible (the focus ring goes on the track, not the hit area), and disabled.
- **Do.** Use a switch for a setting that applies the moment it changes. Its label names the setting, such as "Dark mode", and stays the same when on or off.
- **Don't.** A switch in a form that applies on submit. Use a checkbox there.
- **Keyboard and screen reader.** Space and Enter toggle it. The label names it; the description is linked with `aria-describedby`.
- **Motion.** The knob's transform and the track's fill change over `--duration` with `--ease-out`.
- **Forced colors.** Track: `ButtonText` edge on `Canvas`, with a `ButtonText` knob. On: `Highlight` track with a `HighlightText` knob.

## Toggle button

Layer: Core. ui: `UiToggleButton`.

- **Anatomy.** A `<button aria-pressed>` with a switch track at the start, then a label and an optional `--text-xs` muted description. `--radius-field` corners (a labelled card, so wrapped labels sit square), `--space-2` `--space-3` padding, `--color-surface-raised` fill, a 1px `--color-border-subtle` edge, and no shadow. The visible edge and the missing raise are a named exception; see [decisions](decisions.md).
- **States.** Rest, hover (`--color-border` edge), pressed (the track turns on as in the switch and carries the state; the card takes `--color-accent` at 8% over `--color-surface-raised` and a hairline of `--color-accent` at 35%), focus-visible, and disabled.
- **Do.** Use it for an on or off option whose label sits inside the control, such as "Wrap lines" in a viewer's toolbar.
- **Don't.** A toggle button for an action that runs once, such as Refresh. It stays on until pressed again; an action is a button.
- **Keyboard and screen reader.** A native button; Space and Enter toggle `aria-pressed`.
- **Motion.** The card's fill and edge change over `--duration-fast` with `--ease-out`; the track moves as the switch does.
- **Forced colors.** As for the switch track.

## Segmented control

Layer: Core. ui: `UiSegmentedControl`.

- **Anatomy.** A `role="group"` with an accessible name, containing one `<button aria-pressed>` for each option. The track is undivided: `--color-well` fill, `--shadow-sink`, a transparent 1px border, and `--radius-control`. Each button is the full control height (`--item`) with `--space-3` padding, and square when icon-only. At tablet width an unsized control sets `--item` to `--control-lg`, so its buttons grow to the touch size and icon-only options stay square. Its thumb is a `::before` layer inset 2px inside the button, behind the label.
- **Tokens.** Labels are `--color-muted`. The pressed option's thumb is `--color-control-thumb` with `--shadow-raise` and no ring. Its label is `--color-segmented-current-text`: `--color-accent` where it reaches 4.5:1 on the thumb, on the page and on a surface, and otherwise the first of `--color-text`, black, and white that does. An icon-only option needs 3:1. Hover on an unpressed option shows the thumb at 45% and turns the label `--color-text`.
- **States.** Rest, hover, pressed, focus-visible (an inset ring, so it hugs the thumb instead of crossing into the next option), and disabled.
- **Do.** Use it for two to five short options that apply at once and change how the same content shows, such as a view mode or the System, Light, and Dark choice.
- **Don't.** A segmented control that switches between panels of content. Use tabs.
- **Keyboard and screen reader.** Each option is its own Tab stop; Space and Enter press it. Icon-only options use the label as `aria-label` and `title`.
- **Motion.** Hover fades the label colour over `--duration-fast` with `--ease-out`. When the reader changes the choice, one thumb glides from the old option to the new one. Start the new thumb's left and right edges where the old thumb was, then animate each edge home with CSS `ease`. The leading edge takes 260ms and the trailing edge 300ms, so the thumb stretches a little on the way. Labels cross-fade their colour over 260ms. If a glide is cut short, start the next one from the thumb's current position. There is no motion on first render, on a value restored from storage, or on a theme change: allow glides only after the first frame. Reduced motion moves the thumb at once.
- **Forced colors.** The pressed option draws `Highlight` behind `HighlightText`. Its focus ring is `CanvasText`: the option opts out of adjustment, and the ring sits on the track.

## Text input and textarea

Layer: Core. ui: `UiInput`. ui has no textarea; a textarea uses the same field recipe.

- **Anatomy.** A native `<input>` or `<textarea>`. Full width, line height 1.35. Input heights follow the control size, and horizontal padding is about 9px, 10px, or 11px.
- **Tokens.** Fill `--color-field-bg` (`--color-surface-raised` in light, the sunk `--color-well` well in dark), text `--color-text`, placeholder `--color-muted` at full opacity, corners `--radius-field`, border 1px `--color-field-edge` (`--color-border-subtle`), shadow `--shadow-field` (none in light, `--shadow-sink` in dark).
- **States.** Rest, focus-visible (the accent edge and inset line from [field focus](#rules-for-every-control)), disabled (the `--color-well` well, no shadow), invalid (`--color-error` border), and invalid while focused (`--color-error` border and a `--color-error` inset line). A textarea keeps the same padding at the top and bottom as at the sides, and resizes vertically only.
- **Do.** A textarea for an answer longer than one line, and `type="search"` for a field that filters.
- **Don't.** A label or an instruction that lives only in the placeholder. It disappears as the reader types.
- **Keyboard and screen reader.** Each field has a visible `<label>`. A search field is the one exception: its leading magnifier and an accessible name that names the search (`aria-label`, or a visually hidden `<label>`) stand in for the visible label. A field inside a [field wrapper](#field-wrapper) gets its description and error ids from it.
- **Motion.** None: the focus and invalid edges change at once, so a state shows as soon as it applies.
- **Search.** `type="search"` keeps the native clear button, quieted to a 12px cross drawn with a `mask` (1.5px round strokes) and filled `--color-muted`, with `--space-2` before it. Hover fills it `--color-text`. The cross sits at the input's trailing edge, so inside a field wrapper with an icon or key hint the input takes the free space (`flex: 1`, `min-width: 0`) and the wrapper carries the width. The wrapper carries the field fill, edge, shadow, and focus, so the input inside it draws nothing. In forced colors the cross opts out of adjustment and fills `CanvasText`, so the mask keeps a visible fill.
- **Forced colors.** The border draws as the system field edge. The inset line drops, so a focused field draws a `Highlight` outline just inside its edge. The system edge replaces the `--color-error` edge, so the invalid state relies on its error text there; see [known gaps](decisions.md#known-gaps).

## Select

Layer: Core. ui: `UiSelect`.

- **Anatomy.** A native `<select>` with the input's field recipe and a chevron on the right. Draw the chevron in `currentColor`, or with an 8px border corner in `--color-muted` turned 45°. Right padding leaves room for it at every size.
- **Picker.** Where `appearance: base-select` is supported, the open list is a floating layer: `--color-surface-raised`, a transparent 1px border, `--radius-panel`, `--shadow-dialog`, 4px padding, at least the select's width, and at most `min(20rem, 50dvh)` tall. Options are at least 32px tall (44px on coarse pointers), with `--space-2` `--space-3` padding and corners of `--radius-panel` minus 4px. Hover fills `--color-row-hover`. An `--color-accent` check at the end marks the checked option. The check carries the state: the option's `--color-row-selected` fill equals `--color-surface-raised`. Keyboard focus is the focus ring, inset because the list scrolls. Other browsers keep the native picker.
- **States.** Rest, focus-visible, disabled, invalid, and invalid while focused, as for the input.
- **Do.** Use a select for one choice from more than five options, in a predictable order: alphabetical, numeric, or by frequency of use.
- **Don't.** A first option that acts as the label, such as "Choose a region". The label goes above the field.
- **Keyboard and screen reader.** Native select behavior. A visible `<label>`.
- **Motion.** None: as for the input, and the picker opens at once.
- **Forced colors.** The closed field as for the input, including the `Highlight` focus outline. The picker is native.

## Field wrapper

Layer: Core. ui: `UiField`.

- **Anatomy.** A grid with a 6px gap: label, control, then a description or an error. The error replaces the description.
- **Tokens.** Label `--text-sm` semibold `--color-text`. Description `--text-sm` `--color-muted`. Error `--text-sm` `--color-error`.
- **States.** Rest, and invalid: the error replaces the description, and the control takes its own invalid state.
- **Do.** Write the error as the fix, such as "Enter a date after today", and the description as a format or limit, such as "Up to 64 characters".
- **Don't.** A description that repeats the label, or an error that only says "Invalid".
- **Keyboard and screen reader.** The label's `for` names the control. The control points `aria-describedby` at the description, and `aria-errormessage` at the error with `aria-invalid="true"`.
- **Motion.** None: the error replaces the description at once, so it is never half shown.
- **Forced colors.** The label, description, and error all take the system text colour, so the error's words must say what is wrong.

## Slider

Layer: Core. ui: `UiSlider`.

- **Anatomy.** A 6px track with `--radius-pill` and `--color-surface-muted`, an `--color-accent` range, and a round thumb (16px, 18px, or 20px) with a 2px `--color-accent` edge and a `--color-surface-raised` fill. The current value follows the track as `--text-sm` text in tabular numbers, in an `<output>` whose `for` names the slider.
- **States.** Rest, dragging (`cursor: grabbing`), focus-visible on the thumb, and disabled.
- **Do.** Use a slider for an approximate value in a range, such as volume or opacity, and show the current value as text beside it.
- **Don't.** A slider for a value the reader must set exactly, such as a port or a price. Use a text input.
- **Keyboard and screen reader.** The thumb has `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and a name. Arrow keys step; Home and End jump to the ends. A native `<input type="range">` styled to match is acceptable. The `<output>` sets `aria-live="off"`, because the slider already announces its value.
- **Motion.** None: the thumb and the range follow the pointer or the arrow keys at once.
- **Forced colors.** The range redraws in `Highlight` with `forced-color-adjust: none`. The thumb keeps the system colours.

## Progress

Layer: Core. ui: `UiProgress`.

- **Anatomy.** A track about 9px tall with a 1px `--color-border-subtle` edge, `--radius-pill`, and `--color-surface-muted`, holding an `--color-accent` indicator moved with `translateX`.
- **States.** None: a progress bar takes no input, so it has no interaction states. Its value follows `aria-valuenow`.
- **Do.** Use it for a task with a known end, such as an import, and name it for the task.
- **Don't.** A progress bar for a measured value, such as disk usage or a rating. It shows a task moving to its end; use text or a score.
- **Keyboard and screen reader.** `role="progressbar"` with a name and `aria-valuenow`, or a native `<progress>`.
- **Motion.** The indicator's transform moves over `--duration-fast` with `--ease-out`.
- **Forced colors.** The indicator redraws in `Highlight` with `forced-color-adjust: none`.

## Score

Layer: Core. ui: `UiScore`.

- **Anatomy.** A row of 8px round pips (`--radius-pill`) with 3px gaps, then the value in medium weight and `/max` in muted regular weight, in tabular numbers. Empty pips have a 1px `--color-border` edge; filled pips are `--color-accent`.
- **States.** None: a score is static, so it has no interaction states.
- **Do.** Use it for a value out of a fixed maximum, such as 4/5, and keep one maximum across a list so the rows compare.
- **Don't.** A score for a percentage or an open-ended count. Write the number as text.
- **Keyboard and screen reader.** The pips are `aria-hidden`; the text value carries the score.
- **Motion.** None: a score is static.
- **Forced colors.** Filled pips redraw in `Highlight` with `forced-color-adjust: none`.

## Badge

Layer: Core. ui: `UiBadge`.

- **Anatomy.** An inline pill: `--radius-pill`, about 3px by 9px padding, `--text-xs`, medium weight, and a transparent 1px border.
- **Tokens.** Neutral: `--color-surface-muted` fill, `--color-muted`, no dot. Status tones (success, warning, danger, info): the tone at 22% over `--color-surface-raised`, text of the tone mixed 75% with `--color-text` in light and 85% in dark, and a leading 6px dot in `currentColor`.
- **States.** None: a badge is static text. Its tone is a variant, not a state.
- **Do.** A one- or two-word status or category on an item, such as "Healthy" or "Beta", with a status tone only when it is a status.
- **Don't.** A badge that repeats the title, or one on every row with the same value. Badge the exceptions.
- **Keyboard and screen reader.** Static text; the label carries the meaning, never the colour alone.
- **Motion.** None: a badge is static.
- **Forced colors.** Fills drop and the transparent border draws as the system edge, so each badge reads as an outlined label. The tone dot opts out of adjustment (`forced-color-adjust: none`) and draws in `CanvasText`, the label's colour; the label still carries the status.

## Alert

Layer: Core. ui: `UiAlert`.

- **Anatomy.** An optional 16px icon and short text. `--space-3` `--space-4` padding, `--radius-panel`, and a transparent 1px border.
- **Tokens.** Neutral: `--color-surface`. Status tones use their `--color-*-surface` tint with `--color-text`; the icon takes the status colour.
- **States.** None: an alert is static content. Its tone is a variant, not a state.
- **Do.** Use an alert for a caveat or status message the reader needs before acting. When action is needed, name it, such as "Reconnect the source to resume sync".
- **Don't.** An alert for decoration or routine emphasis. A short status label is a badge; explanations and recovery instructions stay in an alert.
- **Keyboard and screen reader.** Static content. Use `role="status"` or `role="alert"` only for a message that appears while the reader works.
- **Motion.** None: an alert shows at once, with no entrance animation.
- **Forced colors.** Fills drop and the transparent border draws as the system edge. The icon takes `CanvasText`, the text colour, because an SVG keeps the status colour it sets; the text carries the message.

## Surface and card

Layer: Core. ui: `UiSurface`, `UiCard`.

- **Anatomy.** A panel: `--color-surface-raised`, transparent 1px border, `--radius-panel`, and `--shadow-surface`. A card adds a header (title in `--text-md` medium weight, with actions at the end), a body, and an optional footer above a `--color-border-subtle` rule in `--text-sm` muted text. Header and body padding is `--space-4`; padding is compact (`--space-3`) or default (`--space-4`).
- **States.** None: a panel is static. Controls inside it keep their own states.
- **Do.** Use cards for a few parallel, self-contained items that a reader compares, such as plans or projects.
- **Don't.** A panel inside a panel, or cards around ordinary prose.
- **Keyboard and screen reader.** A card's title is a heading at the next level of the page outline.
- **Motion.** None: panels do not lift on hover or animate in.
- **Forced colors.** The shadow drops and the transparent border draws as the system edge, so each panel keeps its outline.

## Figure

Layer: Core. ui: `UiFigure`.

- **Anatomy.** A well (`--color-surface`, 1px `--color-border-subtle`, `--radius-panel`, `--space-5` padding, or `--space-4` on phones) with a caption below it in `--text-sm` muted text. Wide content scrolls inside the well. A figure number is `--color-text` in medium weight.
- **States.** None: a figure is static.
- **Do.** Caption every figure with what it shows. When the prose refers to one figure by number, number them all.
- **Don't.** A screenshot of code or of a component. Show code as text, so the reader can copy it, and a component live.
- **Keyboard and screen reader.** A `<figure>` with a `<figcaption>`, so the caption names the figure.
- **Motion.** None: a figure is static.
- **Forced colors.** The well's fill drops, and its edge draws in the system colour.
- **Identity.** On folio sites the caption is mono.

## Dialog

Layer: Core. ui: `UiDialog`.

- **Anatomy.** A floating layer centred on an `--color-overlay` backdrop, at most 512px wide and 672px tall. It has a header (title in 18px semibold with an optional muted description, and a 44px close button), a body that scrolls, and an optional footer on `--color-surface` with its actions at the end. Rules between the parts are `--color-border-subtle`. On phones it becomes a bottom sheet with rounded top corners.
- **Tokens.** `--color-surface-raised`, a transparent 1px border, `--radius-panel`, `--shadow-dialog`. The close button is a [quiet action](#quiet-action).
- **States.** Closed and open. When focus lands on the dialog itself, it shows the focus ring.
- **Do.** Use a dialog for a short task the reader must finish or cancel before the page continues, such as confirming a deletion. Title it with that task.
- **Don't.** A dialog that opens without the reader asking, such as on page load, or one that holds a long form. A long form gets its own page.
- **Keyboard and screen reader.** `role="dialog"`, `aria-modal="true"`, named by its title. Focus moves in on open and is trapped. Escape closes it, and focus returns to the trigger. A native `<dialog>` opened with `showModal()` provides most of this.
- **Backdrop.** A tap or click on the backdrop, outside the dialog, closes it, the same way Escape does, and focus returns to the trigger. Only a press that starts outside counts: a drag that starts inside the dialog and ends outside leaves it open. Safari does not support `closedby="any"`, so a script closes it.
- **Motion.** None: it opens and closes at once. Only the drawer slides, because it enters from an edge.
- **Forced colors.** The shadow drops and the transparent border draws as the system edge, so the dialog keeps its outline over the page.

## Drawer

Layer: Core. ui: `UiDrawer`.

- **Anatomy.** A dialog fixed to the edge its trigger sits on, full height, `min(--sidebar + 48px, 100vw - 48px)` wide, with a header (title and close button) and a body that scrolls on its own. It is a floating layer with square corners: `--color-surface-raised`, a transparent 1px border, and `--shadow-dialog`. The close button is a [quiet action](#quiet-action). The family's navigation triggers sit at the start, so navigation drawers open from the left.
- **Navigation drawer.** A drawer that holds navigation opens on the current row, scrolled to the centre of the body. A keyboard open moves focus to that row; a tap moves focus to the body, so no ring shows and no on-screen keyboard opens. An open with the `/` shortcut moves focus to the [find field](#find-field), which stays pinned at the top of the body while the list scrolls under it.
- **States.** Closed, open, and closing: `data-closing` keeps it open while it slides out.
- **Do.** Use a drawer for navigation or supporting detail that slides in from the side its trigger sits on, such as phone navigation, and open it from a named button.
- **Don't.** The page's main task inside a drawer. The drawer holds navigation or detail; the task stays on the page.
- **Keyboard and screen reader.** As for the dialog. Following an in-page link inside the drawer closes it and moves focus to the link's destination (given `tabindex="-1"` if it is not focusable), not back to the trigger. Modified clicks (a new tab or window) leave it open.
- **Backdrop.** A tap or click on the backdrop, outside the drawer, closes it, the same way Escape does, and focus returns to the trigger. Only a press that starts outside counts: a drag that starts inside the drawer and ends outside leaves it open. Safari does not support `closedby="any"`, so a script closes it.
- **Page behind.** While the drawer is open, until it has slid out, the page behind it does not scroll: the root takes `overflow: hidden`, which keeps the reader's position. The page reserves the scrollbar gutter all the time (`scrollbar-gutter: stable` on the root), so hiding a classic scrollbar does not reflow it.
- **Motion.** It slides in over `--duration` and out over `--duration-fast`, with `--ease-out`, while the overlay fades. Reduced motion shows and hides it at once.
- **Forced colors.** As for the dialog: the shadow drops and the edge draws in the system colour.

## Navigation list

Layer: Core. The mono font on rail rows is identity. ui: the rows in `UiSiteNav` and the project menu.

- **Anatomy.** A `<nav>` with a name, holding links in rows: at least `--row` tall (`--control-lg` at tablet width), `0 --space-3` padding, `--radius-inline` corners (`calc(var(--radius-panel) - var(--space-1))`, 12px, inside a floating menu such as the project menu, so they are concentric with it), `--text-sm`, and `--color-muted`. A row may hold a leading 16px icon and a trailing muted count. A text-only row centres its label on the cap height: where `text-box` is supported, it is a block with `align-content: center`, `--space-2` block padding, and `text-box: trim-both cap alphabetic`, and the location pip centres itself. The padding keeps a wrapped label's first and last lines clear of the fill's edges and the focus ring. Rows with an icon or a count, and browsers without `text-box`, centre the line box, which leaves a label without descenders about 1px above centre. Groups have a `--text-xs` semibold muted label and 2px gaps between rows.
- **Groups.** Name groups by purpose, with 2 to 8 rows each. Collapse groups only in a list of more than about 40 rows. A collapsible group's label is a `<button aria-expanded>` in the label type, with `--radius-inline` corners and a chevron that turns −90° when the group is closed. Never collapse the group that holds the current row.
- **States.** Hover: `--color-row-hover` fill and `--color-text`. Current page (`aria-current="page"`): `--color-nav-current` fill, `--shadow-nav-current`, `--color-nav-current-text`, and medium weight; hover keeps that fill. `--color-nav-current` is an accent tint: `--color-accent` at 14% over `--color-surface-raised` in light, and `--color-accent` at 20% over transparent in dark. `--color-nav-current-text` is the first of `--color-accent`, `--color-text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Selected tabs and selected list rows use the same fill and rule. Current location in the page (`aria-current="location"`): `--color-text` in medium weight, with a 3×14 `--color-accent` pip at the leading edge, inset 4px, and no fill, in strips and contents lists. In a [section rail](#section-rail) the current section takes the current-page look instead and keeps `aria-current="location"`. A link carries one marker, and page outranks location; the [`aria-current` rules](DESIGN.md#navigation) say which applies, and the [tracking rule](DESIGN.md#navigation) says which section is current. Focus-visible: the focus ring, inset because the rail and the drawer scroll.
- **Do.** Label a page link with the destination page's title, and an in-page link with its destination section's heading.
- **Don't.** Actions such as Delete or Sign out in a navigation list. Every row is a link to a place; an action is a button.
- **Phone triggers.** One labelled trigger opens a navigation drawer: a secondary button at least `--control-lg` tall, with `--space-2` block padding so a label that wraps grows it, and a three-line menu glyph (14×10, 1.5px lines) `--space-3` before the label. The label names the list and its current row, such as "Components: By purpose" for a [section rail](#section-rail) or "On this page: Install" for a docs page's contents, and follows the current section as the page scrolls. The trigger sits at the start, below the site header, and its drawer opens from the left. It shows the page's contents and does not act, so it takes the 10px field corner (`--radius-field`), at rest and pressed. A page has one trigger: no icon-only Find or Menu button beside it. Without JavaScript the list opens in place, so the trigger is a `<details>` summary with the secondary button classes and a chevron after the label. It takes the same 10px field corner. Only the chevron is local.
- **Horizontal strip.** A row of 6 links or fewer; beyond that, use a drawer. It uses these rows and states unchanged: the current page takes the lifted fill, and a location keeps its pip. It scrolls sideways with 2px padding, so the current row's shadow stays whole, and a clipped edge fades over 24px, as [tabs](#tabs) do. An edge with 12px or less hidden does not fade. A focused row scrolls into view clear of the fades (`scroll-padding-inline: 24px`), and the strip shows no scrollbar (`scrollbar-width: none`), because the fade shows the overflow. Becoming current changes no row's width: each link carries its label in `data-label`, and a hidden copy of it at the current row's medium weight (`::after`, with empty alternative text and `margin-top: -1lh`, so it shares the label's line) sets the row's width. A strip in a drawer, where labels wrap, drops the copy, and so does a browser without the `lh` unit.
- **Keyboard and screen reader.** Plain links in Tab order.
- **Motion.** Fill, colour, and shadow change over `--duration-fast` with `--ease-out`.
- **Forced colors.** Fills and shadows drop. The current page (`aria-current="page"`), and a rail's current section, take a 2px `Highlight` border on the leading edge, and their leading padding gives up 2px for it, so the row keeps its width. The location pip keeps its shape with `forced-color-adjust: none` and a `Highlight` fill, so page and location still differ.
- **List selection.** A selected row in a list or table (`aria-selected="true"`) takes the current-page recipe: `--color-nav-current` fill, `--shadow-nav-current`, medium weight, and its primary text in `--color-nav-current-text`, with no accent bar. Hover keeps that fill. Rows keep their own radius. Dividers between rows are straight 1px `--color-border-subtle` lines inset by the row's inline padding, drawn on the row, not as a shadow, and hidden next to a filled (hovered or selected) row. Forced colors: the fill and shadow drop, and the selected row takes a 2px `Highlight` border on its leading edge, as the current page does.

## Section rail

Layer: Core. ui: `UiSiteNav`.

- **Anatomy.** A named `<aside>`, so the find field and the footer sit in a landmark, with `position: sticky; top: 0`, `height: 100dvh`, and a column flex layout with `--space-3` gaps. An optional [find field](#find-field) sits at the top. Below it, a named `<nav>` holds grouped [navigation list](#navigation-list) rows and scrolls on its own (`overflow-y: auto`, `overscroll-behavior: contain`). An optional footer for rail settings, such as the single-key shortcut switch, sits last, above a `--color-border-subtle` rule. The element that draws a divider never scrolls. The rail's rows follow the page order.
- **States.** Rows take the navigation list states. The current section keeps `aria-current="location"` but takes the current-page look: `--color-nav-current` fill, `--shadow-nav-current`, and `--color-nav-current-text` in medium weight, with no pip. When the location changes, the rail scrolls its own list, never the page, to centre the current row if it is out of view. It leaves the list alone while the pointer is over the rail or focus is inside it.
- **Do.** Use a rail for the sections of a long page, or for a site's pages. A site's pages may take a navigation strip of 6 links or fewer instead.
- **Don't.** A rail beside a strip or a contents list that holds the same links. Each level has one list.
- **Tablet and phone.** At `max-width: 800px`, with JavaScript, the rail moves into a [drawer](#drawer) titled with the rail's name, which holds the find field, pinned at the top, and the rail's groups. The labelled [phone trigger](#navigation-list) below the [site header](#site-header), before the breadcrumb, opens it from the left. Its label is "<rail name>: <current section>", such as "Components: By purpose". The header keeps the site's pages and the appearance control, so the drawer does not repeat them. `/` opens the drawer with the field focused. A page with no rail shows no trigger. Without JavaScript nothing moves: the trigger stays hidden, and the rail stays in place above `main` with every row shown and the find field hidden.
- **Keyboard and screen reader.** The trigger has `aria-haspopup="dialog"`, and its visible label is its name. Location changes are not announced; the trigger's label changes without an announcement. The current section follows the [location tracking rule](DESIGN.md#navigation).
- **Motion.** The rail scrolls its list at once. Rows change as in the navigation list.
- **Forced colors.** The current section's fill and shadow drop, and it takes a 2px `Highlight` border on its leading edge, as the current page does.

## Find field

Layer: Core. ui: none yet.

- **Anatomy.** An `<input type="search">` in the [field](#text-input-and-textarea) recipe, with a leading 16px search icon in `--color-muted` (32px start padding) and a trailing [keyboard key](#keyboard-key) hint showing `/` (36px end padding). A visually hidden `role="status"` element, named in the field's `aria-describedby`, holds the match count.
- **States.** Rest, focus-visible (field focus), and a query. The key hint hides while the field has focus or a value, when shortcuts are off, and under `(hover: none)`. With no matches, the list shows "No component matches <q>…</q>." in `--text-sm` `--color-muted`, and a text-button Clear.
- **Do.** Use it at the top of a long navigation list, such as a section rail, to filter its rows by name or purpose.
- **Don't.** A find field used as a site-wide search. It matches only the rows of the list it filters.
- **Matching.** It filters the list only, never the page, so deep links and the page order stay stable. Every word of the query must appear in a row's terms: its name, group, purpose, and aliases, held in `data-terms`. Rows that do not match hide, and so do groups with no visible rows. The count is announced after a 500ms pause ("3 matches", "No matches"). A page whose Find also filters its own content, such as a token table, decides which rows stay and announces its own count and noun ("3 tokens", "No tokens").
- **Keyboard and screen reader.** `/` focuses the field and selects its text, under the [single-key shortcut](DESIGN.md#navigation) rules; the field carries `aria-keyshortcuts="/"` while shortcuts are on. Escape clears a value; the next Escape leaves the field, or closes the drawer. Enter goes to the first match and focuses the destination. ArrowDown moves focus to the first match.
- **Motion.** None: rows hide and show at once as the query changes.
- **Forced colors.** As for the search field. The key hint's edge is `CanvasText`.
- **No JavaScript.** The field is `hidden` until the script runs.

## Breadcrumbs

Layer: Core. ui: none yet.

- **Anatomy.** `<nav aria-label="Breadcrumb">` holding an `<ol>` in `--text-sm`, right above the page's h1. Separators are `--color-muted` chevrons, a 6px box (`0.375rem`) with 1.5px top and right borders turned 45°, so they hold no text to read. The labels centre on the cap height like navigation rows, and the chevrons centre on the row. Ancestors are `--color-muted` links with no underline, at least `--control-sm` tall (`--control-lg` at tablet width), with `--radius-inline` corners. The current page is plain text with `aria-current="page"`, in `--color-text` and medium weight. On folio sites the trail is mono (identity).
- **States.** Hover: `--color-text` and an underline. Focus-visible: the focus ring.
- **Do.** Put the trail above the page's h1 on every page below the site's home page, and keep the project switcher in the header.
- **Don't.** A trail in the site header in place of the project switcher: the header changes from page to page, and the path reads as the page title.
- **Placement.** A page-level trail sits on its text, not on its links' boxes: it moves up by half the room the box adds around the line, `calc((1lh - var(--control-sm)) / 2)` (`--control-lg` at tablet width), and takes the same room back below, so the h1 does not move.
- **Phone.** At `max-width: 640px` a trail of two crumbs shows in full. A trail of three or more shows only the parent, as a back link: the parent's name after a chevron that points back, drawn the same way, inside the link.
- **Keyboard and screen reader.** Ancestors are links in Tab order. The current page is text, so it takes no Tab stop.
- **Motion.** None: hover changes the colour and underline at once.
- **Forced colors.** No change: links and text take the system colours.

## Pager

Layer: Core. ui: none yet.

- **Anatomy.** `<nav aria-label="…">` at the end of `main`, with two equal columns and a `--space-4` gap, below a `--color-border-subtle` rule with `--space-6` padding. Each link is a block row with `--space-3` `--space-4` padding, `--radius-field` corners, and a transparent 1px border: a `--text-xs` `--color-muted` direction with an arrow ("Previous", "Next"), then a medium `--color-text` title. Links take `rel="prev"` and `rel="next"`. Next sits in the end column, end-aligned, even when it is alone.
- **States.** Hover: `--color-row-hover` fill. Focus-visible: the focus ring. There is no current state.
- **Do.** Use a pager for pages a reader goes through in order, such as a guide's chapters or the skills in one group.
- **Don't.** A pager on pages with no reading order, or one per section on a page with a section rail.
- **Phone.** At `max-width: 640px`, one column in source order.
- **Keyboard and screen reader.** The direction and the title are both inside the link, so it reads as one name, such as "Next Application example".
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** Each link's transparent border draws in the system link colour, so both links read as boxes, and the hover fill drops.

## Tabs

Layer: Core. ui: `UiTabs`.

- **Anatomy.** A `role="tablist"` with no rule below it and a 12px gap below it. It scrolls sideways when needed, and a 24px mask fades each clipped edge. Scrolling clips on every side, so the list has 4px (`--space-1`) padding all round: it keeps the selected tab's shadow whole and its fill off the frame edge. Each tab is a borderless button at least `--control-md` tall (`--control-lg` on phones), with `--space-2` `--space-3` padding, `--radius-inline` corners, medium weight, and `--color-muted`. The selected tab's fill is a `::before` layer behind the label, inset 0, with the tab's corners; the list sets `isolation: isolate`, so the layer stays inside it.
- **States.** Hover fills `--color-row-hover` and turns the text `--color-text`. The selected tab takes the [navigation row](#navigation-list)'s current-page recipe: `--color-nav-current` fill and `--shadow-nav-current`, with no underline. Its text is `--color-nav-current-text`: the first of `--color-accent`, `--color-text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Focus-visible is the focus ring, inset because the list scrolls.
- **Do.** Use tabs for panels about one object, such as a monitor's Overview and History, when the URL does not change.
- **Don't.** Links with `role="tab"`, or one set that mixes pages and panels. Pages take a navigation strip.
- **Motion.** Hover fades over `--duration-fast` with `--ease-out`. When the reader changes the tab, the fill glides from the old tab to the new one as the [segmented control](#segmented-control)'s thumb does: start the new fill's left and right edges where the old fill was, then animate each edge home with the `glide-left` and `glide-right` keyframes and CSS `ease`, the leading edge over 260ms and the trailing edge over 300ms. Labels cross-fade their colour over 260ms. An interrupted glide starts from the fill's current position. There is no glide on first render or under reduced motion, where the fill moves at once.
- **Keyboard and screen reader.** Roving `tabindex`: arrow keys move between tabs, Home and End go to the ends, and focus selects the tab. Each tab has `aria-controls` and `aria-selected`; each panel has `role="tabpanel"`. Without JavaScript, show every panel under its own heading. Apply the tab roles and hide the headings and unselected panels only when the script enhances the markup.
- **Forced colors.** The fill layer is removed (`content: none`), so the selected tab takes a 2px `Highlight` border, and its padding shrinks by 2px to keep its size.

## Skip link

Layer: Core. ui: the `fg-site-skip` class.

- **Anatomy.** The first focusable element on the page, linking to `main` (`id="main"`) and named "Skip to content". It sits above the page until it takes focus, then shows at the top left as a floating layer: `--color-surface-raised`, a transparent 1px border, `--radius-field`, `--shadow-dialog`, `--space-2` `--space-3` padding, and the focus ring. It takes the field corner, not the 16px corner of other floating layers, because it is a one-line control that is not an action.
- **States.** Hidden above the page at rest, and shown at the top left while it has focus.
- **Do.** A "Skip to content" link on every page with a header or rail before `main`; the first Tab shows it.
- **Don't.** Hiding it with `display: none`, which also takes it out of the Tab order.
- **Second link.** When a [section rail](#section-rail) comes before `main` and holds more than about 20 rows, a second link, "Skip to contents", follows the first and moves focus to the rail's list. It is hidden at tablet width, where the rail sits in the drawer.
- **Keyboard and screen reader.** Activating a skip link moves focus to its target, which takes `tabindex="-1"` at that moment.
- **Motion.** None: it appears at once when it takes focus.
- **Forced colors.** The shadow drops, and the transparent border draws in the system link colour.

## Keyboard key

Layer: Core. ui: none yet.

- **Anatomy.** A `<kbd>`: `--font-mono` `--text-xs` medium in `--color-muted`, on a `--color-surface` fill with a 1px `--color-border` edge and `--radius-inline` corners, 20px tall, at least 20px wide, with 5px inline padding and no shadow.
- **States.** None: a key is static text.
- **Do.** A key or shortcut in running text or shortcut docs, one key per `<kbd>`.
- **Don't.** A key style for code or button names. Code takes `<code>`; a button's name is plain text.
- **Keyboard and screen reader.** A `<kbd>` reads as its text. The [find field](#find-field)'s hint is `aria-hidden`, because the field carries `aria-keyshortcuts`.
- **Motion.** None: a key is static.
- **Forced colors.** The edge is `CanvasText`.

## Code block

Layer: Core. ui: `UiCodeBlock`.

- **Anatomy.** A frame that holds an optional header and the source panel.
  - **Frame.** `--color-surface-raised`, a 1px `--color-border-subtle` border, `--radius-panel`, and `--shadow-surface`. Its padding is `0 var(--space-1) var(--space-1)` under a header, and `var(--space-1)` on every side without one.
  - **Header.** At least 40px and `--text-xs`, on the frame with no fill and no rule below. It holds the title in semibold, the language in muted text, and a Copy button.
  - **Source panel.** The `<pre>`: `--color-code`, a transparent 1px border, and `calc(var(--radius-panel) - var(--space-1))` corners (12px), so its curve is concentric with the frame's. It has `--space-4` padding, scrolls in both directions, is at most 32rem tall, and sets `--font-mono` at `--text-code` with a line height of 1.65. Line numbers are muted and right-aligned. Syntax uses the `--color-syntax-*` tokens.
  - **Compact.** The panel and the Copy button share one row, with no header, and a `--space-1` column gap. The panel fills the row's height, so it sits `--space-1` from the frame and from Copy on every side, and centres its line.
- **Phone text.** Set `text-size-adjust: 100%` (and `-webkit-text-size-adjust`) on the block, and align each line's items to the baseline, so iOS Safari does not enlarge one line.
- **Copy.** Copies the code text only: no line numbers or prompts, and one line per row joined with newlines. A [quiet action](#quiet-action) at least 44×44 with an accessible name. It is `--color-muted` at rest (7.09:1 on the frame in light, 6.63:1 in dark), and `--color-code-text` on hover and while the tick shows, which the script marks with `data-copied`. Announce the result in a polite live region; in the compact variant the success message is visually hidden.
- **Copy feedback.** This applies to every copy action: the code block's Copy, a token's Copy, and Copy link. On success, the icon turns into a plain tick (`#i-tick`) for 1.5s and then turns back. A second click within the 1.5s restarts the wait. The visible label, such as Copy, and the accessible name do not change, and no "Copied" text appears. The polite live region announces "Copied." or the failure. On failure, the icon does not change and the failure shows as before: a token's Copy shows "Copy failed" in place of its icon. Under reduced motion nothing changes, because the swap has no animation.
- **States.** Rest, and focus-visible on Copy and on the `<pre>` when it scrolls. Copy takes the quiet action states, shows the tick after a copy, and announces "Copied." or a failure.
- **Do.** Use a code block for source with no live result. When the reader should see the result too, use the variant with a live example.
- **Don't.** The same language label on every block of a page. Put useful setup context above the block instead.
- **Keyboard and screen reader.** The `<pre>` is focusable when it scrolls. Its focus ring and the Copy button's ring are inset, because the block clips its content. The `<pre>` ring follows the panel's 12px corners.
- **Motion.** None: the block is static, and Copy changes as a quiet action does.
- **Forced colors.** The shadow drops, and the frame's border and the panel's transparent border draw as system edges. Syntax colours take the system text colour, so code reads as plain text.

### With a live example

ui: `UiExample`.

- **Anatomy.** One frame: a `<figure>` with a 1px `--color-border-subtle` edge, `--radius-panel`, no shadow, and its content clipped to the corners. The stage comes first and holds the live preview, centred, at least 8rem tall, with `--space-8` padding. The code block follows directly below the stage, after one `--color-border-subtle` hairline. There is no header row and no language label. An optional caption follows the frame, as a [figure](#figure) caption does.
- **Tokens.** Frame edge `--color-border-subtle` and corners `--radius-panel`. Stage `--color-bg`. Hairline `--color-border-subtle`.
- **Stage.** The stage sits on the page background, not in a well or a panel. This is a named exception to the container [depth](DESIGN.md#depth) tier: a preview shows each component on the surface it sits on in a page; see [decisions](decisions.md).
- **Source.** Inside the frame the code block has no radius, border, padding, or shadow of its own, and it spans the frame's full width, not `--measure`. It takes `--color-code`, and its panel is flush with no corners, so the source fills the frame below the hairline.
- **Copy.** Icon-only and named "Copy code", in the source's top right corner. It comes before the `<pre>` in DOM order, so the reader reaches it before the code.
- **States.** The frame has no states. Components on the stage show their own states.
- **Keyboard and screen reader.** Tab order is the stage's controls, then Copy, then the `<pre>`. Name the `<pre>` for its role, for example "Example source", when it scrolls. Focus rings on Copy and the `<pre>` are inset, because the frame clips its content.
- **Motion.** None of its own.
- **Responsive.** The frame takes its container's width. The stage stays above the source at every width. On phones the stage padding is `--space-6` by `--space-4`. Wide content scrolls inside the stage or the `<pre>`, never the page.
- **Forced colors.** The frame edge and the hairline draw in the system colour.

## Command plate

Layer: Identity. ui: `UiCodeBlock` with a shell language or the compact variant.

- **Anatomy.** A code block for a shell command, drawn as a dark plate in both themes: the frame is `--color-command-bg` with a `--color-command-border` edge (transparent in light). The source panel is the plate darkened, `color-mix(in srgb, var(--color-command-bg) 55%, var(--color-terminal))`, set as the plate's `--color-code`, so it reads as a panel on the plate. Text, syntax, and the caption all use `--color-terminal-text` or `--color-terminal-caption-text`. Each line starts with a `$ ` prompt in `--color-project-dark`, drawn with `content: "$ " / ""` and `user-select: none`, so copied and spoken text omit it. The plate sets `--color-muted: var(--color-terminal-caption-text)`, so Copy at rest takes the caption colour, and `--color-focus: var(--color-project-dark)`, the dark-theme accent, so every ring on it, Copy's included, reads at 3:1 or more on the dark plate in both page themes.
- **States.** As for the code block.
- **Do.** Use it for a shell command the reader runs, one command per line.
- **Don't.** A `$` typed into the command. CSS draws the prompt; a typed one is copied with the command.
- **Keyboard and screen reader.** As for the code block.
- **Motion.** None: as for the code block.
- **Forced colors.** The dark plate drops to the system background, with system text and edge, and the prompt takes the system text colour.
- **Contrast.** Text at least 4.5:1 and the prompt at least 3:1 on the source panel, and the header text at least 4.5:1 on `--color-command-bg`, for each project hue.

## Terminal capture

Layer: Identity. ui: `UiCapture`.

- **Anatomy.** A panel whose header holds mono tabs (one for each capture) and a Full size [quiet action](#quiet-action) at the end. The screen is the neutral `--color-terminal` plate, and a mono status-line caption sits below it on `--color-terminal-caption` with `--color-terminal-caption-text`. Full size opens the capture in a dialog.
- **States.** Tabs take the tab states in the capture's palette, and Full size takes the quiet action states.
- **Do.** Use it to show what a command prints, one tab per capture, with the path and branch in the status line.
- **Don't.** A capture for a screenshot of a graphical app. Use a figure.
- **Keyboard and screen reader.** Tabs follow the tabs spec. Full size opens the selected capture in a modal dialog named after it, and focus returns to the button when the dialog closes. Without JavaScript the button is hidden. Focus rings are inset, because the panel clips its content. Without JavaScript, every capture is listed under its own heading.
- **Header.** The whole panel, header included, is the `--color-terminal` plate in both page appearances, with a 1px `--color-terminal-border` edge. It scopes its own palette so the tabs read on it: current fill `--color-project-dark` at 20% over transparent, with a `--shadow-nav-current-dark` lift, hover `--color-terminal-text` at 4%, selected text, accent, and focus `--color-project-dark`, text `--color-terminal-text`, muted text `--color-terminal-caption-text`, and dividers `--color-terminal-border`. The tab list keeps its 4px block padding, and the Full size control stays centred on the tab row.
- **Motion.** Tabs glide as in the tabs spec; the panel has no motion of its own.
- **Forced colors.** The plate and the caption drop to the system background and text, the edge draws in the system colour, and the tabs follow the tabs rule.

## Site header

Layer: Identity. ui: `UiSiteHeader`, `UiSiteAppearancePicker`.

- **Anatomy.** A static header at least 64px tall on `--color-bg` with a solid 1px `--color-text` rule below it. At the start is the project switcher: a `<details>` whose summary, a [quiet action](#quiet-action), shows the mono, semibold project name after a `~/` mark in `--color-project` (drawn by CSS, so it is not read), then a chevron. It keeps the quiet-action tint, but it opens a menu and does not act, so it takes the 10px field corner (`--radius-field`), as a select does. Its menu is a floating layer, with the dialog's tokens, listing the shared project registry in the order it defines, as navigation rows with concentric 12px corners (`calc(var(--radius-panel) - var(--space-1))`), with the current project marked `aria-current="page"`. At the end are the site links and the appearance picker: an icon-only segmented control at `lg`. The site links are a [navigation strip](#navigation-list) of rows 44px tall (`--control-lg`). A link to a page inside the site takes `aria-current="page"` on that page, with the current-page recipe.
- **Position.** Every family site, this design system's site included, starts its header with the project switcher. It is the same on every page: never a breadcrumb or a page title, which go above the page's h1 as [breadcrumbs](#breadcrumbs), and the first breadcrumb is the way back to the site's home page. The links sit at the same x on every page, and the current link is as wide as it is on other pages (see the [horizontal strip](#navigation-list)). A header that puts its links right after the switcher, as this design system's site does, is a grid at `min-width: 801px` (`auto minmax(0, 1fr) auto`), so where the links start never depends on the page.
- **States.** The project menu is closed or open; while open, its summary keeps the quiet action's hover tint. Site links take the navigation row states.
- **Do.** Keep the same header and site links, six at most and in one order, on every page of a personal product site.
- **Don't.** The site header on an application screen. An application keeps its own navigation.
- **Phone.** At `max-width: 800px` the header is static, with `--space-2` above, below, and between its rows. The first row holds the switcher at the start and the picker at the end. Where both do not fit, as at 320px, the picker wraps to its own row at the start; the project name never truncates. With three or more links, the links take the next row, as a strip that scrolls with its fades. Where the strip clips a link, at least 16px of that link stays in view under the fade: on the narrowest phones (a strip 340px wide or less, by container query) the strip's rows take 6px (`0.375rem`) side padding. One or two links stay on the first row, beside the picker; at `max-width: 640px` they become plain text links after the switcher, 12px (`--space-3`) apart, and the current link takes `--color-accent` text in medium weight, with no fill. A documentation page hides them at that width, because its [footer](#page-type-and-helpers) carries them. A page with a [section rail](#section-rail) puts the rail's labelled trigger `--space-2` below the header.
- **Keyboard and screen reader.** The summary is named "Project: <name>". Escape closes the menu and returns focus to the summary; moving focus out of it closes it.
- **Motion.** The chevron turns 180° while the menu is open, over `--duration-fast` with `--ease-out`. The menu itself opens at once.
- **Forced colors.** The rule below the header takes the system text colour, and the menu and the site links follow the navigation list rules. A current text link on a phone takes an underline instead of the system border.

## Page type and helpers

Layer: Identity. ui: `site.css` helpers.

- **Anatomy.** Type and layout helpers for identity pages: headings, steps, definitions, facts, a command list, and the footer, each below.
- **Headings.** Documentation, CLI tool, article, and product page titles (`--text-3xl`) use `--font-mono`; application titles use `--font-ui` at `--text-2xl` or smaller. On documentation, CLI tool, article, and product pages, a page-level section heading (h2) uses `--font-mono` at `--text-xl` (a product page may set it larger, up to `--text-3xl`), starts with a `## ` mark in `--color-accent`, drawn with `content: "## " / ""`, and has a `--color-border-subtle` rule above the section. Application and inline-visualization section headings use `--font-ui`, semibold, at `--text-xl` or smaller, with no mark and no rule; h3 and lower never take the mark. A product page or tool home may use a mono `--text-display` title (`--text-display-sm` on phones).
- **Steps.** An ordered list in which each step hangs from a mono number in `--color-accent` on a ruled leading column, with an h3 title per step.
- **Definitions.** A definition list of terms and short meanings: medium-weight terms and muted meanings in two columns, one column on phones. Flags such as `--all` do not break.
- **Facts.** A mono definition list of short labels and values, such as a repository path. Values wrap anywhere.
- **Command list.** A table of commands (mono) and descriptions (muted), with a Copy [quiet action](#quiet-action) for each row. On phones each row becomes a two-column grid.
- **Footer.** Mono, with an attribution link at the start and project links at the end.
- **States.** None: the helpers are static type. The command list's Copy takes the quiet action states.
- **Do.** Use steps for a sequence the reader follows in order, definitions for terms with short meanings, and facts for short labels and values.
- **Don't.** The `##` mark on an application screen, or on h3 and lower.
- **Keyboard and screen reader.** Headings keep their outline levels, and the `## ` mark has empty alternative text, so it is not read. Steps are an ordered list; definitions and facts are definition lists.
- **Motion.** None: the helpers are static.
- **Forced colors.** No change: text, rules, and marks take the system colours.
