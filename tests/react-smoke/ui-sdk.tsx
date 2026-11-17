// A React app that uses ui-sdk the way DESIGN.md "ui-sdk" describes: the layer order first, then
// tokens.css and ui-sdk.css, with no ui-sdk web.css, and the agent bridge created before render.
import './ui-sdk-layers.css'
import '@filipgutica/design-system/tokens.css'
import '@filipgutica/design-system/fonts.css'
import '@filipgutica/design-system/ui-sdk.css'
import { createAgent } from '@ui-sdk/react/agent'
import { Button } from '@ui-sdk/react/button'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@ui-sdk/react/field'
import { Input } from '@ui-sdk/react/input'
import { Radio, RadioGroup, RadioIndicator } from '@ui-sdk/react/radio'
import { Textarea } from '@ui-sdk/react/textarea'
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
        <FieldLabel data-testid="field-label">Project name</FieldLabel>
        <Input data-testid="input" defaultValue="Apollo" />
        <FieldDescription data-testid="field-description">Shown in the sidebar.</FieldDescription>
      </Field>
      <Field invalid>
        <FieldLabel>Service</FieldLabel>
        <Input data-testid="input-invalid" />
        <FieldError data-testid="field-error">Enter a service name.</FieldError>
      </Field>
      <Field disabled>
        <FieldLabel>Region</FieldLabel>
        <Input data-testid="input-disabled" defaultValue="eu-west" />
      </Field>
      <Field>
        <FieldLabel>Note</FieldLabel>
        <Textarea data-testid="textarea" />
      </Field>
      <Field invalid>
        <FieldLabel>Reason</FieldLabel>
        <Textarea data-testid="textarea-invalid" />
      </Field>
      <Field disabled>
        <FieldLabel>History</FieldLabel>
        <Textarea data-testid="textarea-disabled" />
      </Field>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <Input data-testid="input-sm" data-size="sm" />
        <Input data-testid="input-lg" data-size="lg" />
      </Field>
      <label data-slot="label">
        <Checkbox data-testid="checkbox" checked={notify} onCheckedChange={(checked) => setNotify(checked === true)}>
          <CheckboxIndicator />
        </Checkbox>
        Email me about deploys
      </label>
      <label data-slot="label">
        <Checkbox data-testid="checkbox-disabled" disabled><CheckboxIndicator /></Checkbox>
        Archived
      </label>
      <label data-slot="label">
        <Checkbox data-testid="checkbox-checked-disabled" disabled defaultChecked><CheckboxIndicator /></Checkbox>
        Locked
      </label>
      <label data-slot="label" data-size="sm" data-testid="checkbox-sm-label">
        <Checkbox data-testid="checkbox-sm" defaultChecked><CheckboxIndicator /></Checkbox>
        Small
      </label>
      <label data-slot="label" data-size="lg" data-testid="checkbox-lg-label">
        <Checkbox data-testid="checkbox-lg" defaultChecked><CheckboxIndicator /></Checkbox>
        Large
      </label>
      <RadioGroup defaultValue="private" aria-label="Visibility">
        <label data-slot="label"><Radio data-testid="radio-checked" value="private"><RadioIndicator /></Radio>Private</label>
        <label data-slot="label"><Radio data-testid="radio" value="public"><RadioIndicator /></Radio>Public</label>
      </RadioGroup>
      <RadioGroup defaultValue="small" aria-label="Density">
        <label data-slot="label" data-size="sm"><Radio data-testid="radio-sm" value="small"><RadioIndicator /></Radio>Compact</label>
        <label data-slot="label" data-size="lg"><Radio data-testid="radio-lg" value="large"><RadioIndicator /></Radio>Roomy</label>
      </RadioGroup>
      <p data-testid="state">Deploy emails {notify ? 'on' : 'off'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Button data-testid="primary">Save</Button>
        <Button data-testid="secondary" data-variant="secondary">Cancel</Button>
        <Button data-testid="ghost" data-variant="ghost">Mute</Button>
        <Button data-testid="danger" data-variant="danger">Delete</Button>
        <Button data-testid="text" data-variant="text">Show details</Button>
        <Button data-testid="disabled" disabled>Publish</Button>
        {/* Its action never settles, so a click leaves it pending. */}
        <Button data-testid="pending" onClick={() => new Promise<void>(() => {})}>Deploy</Button>
        <Button data-testid="primary-sm" data-size="sm">Small</Button>
        <Button data-testid="primary-lg" data-size="lg">Large</Button>
        <Button data-testid="link-button" data-variant="secondary" render={<a href="#guide" />}>Read the guide</Button>
      </div>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('ui-sdk.html has no #root')
createRoot(root).render(<App />)
