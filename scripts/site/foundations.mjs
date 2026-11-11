// Foundations: every token with its light and dark value, role, and former name. Values come from
// dist/tokens.json; group titles, notes, and roles from the token source; former names from the
// rename table in decisions.md. Find filters the token rows as well as the rail.
import { esc, inlineCode, stackedTablesCss } from './shell.mjs'

// Page order, and the rail group each token group sits under, by the source group's id.
const RAIL = [
  { id: 'start', label: 'Start', groups: ['identity-inputs'] },
  { id: 'color', label: 'Color', groups: ['surfaces', 'accent', 'status', 'code'] },
  { id: 'layout', label: 'Type and layout', groups: ['type', 'space', 'size', 'shape'] },
  { id: 'depth', label: 'Depth and motion', groups: ['elevation', 'motion'] },
  { id: 'identity', label: 'Identity layer', groups: ['terminal-plates'] },
]

/**
 * The page's token groups in page order: the source groups that tokens.json carries. Throws when a
 * group is missing from RAIL, or when RAIL and tokens.json disagree on the tokens, so a new group
 * cannot drop off the page.
 */
export const foundationGroups = ({ source, values }) => {
  const standalone = source.groups.filter(({ standalone }) => standalone !== false)
  const placed = RAIL.flatMap(({ groups }) => groups)
  const unplaced = standalone.map(({ id }) => id).filter((id) => !placed.includes(id))
  if (unplaced.length) throw new Error(`Foundations: no rail group for ${unplaced.join(', ')}`)
  const groups = placed.map((id) => standalone.find((group) => group.id === id))
  const names = groups.flatMap(({ tokens }) => Object.keys(tokens))
  const missing = Object.keys(values.light).filter((name) => !names.includes(name))
  if (missing.length || names.length !== Object.keys(values.light).length) throw new Error(`Foundations: tokens.json and the source groups disagree (${missing.join(', ')})`)
  return groups
}

// A specimen of the value: a swatch, a shadow tile, a corner, a bar, or type set in the token. Both
// columns render on literal surfaces, whatever the page's own appearance.
const specimen = ({ name, value, plate }) => {
  const v = esc(value)
  if (name.startsWith('color-')) return `<i class="chip" style="background:${v}" aria-hidden="true"></i>`
  if (name.startsWith('shadow-')) return `<i class="tile" style="--plate:${esc(plate)};box-shadow:${v}" aria-hidden="true"></i>`
  if (name.startsWith('radius-')) return `<i class="corner" style="border-top-left-radius:min(${v}, 24px)" aria-hidden="true"></i>`
  if (name.startsWith('space-')) return `<i class="bar" style="width:${v}" aria-hidden="true"></i>`
  if (/^(control-|row$)/.test(name)) return `<i class="height" style="height:${v}" aria-hidden="true"></i>`
  if (name.startsWith('font-')) return `<span class="sample" style="font-family:${v}" aria-hidden="true">Aa</span>`
  if (name.startsWith('text-')) return `<span class="sample" style="font-size:${v}" aria-hidden="true">Aa</span>`
  if (name.startsWith('weight-')) return `<span class="sample" style="font-weight:${v}" aria-hidden="true">Aa</span>`
  return ''
}

// A font stack lists one family per span, so lines break between families and never inside one.
const valueText = (name, value) => (name.startsWith('font-')
  ? value.split(',').map((family, i, all) => `<span class="family">${esc(family.trim())}${i < all.length - 1 ? ',' : ''}</span>`).join(' ')
  : esc(value))

// A name breaks only after a hyphen, so a long name wraps inside its column.
const breakableName = (name) => `--${name.replace(/-/g, '-<wbr>')}`

