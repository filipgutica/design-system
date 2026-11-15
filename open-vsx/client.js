import JSZip from 'jszip'
import { parse } from 'jsonc-parser'

import { ThemeValidationError, parseVsCodeTheme, isRecord } from './parse.js'

/** @typedef {import('jsonc-parser').ParseError} ParseError */
/** @typedef {import('./parse.js').VsCodeTheme} VsCodeTheme */
/** @typedef {import('./index.js').OpenVsxThemeSummary} OpenVsxThemeSummary */
/** @typedef {import('./index.js').OpenVsxThemeSearchResult} OpenVsxThemeSearchResult */
/** @typedef {import('./index.js').ThemeImportErrorCode} ThemeImportErrorCode */
/** @typedef {import('./index.js').ThemeImportResult} ThemeImportResult */
/** @typedef {import('./index.js').OpenVsxThemeService} OpenVsxThemeService */
/** @typedef {import('./index.js').OpenVsxThemeServiceDependencies} OpenVsxThemeServiceDependencies */
/** @typedef {'light' | 'dark'} PreferredAppearance */
/** @typedef {{ label?: unknown, uiTheme?: unknown, path?: unknown }} ThemeContribution */
/** @typedef {ReturnType<typeof createRequester>} Requester */

const OPEN_VSX_ORIGIN = 'https://open-vsx.org'
const OPEN_VSX_RESOURCE_ORIGIN = 'https://openvsx.eclipsecontent.org'
const OPEN_VSX_SEARCH_URL = `${OPEN_VSX_ORIGIN}/api/-/search`
const MAX_SEARCH_BYTES = 512 * 1024
const MAX_DETAIL_BYTES = 256 * 1024
const MAX_MANIFEST_BYTES = 256 * 1024
const MAX_THEME_BYTES = 1024 * 1024
const MAX_VSIX_BYTES = 20 * 1024 * 1024
const MAX_ZIP_ENTRIES = 5_000
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
const MAX_COMPRESSION_RATIO = 200
const MAX_THEMES_PER_EXTENSION = 40
const MAX_INCLUDE_DEPTH = 8
const REQUEST_TIMEOUT_MS = 15_000

class OpenVsxThemeError extends Error {
  /** @param {ThemeImportErrorCode} code @param {string} message */
  constructor(code, message) {
    super(message)
    this.name = 'OpenVsxThemeError'
    this.code = code
  }
}

/**
 * @param {string} source
 * @param {string} description
 * @returns {Record<string, unknown>}
 */
const parseJsonObject = (source, description) => {
  /** @type {ParseError[]} */
  const errors = []
  /** @type {unknown} */
  const value = parse(source, errors, { allowTrailingComma: true })
  if (errors.length > 0 || !isRecord(value)) {
    throw new OpenVsxThemeError(
      'unsupported-extension',
      `${description} is not valid JSON.`,
    )
  }
  return value
}

/**
 * @param {unknown} value
 * @param {{ allowResourceOrigin?: boolean; }} options
 * @returns {string | null}
 */
const trustedOpenVsxUrl = (
  value,
  { allowResourceOrigin = false } = {},
) => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const origin = url.origin.toLowerCase()
    return origin === OPEN_VSX_ORIGIN || (allowResourceOrigin && origin === OPEN_VSX_RESOURCE_ORIGIN)
      ? url.toString()
      : null
  } catch {
    return null
  }
}

/**
 * @param {string} value
 * @returns {[ publisher: string, name: string ]}
 */
const validateExtensionId = (value) => {
  const match = /^([a-z0-9][a-z0-9_-]{0,99})\.([a-z0-9][a-z0-9_-]{0,99})$/i.exec(value)
  if (!match?.[1] || !match[2]) {
    throw new OpenVsxThemeError(
      'unsupported-extension',
      'The selected Open VSX extension identifier is invalid.',
    )
  }
  return [match[1], match[2]]
}

/**
 * @param {Record<string, unknown>} manifest
 * @returns {ThemeContribution[]}
 */
const themeContributions = (manifest) => {
  const contributes = isRecord(manifest.contributes) ? manifest.contributes : null
  return Array.isArray(contributes?.themes)
    ? contributes.themes.filter(isRecord)
    : []
}

