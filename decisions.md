# Design decisions

Each entry records a choice this language made, the options it rejected, and why. Read it before you change a component, so a new project does not try a rejected option again. [Component specs](components.md) hold the values; this file holds the reasons.

| Decision | Layer | Chosen | Rejected, and why |
| --- | --- | --- | --- |
| Control depth | Core | Quiet soft: borderless controls that rise softly at rest and sink when pressed. A transparent 1px border stays for forced colors. | The earlier crisp, bordered look. |
| Primary button | Core | Filled with the project hue (`--accent`), with `--accent-text`. | Plain ink (black in light, white in dark) looked too severe. Graphite ink looked disabled. |
| Command plate | Identity | A dark plate tinted with the project hue (`--command-bg`). Terminal captures keep the neutral plate. | The near-black plate looked too severe. |
| Navigation current row | Core | A quiet lifted fill (`--nav-current`, `--shadow-nav-current`) with 10px corners and accent text. In-page location is a 3×14 accent pip with no fill. | A raised pill looked odd. The old 2px inset bar curved away on rounded rows and disappeared in the dark drawer. |
| Fields | Core | 10px rounded rectangles (`--radius-field`). Dark mode adds a faint 1px edge (`--field-edge`), because the dark well is about 1.01:1 against the canvas. | Pill fields, the earlier shape. Without the edge, dark fields disappeared. |
| Switch | Core | Borderless track, 44×22 with an 18px knob. The off state shows through the track fill. | A visible track border, which was not needed. |
| Segmented control | Core | One thumb glides between options: the leading edge takes 260ms and the trailing edge 300ms, with CSS `ease`, so the thumb stretches a little on the way. This was matched frame by frame to a reference. There is no motion on load, on a restored value, or on a theme change. Reduced motion makes the change instant. | The earlier 180ms ease-out looked like a jump. |
| Phone drawer trigger | Core | A soft secondary button with a three-line menu glyph. The no-JavaScript fallback keeps a chevron, because it opens in place. | A down chevron promised a dropdown, but the trigger opens a side drawer. |
| Control focus | Core | A thin ring: `1.5px solid var(--accent)`, offset 2px, with no glow, over the control's own shadow. 2px in forced colors. | A 2px ring with a 6px accent halo felt jarring. |
| Field focus | Core | The field lifts out of its well onto the control surface (`--control-thumb`, `--shadow-raise`, an accent edge at 35%), with no ring. | An accent edge with a halo, an underline, and a ring all felt too heavy. |
| Field focus fill | Core | The lifted fill keeps field text and placeholder at 4.5:1. Where it would not, the focused field keeps its resting fill (`--field-focus: var(--field)`), and the raise shadow and accent hairline mark focus. | Lifting regardless, which left field text unreadable in some themes. |
| Selected tab | Core | The navigation row's lifted fill (`--nav-current`, `--shadow-nav-current`, accent text, 10px corners), with no underline. Navigation and tabs share one selected state. | A 2px accent underline curved at rounded corners and did not match navigation. |
| Selected text | Core | Accent text on the current row and selected tab only where the accent reaches 4.5:1 over the rendered fill, on the page and on a surface; body text otherwise (`--nav-current-text`). | Accent text everywhere: the accent is validated only at 3:1, so some hues miss 4.5:1 as text on the fill. |
| Code blocks | Core | `text-size-adjust: 100%` on code, and prompts aligned to the line's baseline. | iOS Safari enlarged one line of wrapped code and left the `$` prompt misaligned. |

## Known gaps

- In light mode, the pressed primary button (the hue mixed 80% with `--bg`) is below 4.5:1 for every site hue. For indigo it is about 4.2:1. Rest and hover pass. The gap applies to both pressed states: while the pointer is down (`:active`), and for as long as a toggle button stays on (`aria-pressed="true"`). It is still open in `@filipgutica/ui`.
- Field focus is below the 3:1 that WCAG 2.2 asks of a focus indicator, by choice. The lifted fill (`--control-thumb`) measures about 1.2:1 against the resting field in light mode and 1.6:1 in dark. The 35% accent edge measures 1.6–1.7:1 against `--bg` in light and 3.0–3.3:1 in dark, across the six site hues. Forced colors still draw a 2px ring. The same gap is in `@filipgutica/ui`.
- In forced colors (high contrast), an invalid field shows the system edge, not the `--danger` edge, focused or not; the error text carries the state. A visible high-contrast invalid edge needs an error colour validated against high-contrast fills.