// A font stack's Find terms are its family names only, so "link" does not match BlinkMacSystemFont.
const valueTerms = (name, value) => (name.startsWith('font-')
  ? value.split(',').map((family) => family.trim().replace(/"/g, '')).filter((family) => /\s|^[A-Z]/.test(family)).join(' ')
  : value)

/** Find terms for a token row: its name, former name, group, role, and values. The rail uses the same terms. */
export const tokenTerms = ({ name, group, values, formerly }) => [
  `--${name}`, formerly.get(name) ?? '', group.title, group.roles[name].replace(/`/g, ''),
  valueTerms(name, values.light[name]), valueTerms(name, values.dark[name]),
].join(' ').toLowerCase().replace(/\s+/g, ' ').trim()

/** Formerly: the rename table (name before the 2.0.0 rename → name after) inverted, without leading dashes on the key. */
export const formerNames = (renames) => new Map([...renames].map(([from, to]) => [to.slice(2), from]))

export const foundationsPage = ({ source, values, renames, version, packageName }) => {
  const groups = foundationGroups({ source, values })
  const formerly = formerNames(renames)
  const total = groups.reduce((n, { tokens }) => n + Object.keys(tokens).length, 0)
  const plate = { light: values.light['color-surface-raised'], dark: values.dark['color-surface-raised'] }

  const cell = (name, mode) => `<span class="value">${specimen({ name, value: values[mode][name], plate: plate[mode] })}<code>${valueText(name, values[mode][name])}</code></span>`
  const row = (name, group) => {
    const was = formerly.get(name)
    return `<tr data-terms="${esc(tokenTerms({ name, group, values, formerly }))}">
        <th scope="row"><div class="token"><code class="name">${breakableName(name)}</code><button class="quiet-action copy" type="button" data-copy-token="var(--${name})" aria-label="Copy var(--${name})" hidden><svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg><span class="copy-result" hidden></span></button>${was ? `<span class="was">Formerly <code>${was}</code></span>` : ''}</div></th>
        <td data-label="Light"><div>${cell(name, 'light')}</div></td>
        <td data-label="Dark"><div>${values.light[name] === values.dark[name] ? '<span class="same">Same as light</span>' : cell(name, 'dark')}</div></td>
        <td data-label="Role"><div>${inlineCode(group.roles[name])}</div></td>
      </tr>`
  }
  const sections = groups.map((group) => `  <section class="token-group" id="${group.id}" aria-labelledby="${group.id}-title" data-group>
    <header class="layer-head"><h2 id="${group.id}-title">${esc(group.title)}</h2>${group.identity ? '<span class="badge">Identity</span>' : ''}</header>
    <p class="group-note">${inlineCode(group.note)}</p>
    <table class="tokens stack" aria-labelledby="${group.id}-title">
      <colgroup><col class="c-token"><col class="c-value"><col class="c-value"><col></colgroup>
      <thead><tr><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th><th scope="col">Role</th></tr></thead>
      <tbody>
      ${Object.keys(group.tokens).map((name) => row(name, group)).join('\n      ')}
      </tbody>
    </table>
  </section>`).join('\n\n')

  const main = `  <section class="intro" aria-labelledby="title">
    <h1 id="title">Foundations</h1>
    <p>Every token in <a href="tokens.css"><code>tokens.css</code></a>: its light and dark value, its role, and its name before the 2.0.0 token rename. The ${total} tokens come from <code>tokens.json</code> in <code>${esc(packageName)}</code> ${esc(version)}, so this page always matches the package.</p>
    <p>A project sets only the identity inputs. Every other token is core and stays as it is.</p>
  </section>

  <div class="find-summary" id="find-summary" hidden><p></p><button class="btn text" type="button" id="find-summary-clear">Clear</button></div>

${sections}`

  const rail = {
    label: 'Foundations',
    noun: 'a token',
    groups: RAIL.map(({ id, label, groups: ids }) => ({
      id,
      label,
      links: ids.map((groupId) => groups.find((group) => group.id === groupId)).map((group) => ({
        href: `#${group.id}`,
        text: group.title,
        terms: Object.keys(group.tokens).map((name) => tokenTerms({ name, group, values, formerly })).join(' '),
      })),
    })),
  }

  return { title: 'Foundations · Design system', rail, main, css: FOUNDATIONS_CSS, js: FOUNDATIONS_JS, total }
}

// Below this width the four columns cannot hold a font family or a long name, so each row becomes a record.
const STACK_BELOW = '1100px'

