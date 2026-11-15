import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenVsxThemeService, parseVsCodeTheme, ThemeValidationError } from '@filipgutica/design-system/open-vsx'
import { mapVsCodeTheme } from '@filipgutica/design-system/theme-mapper'

const extensionId = 'catppuccin.catppuccin-vsc'

const response = (body, init = {}) => new Response(typeof body === 'string' ? body : new Uint8Array(body).buffer, {
  status: 200,
  ...init,
})

const responseFromUrl = (url, body) => {
  const result = response(body)
  Object.defineProperty(result, 'url', { value: url })
  return result
}

const packageFixture = async ({ rootDecoy = false, unsafeEntry = false } = {}) => {
  const zip = new JSZip()
  zip.file('extension/package.json', JSON.stringify({
    publisher: 'catppuccin',
    name: 'catppuccin-vsc',
    version: '1.0.0',
    contributes: {
      themes: [
        { label: 'Latte', uiTheme: 'vs', path: './themes/latte.json' },
        { label: 'Mocha', uiTheme: 'vs-dark', path: './themes/mocha.json' },
      ],
    },
  }))
  zip.file('extension/themes/base.json', JSON.stringify({
    colors: { 'editor.foreground': '#CDD6F4' },
  }))
  zip.file('extension/themes/latte.json', JSON.stringify({
    colors: { 'editor.background': '#EFF1F5', 'editor.foreground': '#4C4F69' },
  }))
  zip.file('extension/themes/mocha.json', JSON.stringify({
    include: './base.json',
    colors: { 'editor.background': '#1E1E2E' },
  }))
  if (rootDecoy) zip.file('package.json', 'x'.repeat(1024 * 1024 + 1))
  if (unsafeEntry) zip.file('../escape.txt', 'unsafe')
  return zip.generateAsync({ type: 'uint8array' })
}

const registryFetch = async ({ packageBytes }) => {
  const checksum = createHash('sha256').update(packageBytes).digest('hex')
  return mock.fn(async (input) => {
    const url = String(input)
    if (url.includes('/api/-/search')) {
      return response(JSON.stringify({
        extensions: [{
          namespace: 'catppuccin',
          name: 'catppuccin-vsc',
          displayName: 'Catppuccin for VSCode',
          description: 'Soothing pastel theme',
          downloadCount: 12345,
        }],
      }))
    }
    if (url.endsWith(`/api/${extensionId.replace('.', '/')}`)) {
      return response(JSON.stringify({
        namespace: 'catppuccin',
        name: 'catppuccin-vsc',
        displayName: 'Catppuccin for VSCode',
        version: '1.0.0',
        files: {
          manifest: 'https://open-vsx.org/api/catppuccin/catppuccin-vsc/1.0.0/file/package.json',
          download: 'https://open-vsx.org/api/catppuccin/catppuccin-vsc/1.0.0/file/theme.vsix',
          sha256: 'https://open-vsx.org/api/catppuccin/catppuccin-vsc/1.0.0/file/theme.sha256',
        },
      }))
    }
    if (url.endsWith('package.json')) { return response(JSON.stringify({ contributes: {
      themes: [{ path: './themes/mocha.json' }] } }))
    }
    if (url.endsWith('theme.vsix')) return response(packageBytes)
    if (url.endsWith('theme.sha256')) return response(checksum)
    return response('not found', { status: 404 })
  })
}

