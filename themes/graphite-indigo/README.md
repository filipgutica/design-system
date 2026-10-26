# Graphite Indigo

Cool graphite surfaces, indigo primary actions, and blue links and focus. Sidebar hover is neutral; current rows use white in light mode and a restrained indigo tint in dark mode. Includes light and dark themes with VS Code Light+ and Dark+ syntax token colors.

## Try it in T3 Code

Open Settings → Appearance → Add theme → Choose files and select `graphite-indigo.t3-theme.json`. This single file includes both appearances and preserves the exact palette, including blue focus and indigo actions. Select Graphite Indigo for the light and dark appearances you want to try.

When updating an imported theme, choose **Update existing**. The Workbench navigation marker requires an app build containing that UI change; a theme file supplies only colors.

T3 Code's current theme import changes application, code-block, and terminal surfaces. It does not import syntax token rules; code highlighting continues to use T3's built-in Pierre themes. The extension's VS Code syntax colors are available in VS Code-compatible editors that load the color-theme files.

The standalone files under `themes/` can also be imported into T3 Code together. Its VS Code conversion is approximate: it derives additional application colors and uses the focus color as its accent. Use the T3 file for the exact palette.

## VS Code and Open VSX

Install the packaged `.vsix` through VS Code's Extensions: Install from VSIX command, then choose Graphite Indigo Light or Graphite Indigo Dark. The extension contains only theme data, with no executable extension code.

The extension manifest contributes both themes in the VS Code/Open VSX format. It has not been published to Open VSX. Publishing requires control of the `filipgutica` namespace and a registry token.

Syntax rules come from the installed VS Code release recorded in `SOURCE.json`. Includes are flattened, so each theme is valid standalone JSON with its own editor background, workbench colors, token colors, and semantic token colors. Attribution and the Microsoft MIT license are included.
