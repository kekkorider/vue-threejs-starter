import { Pane } from 'tweakpane'

import { scale } from '@/assets/materials/SampleTSLMaterial'

const pane = new Pane({
  container: document.getElementById('tweakpane-container'),
})

pane.addBinding(scale, 'value', { label: 'Mesh scale', min: 0.25, max: 1.5, step: 0.01 })
