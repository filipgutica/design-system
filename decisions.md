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
| Code blocks | Core | `text-size-adjust: 100%` on code, and prompts aligned to the line's baseline. | iOS Safari enlarged one line of wrapped code and left the `$` prompt misaligned. |

## Known gaps

- In light mode, the pressed primary button (the hue mixed 80% with `--bg`) is below 4.5:1 for every site hue. For indigo it is about 4.2:1. Rest and hover pass. The gap applies to both pressed states: while the pointer is down (`:active`), and for as long as a toggle button stays on (`aria-pressed="true"`). It is still open in `@filipgutica/ui`.