describe('Open VSX theme service', () => {
  it('uses the most-downloaded theme catalog for a blank popular search', async () => {
    const packageBytes = await packageFixture()
    const fetchImpl = await registryFetch({ packageBytes })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.search('  ')
    assert.equal(result.status, 'success')
    assert.deepEqual(result.themes.map(({ id }) => ({ id })), [{ id: extensionId }])
    const searchUrl = String(fetchImpl.mock.calls[0]?.arguments[0])
    assert.equal(fetchImpl.mock.callCount(), 1)
    assert.ok(searchUrl.includes('category=Themes'))
    assert.ok(searchUrl.includes('sortBy=downloadCount'))
    assert.equal(searchUrl.includes('query='), false)
  })

  it('searches only the theme category and returns normalized summaries', async () => {
    const packageBytes = await packageFixture()
    const fetchImpl = await registryFetch({ packageBytes })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.search(' catppuccin ')
    assert.deepEqual(result, {
      status: 'success',
      themes: [{
        id: extensionId,
        name: 'Catppuccin for VSCode',
        publisher: 'catppuccin',
        description: 'Soothing pastel theme',
        downloadCount: 12345,
      }],
    })
    assert.ok(String(fetchImpl.mock.calls[0]?.arguments[0]).includes('category=Themes'))
  })

  it('filters obvious non-color extensions without fetching per-result metadata', async () => {
    const packageBytes = await packageFixture()
    const baseFetch = await registryFetch({ packageBytes })
    const fetchImpl = mock.fn(async (input) => {
      const url = String(input)
      if (url.includes('/api/-/search')) {
        return response(JSON.stringify({
          extensions: [
            {
              namespace: 'catppuccin',
              name: 'catppuccin-vsc',
              displayName: 'Catppuccin for VSCode',
              description: 'Soothing pastel theme',
              downloadCount: 12345,
            },
            {
              namespace: 'catppuccin',
              name: 'catppuccin-icons',
              displayName: 'Catppuccin Icons for VSCode',
              description: 'An icon theme',
              downloadCount: 9000,
            },
            {
              namespace: 'ms-vscode',
              name: 'powershell',
              displayName: 'PowerShell',
              description: 'Develop PowerShell modules and scripts',
              downloadCount: 8000,
            },
          ],
        }))
      }
      if (url.endsWith('/api/catppuccin/catppuccin-icons')) {
        return response(JSON.stringify({
          namespace: 'catppuccin',
          name: 'catppuccin-icons',
          version: '1.0.0',
          files: {
            manifest: 'https://open-vsx.org/api/catppuccin/catppuccin-icons/1.0.0/file/package.json',
            download: 'https://open-vsx.org/api/catppuccin/catppuccin-icons/1.0.0/file/icons.vsix',
            sha256: 'https://open-vsx.org/api/catppuccin/catppuccin-icons/1.0.0/file/icons.sha256',
          },
        }))
      }
      if (url.includes('/catppuccin-icons/') && url.endsWith('package.json')) { return response(JSON.stringify({ contributes: {
        iconThemes: [{ id: 'catppuccin-icons' }] } }))
      }
      return baseFetch(input)
    })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.search('catppuccin')
    assert.equal(result.status, 'success')
    assert.deepEqual(result.themes.map(({ id }) => ({ id })), [{ id: extensionId }])
    assert.equal(fetchImpl.mock.callCount(), 1)
  })

  it('validates advertised themes before downloading an imported package', async () => {
    const packageBytes = await packageFixture()
    const baseFetch = await registryFetch({ packageBytes })
    const fetchImpl = mock.fn(async (input) => {
      if (String(input).endsWith('package.json')) { return response(JSON.stringify({ contributes: {
        iconThemes: [{ id: 'icons' }] } }))
      }
      return baseFetch(input)
    })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error')
    assert.equal(result.error.code, 'unsupported-extension')
    assert.equal(fetchImpl.mock.callCount(), 2)
    assert.equal(fetchImpl.mock.calls.some(({ arguments: [url] }) => String(url).endsWith('theme.vsix')), false)
  })

  it('verifies and imports the package variant matching the requested appearance', async () => {
    const packageBytes = await packageFixture()
    const service = createOpenVsxThemeService({
      fetchImpl: await registryFetch({ packageBytes }),
    })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'success')
    assert.equal(result.theme.name, 'Mocha')
    assert.equal(result.theme.type, 'dark')
    assert.equal(result.theme.colors['editor.background'], '#1E1E2E')
    assert.equal(result.theme.colors['editor.foreground'], '#CDD6F4')
  })

  it('accepts extension files served by the Open VSX resource host', async () => {
    const packageBytes = await packageFixture()
    const baseFetch = await registryFetch({ packageBytes })
    const fetchImpl = mock.fn(async (input) => {
      const result = await baseFetch(input)
      if (String(input).includes('/file/')) {
        Object.defineProperty(result, 'url', {
          value: `https://openvsx.eclipsecontent.org/catppuccin/catppuccin-vsc/${String(input).split('/').at(-1)}`,
        })
      }
      return result
    })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'success')
    assert.equal(result.theme.name, 'Mocha')
  })

  it('rejects a package whose checksum does not match', async () => {
    const packageBytes = await packageFixture()
    const fetchImpl = await registryFetch({ packageBytes })
    fetchImpl.mock.mockImplementation(async (input) => {
      if (String(input).endsWith('theme.sha256')) return response('0'.repeat(64))
      const replacement = await registryFetch({ packageBytes })
      return replacement(input)
    })
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error')
    assert.equal(result.error.code, 'integrity-failed')
  })

  it('rejects unsafe extension identifiers without making a request', async () => {
    const fetchImpl = mock.fn()
    const service = createOpenVsxThemeService({ fetchImpl })
    const result = await service.importTheme('../private', 'light')
    assert.equal(result.status, 'error')
    assert.equal(result.error.code, 'unsupported-extension')
    assert.equal(fetchImpl.mock.callCount(), 0)
  })

  it('rejects packages containing paths outside the extension directory', async () => {
    const packageBytes = await packageFixture({ unsafeEntry: true })
    const service = createOpenVsxThemeService({
      fetchImpl: await registryFetch({ packageBytes }),
    })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error')
    assert.equal(result.error.code, 'unsupported-extension')
    assert.equal(result.error.message, 'A theme path escapes its package.')
  })

  it('does not let root entries shadow files inside the extension directory', async () => {
    const packageBytes = await packageFixture({ rootDecoy: true })
    const service = createOpenVsxThemeService({
      fetchImpl: await registryFetch({ packageBytes }),
    })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'success')
    assert.equal(result.theme.name, 'Mocha')
  })

  it('reports registry failures without exposing transport details', async () => {
    const service = createOpenVsxThemeService({
      fetchImpl: mock.fn(async () => { throw new Error('socket path and credentials'); }),
    })
    assert.deepEqual(await service.search('nord'), {
      status: 'error',
      message: 'Open VSX search is unavailable right now.',
    })
    assert.deepEqual(await service.importTheme(extensionId, 'light'), {
      status: 'error',
      error: {
        code: 'open-vsx-unavailable',
        message: 'Open VSX theme details are unavailable right now.',
      },
    })
  })

  it('rejects responses redirected away from Open VSX', async () => {
    const service = createOpenVsxThemeService({
      fetchImpl: mock.fn(async () => responseFromUrl('https://example.invalid/redirected-search', JSON.stringify({ extensions: [] }))),
    })
    assert.deepEqual(await service.search('nord'), {
      status: 'error',
      message: 'Open VSX search is unavailable right now.',
    })
  })
})

