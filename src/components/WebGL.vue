<template>
	<canvas
		class="canvas"
		ref="canvas"
		:width="windowWidth"
		:height="windowHeight"
	/>
</template>

<script setup>
import { useTemplateRef, onMounted, nextTick, watch } from 'vue'
import {
	useWindowSize,
	useDevicePixelRatio,
	useUrlSearchParams,
	get,
} from '@vueuse/core'
import * as THREE from 'three/webgpu'
import {
	mrt,
	output,
	pass,
	float,
	packNormalToRGB,
	normalView,
	velocity,
} from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls'

import { useGSAP } from '@/composables/useGSAP'
import { SampleTSLMaterial } from '@/assets/materials'
import { gltfLoader } from '@/assets/loaders'

const canvasRef = useTemplateRef('canvas')
let perfPanel, scene, camera, renderer, mesh, controls, renderPipeline

const { width: windowWidth, height: windowHeight } = useWindowSize()
const { pixelRatio: dpr } = useDevicePixelRatio()
const params = useUrlSearchParams('history')

const { gsap } = useGSAP()

//
// Lifecycle
//
onMounted(async () => {
	await nextTick()

	createScene()
	createCamera()
	await createRenderer()
	createPostProcess()

	createMesh()

	await loadModel()

	createControls()

	gsap.ticker.fps(60)

	renderer.setAnimationLoop(time => {
		perfPanel?.begin()

		updateScene(time * 0.001)
		renderPipeline.render()

		perfPanel?.end()
	})

	if (Object.hasOwn(params, 'debug')) {
		await import('@/assets/Debug')

		if (!renderer.isWebGPURenderer) {
			const { ThreePerf } = await import('three-perf')

			perfPanel = new ThreePerf({
				anchorX: 'left',
				anchorY: 'top',
				domElement: document.body,
				renderer,
			})
		}
	}
})

//
// Watchers
//
watch(dpr, value => {
	renderer.setPixelRatio(value)
})

watch([windowWidth, windowHeight], value => {
	camera.aspect = value[0] / value[1]
	camera.updateProjectionMatrix()

	renderer.setSize(value[0], value[1])
})

//
// Methods
//
function updateScene(time = 0) {
	controls?.update()
	mesh.rotation.set(time * 0.2, time * 0.13, time * 0.17)
}

function createScene() {
	scene = new THREE.Scene()
}

function createCamera() {
	camera = new THREE.PerspectiveCamera(
		40,
		get(windowWidth) / get(windowHeight),
		0.1,
		100,
	)

	camera.position.set(0, 0, 4)
}

async function createRenderer() {
	renderer = new THREE.WebGPURenderer({
		canvas: get(canvasRef),
		alpha: true,
		antialias: true,
		powerPreference: 'high-performance',
	})

	renderer.setClearColor(0x121212, 1)
	renderer.setSize(get(windowWidth), get(windowHeight))

	if (Object.hasOwn(params, 'debug')) {
		const { Inspector } = await import('three/addons/inspector/Inspector')

		renderer.inspector = new Inspector()
	}

	await renderer.init()
}

function createPostProcess() {
	renderPipeline = new THREE.RenderPipeline(renderer)
	renderPipeline.outputColorTransform = false

	const scenePass = pass(scene, camera)
	scenePass.setMRT(
		mrt({
			output,
			velocity,
			normal: packNormalToRGB(normalView),
			toon: packNormalToRGB(normalView).step(0.5),
		}),
	)

	const scenePassColor = scenePass.getTextureNode('output').toInspector('Color')
	const scenePassNormal = scenePass
		.getTextureNode('normal')
		.toInspector('Normal')
	const scenePassDepth = scenePass
		.getTextureNode('depth')
		.toInspector('Depth', () => scenePass.getLinearDepthNode())
	const scenePassVelocity = scenePass
		.getTextureNode('velocity')
		.toInspector('Velocity')

	const scenePassToon = scenePass.getTextureNode('toon').toInspector('Toon')

	// Keep depth/velocity in the render graph so their inspector nodes update each frame.
	const zero = float(0)
	renderPipeline.outputNode = scenePassColor
		.add(scenePassToon.mul(zero))
		.add(scenePassNormal.mul(zero))
		.add(scenePassDepth.mul(zero))
		.add(scenePassVelocity.mul(zero))
}

async function loadModel() {
	const gltf = await gltfLoader.load('/monkey.glb')
	const model = gltf.scene.getObjectByName('Suzanne')

	model.material = SampleTSLMaterial
	model.position.x = 1

	scene.add(model)
}

function createControls() {
	controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
}

function createMesh() {
	const geometry = new THREE.BoxGeometry()
	const material = SampleTSLMaterial

	mesh = new THREE.Mesh(geometry, material)
	mesh.position.x = -1

	scene.add(mesh)
}
</script>

<style scoped>
.canvas {
	height: 100dvh;
	width: 100dvw;
}
</style>
