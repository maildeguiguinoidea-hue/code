<script setup lang="ts">
import { computed } from 'vue'

import { useTheme } from '@/composables/use-theme'

const theme = useTheme()
const visible = computed(() => theme.active === 'purple')

// Small seeded random generator so the drips land in the same spots every launch
function seeded(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647
		return (seed - 1) / 2147483646
	}
}

const random = seeded(7)
const drips = Array.from({ length: 28 }, (_, i) => {
	const width = 10 + random() * 16
	const duration = 5 + random() * 7
	return {
		left: `${(i / 28) * 100 + random() * 2.5}%`,
		width: `${width}px`,
		length: `${30 + random() * 90}px`,
		duration: `${duration}s`,
		delay: `${-random() * duration}s`,
		falls: random() > 0.45,
	}
})
</script>

<template>
	<div
		v-if="visible"
		class="purple-drip"
		:class="{ still: !theme.advancedRendering }"
		aria-hidden="true"
	>
		<svg width="0" height="0" class="absolute">
			<filter id="purple-drip-goo">
				<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
				<feColorMatrix
					in="blur"
					mode="matrix"
					values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
					result="goo"
				/>
				<feComposite in="SourceGraphic" in2="goo" operator="atop" />
			</filter>
		</svg>

		<div class="glow" />

		<div class="goo">
			<div class="band" />
			<div
				v-for="(drip, i) in drips"
				:key="i"
				class="drip"
				:style="{
					left: drip.left,
					width: drip.width,
					'--len': drip.length,
					animationDuration: drip.duration,
					animationDelay: drip.delay,
				}"
			/>
		</div>

		<template v-for="(drip, i) in drips" :key="`drop-${i}`">
			<div
				v-if="drip.falls"
				class="drop"
				:style="{
					left: `calc(${drip.left} + ${drip.width} / 2)`,
					'--len': drip.length,
					animationDuration: drip.duration,
					animationDelay: drip.delay,
				}"
			/>
		</template>
	</div>
</template>

<style scoped>
.purple-drip {
	position: fixed;
	inset: var(--top-bar-height) 0 0 0;
	z-index: 30;
	overflow: hidden;
	pointer-events: none;
}

.glow {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(60rem 22rem at 15% -6rem, rgba(155, 48, 255, 0.18), transparent 70%),
		radial-gradient(50rem 20rem at 85% -6rem, rgba(255, 79, 216, 0.1), transparent 70%);
}

.goo {
	position: absolute;
	inset: 0 0 auto;
	height: 160px;
	filter: url(#purple-drip-goo) drop-shadow(0 6px 10px rgba(120, 20, 200, 0.45));
}

.band {
	position: absolute;
	inset: 0 0 auto;
	height: 9px;
	background: linear-gradient(#d9a6ff, #9b30ff 60%, #7b1fd1);
}

.drip {
	position: absolute;
	top: 0;
	height: var(--len);
	border-radius: 0 0 999px 999px;
	background: linear-gradient(90deg, #8a24e6, #c77dff 40%, #9b30ff 70%, #7b1fd1);
	transform-origin: top;
	animation-name: drip-stretch;
	animation-iteration-count: infinite;
	animation-timing-function: ease-in-out;
}

/* Rounded blob at the bottom of every drip */
.drip::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: -4px;
	width: 130%;
	aspect-ratio: 1;
	border-radius: 50%;
	background: radial-gradient(circle at 35% 35%, #e6c4ff, #9b30ff 55%, #7b1fd1);
	transform: translateX(-50%);
}

.drop {
	position: absolute;
	top: calc(var(--len) - 4px);
	width: 9px;
	height: 13px;
	margin-left: -4.5px;
	border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
	background: radial-gradient(circle at 35% 35%, #f0d9ff, #b44dff 55%, #7b1fd1);
	box-shadow: 0 0 10px rgba(180, 77, 255, 0.7);
	opacity: 0;
	animation-name: drop-fall;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
}

@keyframes drip-stretch {
	0% {
		transform: scaleY(0.25);
	}
	55% {
		transform: scaleY(1);
	}
	62% {
		transform: scaleY(0.6);
	}
	100% {
		transform: scaleY(0.25);
	}
}

@keyframes drop-fall {
	0%,
	56% {
		opacity: 0;
		transform: translateY(0) scale(0.5);
	}
	60% {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
	/* accelerates like it's actually falling */
	75% {
		transform: translateY(18vh) scale(1, 1.25);
	}
	100% {
		opacity: 0.9;
		transform: translateY(105vh) scale(0.9, 1.4);
	}
}

.still .drip,
.still .drop {
	animation: none;
}

.still .drip {
	transform: scaleY(0.6);
}

@media (prefers-reduced-motion: reduce) {
	.drip,
	.drop {
		animation: none;
	}
}
</style>
