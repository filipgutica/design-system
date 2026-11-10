// A React app that consumes the package the way §1 "Consuming from React" describes: the standalone
// tokens and fonts once at the entry, var() references in styles, and the typed token data.
import '@filipgutica/design-system/tokens.css'
import '@filipgutica/design-system/fonts.css'
import { cssVar, tokens } from '@filipgutica/design-system'
import { createRoot } from 'react-dom/client'

// cssVar returns the literal var() type, and a name outside tokens.css does not type-check.
const text: 'var(--color-text)' = cssVar('color-text')
// @ts-expect-error --text is a 1.x name, renamed to --color-text in 2.0.0.
cssVar('text')

const App = () => (
  <main style={{ color: text, background: cssVar('color-surface'), padding: cssVar('space-4') }}>
    <h1 data-testid="heading">Design system</h1>
    <p>{Object.keys(tokens.themes['graphite-indigo'].light).length} tokens</p>
  </main>
)

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')
createRoot(root).render(<App />)