/**
 * @param {{ response: Response, limit: number, tooLargeMessage: string }} options
 * @returns {Promise<Uint8Array>}
 */
const readCappedResponse = async ({ response, limit, tooLargeMessage }) => {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > limit) {
    throw new OpenVsxThemeError('file-too-large', tooLargeMessage)
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new OpenVsxThemeError('file-too-large', tooLargeMessage)
    return bytes
  }

  const reader = response.body.getReader()
  /** @type {Uint8Array[]} */
  const chunks = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > limit) {
        await reader.cancel()
        throw new OpenVsxThemeError('file-too-large', tooLargeMessage)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/**
 * @param {typeof fetch} fetchImpl
 * @returns {(options: {url: string | URL, limit: number, failureMessage: string, tooLargeMessage: string, allowResourceOrigin?: boolean}) => Promise<Uint8Array>}
 */
const createRequester = (fetchImpl) => async ({
  url,
  limit,
  failureMessage,
  tooLargeMessage,
  allowResourceOrigin = false,
}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const requestedUrl = trustedOpenVsxUrl(String(url), { allowResourceOrigin })
    if (!requestedUrl) {
      throw new OpenVsxThemeError('open-vsx-unavailable', failureMessage)
    }
    const response = await fetchImpl(requestedUrl, {
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!trustedOpenVsxUrl(response.url || requestedUrl, { allowResourceOrigin })) {
      throw new OpenVsxThemeError('open-vsx-unavailable', failureMessage)
    }
    if (!response.ok) {
      throw new OpenVsxThemeError('open-vsx-unavailable', failureMessage)
    }
    return await readCappedResponse({ response, limit, tooLargeMessage })
  } catch (error) {
    if (error instanceof OpenVsxThemeError) throw error
    throw new OpenVsxThemeError(
      'open-vsx-unavailable',
      controller.signal.aborted ? 'Open VSX took too long to respond.' : failureMessage,
    )
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @param {unknown} value
 * @returns {OpenVsxThemeSummary | null}
 */
const searchSummary = (value) => {
  if (!isRecord(value)) return null
  const publisher = typeof value.namespace === 'string' ? value.namespace.trim() : ''
  const extensionName = typeof value.name === 'string' ? value.name.trim() : ''
  if (!publisher || !extensionName) return null
  const name = typeof value.displayName === 'string' && value.displayName.trim()
    ? value.displayName.trim()
    : extensionName
  return {
    id: `${publisher}.${extensionName}`,
    name: name.slice(0, 100),
    publisher: publisher.slice(0, 100),
    description: typeof value.description === 'string' ? value.description.slice(0, 300) : '',
    downloadCount: typeof value.downloadCount === 'number' && Number.isFinite(value.downloadCount)
      ? Math.max(0, value.downloadCount)
      : 0,
  }
}

/**
 * @param {string} path
 * @returns {void}
 */
const validateRelativePath = (path) => {
  if (
    path.length > 1_024
    || path.includes('\0')
    || path.startsWith('/')
    || /^[a-z]:/i.test(path)
  ) {
    throw new OpenVsxThemeError('unsupported-extension', 'A theme path is not safe.')
  }
}

/**
 * @param {{ path: string; initialSegments: string[]; minimumDepth: number; }} options
 * @returns {string}
 */
const resolveSafePath = ({
  path,
  initialSegments,
  minimumDepth,
}) => {
  validateRelativePath(path)
  const segments = [...initialSegments]
  for (const segment of path.replaceAll('\\', '/').split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length <= minimumDepth) {
        throw new OpenVsxThemeError('unsupported-extension', 'A theme path escapes its package.')
      }
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  return segments.join('/')
}

/**
 * @param {string} path
 * @returns {string}
 */
const normalizePackagePath = (path, relativeTo = 'extension/') => {
  const initialSegments = relativeTo.split('/').slice(0, -1)
  if (initialSegments[0] !== 'extension') initialSegments.unshift('extension')
  return resolveSafePath({ path, initialSegments, minimumDepth: 1 })
}

/**
 * @param {string} path
 * @returns {string}
 */
const normalizeArchiveEntryPath = (path) => {
  const normalized = resolveSafePath({ path, initialSegments: [], minimumDepth: 0 })
  if (!normalized) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has an invalid file name.')
  }
  return normalized
}

/**
 * @param {DataView} view
 * @returns {number}
 */
const findZipDirectoryEnd = (view) => {
  const byteLength = view.byteLength
  const minimumOffset = Math.max(0, byteLength - 65_557)
  let endOffset = byteLength - 22
  while (
    endOffset >= minimumOffset
    && (
      view.getUint32(endOffset, true) !== 0x06054b50
      || endOffset + 22 + view.getUint16(endOffset + 20, true) !== byteLength
    )
  ) endOffset -= 1
  if (endOffset < minimumOffset) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package is not a valid ZIP file.')
  }
  return endOffset
}

/**
 * @param {DataView} view
 * @returns {{ start: number; end: number; }}
 */
const zipDirectoryBounds = (view) => {
  const endOffset = findZipDirectoryEnd(view)

  const directorySize = view.getUint32(endOffset + 12, true)
  const directoryOffset = view.getUint32(endOffset + 16, true)
  const directoryEnd = directoryOffset + directorySize
  if (directoryEnd !== endOffset || directoryEnd > view.byteLength) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has an invalid ZIP directory.')
  }
  return { start: directoryOffset, end: directoryEnd }
}

