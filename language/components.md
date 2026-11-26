# Component specs

One section for each component in the design language. Write any framework's version of a component from its section. [`components.html`](components.html) shows each state as static markup, and [`tokens.css`](tokens.css) holds the values. The [decisions](decisions.md) record why each choice was made.

Each section has these parts: anatomy, states, then Do and Don't, keyboard and screen reader, motion, and forced colors. A part that does not apply says "None", with the reason. Do names the choice to make, and Don't names the mistake to avoid; neither repeats the spec. A section may add tokens and parts of its own. Sizes are in CSS pixels at the default 16px root font size. Type, spacing, and control sizes are set in rem (pixels ÷ 16), so they follow the reader's font-size setting; borders, focus rings, and shadows stay in pixels. A percentage mix means `color-mix(in srgb, A n%, B)`.

## Layers

| Layer | What it holds | A new project |
| --- | --- | --- |
| Core | Tokens, depth, controls and their states, focus, motion, accessibility, forced colors | Adopts it as is |
| Identity | The terminal folio look: the `~/name` header, the project registry, terminal plates, captures, and the section rail | Replaces it with its own |

The identity layer reads only the identity tokens (`--color-project`, `--color-project-dark`, `--font-ui`, `--font-mono`, `--radius-base`) and the terminal tokens. A core component never depends on an identity component.

## Groups

The sections follow the catalogue's purpose groups, in this order. Each component keeps its layer.

| Group | Components |
| --- | --- |
| Actions | Button, quiet action, overflow menu, chip |
| Selection | Checkbox and radio, radio card group, switch, toggle button, segmented control |
| Inputs | Text input and textarea, select, combobox, number field, field wrapper, slider |
| Feedback and status | Progress, score, badge, alert |
| Containers and overlays | Surface and card, figure, dialog, drawer, slideout |
| Data display | Description list, stat tile |
| Navigation | Navigation list, section rail, find field, breadcrumbs, pager, tabs, skip link, keyboard key |
| Conversation | Message row, message group, hover toolbar, thread panel, composer, tool-call disclosure, mention |
| Code and examples | Code block |
| Identity | Command plate, terminal capture, site header, page type and helpers |

A control's **States** line names each interactive state it has. In `components.html` each control section lists the same states in `data-states`, and the Control states table shows them; a test checks the three agree.

## Rules for every control