// These contracts belong to the parser, before colour mapping or application.

describe('VS Code theme files', () => {

  it('parses JSONC without changing colours or token rules', () => {
    const theme = parseVsCodeTheme({ fileName: 'forest.jsonc', source: `{
      // Comments and trailing commas are valid in VS Code themes.
      "name": "  Forest\\t Theme  ",
      "type": "dark",
      "colors": { "editor.background": "#101812", "custom.role": "unchanged", },
      "tokenColors": [{ "scope": "comment", "settings": { "foreground": "#A5B3A8" } }],
    }` })
    assert.deepEqual(theme, {
      name: 'Forest Theme', type: 'dark',
      colors: { 'editor.background': '#101812', 'custom.role': 'unchanged' },
      tokenColors: [{ scope: 'comment', settings: { foreground: '#A5B3A8' } }],
    })
  })


  it('normalises names and falls back to the file name', () => {
    for (const [name, fileName, expected] of [
      ['  A\n  Theme  ', 'ignored.json', 'A Theme'],
      ['x'.repeat(90), 'ignored.json', 'x'.repeat(80)],
      [undefined, '/themes/minimal.jsonc', 'minimal'],
      ['  ', 'C:\\themes\\Fallback.JSON', 'Fallback'],
      [undefined, '', 'Imported theme'],
      [undefined, 'x'.repeat(90) + '.json', 'x'.repeat(80)],
    ]) {
      assert.equal(parseVsCodeTheme({ source: JSON.stringify({ name, colors: {} }), fileName }).name, expected)
    }
  })


  it('rejects malformed JSONC with a typed code and useful location', () => {
    assert.throws(() => parseVsCodeTheme({ fileName: 'broken.jsonc', source: '{\n "colors": { "editor.background": "#101010", }' }), error => {
      assert.ok(error instanceof ThemeValidationError)
      assert.equal(error.code, 'malformed-json')
      assert.match(error.message, /could not be parsed.*line 2, column/i)
      return true
    })
  })


  it('requires an object, a string name when present, and a colors object', () => {
    for (const value of [null, [], 'theme', 42, {}, { name: 42, colors: {} }, { colors: [] }, { colors: null }]) {
      assert.throws(() => parseVsCodeTheme({ source: JSON.stringify(value), fileName: 'invalid.json' }), error => {
        assert.ok(error instanceof ThemeValidationError)
        assert.equal(error.code, 'invalid-shape')
        return true
      })
    }
  })
})