/**
 * @param {{ bytes: Uint8Array; view: DataView; offset: number; directoryEnd: number; }} options
 * @returns {{ name: string; uncompressed: number; nextOffset: number; }}
 */
const readZipEntry = ({
  bytes,
  view,
  offset,
  directoryEnd,
}) => {
  if (offset + 46 > directoryEnd || view.getUint32(offset, true) !== 0x02014b50) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has an invalid ZIP directory.')
  }
  const compressed = view.getUint32(offset + 20, true)
  const uncompressed = view.getUint32(offset + 24, true)
  const nameLength = view.getUint16(offset + 28, true)
  const extraLength = view.getUint16(offset + 30, true)
  const commentLength = view.getUint16(offset + 32, true)
  const nextOffset = offset + 46 + nameLength + extraLength + commentLength
  if (nextOffset > directoryEnd || compressed === 0xffffffff || uncompressed === 0xffffffff) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has unsafe ZIP metadata.')
  }
  if (uncompressed > 0 && (compressed === 0 || uncompressed / compressed > MAX_COMPRESSION_RATIO)) {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has unsafe ZIP metadata.')
  }
  try {
    const name = new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    )
    return { name, uncompressed, nextOffset }
  } catch {
    throw new OpenVsxThemeError('unsupported-extension', 'The extension package has an invalid file name.')
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Map<string, number>}
 */
const inspectZipDirectory = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const directory = zipDirectoryBounds(view)

  /** @type {Map<string, number>} */
  const sizes = new Map()
  let totalUncompressed = 0
  let entryCount = 0
  let offset = directory.start
  while (offset < directory.end) {
    entryCount += 1
    if (entryCount > MAX_ZIP_ENTRIES) {
      throw new OpenVsxThemeError('unsupported-extension', 'The extension package has an invalid ZIP directory.')
    }
    const entry = readZipEntry({ bytes, view, offset, directoryEnd: directory.end })
    totalUncompressed += entry.uncompressed
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
      throw new OpenVsxThemeError('file-too-large', 'The extension package expands beyond the safe limit.')
    }
    sizes.set(normalizeArchiveEntryPath(entry.name), entry.uncompressed)
    offset = entry.nextOffset
  }
  return sizes
}

/**
 * @param {{ zip: JSZip; sizes: ReadonlyMap<string, number>; path: string; description: string; }} options
 * @returns {Promise<string>}
 */
const readZipText = async ({
  zip,
  sizes,
  path,
  description,
}) => {
  const size = sizes.get(path)
  if (size === undefined) {
    throw new OpenVsxThemeError('unsupported-extension', `${description} is missing.`)
  }
  if (size > MAX_THEME_BYTES) {
    throw new OpenVsxThemeError('file-too-large', `${description} is too large.`)
  }
  const file = zip.file(path)
  if (!file) throw new OpenVsxThemeError('unsupported-extension', `${description} is missing.`)
  return file.async('string')
}

