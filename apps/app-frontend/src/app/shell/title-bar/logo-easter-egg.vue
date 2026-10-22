<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

import firstVideoSrc from '@/assets/easter-egg/n1.mp4'
import secondVideoSrc from '@/assets/easter-egg/n2.mp4'

// Second (in n1.mp4) where the explosion starts
const EXPLOSION_AT = 1.85

type Stage = 'idle' | 'intro' | 'boom' | 'outro' | 'exit'

const stage = ref<Stage>('idle')
const firstVideo = ref<HTMLVideoElement | null>(null)
const secondVideo = ref<HTMLVideoElement | null>(null)

let frame = 0
let shakeTimeout: ReturnType<typeof setTimeout> | undefined

async function start() {
	if (stage.value !== 'idle') return
	stage.value = 'intro'
	window.addEventListener('keydown', onKeydown)
	await nextTick()
	const video = firstVideo.value
	if (!video) return
	video.currentTime = 0
	await video.play().catch(() => {})
	watchForExplosion()
}

function watchForExplosion() {
	const video = firstVideo.value
	if (!video || stage.value !== 'intro') return
	if (video.currentTime >= EXPLOSION_AT) {
		blowUp()
		return
	}
	frame = requestAnimationFrame(watchForExplosion)
}

function blowUp() {
	stage.value = 'boom'
	document.documentElement.classList.add('easter-egg-shake')
	shakeTimeout = setTimeout(
		() => document.documentElement.classList.remove('easter-egg-shake'),
		700,
	)
}

async function onFirstEnded() {
	if (stage.value === 'idle') return
	stage.value = 'outro'
	await nextTick()
	const video = secondVideo.value
	if (!video) return
	video.currentTime = 0
	await video.play().catch(() => {})
}

function onSecondEnded() {
	if (stage.value === 'outro') stage.value = 'exit'
}

function onSecondAnimationEnd() {
	if (stage.value === 'exit') close()
}

function close() {
	cancelAnimationFrame(frame)
	clearTimeout(shakeTimeout)
	firstVideo.value?.pause()
	secondVideo.value?.pause()
	document.documentElement.classList.remove('easter-egg-shake')
	window.removeEventListener('keydown', onKeydown)
	stage.value = 'idle'
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') close()
}

onBeforeUnmount(close)

defineExpose({ start })
</script>

<template>
	<Teleport to="body">
		<div v-if="stage !== 'idle'" class="egg-overlay" :class="`egg-${stage}`" @click="close">
			<video
				v-show="stage === 'intro' || stage === 'boom'"
				ref="firstVideo"
				:src="firstVideoSrc"
				class="egg-video egg-first"
				playsinline
				@ended="onFirstEnded"
			/>
			<div v-if="stage === 'boom'" class="egg-flash" />
			<video
				v-show="stage === 'outro' || stage === 'exit'"
				ref="secondVideo"
				:src="secondVideoSrc"
				class="egg-video egg-second"
				playsinline
				@ended="onSecondEnded"
				@animationend="onSecondAnimationEnd"
			/>
		</div>
	</Teleport>
</template>

<style scoped>
.egg-overlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	overflow: hidden;
	background: rgba(0, 0, 0, 0.35);
	cursor: pointer;
	transition: background 0.4s ease-in;
}

.egg-exit {
	background: transparent;
}

/* Exit: the second video shrinks back into the logo */
.egg-exit .egg-second {
	animation: egg-shrink 0.4s cubic-bezier(0.55, 0, 0.8, 0.3) forwards;
}

/* Both videos pop out of the logo in the top-left corner into the centre */
.egg-video {
	position: absolute;
	top: 50%;
	left: 50%;
	width: min(60vw, 720px);
	border-radius: 12px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
	transform: translate(-50%, -50%);
	animation: egg-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
	transition:
		transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1),
		opacity 0.45s ease-out,
		filter 0.45s ease-out;
}

/* Explosion: the first video bursts in place and disappears */
.egg-boom .egg-first {
	transform: translate(-50%, -50%) scale(1.3);
	opacity: 0;
	filter: brightness(3) blur(10px);
}

.egg-flash {
	position: absolute;
	top: 50%;
	left: 50%;
	width: min(100vw, 1100px);
	aspect-ratio: 1;
	border-radius: 50%;
	background: radial-gradient(circle, #fff 0%, #c8ffd8 30%, rgba(80, 255, 140, 0.4) 50%, transparent 70%);
	pointer-events: none;
	transform: translate(-50%, -50%) scale(0.2);
	animation: egg-flash 0.7s ease-out forwards;
}

@keyframes egg-pop {
	from {
		transform: translate(calc(-50% - 50vw + 90px), calc(-50% - 50vh + 22px)) scale(0.05);
		opacity: 0;
	}
	to {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
}

@keyframes egg-shrink {
	from {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
	to {
		transform: translate(calc(-50% - 50vw + 90px), calc(-50% - 50vh + 22px)) scale(0.05);
		opacity: 0;
	}
}

@keyframes egg-flash {
	0% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.2);
	}
	20% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(1.2);
	}
}
</style>

<style>
html.easter-egg-shake body {
	animation: egg-shake 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes egg-shake {
	10%,
	90% {
		transform: translate(-2px, 1px);
	}
	20%,
	80% {
		transform: translate(4px, -3px);
	}
	30%,
	50%,
	70% {
		transform: translate(-8px, 5px);
	}
	40%,
	60% {
		transform: translate(8px, -5px);
	}
}
</style>
