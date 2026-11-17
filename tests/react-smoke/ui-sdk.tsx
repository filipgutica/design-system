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
import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@ui-sdk/react/drawer'
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@ui-sdk/react/dialog'
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from '@ui-sdk/react/progress'
import { Radio, RadioGroup, RadioIndicator } from '@ui-sdk/react/radio'
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from '@ui-sdk/react/select'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack, SliderValue } from '@ui-sdk/react/slider'
import { Switch, SwitchThumb } from '@ui-sdk/react/switch'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs'
import { Textarea } from '@ui-sdk/react/textarea'
import { Toggle, ToggleIcon } from '@ui-sdk/react/toggle'
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
      <RadioGroup defaultValue="immediate" aria-label="Delivery">
        <label data-slot="card" data-testid="card-checked"><strong>Immediate</strong><span>Send each alert.</span><Radio data-testid="card-radio-checked" value="immediate"><RadioIndicator /></Radio></label>
        <label data-slot="card" data-testid="card"><strong>Digest</strong><span>Group the alerts.</span><Radio data-testid="card-radio" value="digest"><RadioIndicator /></Radio></label>
        <label data-slot="card" data-testid="card-disabled"><strong>Webhook</strong><span>Not configured.</span><Radio value="webhook" disabled><RadioIndicator /></Radio></label>
      </RadioGroup>
      <label data-slot="label" data-testid="switch-label"><Switch data-testid="switch"><SwitchThumb data-testid="switch-thumb" /></Switch>Alerts</label>
      <label data-slot="label"><Switch data-testid="switch-on" defaultChecked><SwitchThumb data-testid="switch-on-thumb" /></Switch>Single-key shortcuts</label>
      <label data-slot="label" data-testid="switch-disabled-label"><Switch data-testid="switch-disabled" disabled><SwitchThumb /></Switch>Archived alerts</label>
      <label data-slot="label" data-size="sm"><Switch data-testid="switch-sm" defaultChecked><SwitchThumb /></Switch>Small</label>
      <label data-slot="label" data-size="lg"><Switch data-testid="switch-lg" defaultChecked><SwitchThumb /></Switch>Large</label>
      <Toggle data-testid="toggle"><ToggleIcon /><span>Wrap lines<small>Long lines fold</small></span></Toggle>
      <Toggle data-testid="toggle-pressed" defaultPressed><ToggleIcon /><span>Wrap lines</span></Toggle>
      <Toggle data-testid="toggle-disabled" disabled><ToggleIcon /><span>Wrap lines</span></Toggle>
      <Toggle data-testid="toggle-sm" data-size="sm" defaultPressed><ToggleIcon /><span>Small</span></Toggle>
      <Toggle data-testid="toggle-lg" data-size="lg" defaultPressed><ToggleIcon /><span>Large</span></Toggle>
      <Field>
        <FieldLabel>Region</FieldLabel>
        <Select defaultValue="eu-west">
          <SelectTrigger data-testid="select"><SelectValue /></SelectTrigger>
          <SelectContent data-testid="select-content">
            <SelectItem data-testid="select-item" value="us-east">us-east</SelectItem>
            <SelectItem data-testid="select-item-selected" value="eu-west">eu-west<SelectItemIndicator /></SelectItem>
            <SelectItem value="ap-south">ap-south</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field invalid>
        <FieldLabel>Runtime</FieldLabel>
        <Select placeholder="Pick a runtime">
          <SelectTrigger data-testid="select-invalid"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="node">Node</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field disabled>
        <FieldLabel>Zone</FieldLabel>
        <Select defaultValue="a">
          <SelectTrigger data-testid="select-disabled"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="a">Zone A</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <Select defaultValue="s"><SelectTrigger data-testid="select-sm" data-size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="s">Small</SelectItem></SelectContent></Select>
        <Select defaultValue="l"><SelectTrigger data-testid="select-lg" data-size="lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="l">Large</SelectItem></SelectContent></Select>
      </Field>
      <Dialog>
        <DialogTrigger render={<Button data-variant="danger" />} data-testid="dialog-trigger">Delete project</DialogTrigger>
        <DialogBackdrop data-testid="dialog-backdrop" />
        <DialogContent data-testid="dialog">
          <header>
            <div>
              <DialogTitle data-testid="dialog-title">Delete Apollo?</DialogTitle>
              <DialogDescription data-testid="dialog-description">This removes its deploys too.</DialogDescription>
            </div>
            <DialogClose data-testid="dialog-close" aria-label="Close">✕</DialogClose>
          </header>
          <div data-testid="dialog-body"><p>Type the project name to confirm.</p></div>
          <footer data-testid="dialog-footer">
            <DialogClose render={<Button data-variant="secondary" />}>Cancel</DialogClose>
            <Button data-variant="danger">Delete</Button>
          </footer>
        </DialogContent>
      </Dialog>
      {/* In the page's grid a segmented control would stretch; on its own it is as wide as its options. */}
      <div style={{ display: 'grid', justifyItems: 'start', gap: 'var(--space-4)' }}>
      <SegmentedControl data-testid="segmented" aria-label="View" defaultValue="list">
        <SegmentedControlIndicator data-testid="segmented-indicator" />
        <SegmentedControlItem data-testid="seg-list" value="list">List</SegmentedControlItem>
        <SegmentedControlItem data-testid="seg-grid" value="grid">Grid</SegmentedControlItem>
        <SegmentedControlItem data-testid="seg-disabled" value="board" disabled>Board</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl data-testid="segmented-second" aria-label="Theme" defaultValue="dark">
        <SegmentedControlIndicator data-testid="segmented-second-indicator" />
        <SegmentedControlItem value="light">Light</SegmentedControlItem>
        <SegmentedControlItem data-testid="seg-dark" value="dark">Dark</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl data-testid="segmented-sm" data-size="sm" aria-label="Small view" defaultValue="a">
        <SegmentedControlIndicator /><SegmentedControlItem data-testid="seg-sm-item" value="a">Small</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl data-testid="segmented-lg" data-size="lg" aria-label="Large view" defaultValue="a">
        <SegmentedControlIndicator /><SegmentedControlItem data-testid="seg-lg-item" value="a">Large</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl data-testid="segmented-off" aria-label="View, disabled" defaultValue="list" disabled>
        <SegmentedControlIndicator data-testid="segmented-off-indicator" />
        <SegmentedControlItem data-testid="seg-off-list" value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="board">Board</SegmentedControlItem>
      </SegmentedControl>
      <SegmentedControl data-testid="segmented-icon" data-icon-only aria-label="Layout" defaultValue="list">
        <SegmentedControlIndicator />
        <SegmentedControlItem value="list" aria-label="List"><svg width="16" height="16" aria-hidden="true" /></SegmentedControlItem>
        <SegmentedControlItem data-testid="seg-icon-grid" value="grid" aria-label="Grid"><svg width="16" height="16" aria-hidden="true" /></SegmentedControlItem>
      </SegmentedControl>
      </div>
      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-list" aria-label="Monitor">
          <TabsIndicator data-testid="tabs-indicator" />
          <TabsTab data-testid="tab-overview" value="overview">Overview</TabsTab>
          <TabsTab data-testid="tab-history" value="history">History</TabsTab>
          <TabsTab data-testid="tab-disabled" value="alerts" disabled>Alerts</TabsTab>
        </TabsList>
        <TabsPanel data-testid="tabs-panel" value="overview">p95 latency is steady.</TabsPanel>
        <TabsPanel value="history">No incidents this week.</TabsPanel>
      </Tabs>
      <div style={{ width: '14rem' }}>
        <Tabs defaultValue="t1">
          <TabsList data-testid="tabs-scroll" aria-label="Regions">
            <TabsIndicator data-testid="tabs-scroll-indicator" />
            {['t1', 't2', 't3', 't4', 't5', 't6'].map((value) => <TabsTab key={value} data-testid={`tab-${value}`} value={value}>Region {value}</TabsTab>)}
          </TabsList>
        </Tabs>
      </div>
      <Field>
        <FieldLabel>Volume</FieldLabel>
        <Slider data-testid="slider" defaultValue={40}>
          <SliderValue data-testid="slider-value" />
          <SliderControl data-testid="slider-control">
            <SliderTrack data-testid="slider-track"><SliderIndicator data-testid="slider-indicator" /><SliderThumb data-testid="slider-thumb" /></SliderTrack>
          </SliderControl>
        </Slider>
      </Field>
      <Field disabled>
        <FieldLabel>Balance</FieldLabel>
        <Slider data-testid="slider-disabled" defaultValue={50}>
          <SliderValue /><SliderControl><SliderTrack><SliderIndicator /><SliderThumb /></SliderTrack></SliderControl>
        </Slider>
      </Field>
      <Slider data-testid="slider-sm" data-size="sm" defaultValue={30} aria-label="Small slider">
        <SliderControl data-testid="slider-sm-control"><SliderTrack><SliderIndicator /><SliderThumb data-testid="slider-sm-thumb" /></SliderTrack></SliderControl>
      </Slider>
      <Slider data-testid="slider-lg" data-size="lg" defaultValue={70} aria-label="Large slider">
        <SliderControl data-testid="slider-lg-control"><SliderTrack><SliderIndicator /><SliderThumb data-testid="slider-lg-thumb" /></SliderTrack></SliderControl>
      </Slider>
      <Progress data-testid="progress" value={40}>
        <ProgressLabel>Importing deploys</ProgressLabel>
        <ProgressValue data-testid="progress-value" />
        <ProgressTrack data-testid="progress-track"><ProgressIndicator data-testid="progress-indicator" /></ProgressTrack>
      </Progress>
      <Drawer side="left">
        <DrawerTrigger render={<Button data-variant="secondary" />} data-testid="drawer-trigger">Open navigation</DrawerTrigger>
        <DrawerBackdrop data-testid="drawer-backdrop" />
        <DrawerContent data-testid="drawer">
          <header data-testid="drawer-header">
            <DrawerTitle data-testid="drawer-title">Navigation</DrawerTitle>
            <DrawerClose data-testid="drawer-close" aria-label="Close navigation">✕</DrawerClose>
          </header>
          <nav data-testid="drawer-body" aria-label="Sections"><p>Overview</p><p>History</p></nav>
        </DrawerContent>
      </Drawer>
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
