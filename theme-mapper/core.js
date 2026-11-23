// Generated from tokens/core.json by scripts/build-tokens.mjs. Do not edit.
/** The core tokens: every theme's base. @type {import('./engine.js').TokenSource} */
export const core = {
  "groups": [
    {
      "identity": true,
      "tokens": {
        "color-project": null,
        "color-project-dark": null,
        "font-ui": "\"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", system-ui, sans-serif",
        "font-mono": "\"IBM Plex Mono\", ui-monospace, \"SF Mono\", SFMono-Regular, Menlo, Consolas, monospace"
      }
    },
    {
      "tokens": {
        "color-bg": [
          "#f4f5f6",
          "#0d1012"
        ],
        "color-surface": [
          "#e9ebed",
          "#13171a"
        ],
        "color-surface-raised": [
          "#fbfbfc",
          "#181d21"
        ],
        "color-surface-muted": [
          "#e2e5e8",
          "#20262b"
        ],
        "color-well": [
          "{color-surface-muted}",
          "color-mix(in srgb, {color-bg} 87.5%, black)"
        ],
        "color-field-bg": [
          "{color-surface-raised}",
          "{color-well}"
        ],
        "color-field-edge": "{color-border-subtle}",
        "shadow-field": [
          "none",
          "{shadow-sink}"
        ],
        "color-control-thumb": [
          "{color-surface-raised}",
          "color-mix(in srgb, {color-surface-raised} 88%, white)"
        ],
        "color-nav-current": [
          "color-mix(in srgb, {color-accent} 14%, {color-surface-raised})",
          "color-mix(in srgb, {color-accent} 20%, transparent)"
        ],
        "color-nav-current-text": "{color-accent}",
        "color-segmented-current-text": "{color-accent}",
        "color-row-hover": [
          "#e2e5e8",
          "#20262b"
        ],
        "color-row-selected": "{color-surface-raised}",
        "color-border-subtle": [
          "#d3d8dd",
          "#262d33"
        ],
        "color-border": [
          "#6d747b",
          "#78818a"
        ],
        "color-text": [
          "#101315",
          "#e6e9eb"
        ],
        "color-muted": [
          "#50575e",
          "#9aa3ab"
        ],
        "color-overlay": [
          "rgb(0 0 0 / 42%)",
          "rgb(0 0 0 / 62%)"
        ]
      }
    },
    {
      "tokens": {
        "color-accent": "{color-project}",
        "color-accent-text": "{color-bg}",
        "color-accent-hover": "{color-text}",
        "color-button-hover": "color-mix(in srgb, {color-accent} 85%, {color-text})",
        "color-link": [
          "#0b5f7c",
          "#67c1df"
        ],
        "color-focus": "{color-accent}",
        "focus-width": "2px",
        "focus-offset": "3px"
      }
    },
    {
      "tokens": {
        "color-success": [
          "#157249",
          "#4cc38a"
        ],
        "color-warning": [
          "#86532e",
          "#e2a54b"
        ],
        "color-error": [
          "#bd342b",
          "#f0776c"
        ],
        "color-info": [
          "#175cd3",
          "#84adff"
        ],
        "color-success-surface": [
          "#d9e5e1",
          "#172d25"
        ],
        "color-warning-surface": [
          "#e7e2de",
          "#2f281b"
        ],
        "color-error-surface": [
          "#efe4e4",
          "#312020"
        ],
        "color-info-surface": [
          "#d9e3f2",
          "#202938"
        ],
        "color-status-ink": [
          "black",
          "{color-text}"
        ]
      }
    },
    {
      "tokens": {
        "color-command-bg": "{color-code}",
        "color-command-border": "{color-border-subtle}",
        "color-terminal": "#0a0c0e",
        "color-terminal-text": "#e6e9eb",
        "color-terminal-border": "#2a3036",
        "color-terminal-caption": "#13171a",
        "color-terminal-caption-text": "#c9d0d6",
        "shadow-nav-current-dark": "0 1px 2px rgb(0 0 0 / 25%)",
        "color-terminal-ansi-0": "#2b2b31",
        "color-terminal-ansi-1": "#f0776c",
        "color-terminal-ansi-2": "#4cc38a",
        "color-terminal-ansi-3": "#e2a54b",
        "color-terminal-ansi-4": "#7d97ff",
        "color-terminal-ansi-5": "#c792ea",
        "color-terminal-ansi-6": "#5fd3d9",
        "color-terminal-ansi-7": "#c8c8d0",
        "color-terminal-ansi-8": "#a0a0ab",
        "color-terminal-ansi-9": "#ff8f85",
        "color-terminal-ansi-10": "#6fd3a0",
        "color-terminal-ansi-11": "#e8b56a",
        "color-terminal-ansi-12": "#7d97ff",
        "color-terminal-ansi-13": "#d9a8f0",
        "color-terminal-ansi-14": "#8ee3e8",
        "color-terminal-ansi-15": "#ffffff",
        "color-terminal-ansi-4-bg": "#3354c4"
      }
    },
    {
      "tokens": {
        "color-code": "{color-surface}",
        "color-code-text": "{color-text}",
        "color-syntax-keyword": [
          "#715b42",
          "#d8c2a5"
        ],
        "color-syntax-string": [
          "#346347",
          "#a8bd9c"
        ],
        "color-syntax-number": [
          "#86532e",
          "#d5b98c"
        ],
        "color-syntax-comment": [
          "#626772",
          "#a0a6b1"
        ],
        "color-syntax-function": "{color-syntax-keyword}",
        "color-syntax-type": "{color-syntax-number}",
        "color-syntax-variable": "{color-code-text}",
        "color-syntax-operator": "{color-muted}",
        "color-syntax-punctuation": "{color-muted}",
        "color-syntax-tag": "{color-syntax-keyword}",
        "color-syntax-attribute": "{color-syntax-number}"
      }
    },
    {
      "tokens": {
        "text-xs": "0.75rem",
        "text-sm": "0.8125rem",
        "text-md": "0.875rem",
        "text-lg": "1rem",
        "text-xl": "1.25rem",
        "text-2xl": "1.5rem",
        "text-3xl": "2.75rem",
        "text-reading": "1rem",
        "text-display": "3.5rem",
        "text-display-sm": "2.125rem",
        "leading-tight": "1.25",
        "leading": "1.6",
        "weight-regular": "400",
        "weight-medium": "500",
        "weight-semibold": "600",
        "tracking-tight": "-0.03em",
        "text-code": "0.84375rem"
      }
    },
    {
      "tokens": {
        "space-1": "0.25rem",
        "space-2": "0.5rem",
        "space-3": "0.75rem",
        "space-4": "1rem",
        "space-5": "1.25rem",
        "space-6": "1.5rem",
        "space-8": "2rem",
        "space-12": "3rem",
        "space-16": "4rem",
        "space-20": "5rem",
        "space-24": "6rem"
      }
    },
    {
      "tokens": {
        "control-sm": "2rem",
        "control-md": "2.25rem",
        "control-lg": "2.75rem",
        "row": "2.25rem",
        "measure": "68ch",
        "page-max": "960px",
        "page-wide": "1120px",
        "sidebar": "224px"
      }
    },
    {
      "tokens": {
        "radius-inline": "6px",
        "radius-control": "10px",
        "radius-panel": "16px",
        "radius-field": "10px",
        "radius-pill": "999px"
      }
    },
    {
      "tokens": {
        "shadow-raise": [
          "0 1px 2px rgb(16 24 40 / 12%), 0 0 0 1px rgb(16 24 40 / 6%)",
          "inset 0 1px 0 rgb(255 255 255 / 7%), 0 1px 2px rgb(0 0 0 / 45%)"
        ],
        "shadow-surface": [
          "0 1px 2px rgb(16 24 40 / 6%), 0 0 0 1px rgb(16 24 40 / 6%)",
          "0 0 0 1px rgb(255 255 255 / 6%)"
        ],
        "shadow-sink": [
          "inset 1.2px 1.2px 3.6px rgb(130 142 158 / 35%), inset -1.2px -1.2px 3.6px rgb(255 255 255 / 80%)",
          "inset 1.2px 1.2px 3.6px rgb(0 0 0 / 55%), inset -1.2px -1.2px 3.6px rgb(255 255 255 / 5%)"
        ],
        "shadow-dialog": [
          "0 8px 24px rgb(16 16 24 / 12%), 0 0 0 1px {color-border-subtle}",
          "0 8px 24px rgb(0 0 0 / 45%), 0 0 0 1px {color-border-subtle}"
        ],
        "shadow-nav-current": [
          "0 1px 3px rgb(130 142 158 / 40%)",
          "{shadow-nav-current-dark}"
        ],
        "shadow-field-focus": "inset 0 0 0 2px color-mix(in srgb, {color-accent} 18%, transparent)",
        "shadow-field-focus-invalid": "inset 0 0 0 2px color-mix(in srgb, {color-error} 18%, transparent)"
      }
    },
    {
      "tokens": {
        "duration-fast": "120ms",
        "duration": "180ms",
        "ease-out": "cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  ]
}