/**
 * @param {{ zip: JSZip; sizes: ReadonlyMap<string, number>; path: string; ancestors?: ReadonlySet<string>; }} options
 * @returns {Promise<Record<string, unknown>>}
 */
const resolveThemeObject = async ({
  zip,
  sizes,
  path,
  ancestors = new Set(),
}) => {
  if (ancestors.size >= MAX_INCLUDE_DEPTH || ancestors.has(path)) {
    throw new OpenVsxThemeError('unsupported-extension', 'Theme includes are cyclic or too deeply nested.')
  }
  const value = parseJsonObject(
    await readZipText({ zip, sizes, path, description: `Theme file ${path}` }),
    `Theme file ${path}`,
  )
  if (typeof value.include !== 'string') return value
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(path)
  const parent = await resolveThemeObject({
    zip,
    sizes,
    path: normalizePackagePath(value.include, path),
    ancestors: nextAncestors,
  })
  return {
    ...parent,
    ...value,
    // Workbench keys overlay, but later syntax rules win within one ordered array.
    tokenColors: Array.isArray(parent.tokenColors) || Array.isArray(value.tokenColors)
      ? [...(Array.isArray(parent.tokenColors) ? parent.tokenColors : []), ...(Array.isArray(value.tokenColors) ? value.tokenColors : [])]
      : value.tokenColors ?? parent.tokenColors,
    colors: {
      ...(isRecord(parent.colors) ? parent.colors : {}),
      ...(isRecord(value.colors) ? value.colors : {}),
    },
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const contributionType = (value) => {
  if (value === 'vs') return 'light'
  if (value === 'vs-dark') return 'dark'
  if (value === 'hc-black') return 'hc'
  if (value === 'hc-light') return 'hcLight'
  return null
}

/**
 * @param {VsCodeTheme[]} themes
 * @param {PreferredAppearance} preferredAppearance
 * @returns {VsCodeTheme}
 */
const selectTheme = (
  themes,
  preferredAppearance,
) => themes.find(theme =>
  preferredAppearance === 'dark'
    ? theme.type === 'dark' || theme.type === 'hc'
    : theme.type === 'light' || theme.type === 'hcLight') ?? themes[0]

/**
 * @param {{ request: Requester; extensionId: string; }} options
 * @returns {Promise<{ extensionName: string; manifestUrl: string; packageUrl: string; checksumUrl: string; version: string; }>}
 */
const getPackageLocation = async ({
  request,
  extensionId,
}) => {
  const [publisher, extensionName] = validateExtensionId(extensionId)
  const detailBytes = await request({
    url: `${OPEN_VSX_ORIGIN}/api/${encodeURIComponent(publisher)}/${encodeURIComponent(extensionName)}`,
    limit: MAX_DETAIL_BYTES,
    failureMessage: 'Open VSX theme details are unavailable right now.',
    tooLargeMessage: 'Open VSX returned unexpectedly large theme details.',
  })
  /** @type {unknown} */
  const detail = JSON.parse(new TextDecoder().decode(detailBytes))
  if (!isRecord(detail) || !isRecord(detail.files)) {
    throw new OpenVsxThemeError('unsupported-extension', 'Open VSX returned malformed theme details.')
  }
  const resourceOrigin = { allowResourceOrigin: true }
  const manifestUrl = trustedOpenVsxUrl(detail.files.manifest, resourceOrigin)
  const packageUrl = trustedOpenVsxUrl(detail.files.download, resourceOrigin)
  const checksumUrl = trustedOpenVsxUrl(detail.files.sha256, resourceOrigin)
  const version = typeof detail.version === 'string' ? detail.version : ''
  if (!manifestUrl || !packageUrl || !checksumUrl || !version) {
    throw new OpenVsxThemeError('unsupported-extension', 'Open VSX returned malformed theme details.')
  }
  return { extensionName, manifestUrl, packageUrl, checksumUrl, version }
}

/**
 * @param {{ request: Requester; manifestUrl: string; }} options
 * @returns {Promise<void>}
 */
const validateAdvertisedThemes = async ({
  request,
  manifestUrl,
}) => {
  const manifestBytes = await request({
    url: manifestUrl,
    limit: MAX_MANIFEST_BYTES,
    failureMessage: 'That extension has no readable manifest.',
    tooLargeMessage: 'That extension manifest is too large.',
    allowResourceOrigin: true,
  })
  const manifest = parseJsonObject(
    new TextDecoder().decode(manifestBytes),
    'The extension manifest',
  )
  const themes = themeContributions(manifest)
  if (themes.length === 0 || themes.length > MAX_THEMES_PER_EXTENSION) {
    throw new OpenVsxThemeError(
      'unsupported-extension',
      'That extension does not contain a supported number of color themes.',
    )
  }
}

/**
 * @param {{ request: Requester; packageUrl: string; checksumUrl: string; }} options
 * @returns {Promise<Uint8Array>}
 */
const downloadVerifiedPackage = async ({
  request,
  packageUrl,
  checksumUrl,
}) => {
  const [packageBytes, checksumBytes] = await Promise.all([
    request({
      url: packageUrl,
      limit: MAX_VSIX_BYTES,
      failureMessage: 'That Open VSX theme could not be downloaded.',
      tooLargeMessage: 'That theme extension is too large to import safely.',
      allowResourceOrigin: true,
    }),
    request({
      url: checksumUrl,
      limit: 256,
      failureMessage: 'That Open VSX theme has no readable checksum.',
      tooLargeMessage: 'That Open VSX checksum response is invalid.',
      allowResourceOrigin: true,
    }),
  ])
  const expectedChecksum = new TextDecoder().decode(checksumBytes).trim().split(/\s+/)[0]
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(packageBytes))
  const actualChecksum = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  if (!expectedChecksum || !/^[a-f\d]{64}$/i.test(expectedChecksum)) {
    throw new OpenVsxThemeError('integrity-failed', 'That Open VSX theme has an invalid checksum.')
  }
  if (expectedChecksum.toLowerCase() !== actualChecksum) {
    throw new OpenVsxThemeError('integrity-failed', 'That Open VSX theme failed its integrity check.')
  }
  return packageBytes
}

/**
 * @param {Uint8Array} packageBytes
 * @returns {Promise<{ zip: JSZip; sizes: ReadonlyMap<string, number>; }>}
 */
const openPackage = async (packageBytes) => {
  const sizes = inspectZipDirectory(packageBytes)
  try {
    return { zip: await JSZip.loadAsync(packageBytes), sizes }
  } catch {
    throw new OpenVsxThemeError('unsupported-extension', 'That extension package could not be opened.')
  }
}

/**
 * @param {{ zip: JSZip; sizes: ReadonlyMap<string, number>; extensionId: string; version: string; }} options
 * @returns {Promise<Record<string, unknown>>}
 */
const readMatchingManifest = async ({
  zip,
  sizes,
  extensionId,
  version,
}) => {
  const manifest = parseJsonObject(
    await readZipText({
      zip,
      sizes,
      path: 'extension/package.json',
      description: 'The packaged extension manifest',
    }),
    'The packaged extension manifest',
  )
  const packagedId = typeof manifest.publisher === 'string' && typeof manifest.name === 'string'
    ? `${manifest.publisher}.${manifest.name}`
    : ''
  if (packagedId.toLowerCase() !== extensionId.toLowerCase() || manifest.version !== version) {
    throw new OpenVsxThemeError(
      'integrity-failed',
      'The downloaded package does not match the selected Open VSX theme.',
    )
  }
  return manifest
}

/**
 * @param {{ zip: JSZip; sizes: ReadonlyMap<string, number>; manifest: Record<string, unknown>; fallbackName: string; }} options
 * @returns {Promise<VsCodeTheme[]>}
 */
const parseContributedThemes = async ({
  zip,
  sizes,
  manifest,
  fallbackName,
}) => {
  const contributions = themeContributions(manifest)
  if (contributions.length === 0 || contributions.length > MAX_THEMES_PER_EXTENSION) {
    throw new OpenVsxThemeError('unsupported-extension', 'That extension has no compatible color themes.')
  }

  /** @type {VsCodeTheme[]} */
  const themes = []
  for (const contribution of contributions) {
    if (typeof contribution.path !== 'string') {
      throw new OpenVsxThemeError('unsupported-extension', 'A contributed theme has no valid path.')
    }
    const path = normalizePackagePath(contribution.path)
    const value = await resolveThemeObject({ zip, sizes, path })
    const type = contributionType(contribution.uiTheme)
    const label = typeof contribution.label === 'string' && contribution.label.trim()
      ? contribution.label.trim()
      : fallbackName
    themes.push(parseVsCodeTheme({
      source: JSON.stringify({ ...value, name: label, ...(value.type === undefined && type ? { type } : {}) }),
      fileName: path,
    }))
  }
  return themes
}

/**
 * @param {OpenVsxThemeSummary} options
 * @returns {boolean}
 */
const isLikelyColorTheme = ({
  description,
  name,
}) => {
  const summary = `${name} ${description}`
  return /\b(?:color\s+scheme|theme)\b/i.test(summary)
    && !/\b(?:file\s+icons?|product\s+icons?|icon\s+theme|icons?)\b/i.test(summary)
}

/**
 * @param {OpenVsxThemeServiceDependencies} options
 * @returns {OpenVsxThemeService}
 */
export const createOpenVsxThemeService = ({
  fetchImpl = fetch,
} = {}) => {
  const request = createRequester(fetchImpl)

  /**
   * @param {string} query
   * @returns {Promise<OpenVsxThemeSearchResult>}
   */
  const search = async (query) => {
    const searchText = query.trim()
    if (searchText.length > 100) {
      return { status: 'error', message: 'Search terms must be 100 characters or fewer.' }
    }
    try {
      const url = new URL(OPEN_VSX_SEARCH_URL)
      if (searchText) url.searchParams.set('query', searchText)
      url.searchParams.set('category', 'Themes')
      url.searchParams.set('sortBy', 'downloadCount')
      url.searchParams.set('sortOrder', 'desc')
      url.searchParams.set('size', '12')
      const bytes = await request({
        url,
        limit: MAX_SEARCH_BYTES,
        failureMessage: 'Open VSX search is unavailable right now.',
        tooLargeMessage: 'Open VSX returned an unexpectedly large search response.',
      })
      /** @type {unknown} */
      const payload = JSON.parse(new TextDecoder().decode(bytes))
      if (!isRecord(payload) || !Array.isArray(payload.extensions)) throw new Error('invalid response')
      const candidates = payload.extensions.flatMap(candidate => {
        const summary = searchSummary(candidate)
        return summary && isLikelyColorTheme(summary) ? [summary] : []
      }).slice(0, 12)
      return { status: 'success', themes: candidates }
    } catch {
      return { status: 'error', message: 'Open VSX search is unavailable right now.' }
    }
  }

  /**
   * @param {string} extensionId
   * @param {PreferredAppearance} preferredAppearance
   * @returns {Promise<ThemeImportResult>}
   */
  const importTheme = async (
    extensionId,
    preferredAppearance,
  ) => {
    try {
      const location = await getPackageLocation({ request, extensionId })
      await validateAdvertisedThemes({ request, manifestUrl: location.manifestUrl })
      const packageBytes = await downloadVerifiedPackage({ request, ...location })
      const { zip, sizes } = await openPackage(packageBytes)
      const manifest = await readMatchingManifest({
        zip,
        sizes,
        extensionId,
        version: location.version,
      })
      const themes = await parseContributedThemes({
        zip,
        sizes,
        manifest,
        fallbackName: location.extensionName,
      })
      return { status: 'success', theme: selectTheme(themes, preferredAppearance) }
    } catch (error) {
      if (error instanceof ThemeValidationError || error instanceof OpenVsxThemeError) {
        return { status: 'error', error: { code: error.code, message: error.message } }
      }
      return {
        status: 'error',
        error: {
          code: 'open-vsx-unavailable',
          message: 'Could not import that Open VSX theme.',
        },
      }
    }
  }

  return { search, importTheme }
}
