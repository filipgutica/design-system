// A React app that uses ui-sdk the way DESIGN.md "ui-sdk" describes: the layer order first, then
// tokens.css, ui-sdk's web.css, and the ui-sdk.css bridge, with the agent bridge created before render.
import './ui-sdk-layers.css'
import '@filipgutica/design-system/tokens.css'
import '@filipgutica/design-system/fonts.css'
import '@ui-sdk/core/web.css'
import '@filipgutica/design-system/ui-sdk.css'
import { createAgent } from '@ui-sdk/react/agent'
import { Button } from '@ui-sdk/react/button'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Field, FieldLabel } from '@ui-sdk/react/field'
import { Input } from '@ui-sdk/react/input'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

Object.assign(window, { agent: createAgent() })

const App = () => {
  const [notify, setNotify] = useState(false)
  return (
    <main style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '28rem', padding: 'var(--space-6)' }}>
      <h1>Project settings</h1>
      <p>Read the <a href="#guide" data-testid="link">settings guide</a> first.</p>
      <Field>
        <FieldLabel>Project name</FieldLabel>
        <Input data-testid="input" defaultValue="Apollo" />
      </Field>
      <label data-slot="label">
        <Checkbox data-testid="checkbox" checked={notify} onCheckedChange={(checked) => setNotify(checked === true)}>
          <CheckboxIndicator aria-hidden="true">✓</CheckboxIndicator>
        </Checkbox>
        Email me about deploys
      </label>
      <p data-testid="state">Deploy emails {notify ? 'on' : 'off'}</p>
      <Button data-testid="save" data-variant="solid">Save</Button>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('ui-sdk.html has no #root')
createRoot(root).render(<App />)
