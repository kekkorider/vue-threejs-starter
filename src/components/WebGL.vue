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
import { Scene, PerspectiveCamera, Mesh, BoxGeometry } from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls'

import { useGSAP } from '@/composables/useGSAP'
import { SampleTSLMaterial } from '@/assets/materials'
import { gltfLoader } from '@/assets/loaders'

const canvasRef = useTemplateRef('canvas')
let scene, camera, renderer, mesh, controls

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
	createRenderer()

	createMesh()

	await loadModel()

	createControls()

	gsap.ticker.add(time => {
		updateScene(time)
		renderer.renderAsync(scene, camera)
	})

	if (Object.hasOwn(params, 'debug')) {
		await import('@/assets/Debug')
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
	controls.update()
	mesh.rotation.set(time * 0.2, time * 0.13, time * 0.17)
}

function createScene() {
	scene = new Scene()
}

function createCamera() {
	camera = new PerspectiveCamera(
		40,
		get(windowWidth) / get(windowHeight),
		0.1,
		100
	)

	camera.position.set(0, 0, 4)
}

function createRenderer() {
	renderer = new WebGPURenderer({
		canvas: get(canvasRef),
		alpha: true,
		antialias: get(dpr) === 1,
	})

	renderer.setClearColor(0x121212, 1)
	renderer.setSize(get(windowWidth), get(windowHeight))
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
	const geometry = new BoxGeometry()
	const material = SampleTSLMaterial

	mesh = new Mesh(geometry, material)
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
