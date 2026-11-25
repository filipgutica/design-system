// The CSS that the token build and the theme builder share: tokens as custom properties, the dark overrides, the
// subtree blocks, and a theme's CSS. Not a package entry: the token build imports it, and so does theme-builder.js.
import { DARK, LIGHT, flatTokens, reference, valueFor } from './engine.js'

/** @typedef {import('./engine.js').TokenSource} TokenSource */
/** @typedef {[string, string][]} Declarations */
/** @typedef {(name: string, mode: number) => string} Resolve */

/**
 * @param {string} indent
 * @param {Declarations} declarations
 */
export const block = (indent, declarations) => declarations.map(([name, value]) => `${indent}${name}: ${value};`)

/**
 * Dark blocks list only what differs from light, compared after references resolve.
 * @param {string[]} names
 * @param {Resolve} resolve
 * @returns {Declarations}
 */
export const darkOverrides = (names, resolve) => names
  .map((name) => [name, resolve(name, LIGHT), resolve(name, DARK)])
  .filter(([, light, dark]) => light !== dark)
  .map(([name, , dark]) => [name, dark])

/**
 * A token's value in one mode, with each reference written as var().
 * @param {TokenSource} data
 * @returns {Resolve}
 */
export const standaloneResolver = (data) => {
  const tokens = flatTokens(data)
  return (name, mode) => valueFor(tokens, name, mode).replace(reference, (_, target) => `var(--${target})`)
}

/** @param {TokenSource} data */
export const standaloneNames = (data) => Object.keys(flatTokens(data))

// Subtree themes: data-theme="dark" or "light" on any element below <html>, and a .dark class on <html> or
// below it, theme that element's subtree. A custom property resolves on the element that declares it, so a
// subtree block declares every token whose value differs between the modes and every token that refers to
// one, directly or through others; tokens that are the same in both modes inherit. Each selector carries a
// :root, so it outranks a theme's or a page's bare :root inputs, as the root dark rules do. On an element with
// both, data-theme="light" wins over .dark; :not(:where()) keeps that exclusion from adding specificity.
/** @type {{ dark: string[], light: string[] }} */
const SUBTREE = {
  dark: [':root.dark:not(:where([data-theme="light"]))', ':root [data-theme="dark"]', ':root .dark:not(:where([data-theme="light"]))'],
  light: [':root [data-theme="light"]'],
}

/** @param {TokenSource} data */
export const subtreeNames = (data) => {
  const tokens = flatTokens(data)
  /** @type {Map<string, boolean>} */
  const memo = new Map()
  /**
   * @param {string} name
   * @returns {boolean}
   */
  const followsMode = (name) => {
    if (!memo.has(name)) {
      memo.set(name, false)
      const [light, dark] = [LIGHT, DARK].map((mode) => valueFor(tokens, name, mode))
      memo.set(name, light !== dark || [...`${light} ${dark}`.matchAll(reference)].some(([, target]) => followsMode(target)))
    }
    return memo.get(name) ?? false
  }
  return Object.keys(tokens).filter(followsMode)
}

/**
 * @param {{ dark: Declarations, light: Declarations }} blocks
 * @param {{ scheme?: boolean }} [options]
 */
export const subtreeBlocks = (blocks, { scheme = false } = {}) => /** @type {const} */ (['dark', 'light'])
  .filter((mode) => blocks[mode].length > 0)
  .flatMap((mode) => [
    '',
    `${SUBTREE[mode].join(', ')} {`,
    ...(scheme ? [`  color-scheme: ${mode};`] : []),
    ...block('  ', blocks[mode]),
    '}',
  ])

/**
 * What one theme changes from tokens.css, to load after it on :root: its identity inputs, then every other
 * token whose light value differs. In tokens.css's cascade layer, tokens.css's dark rules outrank the theme's
 * bare :root; in a later layer, the theme's :root outranks them. So the theme's dark blocks, with the same
 * selectors, set each token whose dark value would come out wrong in either placement. A hue-only theme needs
 * none: tokens.css's dark blocks already switch the accent to --color-project-dark. Its subtree blocks, after
 * those, set each token whose value in that mode differs from what tokens.css's subtree blocks declare, such as
 * the neutrals, and, because the dark one also matches :root.dark, each token the theme's :root would get wrong
 * there.
 * @param {{ name: string, data: TokenSource, source: string }} theme `source` names the theme file in the first comment line.
 * @param {TokenSource} defaultData The default theme's tokens, which tokens.css carries.
 */
export const renderThemeCss = ({ name, data, source }, defaultData) => {
  const resolve = standaloneResolver(data)
  const resolveDefault = standaloneResolver(defaultData)
  const names = standaloneNames(data)
  const identity = data.groups.filter(({ identity: isIdentity }) => isIdentity).flatMap(({ tokens }) => Object.keys(tokens))
  const root = [...identity, ...names.filter((token) => !identity.includes(token) && resolve(token, LIGHT) !== resolveDefault(token, LIGHT))]
  const rootLight = new Map(root.map((token) => [token, resolve(token, LIGHT)]))
  const defaultDark = new Map(darkOverrides(names, resolveDefault))
  /**
   * The token's value on a dark :root without the theme's dark blocks: in tokens.css's layer, then in a later one.
   * @param {string} token
   */
  const seenInDark = (token) => [
    defaultDark.get(token) ?? rootLight.get(token) ?? resolveDefault(token, LIGHT),
    rootLight.get(token) ?? defaultDark.get(token) ?? resolveDefault(token, LIGHT),
  ]
  /** @type {Declarations} */
  const dark = names.filter((token) => seenInDark(token).some((seen) => seen !== resolve(token, DARK))).map((token) => [`--${token}`, resolve(token, DARK)])
  const defaultSubtree = new Set(subtreeNames(defaultData))
  const subtree = new Set([...defaultSubtree, ...subtreeNames(data)])
  /**
   * @param {number} mode
   * @returns {Declarations}
   */
  const subtreeIn = (mode) => names
    .filter((token) => subtree.has(token) && !(defaultSubtree.has(token) && resolve(token, mode) === resolveDefault(token, mode)
      && (mode === LIGHT || (rootLight.get(token) ?? resolve(token, DARK)) === resolve(token, DARK))))
    .map((token) => [`--${token}`, resolve(token, mode)])
  /** @param {string} text */
  const commentSafe = (text) => text.replaceAll('*/', '*\\/')
  return [
    `/* Generated from ${commentSafe(source)} by the theme builder in @filipgutica/design-system. Do not edit.`,
    ` * The ${commentSafe(name)} theme for tokens.css. Load after tokens.css, in its cascade layer or a later one, on :root`,
    ' * only: the tokens that follow the theme resolve on :root, so a theme scoped to an element below it changes',
    " * its inputs there, but the accent, focus ring, and selection keep the default theme's colours. */",
    '',
    ':root {',
    ...block('  ', root.map((token) => [`--${token}`, resolve(token, LIGHT)])),
    '}',
    ...(dark.length === 0 ? [] : [
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      ...block('    ', dark),
      '  }',
      '}',
      '',
      ':root[data-theme="dark"] {',
      ...block('  ', dark),
      '}',
    ]),
    ...subtreeBlocks({ dark: subtreeIn(DARK), light: subtreeIn(LIGHT) }),
    '',
  ].join('\n')
}
