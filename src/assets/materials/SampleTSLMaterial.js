import { uv, Fn, vec4, positionLocal, uniform } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

export const SampleTSLMaterial = new MeshBasicNodeMaterial()

export const scale = uniform(1)

SampleTSLMaterial.positionNode = Fn(() => {
  return positionLocal.mul(scale)
})()

SampleTSLMaterial.colorNode = Fn(() => {
  return vec4(uv(), 0.5, 1.0)
})()
