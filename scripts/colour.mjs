// Colour arithmetic for the contrast checks: the token build's text fallback, the Themes page, and the tests.
// The colour syntax tokens.json resolves to: #rrggbb, white, black, transparent, and
// color-mix(in srgb, A p%, B), nested. Anything else throws, so a check cannot pass on an unread colour.
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] }
const splitTop = (text) => {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1
    if (text[i] === ')') depth -= 1
    if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  return [...parts, text.slice(start).trim()]
}
/** A resolved token colour as [r, g, b, alpha], channels 0 to 255, mixed as the browser mixes it. */
export const parseColour = (value) => {
  const text = value.trim()
  if (NAMED[text]) return NAMED[text]
  const hex = text.match(/^#([\da-f]{6})$/i)?.[1]
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1)
  const mix = text.match(/^color-mix\(in srgb, (.*)\)$/)
  if (mix) {
    const [first, second] = splitTop(mix[1])
    const share = Number(first.match(/ ([\d.]+)%$/)[1]) / 100
    const a = parseColour(first.replace(/ [\d.]+%$/, ''))
    const b = parseColour(second)
    // Premultiplied, as CSS mixes a colour with transparent.
    const alpha = a[3] * share + b[3] * (1 - share)
    const channel = (i) => (alpha === 0 ? 0 : (a[i] * a[3] * share + b[i] * b[3] * (1 - share)) / alpha)
    return [channel(0), channel(1), channel(2), alpha]
  }
  throw new Error(`unsupported colour: ${value}`)
}
/** A colour composited over an opaque one. */
export const over = (top, below) => [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3])).concat(1)
const luminance = (colour) => colour.slice(0, 3)
  .map((c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4))
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
/** The WCAG contrast ratio of a colour, composited over an opaque one, against that one. */
export const ratio = (ink, below) => {
  const [hi, lo] = [luminance(over(ink, below)), luminance(below)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}
