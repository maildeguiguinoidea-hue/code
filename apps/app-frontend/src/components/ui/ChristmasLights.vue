<script setup lang="ts">
import { computed } from 'vue'

import blueBulb from '@/assets/christmas/bulb-blue.svg?url'
import goldBulb from '@/assets/christmas/bulb-gold.svg?url'
import greenBulb from '@/assets/christmas/bulb-green.svg?url'
import redBulb from '@/assets/christmas/bulb-red.svg?url'
import largeFlake from '@/assets/christmas/flake-large.svg?url'
import mediumFlake from '@/assets/christmas/flake-medium.svg?url'
import smallFlake from '@/assets/christmas/flake-small.svg?url'
import garland from '@/assets/christmas/garland.svg?url'
import holly from '@/assets/christmas/holly.svg?url'
import snowGround from '@/assets/christmas/snow-ground.svg?url'
import { useTheme } from '@/composables/use-theme'

const theme = useTheme()
const visible = computed(() => theme.active === 'christmas')

// Small seeded random generator so the lights and snow look the same every launch
function seeded(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647
		return (seed - 1) / 2147483646
	}
}

const random = seeded(25)

const BULB_COUNT = 22
const bulbSprites = [
	{ src: redBulb, glow: '#ff4b4b' },
	{ src: goldBulb, glow: '#ffc83d' },
	{ src: greenBulb, glow: '#43d16a' },
	{ src: blueBulb, glow: '#42a5f5' },
]
const bulbs = Array.from({ length: BULB_COUNT }, (_, i) => ({
	...bulbSprites[i % bulbSprites.length],
	left: `${((i + 0.5) / BULB_COUNT) * 100}%`,
	tilt: `${(random() - 0.5) * 20}deg`,
	duration: `${1.6 + random() * 2.4}s`,
	delay: `${-random() * 4}s`,
}))

const hollies = [
	{ left: '0%', shift: '0%' },
	{ left: '50%', shift: '-50%' },
	{ left: '100%', shift: '-100%' },
]

// Sizes are whole multiples of each sprite's pixel grid so the pixels stay square
const flakeSprites = [
	{ src: smallFlake, sizes: [10, 15] },
	{ src: mediumFlake, sizes: [14, 21] },
	{ src: largeFlake, sizes: [18, 27] },
]
const flakes = Array.from({ length: 40 }, () => {
	const sprite = flakeSprites[Math.floor(random() * flakeSprites.length)]
	const size = sprite.sizes[random() > 0.7 ? 1 : 0]
	const duration = 10 + random() * 12
	return {
		src: sprite.src,
		left: `${random() * 100}%`,
		size: `${size}px`,
		opacity: 0.5 + random() * 0.5,
		duration: `${duration}s`,
		delay: `${-random() * duration}s`,
		sway: `${12 + random() * 30}px`,
		swayDuration: `${3 + random() * 4}s`,
	}
})
</script>

<template>
	<div
		v-if="visible"
		class="christmas"
		:class="{ still: !theme.advancedRendering }"
		aria-hidden="true"
	>
		<div class="glow" />

		<div
			v-for="(flake, i) in flakes"
			:key="`flake-${i}`"
			class="flake"
			:style="{
				left: flake.left,
				animationDuration: flake.duration,
				animationDelay: flake.delay,
			}"
		>
			<img
				:src="flake.src"
				alt=""
				class="pixel flake-sprite"
				:style="{
					width: flake.size,
					height: flake.size,
					opacity: flake.opacity,
					'--sway': flake.sway,
					animationDuration: flake.swayDuration,
				}"
			/>
		</div>

		<div class="pixel snow-ground" :style="{ backgroundImage: `url(${snowGround})` }" />

		<div
			v-for="(bulb, i) in bulbs"
			:key="`bulb-${i}`"
			class="bulb"
			:style="{
				left: bulb.left,
				'--glow': bulb.glow,
				'--tilt': bulb.tilt,
			}"
		>
			<div
				class="bulb-glow"
				:style="{ animationDuration: bulb.duration, animationDelay: bulb.delay }"
			/>
			<img :src="bulb.src" alt="" class="pixel bulb-sprite" />
		</div>

		<div class="pixel garland" :style="{ backgroundImage: `url(${garland})` }" />

		<img
			v-for="sprig in hollies"
			:key="`holly-${sprig.left}`"
			:src="holly"
			alt=""
			class="pixel holly"
			:style="{ left: sprig.left, transform: `translateX(${sprig.shift})` }"
		/>
	</div>
</template>

<style scoped>
.christmas {
	position: fixed;
	inset: var(--top-bar-height, 3rem) 0 0 0;
	z-index: 30;
	overflow: hidden;
	pointer-events: none;
}

.pixel {
	image-rendering: pixelated;
}

.glow {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(55rem 18rem at 20% -6rem, rgba(229, 57, 53, 0.12), transparent 70%),
		radial-gradient(55rem 18rem at 80% -6rem, rgba(67, 209, 106, 0.08), transparent 70%);
}

/* Garland sprite is 16x8, drawn at 3x */
.garland {
	position: absolute;
	inset: 0 0 auto;
	height: 24px;
	background-repeat: repeat-x;
	background-size: 48px 24px;
	filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.35));
}

/* Holly sprite is 13x8, drawn at 3x */
.holly {
	position: absolute;
	top: 6px;
	width: 39px;
	height: 24px;
}

/* Bulb sprite is 5x9, drawn at 3x */
.bulb {
	position: absolute;
	top: 14px;
	width: 15px;
	height: 27px;
	margin-left: -7.5px;
	transform: rotate(var(--tilt));
	transform-origin: top center;
}

.bulb-sprite {
	position: relative;
	display: block;
	width: 15px;
	height: 27px;
}

.bulb-glow {
	position: absolute;
	top: 2px;
	left: -14px;
	width: 43px;
	height: 43px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--glow) 0%, transparent 65%);
	opacity: 0.55;
	animation-name: twinkle;
	animation-iteration-count: infinite;
	animation-timing-function: steps(4, jump-none);
}

.flake {
	position: absolute;
	top: -30px;
	animation-name: fall;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
}

.flake-sprite {
	display: block;
	animation-name: sway;
	animation-iteration-count: infinite;
	animation-direction: alternate;
	animation-timing-function: ease-in-out;
}

/* Snow ground sprite is 16x6, drawn at 2x */
.snow-ground {
	position: absolute;
	inset: auto 0 0;
	height: 12px;
	background-repeat: repeat-x;
	background-size: 32px 12px;
}

@keyframes twinkle {
	0%,
	100% {
		opacity: 0.6;
	}
	50% {
		opacity: 0.1;
	}
}

@keyframes fall {
	from {
		transform: translateY(0);
	}
	to {
		transform: translateY(calc(100vh + 30px));
	}
}

@keyframes sway {
	from {
		transform: translateX(calc(var(--sway) * -1));
	}
	to {
		transform: translateX(var(--sway));
	}
}

.still .bulb-glow,
.still .flake,
.still .flake-sprite {
	animation: none;
}

.still .flake {
	display: none;
}

@media (prefers-reduced-motion: reduce) {
	.bulb-glow,
	.flake,
	.flake-sprite {
		animation: none;
	}

	.flake {
		display: none;
	}
}
</style>