it('merges include colours child-first and token rules base-first across multiple levels', async () => {
  const zip = await JSZip.loadAsync(await packageFixture())
  const baseRule = { scope: 'comment', settings: { foreground: '#111111' } }
  const middleRule = { scope: 'comment', settings: { foreground: '#222222' } }
  const childRule = { scope: 'comment', settings: { foreground: '#333333' } }
  zip.file('extension/themes/base.json', JSON.stringify({
    colors: { 'editor.foreground': '#CDD6F4', 'editor.background': '#000000' }, tokenColors: [baseRule],
  }))
  zip.file('extension/themes/middle.json', JSON.stringify({ include: './base.json', colors: { 'editor.background': '#111111' }, tokenColors: [middleRule] }))
  zip.file('extension/themes/mocha.json', JSON.stringify({ include: './middle.json', colors: { 'editor.background': '#1E1E2E' }, tokenColors: [childRule] }))
  const service = createOpenVsxThemeService({ fetchImpl: await registryFetch({ packageBytes: await zip.generateAsync({ type: 'uint8array' }) }) })
  const result = await service.importTheme(extensionId, 'dark')
  assert.equal(result.status, 'success')
  assert.deepEqual(result.theme.colors, { 'editor.foreground': '#CDD6F4', 'editor.background': '#1E1E2E' })
  assert.deepEqual(result.theme.tokenColors, [baseRule, middleRule, childRule])
  // The parser's result is directly usable by the separate mapper.
  assert.equal(mapVsCodeTheme(result.theme).appearance, 'dark')
})

it('translates all manifest uiTheme values only when the resolved file has no type', async () => {
  for (const [uiTheme, fileType, expected, preference] of [
    ['vs', undefined, 'light', 'light'], ['vs-dark', undefined, 'dark', 'dark'],
    ['hc-black', undefined, 'hc', 'dark'], ['hc-light', undefined, 'hcLight', 'light'],
    ['vs-dark', 'hcLight', 'hcLight', 'light'],
  ]) {
    const zip = await JSZip.loadAsync(await packageFixture())
    const manifest = JSON.parse(await zip.file('extension/package.json').async('string'))
    manifest.contributes.themes = [{ label: '  Selected\n Theme ', uiTheme, path: './themes/selected.json' }]
    zip.file('extension/package.json', JSON.stringify(manifest))
    zip.file('extension/themes/selected.json', JSON.stringify({ type: fileType, colors: {} }))
    const service = createOpenVsxThemeService({ fetchImpl: await registryFetch({ packageBytes: await zip.generateAsync({ type: 'uint8array' }) }) })
    const result = await service.importTheme(extensionId, preference)
    assert.equal(result.status, 'success')
    assert.equal(result.theme.type, expected)
    assert.equal(result.theme.name, 'Selected Theme')
  }
})

it('rejects cyclic, escaping, and overly deep includes while accepting eight levels', async () => {
  for (const [kind, expectedStatus] of [['cycle', 'error'], ['escape', 'error'], ['depth-9', 'error'], ['depth-8', 'success']]) {
    const zip = await JSZip.loadAsync(await packageFixture())
    if (kind === 'cycle' || kind === 'escape') {
      zip.file('extension/themes/mocha.json', JSON.stringify({ include: kind === 'cycle' ? './mocha.json' : '../../outside.json', colors: {} }))
    } else {
      const depth = kind === 'depth-8' ? 8 : 9
      for (let i = 0; i < depth; i++) {
        zip.file(`extension/themes/${i === 0 ? 'mocha' : i}.json`, JSON.stringify({
          ...(i + 1 < depth ? { include: `./${i + 1}.json` } : {}), colors: {},
        }))
      }
    }
    const service = createOpenVsxThemeService({ fetchImpl: await registryFetch({ packageBytes: await zip.generateAsync({ type: 'uint8array' }) }) })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, expectedStatus, kind)
    if (result.status === 'error') assert.equal(result.error.code, 'unsupported-extension', kind)
  }
})