const FOUNDATIONS_CSS = `
  .token-group { display: grid; gap: var(--space-2); }
  .token-group .layer-head { grid-auto-flow: column; justify-content: start; align-items: center; gap: var(--space-3); }
  .group-note { max-width: var(--measure); margin-bottom: var(--space-2); }
  .tokens { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: var(--text-sm); }
  .tokens .c-token { width: 26%; }
  .tokens .c-value { width: 21%; }
  .tokens th, .tokens td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border-subtle); text-align: left; vertical-align: top; }
  .tokens :is(th, td):first-child { padding-inline-start: 0; }
  .tokens thead th { color: var(--color-muted); font-size: var(--text-xs); font-weight: var(--weight-medium); white-space: nowrap; }
  .tokens tbody th { font-weight: var(--weight-regular); }
  .tokens code { font-size: var(--text-xs); }
  /* The name and its former name stack on the cell's first lines, level with the values. Copy sits right
     after the name, centred on its line. Its box, and so its tint and focus ring, fit that line, so they
     never draw over the former name; a transparent ::after keeps the 44px touch target. */
  .token { display: grid; grid-template-columns: minmax(0, max-content) auto; justify-content: start; column-gap: var(--space-1); align-items: start; }
  .token .name { min-width: 0; overflow-wrap: anywhere; color: var(--color-text); }
  .token .copy { position: relative; grid-row: 1; grid-column: 2; align-self: center; justify-self: start; min-width: 0; min-height: 0; margin: 0; padding-block: 0; }
  .token .copy::after { content: ""; position: absolute; top: 50%; left: 50%; width: max(100%, var(--control-lg)); height: var(--control-lg); translate: -50% -50%; }
  .token .copy:focus-visible { outline-offset: calc(var(--focus-width) * -1); }
  .copy-result { font-size: var(--text-xs); }
  .was { grid-column: 1 / -1; color: var(--color-muted); font-size: var(--text-xs); }
  .was code { color: var(--color-muted); }
  .value { display: inline-flex; align-items: flex-start; gap: var(--space-2); min-width: 0; }
  .value code { min-width: 0; overflow-wrap: anywhere; color: var(--color-muted); }
  /* A font stack breaks between families; a family wraps inside itself only when it is wider than the column. */
  .family { display: inline-block; max-width: 100%; }
  .value:has(.family) { flex-direction: column; }
  .same { color: var(--color-muted); }
  .chip { flex: none; width: 1.25rem; height: 1.25rem; border-radius: var(--radius-inline); box-shadow: inset 0 0 0 1px var(--color-border-subtle); }
  .tile { flex: none; width: 2rem; height: 1.5rem; border-radius: var(--radius-inline); background: var(--plate); }
  .corner { flex: none; width: 1.5rem; height: 1.5rem; border-top: 2px solid var(--color-muted); border-left: 2px solid var(--color-muted); }
  .bar { flex: none; height: 0.5rem; margin-top: 0.3rem; border-radius: 2px; background: var(--color-accent); }
  .height { flex: none; width: 0.5rem; border-radius: 2px; background: var(--color-accent); }
  .sample { flex: none; min-width: 1.5rem; line-height: 1; color: var(--color-text); }
  .find-summary { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
  /* The phone bar's Clear names the query on one line, cut short with an ellipsis; the bar's icon buttons keep their size. */
  .section-bar > .bar-clear { display: block; width: auto; max-width: 7.5rem; padding-inline: var(--space-2); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  /* The site name keeps its one line, so the bar may shrink below its content and Clear gives way; the icon buttons keep their size. */
  .page-head > .section-bar { min-width: 0; }
  .section-bar > .btn:not(.bar-clear) { flex: none; }
  @media (forced-colors: active) { .chip { forced-color-adjust: none; } }
${stackedTablesCss(STACK_BELOW)}`

// Find also filters the token rows, so a query shows the matching tokens in place. The page hands the
// shell its scope (see the Find comment in components.html): the rows a query keeps, the rail links
// whose group still has a row, and the count to announce.
const FOUNDATIONS_JS = `
  const find = document.getElementById('find');
  const rows = [...document.querySelectorAll('.tokens tbody tr')];
  const groups = [...document.querySelectorAll('[data-group]')];
  const summary = document.getElementById('find-summary');
  const status = document.getElementById('copy-status');
  // Phones: the drawer closes over a filtered page, so the sticky bar says so and can clear it.
  const barClear = document.createElement('button');
  barClear.type = 'button';
  barClear.className = 'btn text bar-clear';
  barClear.hidden = true;
  document.getElementById('section-bar').prepend(barClear);
  window.findScope = {
    filter: (words) => {
      const query = find.value.trim();
      let shown = 0;
      rows.forEach((row) => { row.hidden = !words.every((w) => row.dataset.terms.includes(w)); if (!row.hidden) shown += 1; });
      groups.forEach((group) => { group.hidden = !group.querySelector('tbody tr:not([hidden])'); });
      summary.hidden = !words.length;
      summary.querySelector('p').textContent = shown ? \`Showing \${shown} of \${rows.length} tokens for “\${query}”.\` : \`No token matches “\${query}”.\`;
      barClear.hidden = !words.length;
      barClear.textContent = \`Clear “\${query}”\`;
      return { count: shown, one: 'token', many: 'tokens' };
    },
    keeps: (link) => !document.getElementById(link.hash.slice(1)).hidden,
  };
  // Clearing sets the field and fires input, so the shell runs the filter.
  const clear = () => { find.value = ''; find.dispatchEvent(new Event('input')); };
  document.getElementById('find-summary-clear').addEventListener('click', () => { clear(); find.focus(); });
  barClear.addEventListener('click', clear);

  // Copy needs the script, so it shows only once the script runs. It announces its result. A success swaps the
  // icon for a tick for 1.5s; a failure shows "Copy failed" in place of the icon for 4s. A repeat click restarts the wait.
  document.querySelectorAll('[data-copy-token]').forEach((button) => {
    button.hidden = false;
    const result = button.querySelector('.copy-result');
    const icon = button.querySelector('.icon');
    const use = icon.querySelector('use');
    button.addEventListener('click', async () => {
      let ok = true;
      try { await navigator.clipboard.writeText(button.dataset.copyToken); } catch (e) { ok = false; }
      status.textContent = ok ? \`Copied \${button.dataset.copyToken}.\` : 'Copy failed. Select the name instead.';
      use.setAttribute('href', ok ? '#i-tick' : '#i-copy');
      icon.hidden = !ok;
      result.textContent = ok ? '' : 'Copy failed';
      result.hidden = ok;
      clearTimeout(button.restore);
      button.restore = setTimeout(() => { use.setAttribute('href', '#i-copy'); icon.hidden = false; result.hidden = true; }, ok ? 1500 : 4000);
    });
  });
`