- **Sizes.** `sm`, `md`, and `lg` use `--control-sm`, `--control-md`, and `--control-lg` for height (28px, 32px, and 36px, Astryx's scale), with `--text-sm`, `--text-md`, and `--text-lg`. A control with no size is `md`. An application screen sets every control at `sm`, its main action included ([density](DESIGN.md#layout-and-spacing)). At tablet width (`max-width: 800px`) controls of every size grow to `--control-touch` (44px): `tokens.css` sets `--control-sm`, `--control-md`, and `--control-lg` to it there, so a control sized from them needs no touch rule. Only the catalogue's size specimens keep their sizes; each sets the three back on itself.
- **Borders.** Every control keeps a 1px border, transparent unless its section says otherwise, so forced colors can draw an edge.
- **Depth.** Each control takes its shadow from the [depth tiers](DESIGN.md#depth).
- **Hover.** Hover fills apply only where the pointer can hover. Put every `:hover` rule that sets a background, shadow, border colour, or text colour in `@media (hover: hover)`, because a touch screen keeps `:hover` on the last element tapped. The pressed tint stays outside the query: it shows only while a finger is down.
- **Press.** Only a button has a pressed state; see [Button](#button). A [quiet action](#quiet-action) tints on press without sinking. Other controls have no `:active` treatment: they show their latched state as their section says.
- **Focus.** One ring for every role but fields: `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)` (2px, 3px), with no halo or glow. `--color-focus` is the accent (`--color-accent`), which reaches 3:1 on `--color-bg`, `--color-surface`, and `--color-surface-raised` in both themes. It sits around primary, danger, and selected controls too. Do not give a role its own ring colour; where a variant must recolour the ring, set only `outline-color`. The ring is drawn over the control's own raise or sink shadow, which does not change. It goes on the visible part of a composite control: the switch track, the radio card, and the slider thumb. A terminal capture sets `--color-focus: var(--color-project-dark)`, the dark-theme accent, which reaches 3:1 on the capture in both page themes. In forced colors, a control that opts out of adjustment (a checked box, the switch track) sets `outline-color: CanvasText`; a pressed segmented option, whose inset ring sits on its own `Highlight` fill, sets `HighlightText`. Inside a scrolling or clipping parent, the ring is inset (`outline-offset: calc(var(--focus-width) * -1)`), and a comment names the reason. Only `:focus-visible` shows a ring; pointer hover never does.
- **Field focus.** Fields (input, select, textarea, and the search wrapper) draw no ring. On `:focus-visible` (the search wrapper uses `:has(input:focus-visible)`) the 1px edge turns `--color-accent`, and `--shadow-field-focus` (`inset 0 0 0 2px`, the accent at 18% over transparent) draws a muted accent line inside it, with `outline: none`. The fill does not change in either theme. An invalid field keeps its `--color-error` edge while focused, and its inset line is `--shadow-field-focus-invalid` (`--color-error` at 18%). Forced colors drop the inset line, so a focused field there draws `outline: var(--focus-width) solid Highlight; outline-offset: -1px`.
- **Cursor.** An enabled control shows `cursor: pointer`, and so does a label that wraps or follows an enabled checkbox, radio, or switch. The `tokens.css` base sets it with no specificity, so a component's own cursor, such as a busy button's `wait` or a slider's `grabbing`, wins. A label right after an enabled choice counts as that choice's label, so write a choice's label after it or around it. An editable combobox (an `input`, `textarea`, or `contenteditable` one) keeps the text cursor.
- **Disabled.** Opacity 0.58, `cursor: not-allowed`, and no hover or press. Buttons drop their shadow. Fields drop theirs and fill with the `--color-well` well (the grey well in light; the same as rest in dark). Other controls keep theirs. Use the native `disabled` attribute. A link styled as a button has no disabled state: use `<button disabled>`.
- **Invalid.** Fields only: `aria-invalid="true"` and a `--color-error` border (not in forced colors; see [field focus](#rules-for-every-control)). Other controls show an invalid state through the [field wrapper](#field-wrapper)'s error text. Link the error text with `aria-describedby` or `aria-errormessage`.
- **Motion.** Hover and press transitions use `--duration-fast` with `--ease-out`. State changes such as a switch knob use `--duration`. Under `prefers-reduced-motion: reduce`, transitions are instant.

## Button

Layer: Core.

- **Anatomy.** A native `<button>` with a label and an optional 16px leading icon. A link that should look like a button is an `<a>` with the same classes and no underline. Medium weight, `-0.01em` tracking, line height 1.25, `--radius-control` (an 8px rounded rectangle, the field and row corner). Horizontal padding is `--space-2` (8px) at `sm`, 10px at `md`, and `--space-3` at `lg`, and an `sm` button's icon sits 6px from its label. An icon-only button carries `data-icon-only` and holds one 16px icon and no text. It is a circle: its width equals its height at every size, with no padding and `--radius-circle`. Only primary, secondary, and danger have an icon-only form.
- **Variants.**

  | Variant | Rest | Hover | Pressed |
  | --- | --- | --- | --- |
  | Primary | `--color-accent` fill, `--color-accent-text`, `--shadow-raise` | `--color-button-hover` | `--color-button-hover`, `--shadow-sink` |
  | Secondary | `--color-control-thumb` fill, `--color-text`, `--shadow-raise` | `--color-text` 8% into `--color-control-thumb` | `--color-well` fill, `--shadow-sink` |
  | Ghost | Transparent, `--color-muted`, no shadow | `--color-row-hover` fill, `--color-text` | `--color-well` fill, `--shadow-sink` |
  | Danger | `--color-error-surface` fill, `--color-error` mixed 75% with `--color-status-ink` (85% in dark), `--shadow-raise` | `--color-error` 10% into `--color-error-surface` | `--color-error` 16% into `--color-error-surface`, `--shadow-sink` |
  | Text | Transparent, `--color-link`, underlined, 4px padding | No change | No change |

- **States.** Rest, hover, pressed, focus-visible, disabled, and busy. Pressed also moves the button 1px down, for every variant but text, and applies to `aria-pressed="true"`. Busy sets `aria-busy="true"` and `disabled`, so the button takes no hover or press, with `cursor: wait`. It shows a 14px spinner before the label: a 2px `currentColor` ring with a transparent right edge, turning once every 700ms. Keep the label while busy. An icon-only button has no room for both, so the spinner replaces its icon, and its `aria-label` stays the same.
- **Do.** One primary button in each decision group, labelled with a verb for its result, such as "Save changes". Every other action in the group is secondary, ghost, or text. Give a lone icon a circle when it is the one icon action in its group that needs a fill, such as Send or Update, and put it at the end of its row.
- **Don't.** The danger variant on an action the reader can undo. Danger marks an action that destroys something. An icon-only ghost or text button: a lone icon with no fill at rest is a quiet action, because the two look the same at rest and would hover in different shapes.
- **Danger label.** Check the label at 4.5:1 on the rest, hover, and pressed fills. Where the mix misses, use the first of `--color-text`, black, and white that reads on all three.
- **Keyboard and screen reader.** Native button behavior: Enter and Space activate it. An icon-only button needs `aria-label`.
- **Touch.** At tablet width (`max-width: 800px`) every button is at least `--control-touch` tall, and an icon-only button grows to a `--control-touch` circle.
- **Motion.** Fill and shadow transition over `--duration-fast`. Reduced motion slows the spinner to 1.4s instead of stopping it, so the busy state stays visible. The `tokens.css` base holds that exception.
- **Forced colors.** The transparent border draws as the system button edge.

## Quiet action

Layer: Core.

- **Anatomy.** A native `<button>`, or the `<summary>` of a menu. Transparent fill, a transparent 1px border, `--radius-control`, and `--color-muted`. The project trigger overrides the corner with `--radius-field`, because it opens a menu and does not act (see [Site header](#site-header)). The content is centred in the box. An icon-only action holds an SVG icon, never a text glyph such as ×, because a font draws a glyph's ink off the centre of its box. Give the shared recipe zero specificity (`:where()`), so each component sets the action's size, place, and resting colour. On a docs page, Copy, close, Full size, and the project trigger are `--control-md` (32px) tall, and `--control-touch` at tablet width.
- **States.** Hover turns the text `--color-text` and fills `currentColor` at 6% over transparent, only where the pointer can hover (`@media (hover: hover)`). Pressed fills `currentColor` at 12%, with no sink. Focus-visible is the focus ring, inset where the parent clips. An open menu keeps its trigger at the 6% hover tint, below the press. The code block's Copy is `--color-muted` at rest and takes the block's text colour (`--color-code-text`) on hover and while its tick shows. A disabled quiet action follows the shared [disabled](#rules-for-every-control) rule.
- **Do.** Use it for an action inside a component: Copy in a code block or command list, close in a dialog or drawer, Full size on a capture, the project trigger, and the overflow menu trigger. Use it too for any icon-only action that needs no fill at rest, such as the utilities in a sidebar footer or Help at the end of an action bar. In a row of controls it is a square at that row's control size, and it grows to `--control-touch` at tablet width.
- **Don't.** A labelled action that stands on its own in the page, such as Save or Next. That is a button. A lone icon that needs a fill at rest, such as Send: that is an icon-only button, a circle.
- **Keyboard and screen reader.** Native button behavior. An icon-only action needs `aria-label`.
- **Motion.** Fill and colour change over `--duration-fast` with `--ease-out`.
- **Forced colors.** The transparent border draws as the system edge.

## Overflow menu

Layer: Core.

- **Anatomy.** A trigger and a menu of actions. The trigger is an icon-only [quiet action](#quiet-action), `--control-sm` square, holding the SVG "more" icon (three dots, never a text glyph). Its `aria-label` names the item it acts on, such as "More actions for API latency", and it carries `aria-haspopup="menu"` and `aria-expanded`. The menu is a floating layer, as the project menu is: `--color-surface-raised`, a transparent 1px border, `--radius-panel`, `--shadow-dialog`, and `--space-1` padding, at least 180px wide, opening `--space-1` below the trigger, or above it when the viewport has no room below, and aligned to its end edge, so the trigger sits at the end of its row, card, or toolbar. Each item is a `<button role="menuitem">`, `--row` tall with `--space-3` side padding, in `--color-text`, with corners concentric with the menu, `calc(var(--radius-panel) - var(--space-1))`, and an optional 16px leading icon. Its focus ring is inset, as on the project menu's rows. A destructive item comes last, after a separator (`role="separator"`, a 1px `--color-border-subtle` line), with the danger button's text colour.
- **States.** The trigger takes the quiet action's hover, press, focus-visible, and disabled states; while the menu is open it keeps the 6% hover tint, below the press, and `aria-expanded="true"`. An item is highlighted while a pointer hovers it or it has keyboard focus: it takes `--color-row-hover`, and keyboard focus also draws the focus ring. A disabled item uses the native `disabled` attribute, opacity 0.58, and no hover fill, and the arrow keys skip it, as reka-ui's DropdownMenu does.
- **Do.** Use it for two or more secondary actions of a row, card, or toolbar, ordered by how often they are used. Put a destructive action last, after a separator, and confirm it in a dialog.
- **Don't.** The item's primary action, a recovery action such as Retry on a failed item, a menu with one action, or links to other pages. Those stay buttons or links.
- **Keyboard and screen reader.** The WAI-ARIA menu button pattern. Enter, Space, or Down Arrow on the trigger opens the menu and focuses the first item; Up Arrow opens it on the last. Down and Up Arrow move between items and wrap, Home and End go to the first and last, and a printable character moves to the next item that starts with it. Enter or Space runs the item and closes the menu. Escape closes it and returns focus to the trigger; Tab closes it and moves on; a press outside closes it. After an item runs, focus returns to the trigger, unless the action opens a dialog, which returns focus to the trigger when it closes. Items take `tabindex="-1"`, so the menu adds no Tab stops.
- **Motion.** None: the menu opens and closes at once, as the project menu does.
- **Forced colors.** The trigger and menu borders draw as system edges. A highlighted item, from a pointer or keyboard focus, opts out of adjustment and takes `Highlight` with `HighlightText`; the separator takes `CanvasText`.
- **Touch.** At tablet width (`max-width: 800px`) the trigger and each item grow to `--control-touch`.

## Chip

Layer: Core.

- **Anatomy.** A link, or a `<button>` when it fills in a composer, 24px tall (`1.5rem`) with `--space-2` inline padding, holding a label and an optional 14px leading icon in `--color-muted`, 6px (`0.375rem`) from the label. A 1px `--color-border-subtle` edge, no fill, `--radius-control`, `--text-sm`, and `--color-text`. Chips sit in a list (`<ul>`) named for what they offer, such as "Suggestions": a wrapping row with a `--space-2` gap, centred under an empty composer.
- **States.** Rest, hover (a `--color-row-hover` fill), and focus-visible (the focus ring). A chip that does not apply is left out, not dimmed.
- **Do.** Offer two to four next steps under an empty composer, each named for its result, such as "Review last night's run". A chip either fills in the composer or opens a screen.
- **Don't.** A chip for a status or a category, which is a badge, or a chip that sends a message on its own.
- **Keyboard and screen reader.** A native link or button in Tab order; the list's name says what the chips are. A chip that fills in the composer moves focus to the composer's field, with the text in place and nothing sent.
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The edge draws in the system colour, and the hover fill drops.
- **Touch.** At tablet width (`max-width: 800px`) a chip grows to `--control-touch`.

## Checkbox and radio

Layer: Core.

- **Anatomy.** A `<label>` around the box and its text, with a gap of about 9px. The box is 16px at `sm`, 18px at `md`, and 20px at `lg`. Checkbox corners are `--radius-mark`; a radio is round. The row is at least the control height of its size, and the label takes that size's text: `--text-sm` at `sm`, `--text-md` at `md`, and `--text-lg` at `lg`.
- **Tokens.** Unchecked: `--color-surface-raised` fill and a 1px `--color-border` edge. Checked: `--color-accent` fill and edge, with a check mark in `--color-accent-text`. A checked radio shows a 5px `--color-accent` ring around a `--color-surface-raised` centre.
- **States.** Rest, checked, focus-visible (the focus ring on the box), and disabled.
- **Do.** Checkboxes for options the reader can pick in any combination. Radios for one choice from a short list that stays in view.
- **Don't.** A label written as a question, such as "Send updates?", or as a negative, such as "Don't email me". Name the option: "Email me updates".
- **Keyboard and screen reader.** Native `<input type="checkbox">` or `type="radio"`. Space toggles a checkbox. Arrow keys move between radios in a named `radiogroup` or `<fieldset>`.
- **Motion.** None: the box fills and the mark appears at once, as a native input's do.
- **Forced colors.** Native inputs keep system colors. A custom-drawn box redraws in `Highlight` when checked.

## Radio card group

Layer: Core.

- **Anatomy.** A grid of cards (`repeat(auto-fit, minmax(160px, 1fr))`, `--space-3` gap). Each card is a `<label>` with a title, an optional muted description, and a 16px round indicator in the top right corner. The native radio stays inside the card.
- **Tokens.** Unselected: `--color-surface-raised`, `--shadow-raise`, transparent border, `--radius-panel`, `--space-3` padding. Hover: `--color-surface-muted` 45% into `--color-surface-raised`. Selected: `--color-well` fill and `--shadow-sink`, with the indicator filled `--color-accent` and an `--color-accent-text` check. The selected card has no accent ring.
- **States.** Rest, hover, selected, focus-visible (the focus ring over the card's raise or sink), and disabled.
- **Do.** Use radio cards when the reader chooses by a description, such as plans or deploy modes. Give each card a title and one line on what differs.
- **Don't.** Radio cards for options that a title alone explains. Use radios.
- **Keyboard and screen reader.** One Tab stop for the group; arrow keys change the selection. Name the group.
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The selected indicator uses `Highlight` with `HighlightText`.

## Switch

Layer: Core.

- **Anatomy.** A `<button role="switch" aria-checked>` that contains the track, and a separate `<label for>` with an optional description. The button's hit area is at least 32px wide and the control height tall. The track is 44×22 with a pill radius; the knob is 18px, inset 2px. `sm` scales both by 0.8 and `lg` by 1.2.
- **Tokens.** Off track: `--color-border` 90% into `--color-well`, `--shadow-sink`, transparent 1px border. Knob: `--color-surface-raised` with `--shadow-raise`. On: `--color-accent` track, `--color-accent-text` knob moved 22px to the right.
- **States.** Off, on, focus-visible (the focus ring goes on the track, not the hit area), and disabled.
- **Do.** Use a switch for a setting that applies the moment it changes. Its label names the setting, such as "Dark mode", and stays the same when on or off.
- **Don't.** A switch in a form that applies on submit. Use a checkbox there.
- **Keyboard and screen reader.** Space and Enter toggle it. The label names it; the description is linked with `aria-describedby`.
- **Motion.** The knob's transform and the track's fill change over `--duration` with `--ease-out`.
- **Forced colors.** Track: `ButtonText` edge on `Canvas`, with a `ButtonText` knob. On: `Highlight` track with a `HighlightText` knob.

## Toggle button

Layer: Core.

- **Anatomy.** A `<button aria-pressed>` with a switch track at the start, then a label and an optional `--text-xs` muted description. `--radius-field` corners (a labelled card, so wrapped labels sit square), `--space-2` `--space-3` padding, `--color-surface-raised` fill, a 1px `--color-border-subtle` edge, and no shadow. The visible edge and the missing raise are a named exception; see [decisions](decisions.md).
- **States.** Rest, hover (`--color-border` edge), pressed (the track turns on as in the switch and carries the state; the card takes `--color-accent` at 8% over `--color-surface-raised` and a hairline of `--color-accent` at 35%), focus-visible, and disabled.
- **Do.** Use it for an on or off option whose label sits inside the control, such as "Wrap lines" in a viewer's toolbar.
- **Don't.** A toggle button for an action that runs once, such as Refresh. It stays on until pressed again; an action is a button.
- **Keyboard and screen reader.** A native button; Space and Enter toggle `aria-pressed`.
- **Motion.** The card's fill and edge change over `--duration-fast` with `--ease-out`; the track moves as the switch does.
- **Forced colors.** As for the switch track.

## Segmented control

Layer: Core.

- **Anatomy.** A `role="group"` with an accessible name, containing one `<button aria-pressed>` for each option. The track is undivided: `--color-well` fill, `--shadow-sink`, a transparent 1px border, 1px of padding, and `--radius-control`, and it is the control height (`--item`), so an `sm` filter lines up with the `sm` buttons beside it. Its options sit 2px (`--inset`, the border plus the padding) inside its outer edge, with 2px between them, as in Astryx's segmented control: each button is `--item` minus 4px tall, with line height 1, so the label sits centred, and `--space-2` padding at `sm` and `--space-3` at `md` and `lg`, and square when icon-only. Each button is its own thumb: a `::before` layer that fills it, behind the label. Its corners are concentric with the track from the outer edge, `calc(var(--radius-control) - var(--inset))` (6px), a named exception to the 8px row corner. At tablet width a control of any size sets `--item` to `--control-touch`, so its options grow to the touch size less their 4px total inset, and icon-only options stay square. An icon-only control (`data-icon-only`) has a `--radius-pill` track and round options, `calc(var(--radius-pill) - var(--inset))` on a square box, so the thumb is a circle at rest and a pill while it glides. A text control keeps the 8px track and 6px options.
- **Tokens.** Labels are `--color-muted`. The pressed option's thumb is `--color-control-thumb` with `--shadow-raise` and no ring. Its label is `--color-segmented-current-text`: `--color-accent` where it reaches 4.5:1 on the thumb, on the page and on a surface, and otherwise the first of `--color-text`, black, and white that does. An icon-only option needs 3:1. Hover on an unpressed option shows the thumb at 45% and turns the label `--color-text`.
- **States.** Rest, hover, pressed, focus-visible (an inset ring, so it hugs the thumb instead of crossing into the next option), and disabled.
- **Do.** Use it for two to five short options that apply at once and change how the same content shows, such as a view mode or the System, Light, and Dark choice.
- **Don't.** A segmented control that switches between panels of content. Use tabs.
- **Keyboard and screen reader.** Each option is its own Tab stop; Space and Enter press it. Icon-only options use the label as `aria-label` and `title`.
- **Motion.** Hover fades the label colour over `--duration-fast` with `--ease-out`. When the reader changes the choice, one thumb glides from the old option to the new one. Start the new thumb's left and right edges where the old thumb was, then animate each edge home with CSS `ease`. The leading edge takes 260ms and the trailing edge 300ms, so the thumb stretches a little on the way. Labels cross-fade their colour over 260ms. If a glide is cut short, start the next one from the thumb's current position. There is no motion on first render, on a value restored from storage, or on a theme change: allow glides only after the first frame. Reduced motion moves the thumb at once.
- **Forced colors.** The pressed option draws `Highlight` behind `HighlightText`. Its focus ring is `HighlightText`: the option opts out of adjustment, and its inset ring sits on its own `Highlight` fill.

## Text input and textarea

Layer: Core. A textarea uses the same field recipe.

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

Layer: Core.

- **Anatomy.** A native `<select>` with the input's field recipe and a chevron on the right. Draw the chevron in `currentColor`, or with an 8px border corner in `--color-muted` turned 45°. Right padding leaves room for it at every size.
- **Picker.** Where `appearance: base-select` is supported, the open list is a floating layer: `--color-surface-raised`, a transparent 1px border, `--radius-panel`, `--shadow-dialog`, 4px padding, at least the select's width, and at most `min(20rem, 50dvh)` tall. Options are at least 32px tall (44px on coarse pointers), with `--space-2` `--space-3` padding and corners of `--radius-panel` minus 4px. Hover fills `--color-row-hover`. An `--color-accent` check at the end marks the checked option. The check carries the state: the option's `--color-row-selected` fill equals `--color-surface-raised`. Keyboard focus is the focus ring, inset because the list scrolls. Other browsers keep the native picker.
- **States.** Rest, focus-visible, disabled, invalid, and invalid while focused, as for the input.
- **Do.** Use a select for one choice from more than five options, in a predictable order: alphabetical, numeric, or by frequency of use.
- **Don't.** A first option that acts as the label, such as "Choose a region". The label goes above the field.
- **Keyboard and screen reader.** Native select behavior. A visible `<label>`.
- **Motion.** None: as for the input, and the picker opens at once.
- **Forced colors.** The closed field as for the input, including the `Highlight` focus outline. The picker is native.

## Combobox

Layer: Core.

- **Anatomy.** An editable `<input role="combobox">` in the [field](#text-input-and-textarea) recipe, with the [select](#select)'s chevron at the end, and a listbox in the select's picker recipe below it. Typing filters the options; the list keeps their order. When nothing matches, the list holds one row, "No matches", in `--text-sm` `--color-muted`, which cannot be chosen.
- **States.** Rest, focus-visible (field focus), open, disabled, invalid, and invalid while focused. In the open list, pointer hover fills `--color-row-hover`; the active option, the one the arrow keys reach, takes the same fill and the inset focus ring, because DOM focus stays in the field. An `--color-accent` check marks the chosen option, as in the select.
- **Do.** Use a combobox to choose one value from a long or growing list that the reader can name, such as a product, a location, or a supplier.
- **Don't.** A combobox for about 15 options or fewer, which is a select, or a free-text field that only suggests values. Typed text never chooses by itself: on leaving the field, it goes back to the chosen option's label, even when it names another option.
- **Keyboard and screen reader.** `aria-expanded`, `aria-controls` naming the listbox, `aria-autocomplete="list"`, and `aria-activedescendant` naming the active option. Typing opens the list and filters it. ArrowDown opens the list or moves down, and ArrowUp moves up. Only Enter on the active option, or a click on an option, chooses it and closes the list. Typed text never chooses by itself: Tab, or leaving the field another way, keeps the choice and puts its label back, even when the text matches another option exactly. The first Escape closes the list and puts the chosen label back; a second Escape clears the text and the choice. The chosen option's check is decorative and stays out of its name (empty alternative text, `content: "✓" / ""`); `aria-selected` carries the state. The chevron is a button out of the Tab order (`tabindex="-1"`) that opens and closes the list. A visually hidden `role="status"` element announces the match count after a 500ms pause, as in the [find field](#find-field). A visible `<label>`.
- **Motion.** None: the list opens, closes, and filters at once, as the select's picker does.
- **Forced colors.** The field as for the input. The active option draws a `Highlight` outline inside its edge, and the chosen option's check draws in `CanvasText`.
- **Touch.** At tablet width (`max-width: 800px`) the field and each option grow to `--control-touch`, and the chevron becomes a `--control-touch` square, with the field's end padding to match.

## Number field

Layer: Core.

- **Anatomy.** A wrapper in the field recipe, which carries the fill, edge, shadow, and focus as the [search](#text-input-and-textarea) wrapper does. Inside it, left to right: a decrease button, the input, an optional unit, and an increase button. The input is `type="text"` with `inputmode="numeric"`, or `inputmode="decimal"` for a fraction, in tabular numbers and aligned to the end. The unit, such as "pcs" or "kg", is `--text-sm` `--color-muted` with `--space-1` before it. Each button is a square [quiet action](#quiet-action) the height of the control, which spans the wrapper's 1px edges (a -1px margin on its outer sides), with a 16px minus or plus in `--color-muted`, and `--radius-field` corners, so its tint meets the field's own corners on its outer side. The wrapper does not clip its contents, because a clip would also cut the buttons' tap area along the edge they span. The value shows with the locale's digit grouping, such as "1,200", and is written back in that form when the field loses focus.
- **States.** Rest, focus-visible (field focus on the wrapper, through `:has(input:focus-visible)`), disabled, invalid, and invalid while focused. A button at its limit (`min` or `max`) is disabled. A button tints on hover and press as a quiet action does.
- **Do.** Use a number field for an exact amount that the reader may change by a few steps, such as a quantity or a reorder point. Show the unit in the field, and set `min` and `max` when the amount has limits.
- **Don't.** A number field for a code made of digits, such as a part number, an order number, or a postcode. Use a text input, because steps and digit grouping would change it. Don't use the native `type="number"`, which changes the value on a scroll and shows its own spinner.
- **Keyboard and screen reader.** The input takes `role="spinbutton"` with `aria-valuenow`, and `aria-valuemin` and `aria-valuemax` when they are set, and a visible `<label>`. ArrowUp and ArrowDown change the value by one step, Shift with an arrow by ten steps, and Home and End jump to `min` and `max`. With a unit, `aria-valuetext` reads the value with it, such as "1,200 pcs", and the visible unit is `aria-hidden`. The buttons are out of the Tab order (`tabindex="-1"`), because the arrow keys do the same, and are named for their action with the label, such as "Increase quantity". A held button repeats its step after a 400ms pause.
- **Motion.** None: the value changes at once.
- **Forced colors.** The wrapper as for the input. The minus and plus draw in `ButtonText`, and a disabled button's sign draws in `GrayText`.
- **Touch.** At tablet width (`max-width: 800px`) the field grows to `--control-touch`, and the decrease and increase buttons are `--control-touch` squares, because they span the wrapper's edges.

## Field wrapper

Layer: Core.

- **Anatomy.** A grid with a 6px gap: label, control, then a description or an error. The error replaces the description.
- **Tokens.** Label `--text-sm` semibold `--color-text`. Description `--text-sm` `--color-muted`. Error `--text-sm` `--color-error`.
- **States.** Rest, and invalid: the error replaces the description, and the control takes its own invalid state.
- **Do.** Write the error as the fix, such as "Enter a date after today", and the description as a format or limit, such as "Up to 64 characters". Leave the description out when the label is enough.
- **Don't.** A description that repeats the label, or an error that only says "Invalid".
- **Keyboard and screen reader.** The label's `for` names the control. The control points `aria-describedby` at the description, and `aria-errormessage` at the error with `aria-invalid="true"`.
- **Motion.** None: the error replaces the description at once, so it is never half shown.
- **Forced colors.** The label, description, and error all take the system text colour, so the error's words must say what is wrong.

## Slider

Layer: Core.

- **Anatomy.** A 6px track with `--radius-pill` and `--color-surface-muted`, an `--color-accent` range, and a round thumb (16px, 18px, or 20px) with a 2px `--color-accent` edge and a `--color-surface-raised` fill. The current value follows the track as `--text-sm` text in tabular numbers, in an `<output>` whose `for` names the slider.
- **States.** Rest, dragging (`cursor: grabbing`), focus-visible on the thumb, and disabled.
- **Do.** Use a slider for an approximate value in a range, such as volume or opacity, and show the current value as text beside it.
- **Don't.** A slider for a value the reader must set exactly, such as a port or a price. Use a text input.
- **Keyboard and screen reader.** The thumb has `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and a name. Arrow keys step; Home and End jump to the ends. A native `<input type="range">` styled to match is acceptable. The `<output>` sets `aria-live="off"`, because the slider already announces its value.
- **Motion.** None: the thumb and the range follow the pointer or the arrow keys at once.
- **Forced colors.** The range redraws in `Highlight` with `forced-color-adjust: none`. The thumb keeps the system colours.

## Progress

Layer: Core.

- **Anatomy.** A track about 9px tall with a 1px `--color-border-subtle` edge, `--radius-pill`, and `--color-surface-muted`, holding an `--color-accent` indicator moved with `translateX`.
- **States.** None: a progress bar takes no input, so it has no interaction states. Its value follows `aria-valuenow`.
- **Do.** Use it for a task with a known end, such as an import, and name it for the task.
- **Don't.** A progress bar for a measured value, such as disk usage or a rating. It shows a task moving to its end; use text or a score.
- **Keyboard and screen reader.** `role="progressbar"` with a name and `aria-valuenow`, or a native `<progress>`.
- **Motion.** The indicator's transform moves over `--duration-fast` with `--ease-out`.
- **Forced colors.** The indicator redraws in `Highlight` with `forced-color-adjust: none`.

## Score

Layer: Core.

- **Anatomy.** A row of 8px round pips (`--radius-pill`) with 3px gaps, then the value in medium weight and `/max` in muted regular weight, in tabular numbers. Empty pips have a 1px `--color-border` edge; filled pips are `--color-accent`.
- **States.** None: a score is static, so it has no interaction states.
- **Do.** Use it for a value out of a fixed maximum, such as 4/5, and keep one maximum across a list so the rows compare.
- **Don't.** A score for a percentage or an open-ended count. Write the number as text.
- **Keyboard and screen reader.** The pips are `aria-hidden`; the text value carries the score.
- **Motion.** None: a score is static.
- **Forced colors.** Filled pips redraw in `Highlight` with `forced-color-adjust: none`.

## Badge

Layer: Core.

- **Anatomy.** An inline pill: `--radius-pill`, 2px by 6px padding, `--text-xs`, medium weight, and a transparent 1px border. A tone's dot sits `--space-1` from the label.
- **Tokens.** Neutral: `--color-surface-muted` fill, `--color-muted`, no dot. Status tones (success, warning, danger, info): the tone at 22% over `--color-surface-raised`, text of the tone mixed 75% with `--color-status-ink` in light and 85% in dark, and a leading 6px dot in `currentColor`.
- **States.** None: a badge is static text. Its tone is a variant, not a state.
- **Do.** A one- or two-word status or category on an item, such as "Healthy" or "Beta", with a status tone only when it is a status.
- **Don't.** A badge that repeats the title, or one on every row with the same value. Badge the exceptions. An icon beside a badge that says the same.
- **Keyboard and screen reader.** Static text; the label carries the meaning, never the colour alone.
- **Motion.** None: a badge is static.
- **Forced colors.** Fills drop and the transparent border draws as the system edge, so each badge reads as an outlined label. The tone dot opts out of adjustment (`forced-color-adjust: none`) and draws in `CanvasText`, the label's colour; the label still carries the status.

## Alert

Layer: Core.

- **Anatomy.** An optional 16px icon and short text. `--space-3` `--space-4` padding, `--radius-panel`, and a transparent 1px border.
- **Tokens.** Neutral: `--color-surface`. Status tones use their `--color-*-surface` tint with `--color-text`; the icon takes the status colour.
- **States.** None: an alert is static content. Its tone is a variant, not a state.
- **Do.** Use an alert for a caveat or status message the reader needs before acting. When action is needed, name it, such as "Reconnect the source to resume sync".
- **Don't.** An alert for decoration or routine emphasis. A short status label is a badge; explanations and recovery instructions stay in an alert. An alert that repeats the summary sentence, a badge, or the heading in view, or a second alert in the same view.
- **Keyboard and screen reader.** Static content. Use `role="status"` or `role="alert"` only for a message that appears while the reader works.
- **Motion.** None: an alert shows at once, with no entrance animation.
- **Forced colors.** Fills drop and the transparent border draws as the system edge. The icon takes `CanvasText`, the text colour, because an SVG keeps the status colour it sets; the text carries the message.

## Surface and card

Layer: Core.

- **Anatomy.** A panel: `--color-surface-raised`, transparent 1px border, `--radius-panel`, and `--shadow-surface`. A card adds a header (title in `--text-md` medium weight, with actions at the end), a body, and an optional footer above a `--color-border-subtle` rule in `--text-sm` muted text. Header and body padding is `--space-4`; padding is compact (`--space-3`) or default (`--space-4`).
- **States.** None: a panel is static. Controls inside it keep their own states.
- **Do.** Use cards for a few parallel, self-contained items that a reader compares, such as plans or projects.
- **Don't.** A panel inside a panel, or cards around ordinary prose.
- **Keyboard and screen reader.** A card's title is a heading at the next level of the page outline.
- **Motion.** None: panels do not lift on hover or animate in.
- **Forced colors.** The shadow drops and the transparent border draws as the system edge, so each panel keeps its outline.

## Figure

Layer: Core.

- **Anatomy.** A well (`--color-surface`, 1px `--color-border-subtle`, `--radius-panel`, `--space-5` padding, or `--space-4` on phones) with a caption below it in `--text-sm` muted text. Wide content scrolls inside the well. A figure number is `--color-text` in medium weight.
- **States.** None: a figure is static.
- **Do.** Caption every figure with what it shows. When the prose refers to one figure by number, number them all.
- **Don't.** A screenshot of code or of a component. Show code as text, so the reader can copy it, and a component live.
- **Keyboard and screen reader.** A `<figure>` with a `<figcaption>`, so the caption names the figure.
- **Motion.** None: a figure is static.
- **Forced colors.** The well's fill drops, and its edge draws in the system colour.
- **Identity.** On folio sites the caption is mono.

## Dialog

Layer: Core.

- **Anatomy.** A floating layer centred on an `--color-overlay` backdrop, at most 512px wide and 672px tall. It has a header (title in 18px semibold with an optional muted description, and a 32px close button, `--control-touch` at tablet width), a body that scrolls, and an optional footer on `--color-surface` with its actions at the end. Rules between the parts are `--color-border-subtle`. On phones it becomes a bottom sheet with rounded top corners.
- **Tokens.** `--color-surface-raised`, a transparent 1px border, `--radius-panel`, `--shadow-dialog`. The close button is a [quiet action](#quiet-action).
- **States.** Closed and open. When focus lands on the dialog itself, it shows the focus ring.
- **Do.** Use a dialog for a short task the reader must finish or cancel before the page continues, such as confirming a deletion. Title it with that task.
- **Don't.** A dialog that opens without the reader asking, such as on page load, or one that holds a long form. A long form gets its own page.
- **Keyboard and screen reader.** `role="dialog"`, `aria-modal="true"`, named by its title. Focus moves in on open and is trapped. Escape closes it, and focus returns to the trigger. A native `<dialog>` opened with `showModal()` provides most of this.
- **Backdrop.** A tap or click on the backdrop, outside the dialog, closes it, the same way Escape does, and focus returns to the trigger. Only a press that starts outside counts: a drag that starts inside the dialog and ends outside leaves it open. Safari does not support `closedby="any"`, so a script closes it.
- **Motion.** None: it opens and closes at once. Only the drawer and the slideout slide, because they enter from an edge.
- **Forced colors.** The shadow drops and the transparent border draws as the system edge, so the dialog keeps its outline over the page.

### Viewer

- **Anatomy.** A dialog that shows one screenshot, terminal capture, or figure at full size. It is a named exception to the dialog's task rule: the reader opened it to look, so it has no footer, and its header's close button, Escape, and the backdrop close it. The header holds only the title, in the dialog's 18px semibold `--font-ui` type, centred on the close button. The body is one scroll region with `--space-4` padding. The viewer is as wide as its content, up to the viewport minus `--space-8`, and as tall, up to the dynamic viewport height (`dvh`) minus `--space-8`.
- **Size.** Full size is the content's own CSS size, such as a 2x screenshot at half its pixel width. The content scales down to fit the body's width only while it keeps at least 70% of that size; below 70% its text is too small to read, so it stays at full size and the body scrolls in both directions. A terminal capture follows the same 70% rule in its panel.
- **Title.** The short name of what it shows, such as "Ticket screenshot" or "Build capture", not the image's alt text. The alt text stays on the image.
- **Do.** Open every screenshot, capture, or figure that the page shows smaller than its full size in a viewer, from a native button or link, so all of them open the same way.
- **Don't.** A footer with a Close button, a long alt text as the title, or a phone viewer that shrinks a screenshot to the screen's width so that its text cannot be read.
- **Keyboard and screen reader.** As for the dialog. The scroll region is focusable and named by the title, so the arrow keys scroll it; its focus ring is inset, because the body clips it. Focus returns to the trigger on close.
- **Phones.** At `max-width: 640px` it is the dialog's bottom sheet at full width, up to the dynamic viewport height minus `--space-4`. The scroll region contains its overscroll, so a pan that reaches the edge does not scroll the page behind.
- **Motion.** None: as for the dialog.

## Drawer

Layer: Core.

- **Anatomy.** Navigation in a dialog fixed to the leading edge (the left in a left-to-right page), full height, `min(--sidebar-width + 48px, 100vw - 48px)` wide, with a header (title and close button) and a body that scrolls on its own. It is a floating layer with square corners: `--color-surface-raised`, a transparent 1px border, and `--shadow-dialog`. The close button is a [quiet action](#quiet-action). The family's navigation triggers sit at the start, so the drawer opens from the start too.
- **Current row.** The drawer opens on the current row, scrolled to the centre of the body. A keyboard open moves focus to that row; a tap moves focus to the body, so no ring shows and no on-screen keyboard opens. An open with the `/` shortcut moves focus to the [find field](#find-field), which stays pinned at the top of the body while the list scrolls under it.
- **States.** Closed, open, and closing: `data-closing` keeps it open while it slides out.
- **Do.** Use a drawer for navigation that does not fit on the page, such as phone navigation or a section rail at tablet width, and open it from a named button.
- **Don't.** Filters, settings, or detail in a drawer: they go in a slideout. The page's main task stays on the page.
- **Keyboard and screen reader.** As for the dialog. Following an in-page link inside the drawer closes it and moves focus to the link's destination (given `tabindex="-1"` if it is not focusable), not back to the trigger. Modified clicks (a new tab or window) leave it open.
- **Backdrop.** A tap or click on the backdrop, outside the drawer, closes it, the same way Escape does, and focus returns to the trigger. Only a press that starts outside counts: a drag that starts inside the drawer and ends outside leaves it open. Safari does not support `closedby="any"`, so a script closes it.
- **Page behind.** While the drawer is open, until it has slid out, the page behind it does not scroll: the root takes `overflow: hidden`, which keeps the reader's position. The page reserves the scrollbar gutter all the time (`scrollbar-gutter: stable` on the root), so hiding a classic scrollbar does not reflow it.
- **Motion.** It slides in over `--duration` and out over `--duration-fast`, with `--ease-out`, while the overlay fades. Reduced motion shows and hides it at once.
- **Forced colors.** As for the dialog: the shadow drops and the edge draws in the system colour.

## Slideout

Layer: Core.

- **Anatomy.** A modal panel that slides in from an edge and holds filters or secondary detail. It is the [drawer](#drawer)'s floating layer, with square corners, on the `--color-overlay` backdrop. It has a header (the drawer's title type and a close button, a [quiet action](#quiet-action)), a body that scrolls on its own, and an optional footer on `--color-surface` with its actions at the end, as the [dialog](#dialog)'s footer. Rules between the parts are `--color-border-subtle`.
- **Edge.** The page names the edge. The default is the trailing edge (the right in a left-to-right page); the top and the bottom are allowed. The leading edge belongs to the navigation drawer. A side slideout is full height and `min(75%, 384px)` wide; a top or bottom slideout is full width and as tall as its content, up to 75% of the dynamic viewport height.
- **States.** Closed, open, and closing: `data-closing` keeps it open while it slides out.
- **Do.** Use a slideout for filters, settings, or the detail of a selected item that the reader opens beside the page and closes to go on, and open it from a named button, such as Filters.
- **Don't.** Navigation in a slideout: that is the drawer's job. The page's main task stays on the page, and a short task that needs an answer is a dialog.
- **Keyboard and screen reader.** As for the dialog. Every close returns focus to the trigger; a link inside it is not the drawer's in-page exception.
- **Backdrop.** As for the drawer: a tap or click on the backdrop closes it, the same way Escape does, and a drag that starts inside and ends outside leaves it open.
- **Page behind.** As for the drawer: the page behind it does not scroll until it has slid out.
- **Phones.** At `max-width: 640px` the footer's actions stack at full width in source order, so the primary action, last, sits nearest the thumb. A side slideout keeps its 75% width, so the page still shows beside it.
- **Touch.** At tablet width (`max-width: 800px`) the close button and the footer's actions grow to `--control-touch`, as every control does.
- **Motion.** As for the drawer, from its own edge: it slides in over `--duration` and out over `--duration-fast`, with `--ease-out`, while the overlay fades. Reduced motion shows and hides it at once.
- **Forced colors.** As for the dialog: the shadow drops and the edge draws in the system colour.

## Description list

Layer: Core.

- **Anatomy.** A `<dl>` of term and value pairs, each pair in a `<div>`. On a wide screen it is a two-column grid: the term column is as wide as its longest term, up to 12rem, and the value column takes the rest. Terms wrap anywhere (`overflow-wrap: anywhere`), so an unbroken term keeps the column at its 12rem cap. The grid has an `--space-4` column gap and an `--space-2` row gap. A term is `--text-sm` `--color-muted`; a value is `--text-md` `--color-text`, in tabular numbers, and may hold a link, a [badge](#badge), or a quiet copy action. Both align to the first line's baseline. A value that is not set reads "None" in `--color-muted`. In a narrow container (`max-width: 30rem` on the list's container), each term sits above its value with an `--space-1` gap, and the pairs keep the `--space-2` gap.
- **States.** None: the list is static text. A link or an action inside a value keeps its own states.
- **Do.** Use a description list for the details of one record, such as a product's location, supplier, and reorder point. Order the terms the way the reader checks them, most used first.
- **Don't.** A description list to compare several records, which is a table, or a border or fill on each pair. Leave a pair out only when it never applies to the record; when it applies and is empty, write "None".
- **Keyboard and screen reader.** Native `<dl>`, `<dt>`, and `<dd>`, so a screen reader reads each term with its value. A copy action is named for its value, such as "Copy location".
- **Motion.** None: the list is static.
- **Forced colors.** Terms and values take the system text colour. The list has no fill or edge to lose.

## Stat tile

Layer: Core.

- **Anatomy.** A tile with `--color-surface` fill, a transparent 1px border, `--radius-panel`, and `--space-4` padding, holding, top to bottom: a label in `--text-sm` `--color-muted`; the value in `--text-2xl` semibold `--color-text`, tabular numbers, with an optional unit in `--text-sm` `--color-muted`; and an optional context line in `--text-sm` `--color-muted`, such as "8 below reorder point", or a [badge](#badge). Tiles sit in a grid with `repeat(auto-fit, minmax(12rem, 1fr))` and an `--space-4` gap, outside a card.
- **States.** Rest. A tile that opens the records behind its number is a link: hover fills `--color-row-hover`, and focus-visible shows the focus ring.
- **Do.** Use stat tiles for a few headline counts at the top of an overview, such as items in stock and items below their reorder point, each with a context line that says what the number means. Link a tile to the list of records it counts.
- **Don't.** A border on each tile or a tile inside a card. Don't colour the value to show good or bad: a badge or the context line says it in words. Don't add a trend arrow or a sparkline without the period it compares.
- **Keyboard and screen reader.** The label comes before the value in the DOM, so it is read first. A tile without a link is a `<div>` holding a `<dl>` with one `<dt>` and its `<dd>`s. A linked tile is one `<a>` whose name reads the label, the value, and the context line, such as "Below reorder point, 8 items".
- **Motion.** A linked tile's fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The fill drops, and the transparent border draws as the system edge, so each tile keeps its outline.

## Navigation list

Layer: Core. The mono font on rail rows is identity.

- **Anatomy.** A `<nav>` with a name, holding links in rows: at least `--row` tall (`--control-touch` at tablet width), `0 --space-3` padding, `--radius-inline` corners (`calc(var(--radius-panel) - var(--space-1))`, the same 8px, inside a floating menu such as the project menu, so they are concentric with it), `--text-sm`, and `--color-muted`. A row may hold a leading 16px icon and a trailing muted count. A text-only row centres its label on the cap height: where `text-box` is supported, it is a block with `align-content: center`, `--space-2` block padding, and `text-box: trim-both cap alphabetic`, and the location pip centres itself. The padding keeps a wrapped label's first and last lines clear of the fill's edges and the focus ring. Rows with an icon or a count, and browsers without `text-box`, centre the line box, which leaves a label without descenders about 1px above centre. Groups have a `--text-xs` semibold muted label and 2px gaps between rows.
- **Groups.** Name groups by purpose, with 2 to 8 rows each. Collapse groups only in a list of more than about 40 rows. A collapsible group's label is a `<button aria-expanded>` in the label type, with `--radius-inline` corners and a chevron that turns −90° when the group is closed. Never collapse the group that holds the current row.
- **States.** Hover: `--color-row-hover` fill and `--color-text`. Current page (`aria-current="page"`): `--color-nav-current` fill, `--shadow-nav-current`, `--color-nav-current-text`, and medium weight; hover keeps that fill. `--color-nav-current` is an accent tint: `--color-accent` at 14% over `--color-surface-raised` in light, and `--color-accent` at 20% over transparent in dark. `--color-nav-current-text` is the first of `--color-accent`, `--color-text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Selected tabs and selected list rows use the same fill and rule. Current location in the page (`aria-current="location"`): `--color-text` in medium weight, with a 3×14 `--color-accent` pip at the leading edge, inset 4px, and no fill, in strips and contents lists. In a [section rail](#section-rail) the current section takes the current-page look instead and keeps `aria-current="location"`. A link carries one marker, and page outranks location; the [`aria-current` rules](DESIGN.md#navigation) say which applies, and the [tracking rule](DESIGN.md#navigation) says which section is current. Focus-visible: the focus ring, inset because the rail, the drawer, and a contents list beside a column scroll.
- **Do.** Label a page link with the destination page's title, and an in-page link with its destination section's heading.
- **Don't.** Actions such as Delete or Sign out in a navigation list. Every row is a link to a place; an action is a button.
- **Beside a column.** A contents list ("On this page") that sits beside the reading column stays in view while the column scrolls. It takes `position: sticky`, a `top` equal to the page's one [scroll offset](DESIGN.md#navigation) (the `html { scroll-padding-top }` length: any sticky bar plus `--space-4`, or `--space-4` alone), and `align-self: start` in its grid or flex row, so the row does not stretch it to the column's height. Its `max-height` is the window height (`100dvh`, as the rail uses) less its `top` and `--space-4`, and it is a column flex layout: its heading stays put, and its list scrolls on its own (`overflow-y: auto`, `overscroll-behavior: contain`) when it does not fit. It keeps the current row in view as the [section rail](#section-rail) does: when the location changes, it scrolls only its own list, never the page, to centre the current row if it is out of view. It leaves the list alone while the pointer is over it or focus is inside it, and centres the current row again when they leave. Its rows, pip, and states do not change. When the frame is too narrow for the page rail, the reading column, and the contents list side by side, the list leaves its column: a container query on the docs frame, not a viewport breakpoint, moves it to a closed disclosure right before `main`. It is not sticky there, so the page keeps its one scroll offset. Its summary is the no-JavaScript summary below, and with JavaScript it reads "On this page: <current section>". Its rows, pip, and states do not change. `guide.html` moves it below a 66rem frame: two `--sidebar-width` columns, two `--space-8` gaps, and a reading column of about 34rem. At `max-width: 800px`, where the layout becomes one column, the phone trigger takes its place, as the next part says.
- **Phone triggers.** One labelled trigger opens a navigation drawer: a secondary button at least `--control-touch` tall, with `--space-2` block padding so a label that wraps grows it, and a three-line menu glyph (14×10, 1.5px lines) `--space-3` before the label. The label names the list and its current row, such as "Components: By purpose" for a [section rail](#section-rail) or "On this page: Install" for a docs page's contents, and follows the current section as the page scrolls. The trigger sits at the start, below the site header, and its drawer opens from the left. It shows the page's contents and does not act, so it takes the 8px field corner (`--radius-field`), at rest and pressed. With JavaScript a page has one trigger: no icon-only Find or Menu button beside it. A page with both a page rail and a contents list keeps that one trigger, labelled for the rail and its current page, such as "Documentation: Write a guide". Its drawer holds the two lists as two named navigations: "On this page" first, with its pip, then a `--color-border-subtle` rule and the page rail, with its fill. While Find has a query, the contents list hides. The drawer opens at its top, where the current section is. Without JavaScript the trigger is not there, and each list is its own closed disclosure in place: the page rail first, then the contents list. Without JavaScript the list opens in place, so the trigger is a `<details>` summary with the secondary button classes and a chevron after the label. It takes the same 8px field corner. Only the chevron is local.
- **Horizontal strip.** A row of 6 links or fewer; beyond that, use a drawer. It uses these rows and states unchanged: the current page takes the lifted fill, and a location keeps its pip. It scrolls sideways with 2px padding, so the current row's shadow stays whole, and a clipped edge fades over 24px, as [tabs](#tabs) do. An edge with 12px or less hidden does not fade. A focused row scrolls into view clear of the fades (`scroll-padding-inline: 24px`), and the strip shows no scrollbar (`scrollbar-width: none`), because the fade shows the overflow. Becoming current changes no row's width: each link carries its label in `data-label`, and a hidden copy of it at the current row's medium weight (`::after`, with empty alternative text and `margin-top: -1lh`, so it shares the label's line) sets the row's width. A strip in a drawer, where labels wrap, drops the copy, and so does a browser without the `lh` unit.
- **Keyboard and screen reader.** Plain links in Tab order.
- **Motion.** Fill, colour, and shadow change over `--duration-fast` with `--ease-out`. A contents list beside a column scrolls its list at once, as the rail does.
- **Forced colors.** Fills and shadows drop. The current page (`aria-current="page"`), and a rail's current section, take a 2px `Highlight` border on the leading edge, and their leading padding gives up 2px for it, so the row keeps its width. The location pip keeps its shape with `forced-color-adjust: none` and a `Highlight` fill, so page and location still differ.
- **List selection.** A selected row in a list or table (`aria-selected="true"`) takes the current-page recipe: `--color-nav-current` fill, `--shadow-nav-current`, medium weight, and its primary text in `--color-nav-current-text`, with no accent bar. Hover keeps that fill. Rows keep their own radius. Dividers between rows are straight 1px `--color-border-subtle` lines inset by the row's inline padding, drawn on the row, not as a shadow, and hidden next to a filled (hovered or selected) row. Forced colors: the fill and shadow drop, and the selected row takes a 2px `Highlight` border on its leading edge, as the current page does.

## Section rail

Layer: Core.

- **Anatomy.** A named `<aside>`, so the find field and the footer sit in a landmark, with `position: sticky; top: 0`, `height: 100dvh`, and a column flex layout with `--space-3` gaps. An optional [find field](#find-field) sits at the top. Below it, a named `<nav>` holds grouped [navigation list](#navigation-list) rows and scrolls on its own (`overflow-y: auto`, `overscroll-behavior: contain`). An optional footer for rail settings, such as the single-key shortcut switch, sits last, above a `--color-border-subtle` rule. The element that draws a divider never scrolls. The rail's rows follow the page order.
- **States.** Rows take the navigation list states. The current section keeps `aria-current="location"` but takes the current-page look: `--color-nav-current` fill, `--shadow-nav-current`, and `--color-nav-current-text` in medium weight, with no pip. When the location changes, the rail scrolls its own list, never the page, to centre the current row if it is out of view. It leaves the list alone while the pointer is over the rail or focus is inside it.
- **Do.** Use a rail for the sections of a long page, or for a site's pages. A site's pages may take a navigation strip of 6 links or fewer instead.
- **Don't.** A rail beside a strip or a contents list that holds the same links. Each level has one list.
- **Levels.** A rail holds one level. When it holds the site's pages, the current page's sections go in a [contents list beside the column](#navigation-list), never in a group of the rail.
- **Name.** A rail that holds a site's pages is named for them, such as "Documentation". A one-page site's rail holds its sections and is named "On this page". On a site whose pages sit in a strip, a page's section rail is named after the page, such as "Components".
- **Tablet and phone.** At `max-width: 800px`, with JavaScript, the rail moves into a [drawer](#drawer) titled with the rail's name, which holds the find field, pinned at the top, and the rail's groups. The labelled [phone trigger](#navigation-list) below the [site header](#site-header), before the breadcrumb, opens it from the left. Its label is "<rail name>: <current section>", such as "Components: By purpose". The header keeps the site's pages and the appearance control, so the drawer does not repeat them. `/` opens the drawer with the field focused. A page with no rail shows no trigger. Without JavaScript nothing moves: the trigger stays hidden, and the rail stays in place above `main` with every row shown and the find field hidden.
- **Keyboard and screen reader.** The trigger has `aria-haspopup="dialog"`, and its visible label is its name. Location changes are not announced; the trigger's label changes without an announcement. The current section follows the [location tracking rule](DESIGN.md#navigation).
- **Motion.** The rail scrolls its list at once. Rows change as in the navigation list.
- **Forced colors.** The current section's fill and shadow drop, and it takes a 2px `Highlight` border on its leading edge, as the current page does.

## Find field

Layer: Core.

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

Layer: Core.

- **Anatomy.** `<nav aria-label="Breadcrumb">` holding an `<ol>` in `--text-sm`, right above the page's h1. Separators are `--color-muted` chevrons, a 6px box (`0.375rem`) with 1.5px top and right borders turned 45°, so they hold no text to read. The labels centre on the cap height like navigation rows, and the chevrons centre on the row. Ancestors are `--color-muted` links with no underline, at least `--control-sm` tall (`--control-touch` at tablet width), with `--radius-inline` corners. The current page is plain text with `aria-current="page"`, in `--color-text` and medium weight. On folio sites the trail is mono (identity).
- **States.** Hover: `--color-text` and an underline. Focus-visible: the focus ring.
- **Do.** Put the trail above the page's h1 on every page below the site's home page, and keep the project switcher in the header.
- **Don't.** A trail in the site header in place of the project switcher: the header changes from page to page, and the path reads as the page title.
- **Placement.** A page-level trail sits on its text, not on its links' boxes: it moves up by half the room the box adds around the line, `calc((1lh - var(--control-sm)) / 2)` (`--control-touch` at tablet width), and takes the same room back below, so the h1 does not move.
- **Phone.** At `max-width: 640px` a trail of two crumbs shows in full. A trail of three or more shows only the parent, as a back link: the parent's name after a chevron that points back, drawn the same way, inside the link.
- **Keyboard and screen reader.** Ancestors are links in Tab order. The current page is text, so it takes no Tab stop.
- **Motion.** None: hover changes the colour and underline at once.
- **Forced colors.** No change: links and text take the system colours.

## Pager

Layer: Core.

- **Anatomy.** `<nav aria-label="…">` at the end of `main`, with two equal columns and a `--space-4` gap, below a `--color-border-subtle` rule with `--space-6` padding. Each link is a block row with `--space-3` `--space-4` padding, `--radius-field` corners, and a transparent 1px border: a `--text-xs` `--color-muted` direction with an arrow ("Previous", "Next"), then a medium `--color-text` title. Links take `rel="prev"` and `rel="next"`. Next sits in the end column, end-aligned, even when it is alone.
- **States.** Hover: `--color-row-hover` fill. Focus-visible: the focus ring. There is no current state.
- **Do.** Use a pager for pages a reader goes through in order, such as a guide's chapters or the skills in one group.
- **Don't.** A pager on pages with no reading order, or one per section on a page with a section rail.
- **Phone.** No change: the two columns stay, so Previous and Next share one row, and a long title wraps inside its column, breaking inside a word when it must.
- **Keyboard and screen reader.** The direction and the title are both inside the link, so it reads as one name, such as "Next Application example".
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** Each link's transparent border draws in the system link colour, so both links read as boxes, and the hover fill drops.

## Tabs

Layer: Core.

- **Anatomy.** A `role="tablist"` with no rule below it and a 12px gap below it. It scrolls sideways when needed, and a 24px mask fades each clipped edge. Scrolling clips on every side, so the list has 4px (`--space-1`) padding all round: it keeps the selected tab's shadow whole and its fill off the frame edge. Each tab is a borderless button with the [button](#button)'s box: at least `--control-md` tall with 10px inline padding, no block padding, and line height 1, so its label sits centred; `--radius-inline` corners, medium weight, and `--color-muted`. A list with `data-size="sm"`, for app screens, has tabs at least `--control-sm` tall with `--space-2` padding and `--text-sm` labels. At tablet width tabs of every size are at least `--control-touch` tall. The selected tab's fill is a `::before` layer behind the label, inset 0, with the tab's corners; the list sets `isolation: isolate`, so the layer stays inside it.
- **States.** Hover fills `--color-row-hover` and turns the text `--color-text`. The selected tab takes the [navigation row](#navigation-list)'s current-page recipe: `--color-nav-current` fill and `--shadow-nav-current`, with no underline. Its text is `--color-nav-current-text`: the first of `--color-accent`, `--color-text`, black, and white that reaches 4.5:1 over the tinted fill, both on the page and on a surface (composite a translucent fill over each first). Focus-visible is the focus ring, inset because the list scrolls.
- **Do.** Use tabs for panels about one object, such as a monitor's Overview and History, when the URL does not change.
- **Don't.** Links with `role="tab"`, or one set that mixes pages and panels. Pages take a navigation strip.
- **Motion.** Hover fades over `--duration-fast` with `--ease-out`. When the reader changes the tab, the fill glides from the old tab to the new one as the [segmented control](#segmented-control)'s thumb does: start the new fill's left and right edges where the old fill was, then animate each edge home with the `glide-left` and `glide-right` keyframes and CSS `ease`, the leading edge over 260ms and the trailing edge over 300ms. Labels cross-fade their colour over 260ms. An interrupted glide starts from the fill's current position. There is no glide on first render or under reduced motion, where the fill moves at once.
- **Keyboard and screen reader.** Roving `tabindex`: arrow keys move between tabs, Home and End go to the ends, and focus selects the tab. Each tab has `aria-controls` and `aria-selected`; each panel has `role="tabpanel"`. Without JavaScript, show every panel under its own heading. Apply the tab roles and hide the headings and unselected panels only when the script enhances the markup.
- **Forced colors.** The fill layer is removed (`content: none`), so the selected tab takes a 2px `Highlight` border, and its inline padding shrinks by 2px to keep its size.

## Skip link

Layer: Core.

- **Anatomy.** The first focusable element on the page, linking to `main` (`id="main"`) and named "Skip to content". It sits above the page until it takes focus, then shows at the top left as a floating layer: `--color-surface-raised`, a transparent 1px border, `--radius-field`, `--shadow-dialog`, `--space-2` `--space-3` padding, and the focus ring. It takes the field corner, not the 12px corner of other floating layers, because it is a one-line control that is not an action.
- **States.** Hidden above the page at rest, and shown at the top left while it has focus.
- **Do.** A "Skip to content" link on every page with a header or rail before `main`; the first Tab shows it.
- **Don't.** Hiding it with `display: none`, which also takes it out of the Tab order.
- **Second link.** When a [section rail](#section-rail) comes before `main` and holds more than about 20 rows, a second link, "Skip to contents", follows the first and moves focus to the rail's list. It is hidden at tablet width, where the rail sits in the drawer.
- **Keyboard and screen reader.** Activating a skip link moves focus to its target, which takes `tabindex="-1"` at that moment.
- **Motion.** None: it appears at once when it takes focus.
- **Forced colors.** The shadow drops, and the transparent border draws in the system link colour.

## Keyboard key

Layer: Core.

- **Anatomy.** A `<kbd>`: `--font-mono` `--text-xs` medium in `--color-muted`, on a `--color-surface` fill with a 1px `--color-border` edge and `--radius-mark` corners, 20px tall, at least 20px wide, with 5px inline padding and no shadow.
- **States.** None: a key is static text.
- **Do.** A key or shortcut in running text or shortcut docs, one key per `<kbd>`.
- **Don't.** A key style for code or button names. Code takes `<code>`; a button's name is plain text.
- **Keyboard and screen reader.** A `<kbd>` reads as its text. The [find field](#find-field)'s hint is `aria-hidden`, because the field carries `aria-keyshortcuts`.
- **Motion.** None: a key is static.
- **Forced colors.** The edge is `CanvasText`.

## Message row

Layer: Core.

- **Anatomy.** One message in a list (`<ol>`) of messages, as a flat row with no bubble or card. A grid of a 32px avatar column (`2rem`) and the body, with a `--space-3` gap, `0.375rem` `--space-2` padding, and `--radius-inline` corners. The avatar is 32px square with `--radius-inline` corners, a `--color-surface-muted` fill, and the author's initials in `--font-mono` `--text-xs` semibold `--color-muted`; it is `aria-hidden`, because the name follows it. The header line holds the author in semibold (an agent's name in `--font-mono` `--text-sm`), an optional `--text-xs` tag such as "Asks you" in `--color-nav-current-text` semibold, then the time in a `<time>` element, `--text-xs` `--color-muted`. The body follows, at most `--measure` wide, with `--space-1` between its blocks. A new group starts `--space-2` below the row before it. The row holds a [hover toolbar](#hover-toolbar) at its top right.
- **States.** Rest; hover, which tints the row `--color-row-hover` at 55% over transparent and shows its [hover toolbar](#hover-toolbar); focus within, which shows the toolbar as hover does; and selected, the message whose thread is open (`aria-current="true"`), with the `--color-nav-current` fill, kept under hover.
- **Do.** Put the author and the time on every message that starts a group, and use one tag, such as "Asks you", only on a message that needs the reader.
- **Don't.** A bubble, a card, or a per-message row of buttons. The row stays flat, and its actions live in the hover toolbar.
- **Keyboard and screen reader.** The list is named for its channel or thread. Each row reads as its author, tag, time, and body, in that order. The row itself takes no Tab stop: its links and its toolbar do.
- **Motion.** The fill changes over `--duration-fast` with `--ease-out`.
- **Forced colors.** The fills drop. The selected row takes a 2px `Highlight` border on its leading edge, as list selection does, and its leading padding gives up 2px for it.

## Message group

Layer: Core.

- **Anatomy.** A run of [message rows](#message-row). Consecutive messages by one author within about 5 minutes form a group: the first row shows the avatar, the author, and the time, and each later row is a continuation row with no avatar or name and `0.125rem` top padding. A different author, a longer gap, or a day divider starts a new group. A continuation row shows its time in the avatar column while it is hovered or has focus within: `--text-xs`, `--color-muted`, tabular numbers, end-aligned. That time is `aria-hidden`; a visually hidden "author, time" before the body gives a screen reader both on every row. A day divider is a list item between groups: a `--text-xs` medium `--color-muted` label, such as "Today", between two 1px `--color-border-subtle` rules, with `--space-3` above it and `--space-1` below.
- **States.** None: a group lays out message rows, which keep their own states.
- **Do.** Group by author and time only, and start a new group after a day divider, even for the same author.
- **Don't.** A group that spans two authors, or a continuation row that hides its time from a screen reader.
- **Keyboard and screen reader.** Each continuation row reads as "author, time", then its body, from its visually hidden text. A day divider reads as a list item with its label.
- **Motion.** None: the gutter time appears at once with the row's toolbar.
- **Forced colors.** No change: the rules and the text take the system colours.

## Hover toolbar

Layer: Core.

- **Anatomy.** A floating strip at the top right of a [message row](#message-row), `-0.875rem` from the row's top and `--space-2` from its end, so it overlaps the row above. It is a floating layer: `--color-surface-raised`, a transparent 1px border, `--radius-panel`, and `--shadow-dialog`, with `calc(var(--space-1) - 1px)` padding, so its buttons sit 4px inside its outer edge, and a 2px gap between them. It holds icon-only [quiet actions](#quiet-action), 24px square (`1.5rem`), in `--color-muted`, with `--radius-inline` corners, concentric with the strip (12px minus 4px): Reply in thread, Copy link, and an [overflow menu](#overflow-menu) trigger, More, for the rest. Each holds an SVG icon.
- **States.** Hidden at rest; shown while its row is hovered or has focus within, and never on a touch screen. Its buttons take the quiet action's hover, press, and focus-visible states, with the ring inset because the strip is tight.
- **Do.** Keep two or three frequent actions in the strip, Reply in thread first, and put the rest behind More.
- **Don't.** A strip as the only way to reach an action. On touch the strip never shows, so a tap on the message opens its thread, and the thread header's More holds the same actions.
- **Keyboard and screen reader.** `role="toolbar"` named "Message actions", with one Tab stop: Left and Right Arrow move between its buttons and Home and End go to the ends (a roving `tabindex`), and Tab leaves it. Focus on any button shows the strip. Each button has an `aria-label`, such as "Reply in thread". More follows the overflow menu pattern.
- **Motion.** None: the strip appears at once, so it is ready under the pointer.
- **Forced colors.** The shadow drops and the transparent border draws as the system edge, so the strip keeps its outline.
- **Touch.** At tablet width (`max-width: 800px`) the strip is hidden.

## Thread panel

Layer: Core.

- **Anatomy.** A side pane beside the message list, with a 1px `--color-border-subtle` edge at its start. A header at least 44px tall (`--control-touch`), with a `--color-border-subtle` rule below it, holds the title ("Thread") in semibold, the channel in `--text-sm` `--color-muted`, and an [overflow menu](#overflow-menu) trigger, More, at the end. The body scrolls: the root message with its facts and actions, a reply-count rule (a `--text-xs` `--color-muted` label such as "3 replies", then a `--color-border-subtle` rule to the end), and the replies as [message rows](#message-row). A [composer](#composer) sits at the bottom. The pane's start edge is a resize handle: a 6px hit area (`0.375rem`) centred on the edge, with `cursor: col-resize`. The pane is 26rem wide by default, and from 20rem to 40rem as the reader resizes it, and never so wide that the channel beside it drops below 16rem; the separator reports that limit as its maximum.
- **States.** Open or closed. The resize handle takes an `--color-accent` tint at 40% while hovered, and the tint with an inset focus ring at focus-visible.
- **Do.** Open a thread beside its channel, so the reader keeps the channel in view, and mark its root message as selected in the list.
- **Don't.** A thread in a dialog, or a second pane beside the first. One thread is open at a time.
- **Keyboard and screen reader.** The pane is a complementary landmark (`<aside>`) named by its title. The handle is a focusable separator (`role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`) named "Resize thread panel", with `aria-controls` naming the pane and `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` in rem. Left Arrow widens the pane by 1rem and Right Arrow narrows it; a drag sets the width directly. Opening a thread moves focus to the pane's heading, and closing it returns focus to the action that opened it.
- **Motion.** None: the pane opens at once, and a resize follows the pointer or the arrow keys at once.
- **Forced colors.** The pane's edge and the header rule draw in the system colour. The handle's tint drops, so its focus ring shows the focus.
- **Tablet and phone.** At `max-width: 800px` the pane takes the full width below the message list, with its edge on top, and the handle is hidden.

## Composer

Layer: Core.

- **Anatomy.** A box that holds one auto-growing `<textarea>` and an inline send button, with a one-line hint below it. The box is a field: `--color-field-bg`, a 1px `--color-field-edge` border, `--radius-panel`, and `--shadow-field`, with 5px (`0.3125rem`) padding inside its 1px border, 6px from its outer edge, and `--space-3` at the start. The textarea has no edge, fill, or ring of its own: `field-sizing: content`, at least `--control-sm` tall and at most 10rem before it scrolls, with no resize handle, in `--text-md` with line height 1.45. The send button is an icon-only primary [button](#button) at `sm`: a 28px circle with the SVG send icon. The 6px around it keeps the circle clear of the box's 12px corner; a circle is not a nested rectangle, so the concentric rule does not apply. It stays at the bottom of the box as the text grows. The hint is `--text-xs` `--color-muted`, `--space-1` below the box, and says where the message goes, such as "Saved to the board". An error, in the [field wrapper](#field-wrapper)'s error type, sits between the box and the hint.
- **States.** Rest (empty or typing), focus (the [field focus](#rules-for-every-control) on the box: `--color-accent` edge and `--shadow-field-focus`, no ring), invalid (refused: `--color-error` edge, `--shadow-field-focus-invalid` while focused, the reason as inline error text, and nothing saved), and disabled (offline: the box takes the disabled field look, the send button its own, and the hint says why). The send button keeps the primary button's own look.
- **Do.** Name the field for where the message goes, such as "Reply to desktop-claude", and say in the hint what happens after sending.
- **Don't.** A Send label beside the field, or a second field for a title. The composer is one field and one icon.
- **Keyboard and screen reader.** The textarea has a visible or visually hidden `<label>`, and `aria-describedby` names the hint. Enter sends, and Shift+Enter starts a new line. The send button has `aria-label="Send"`. A refused message keeps the text in the field, sets `aria-invalid="true"`, and names the error with `aria-errormessage`. Offline, the textarea and the button are `disabled`, and the hint gives the reason.
- **Motion.** None: as for the input, the focus and invalid edges change at once.
- **Forced colors.** As for the search field: the box's edge draws as the system field edge, and a focused composer draws a `Highlight` outline 1px inside its edge, because the inset line drops. The invalid edge relies on its error text.
- **Touch.** At tablet width (`max-width: 800px`) the textarea is at least `--control-touch` tall and the send button grows to a `--control-touch` circle, as every icon-only button does.

## Tool-call disclosure

Layer: Core.

- **Anatomy.** A `<details>`, collapsed by default, inside a message body. The `<summary>` is one quiet line: a chevron drawn with two 1.5px borders of a 5px box, turned −45° (pointing to the end) and 45° (pointing down) when open, then the summary text in `--text-sm` `--color-muted`, with its key part in `--color-text` medium weight, such as "Handoff note · **PR #31 open**". The summary has `0.125rem` `--space-1` padding, `--radius-inline` corners, and a `--space-1` negative start margin, so its text lines up with the body. The detail box sits `--space-1` below it: `--color-surface` fill, a transparent 1px border, `--radius-panel`, `--space-2` `--space-3` padding, and `--text-sm`.
- **States.** Collapsed by default, and open. The summary takes hover (a `--color-row-hover` fill and `--color-text`) and focus-visible (the focus ring).
- **Do.** Collapse tool output, handoff notes, and logs to one line that says the result, so the conversation reads first.
- **Don't.** A disclosure around the message's own answer or question. The reader must see that without opening anything.
- **Keyboard and screen reader.** A native `<details>`: the summary is a Tab stop, and Enter or Space opens and closes it, announced as expanded or collapsed.
- **Motion.** The chevron turns over `--duration-fast` with `--ease-out`; the box opens at once.
- **Forced colors.** The summary's hover fill drops, and the detail box's transparent border draws as the system edge.

## Mention

Layer: Core.

- **Anatomy.** An inline `@name` in running text: a `<span>` with `0 0.1875rem` padding, `--radius-mark` corners, the `--color-nav-current` fill, `--color-nav-current-text`, and medium weight.
- **States.** None: a mention is static text. It is not a link, because it names a profile and delivers nothing.
- **Do.** Write the name as the profile shows it, such as "@desktop-claude", with the `@` in the text.
- **Don't.** A mention that looks different for the reader, or one styled as a link.
- **Keyboard and screen reader.** Plain text that reads as "@desktop-claude"; it takes no Tab stop.
- **Motion.** None: a mention is static.
- **Forced colors.** The fill drops, so the mention reads as plain text; the `@` carries it.

## Code block

Layer: Core.

- **Anatomy.** A frame that holds an optional header and the source panel.
  - **Frame.** `--color-surface-raised`, a 1px `--color-border-subtle` border, `--radius-panel`, and `--shadow-surface`. Its padding is `0 var(--space-1) var(--space-1)` under a header, and `var(--space-1)` on every side without one.
  - **Header.** At least 40px and `--text-xs`, on the frame with no fill and no rule below. It holds the title in semibold, the language in muted text, and, at the end, Wrap lines then Copy, 4px (`--space-1`) apart.
  - **Source panel.** The `<pre>`: `--color-code`, a transparent 1px border, and `calc(var(--radius-panel) - var(--space-1))` corners (8px), so its curve is concentric with the frame's. It has `--space-4` padding, scrolls in both directions, is at most 32rem tall, and sets `--font-mono` at `--text-code` with a line height of 1.65. Line numbers are muted and right-aligned. Syntax uses the `--color-syntax-*` tokens.
  - **Compact.** The panel and the Copy button share one row, with no header, and a `--space-1` column gap. The panel fills the row's height, so it sits `--space-1` from the frame and from Copy on every side, and centres its line. Copy centres on the row.
- **Wrap lines.** Every block with a header, and every live example's source, has a Wrap lines toggle before Copy: an icon-only [quiet action](#quiet-action) (`#i-wrap`), 32×32 (`--control-md`) and 44×44 at tablet width, named "Wrap lines", with `aria-pressed` for its state; the name and title never change. It is off by default, so lines keep their shape and the panel scrolls sideways. On, the block takes `data-wrap`: each line's text breaks inside the panel (`white-space: pre-wrap`, `overflow-wrap: anywhere`, so long words and URLs break too), the line number stays on the first visual line, and Copy still copies the original lines. While on it takes `--color-code-text` and the quiet action's 6% open-menu tint; in forced colors a `Highlight` border and icon mark it, at rest and on hover. A compact block holds one line and has no toggle. The state is per block and is not saved.
- **Phone text.** Set `text-size-adjust: 100%` (and `-webkit-text-size-adjust`) on the block, and align each line's items to the baseline, so iOS Safari does not enlarge one line.
- **Copy.** Copies the code text only: no line numbers or prompts, and one line per row joined with newlines. A [quiet action](#quiet-action) at least 32×32 (`--control-md`), and 44×44 at tablet width, with an accessible name. It is `--color-muted` at rest (7.09:1 on the frame in light, 6.63:1 in dark), and `--color-code-text` on hover and while the tick shows, which the script marks with `data-copied`. Announce the result in a polite live region; in the compact variant the success message is visually hidden.
- **Copy feedback.** This applies to every copy action: the code block's Copy, a token's Copy, and Copy link. On success, the icon turns into a plain tick (`#i-tick`) for 1.5s and then turns back. A second click within the 1.5s restarts the wait. The visible label, such as Copy, and the accessible name do not change, and no "Copied" text appears. The polite live region announces "Copied." or the failure. On failure, the icon does not change and the failure shows as before: a token's Copy shows "Copy failed" in place of its icon. Under reduced motion nothing changes, because the swap has no animation.
- **States.** Rest, Wrap lines on, and focus-visible on Copy, on Wrap lines, and on the `<pre>` when it scrolls. Copy takes the quiet action states, shows the tick after a copy, and announces "Copied." or a failure.
- **Do.** Use a code block for source with no live result. When the reader should see the result too, use the variant with a live example.
- **Don't.** The same language label on every block of a page. Put useful setup context above the block instead.
- **Keyboard and screen reader.** The `<pre>` is focusable when it scrolls. With a header, Tab order is Wrap lines, then Copy, then the `<pre>`; a compact block puts the `<pre>` before Copy. The focus rings on Wrap lines, Copy, and the `<pre>` are inset, because the block clips its content. The `<pre>` ring follows the panel's 8px corners.
- **Motion.** None: the block is static, and Copy changes as a quiet action does.
- **Forced colors.** The shadow drops, and the frame's border and the panel's transparent border draw as system edges. Syntax colours take the system text colour, so code reads as plain text.

### With a live example

- **Anatomy.** One frame: a `<figure>` with a 1px `--color-border-subtle` edge, `--radius-panel`, no shadow, and its content clipped to the corners. The stage comes first and holds the live preview, centred, at least 8rem tall, with `--space-8` padding. The code block follows directly below the stage, after one `--color-border-subtle` hairline. There is no header row and no language label. An optional caption follows the frame, as a [figure](#figure) caption does.
- **Tokens.** Frame edge `--color-border-subtle` and corners `--radius-panel`. Stage `--color-bg`. Hairline `--color-border-subtle`.
- **Stage.** The stage sits on the page background, not in a well or a panel. This is a named exception to the container [depth](DESIGN.md#depth) tier: a preview shows each component on the surface it sits on in a page; see [decisions](decisions.md).
- **Source.** Inside the frame the code block has no radius, border, padding, or shadow of its own, and it spans the frame's full width, not `--measure`. It takes `--color-code`, and its panel is flush with no corners, so the source fills the frame below the hairline.
- **Copy.** Icon-only and named "Copy code", in the source's top right corner, after Wrap lines. It comes before the `<pre>` in DOM order, so the reader reaches it before the code.
- **States.** The frame has no states. Components on the stage show their own states.
- **Keyboard and screen reader.** Tab order is the stage's controls, then Wrap lines, then Copy, then the `<pre>`. Name the `<pre>` for its role, for example "Example source", when it scrolls. Focus rings on Wrap lines, Copy, and the `<pre>` are inset, because the frame clips its content.
- **Motion.** None of its own.
- **Responsive.** The frame takes its container's width. The stage stays above the source at every width. On phones the stage padding is `--space-6` by `--space-4`. Wide content scrolls inside the stage or the `<pre>`, never the page.
- **Forced colors.** The frame edge and the hairline draw in the system colour.

## Command plate

Layer: Identity.

- **Anatomy.** The normal [code block](#code-block) for a shell command, with the same frame, source well (`--color-code`), text, syntax, header, Copy action, compact layout, and focus ring in light and dark. Each line starts with a `$ ` prompt in `--color-accent`, drawn with `content: "$ " / ""` and `user-select: none`, so copied and spoken text omit it. `--color-command-bg` and `--color-command-border` remain compatibility aliases for `--color-code` and `--color-border-subtle`; the component uses the normal code block tokens.
- **States.** As for the code block.
- **Do.** Use it for a shell command the reader runs, one command per line.
- **Don't.** A `$` typed into the command. CSS draws the prompt; a typed one is copied with the command.
- **Keyboard and screen reader.** As for the code block.
- **Motion.** None: as for the code block.
- **Forced colors.** As for the code block; the prompt takes the system text colour.
- **Contrast.** Text at least 4.5:1 and the prompt at least 3:1 on `--color-code`, and the header text and Copy at least 4.5:1 on the normal raised frame, for each project hue.

## Terminal capture

Layer: Identity.

- **Anatomy.** A panel whose header holds mono tabs (one for each capture) and a Full size [quiet action](#quiet-action) at the end. The screen is the neutral `--color-terminal` plate, and a mono status-line caption sits below it on `--color-terminal-caption` with `--color-terminal-caption-text`. Full size opens the capture in a [viewer](#viewer).
- **States.** Tabs take the tab states in the capture's palette, and Full size takes the quiet action states.
- **Do.** Use it to show what a command prints, one tab per capture, with the path and branch in the status line.
- **Don't.** A capture for a screenshot of a graphical app. Use a figure.
- **Keyboard and screen reader.** Tabs follow the tabs spec. Full size opens the selected capture in a [viewer](#viewer) named after it, and focus returns to the button when the viewer closes. Without JavaScript the button is hidden. Focus rings are inset, because the panel clips its content. Without JavaScript, every capture is listed under its own heading.
- **Header.** The whole panel, header included, is the `--color-terminal` plate in both page appearances, with a 1px `--color-terminal-border` edge. It scopes its own palette so the tabs read on it: current fill `--color-project-dark` at 20% over transparent, with a `--shadow-nav-current-dark` lift, hover `--color-terminal-text` at 4%, selected text, accent, and focus `--color-project-dark`, text `--color-terminal-text`, muted text `--color-terminal-caption-text`, and dividers `--color-terminal-border`. The tab list keeps its 4px block padding, and the Full size control stays centred on the tab row.
- **ANSI output.** Coloured output reads `--color-terminal-ansi-1` to `-15` as text. Black (`--color-terminal-ansi-0`) is a background only, and a blue background reads `--color-terminal-ansi-4-bg`, which is darker than blue text so `--color-terminal-text` reads on it. Dim text reads `--color-terminal-ansi-8`. A site can still set its own palette over these.
- **Contrast.** ANSI colours 1 to 15 reach 4.5:1 on `--color-terminal`, and `--color-terminal-text` reaches 4.5:1 on `--color-terminal-ansi-4-bg`.
- **Motion.** Tabs glide as in the tabs spec; the panel has no motion of its own.
- **Forced colors.** The plate and the caption drop to the system background and text, the edge draws in the system colour, and the tabs follow the tabs rule.

## Site header

Layer: Identity.

- **Anatomy.** A static header at least 64px tall on `--color-bg` with a solid 1px `--color-text` rule below it. At the start is the project switcher: a `<details>` whose summary, a [quiet action](#quiet-action), shows the mono, semibold project name after a `~/` mark in `--color-accent` (drawn by CSS, so it is not read), then a chevron. It keeps the quiet-action tint, but it opens a menu and does not act, so it takes the 8px field corner (`--radius-field`), as a select does. Its menu is a floating layer, with the dialog's tokens, listing the shared project registry in the order it defines, as navigation rows with concentric 8px corners (`calc(var(--radius-panel) - var(--space-1))`), with the current project marked `aria-current="page"`. At the end are the site links and the appearance picker: an icon-only segmented control at `lg`. The site links are a [navigation strip](#navigation-list) of rows `--control-md` tall (32px), and `--control-touch` at tablet width. A link to a page inside the site takes `aria-current="page"` on that page, with the current-page recipe.
- **Position.** Every family site, this design system's site included, starts its header with the project switcher. It is the same on every page: never a breadcrumb or a page title, which go above the page's h1 as [breadcrumbs](#breadcrumbs), and the first breadcrumb is the way back to the site's home page. The links sit at the same x on every page, and the current link is as wide as it is on other pages (see the [horizontal strip](#navigation-list)). A header that puts its links right after the switcher, as this design system's site does, is a grid at `min-width: 801px` (`auto minmax(0, 1fr) auto`), so where the links start never depends on the page.
- **States.** The project menu is closed or open; while open, its summary keeps the quiet action's hover tint. Site links take the navigation row states.
- **Do.** Keep the same header and site links, six at most and in one order, on every page of a personal product site.
- **Don't.** The site header on an application screen. An application keeps its own navigation.
- **Phone.** At `max-width: 800px` the header is static, with `--space-2` above, below, and between its rows. The first row holds the switcher at the start and the picker at the end. Where both do not fit, as at 320px, the picker wraps to its own row at the start; the project name never truncates. With three or more links, the links take the next row, as a strip that scrolls with its fades. Where the strip clips a link, at least 16px of that link stays in view under the fade: on the narrowest phones (a strip 340px wide or less, by container query) the strip's rows take 6px (`0.375rem`) side padding. One or two links stay on the first row, beside the picker; at `max-width: 640px` they become plain text links after the switcher, 12px (`--space-3`) apart, and the current link takes `--color-accent` text in medium weight, with no fill. A documentation page hides them at that width, because its [footer](#page-type-and-helpers) carries them. A page with a [section rail](#section-rail) puts the rail's labelled trigger `--space-2` below the header.
- **Keyboard and screen reader.** The summary is named "Project: <name>". Escape closes the menu and returns focus to the summary; moving focus to an element outside it, or a press outside it, closes it. A press on a link inside keeps it open, though Safari does not focus the link.
- **Motion.** The chevron turns 180° while the menu is open, over `--duration-fast` with `--ease-out`. The menu itself opens at once.
- **Forced colors.** The rule below the header takes the system text colour, and the menu and the site links follow the navigation list rules. A current text link on a phone takes an underline instead of the system border.

## Page type and helpers

Layer: Identity.

- **Anatomy.** Type and layout helpers for identity pages: headings, steps, definitions, facts, a command list, and the footer, each below.
- **Headings.** Every page title and section heading uses `--font-ui`, semibold, with no mark before it. Documentation, CLI tool, article, and product page titles use `--text-3xl`; application titles use `--text-2xl` or smaller. On documentation, CLI tool, article, and product pages, a page-level section heading (h2) uses `--text-xl` (a product page may set it larger, up to `--text-3xl`) and has a `--color-border-subtle` rule above the section. Application and inline-visualization section headings use `--text-xl` or smaller, with no rule. A product page or tool home may use a `--text-display` title (`--text-display-sm` on phones).
- **Steps.** An ordered list in which each step hangs from a mono number in `--color-accent` on a ruled leading column, with an h3 title per step.
- **Definitions.** A definition list of terms and short meanings: medium-weight terms and muted meanings in two columns, one column on phones. Flags such as `--all` do not break.
- **Facts.** A mono definition list of short labels and values, such as a repository path. Values wrap anywhere.
- **Command list.** A table of commands (mono) and descriptions (muted), with a Copy [quiet action](#quiet-action) for each row. On phones each row becomes a two-column grid.
- **Footer.** Mono, with an attribution link at the start and project links at the end.
- **States.** None: the helpers are static type. The command list's Copy takes the quiet action states.
- **Do.** Use steps for a sequence the reader follows in order, definitions for terms with short meanings, and facts for short labels and values.
- **Don't.** Mono, or a mark such as `##`, on a heading.
- **Keyboard and screen reader.** Headings keep their outline levels. Steps are an ordered list; definitions and facts are definition lists.
- **Motion.** None: the helpers are static.
- **Forced colors.** No change: text, rules, and marks take the system colours.