it('caps declared response sizes at the detail, manifest, VSIX, and checksum boundaries', async () => {
  const baseFetch = await registryFetch({ packageBytes: await packageFixture() })
  for (const [suffix, limit] of [
    ['/api/catppuccin/catppuccin-vsc', 256 * 1024], ['package.json', 256 * 1024],
    ['theme.vsix', 20 * 1024 * 1024], ['theme.sha256', 256],
  ]) {
    const fetchImpl = async input => String(input).endsWith(suffix)
      ? response('', { headers: { 'content-length': String(limit + 1) } })
      : baseFetch(input)
    const result = await createOpenVsxThemeService({ fetchImpl }).importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error', suffix)
    assert.equal(result.error.code, 'file-too-large', suffix)
  }
})

it('caps streamed search responses even when content-length is absent', async () => {
  let cancelled = false
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(300 * 1024)) },
    cancel() { cancelled = true },
  })
  const service = createOpenVsxThemeService({ fetchImpl: async () => new Response(body) })
  assert.deepEqual(await service.search('nord'), { status: 'error', message: 'Open VSX search is unavailable right now.' })
  assert.equal(cancelled, true)
})

it('aborts requests after fifteen seconds and reports the timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const fetchImpl = async (_input, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
  })
  const pending = createOpenVsxThemeService({ fetchImpl }).importTheme(extensionId, 'dark')
  t.mock.timers.tick(15_000)
  assert.deepEqual(await pending, { status: 'error', error: { code: 'open-vsx-unavailable', message: 'Open VSX took too long to respond.' } })
})

it('rejects large theme files, too many contributions, and mismatched packaged identities', async () => {
  for (const [kind, code] of [['theme-size', 'file-too-large'], ['theme-count', 'unsupported-extension'], ['identity', 'integrity-failed']]) {
    const zip = await JSZip.loadAsync(await packageFixture())
    const manifest = JSON.parse(await zip.file('extension/package.json').async('string'))
    if (kind === 'theme-size') zip.file('extension/themes/mocha.json', ' '.repeat(1024 * 1024 + 1))
    if (kind === 'theme-count') manifest.contributes.themes = Array(41).fill(manifest.contributes.themes[0])
    if (kind === 'identity') manifest.publisher = 'someone-else'
    zip.file('extension/package.json', JSON.stringify(manifest))
    const service = createOpenVsxThemeService({ fetchImpl: await registryFetch({ packageBytes: await zip.generateAsync({ type: 'uint8array' }) }) })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error', kind)
    assert.equal(result.error.code, code, kind)
  }
})

it('rejects ZIP bombs by expansion ratio, entry count, and total declared size before reading themes', async () => {
  for (const [kind, code] of [['ratio', 'unsupported-extension'], ['entries', 'unsupported-extension'], ['total-size', 'file-too-large']]) {
    const zip = await JSZip.loadAsync(await packageFixture())
    if (kind === 'ratio') zip.file('extension/bomb.txt', 'x'.repeat(100_000))
    if (kind === 'entries') for (let i = 0; i < 5000; i++) zip.file(`extension/empty-${i}`, '')
    if (kind === 'total-size') {
      zip.file('extension/large-1', 'x')
      zip.file('extension/large-2', 'x')
    }
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: kind === 'ratio' ? 'DEFLATE' : 'STORE' })
    if (kind === 'total-size') {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const end = bytes.length - 22
      let offset = view.getUint32(end + 16, true)
      while (offset < end) {
        const nameLength = view.getUint16(offset + 28, true)
        const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
        if (name.startsWith('extension/large-')) {
          view.setUint32(offset + 20, 1024 * 1024, true)
          view.setUint32(offset + 24, 60 * 1024 * 1024, true)
        }
        offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
      }
    }
    const service = createOpenVsxThemeService({ fetchImpl: await registryFetch({ packageBytes: bytes }) })
    const result = await service.importTheme(extensionId, 'dark')
    assert.equal(result.status, 'error', kind)
    assert.equal(result.error.code, code, kind)
  }
})
