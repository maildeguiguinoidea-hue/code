<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

import bombSoundSrc from '@/assets/easter-egg/bomb.ogg'
import bombImage from '@/assets/easter-egg/bomb.webp'
import bombLightsImage from '@/assets/easter-egg/bomb-lights.webp'
import portalSoundSrc from '@/assets/easter-egg/portal.ogg'
import portalImage from '@/assets/easter-egg/portal.webp'
import smokeSpriteSrc from '@/assets/easter-egg/smoke.webp'

// Clicks needed, and the max gap between them (ms)
const CLICKS_TO_ARM = 4
const CLICK_WINDOW = 700

// Timeline (ms after the 4th click)
const DROP_AT = 650 // bomb starts falling out of the portal
const FALL_MS = 430
const LAND_AT = DROP_AT + FALL_MS
const PORTAL_CLOSE_AT = 1450

// bomb.ogg timings (seconds into the file)
const SOUND_CHARGE_START = 0.9
const SOUND_BOOM = 2.52

// Each beep of the charging whine in bomb.ogg: [seconds, strength 0-99]
// prettier-ignore
const BEATS: [number, number][] = [[0.9,94],[1.04,66],[1.14,38],[1.24,51],[1.32,43],[1.38,44],[1.46,56],[1.52,53],[1.6,68],[1.68,49],[1.74,51],[1.84,79],[1.9,79],[2.0,87],[2.06,83],[2.12,87],[2.18,85],[2.24,71],[2.3,80],[2.36,99],[2.44,41]]

const GRAVITY = 2400 // px/s² for the flying buttons
const BLAST_POWER = 2600
const MAX_PIECES = 160

type Phase = 'idle' | 'portal' | 'charging' | 'boom' | 'settled' | 'rebuilding'

interface Piece {
	clone: HTMLElement
	original: HTMLElement
	previousVisibility: string
	x0: number
	y0: number
	w: number
	h: number
	x: number
	y: number
	vx: number
	vy: number
	r: number
	vr: number
	delay: number
}

interface Bolt {
	points: string
	width: number
	delay: number
}

interface Particle {
	kind: 'fire' | 'smoke' | 'ember'
	x: number
	y: number
	vx: number
	vy: number
	size: number
	grow: number
	rotation: number
	spin: number
	life: number
	age: number
	delay: number
	drag: number
	lift: number
	alpha: number
	sprite: number
}

// smoke.webp holds 4 different puffs side by side
const SPRITE_COUNT = 4
const SPRITE_SOURCE = 256
const SPRITE_SIZE = 128
const FIRE_COLORS = ['#fff0f8', '#ff8fdc', '#ff5ccb', '#ff3eb5', '#f22aa8']
const SMOKE_COLORS = ['#b993c4', '#9a77a8', '#7f6890', '#6a5578', '#a585ae']
const CANVAS_SCALE = 0.5 // smoke is soft anyway, so draw it at half resolution
const EXPLOSION_SIZE = 1.7 // bigger = bigger fireball and smoke cloud
const EXPLOSION_SPREAD = 1.4 // how far the puffs get thrown out

const phase = ref<Phase>('idle')
const clicks = ref(0)
const portalOpen = ref(false)
const portalClosing = ref(false)
const bombVisible = ref(false)
const bombLanded = ref(false)
const blast = ref(false)
const bolts = ref<Bolt[]>([])

// Positions (px), set when the bomb is armed
const centerX = ref(0)
const portalY = ref(0)
const landY = ref(0)
const bombSize = ref(160)

const layer = ref<HTMLElement | null>(null)
const debris = ref<HTMLElement | null>(null)
const bombEl = ref<HTMLElement | null>(null)
const lightsEl = ref<HTMLElement | null>(null)
const glowEl = ref<HTMLElement | null>(null)
const auraEl = ref<HTMLElement | null>(null)
const vignetteEl = ref<HTMLElement | null>(null)
const dimEl = ref<HTMLElement | null>(null)
const ringsEl = ref<HTMLElement | null>(null)
const fxCanvas = ref<HTMLCanvasElement | null>(null)

let lastClick = 0
let startedAt = 0
let landedAt = 0
let frame = 0
let lastFrame = 0
let boomAt = 0
let lastRing = 0
let beatLevel = 0
let nextBeat = 0
let pieces: Piece[] = []
let prepQueue: HTMLElement[] = []
let appRoot: HTMLElement | null = null
let particles: Particle[] = []
let lastFxFrame = 0
let smokeImage: HTMLImageElement | null = null
let fireSprites: HTMLCanvasElement[] = []
let smokeSprites: HTMLCanvasElement[] = []
let timers: ReturnType<typeof setTimeout>[] = []
let portalSound: HTMLAudioElement | null = null
let bombSound: HTMLAudioElement | null = null
let bombSoundFailed = false

function later(ms: number, fn: () => void) {
	timers.push(setTimeout(fn, ms))
}

function press() {
	if (phase.value !== 'idle') return
	const now = performance.now()
	clicks.value = now - lastClick < CLICK_WINDOW ? clicks.value + 1 : 1
	lastClick = now
	if (clicks.value >= CLICKS_TO_ARM) {
		clicks.value = 0
		start()
	}
}

function playSound(src: string, volume: number): HTMLAudioElement {
	const audio = new Audio(src)
	audio.volume = volume
	audio.play().catch(() => {
		if (audio === bombSound) bombSoundFailed = true
	})
	audio.addEventListener('error', () => {
		if (audio === bombSound) bombSoundFailed = true
	})
	return audio
}

async function start() {
	const width = window.innerWidth
	const height = window.innerHeight
	centerX.value = width / 2
	portalY.value = height * 0.25
	landY.value = height * 0.62
	bombSize.value = Math.round(Math.min(230, Math.max(130, Math.min(width, height) * 0.27)))
	bombSoundFailed = false
	lastRing = 0
	beatLevel = 0
	nextBeat = 0

	phase.value = 'portal'
	portalOpen.value = true
	window.addEventListener('keydown', onKeydown)
	portalSound = playSound(portalSoundSrc, 1)

	loadSmokeSprites()

	// Preload the bomb sound so it starts exactly on landing
	bombSound = new Audio(bombSoundSrc)
	bombSound.preload = 'auto'
	bombSound.load()

	later(DROP_AT, () => (bombVisible.value = true))
	later(LAND_AT - 20, () => {
		if (!bombSound) return
		bombSound.volume = 1
		bombSound.play().catch(() => (bombSoundFailed = true))
		bombSound.addEventListener('error', () => (bombSoundFailed = true))
	})
	later(PORTAL_CLOSE_AT, () => (portalClosing.value = true))
	later(PORTAL_CLOSE_AT + 450, () => (portalOpen.value = false))

	await nextTick()
	startedAt = performance.now()
	lastFrame = startedAt
	frame = requestAnimationFrame(tick)
}

// How far bomb.ogg may lag behind the wall clock before it counts as stalled (s)
const SOUND_MAX_LAG = 0.25

// Seconds into bomb.ogg. Follows the wall clock if the sound can't play, or
// starts but stalls (as with mismatched GStreamer plugins on Linux).
function soundTime(now: number): number {
	const wallTime = landedAt ? (now - landedAt) / 1000 : 0
	if (bombSound && !bombSoundFailed && !bombSound.paused && bombSound.currentTime > 0) {
		if (bombSound.currentTime >= wallTime - SOUND_MAX_LAG) return bombSound.currentTime
		bombSoundFailed = true
	}
	return wallTime
}

function tick(now: number) {
	const elapsed = now - startedAt

	// --- Falling out of the portal -----------------------------------------
	if (bombVisible.value && !bombLanded.value && bombEl.value) {
		const u = Math.min(1, (elapsed - DROP_AT) / FALL_MS)
		const fromY = portalY.value - bombSize.value * 0.55
		const y = fromY + (landY.value - fromY) * u * u // accelerates like real gravity
		const rotation = -25 + 35 * u
		bombEl.value.style.transform = `translate(-50%, -50%) translate(0px, ${y}px) rotate(${rotation}deg)`
		if (u >= 1) land(now)
	}

	// --- Charging: blink and throb on every beep -----------------------------
	if (phase.value === 'charging' && bombEl.value) {
		const t = soundTime(now)
		const dt = Math.min(0.05, (now - lastFrame) / 1000)
		const progress = clamp((t - SOUND_CHARGE_START) / (SOUND_BOOM - SOUND_CHARGE_START))
		const finalSwell = clamp((t - (SOUND_BOOM - 0.3)) / 0.3)

		while (nextBeat < BEATS.length && t >= BEATS[nextBeat][0]) {
			onBeat(BEATS[nextBeat][1] / 99, progress, now)
			nextBeat++
		}
		beatLevel *= Math.exp(-dt / 0.075) // fast decay, so the lights blink with the beeps
		const b = beatLevel

		const shake = (1 + 10 * progress) * (0.3 + b) + 10 * finalSwell
		const jx = (Math.random() - 0.5) * shake
		const jy = (Math.random() - 0.5) * shake
		const scale = 1 + 0.05 * progress + 0.1 * b + 0.3 * finalSwell
		bombEl.value.style.transform = `translate(-50%, -50%) translate(${jx}px, ${landY.value + jy}px) rotate(${10 + jx * 0.6}deg) scale(${scale})`

		// Only opacity/transform change per frame: cheap, so no stutter
		if (lightsEl.value)
			lightsEl.value.style.opacity = String(Math.min(1, 0.12 + 0.88 * b + 0.6 * finalSwell))
		if (glowEl.value)
			glowEl.value.style.opacity = String(Math.min(1, b * (0.5 + 0.5 * progress) + finalSwell))
		if (auraEl.value) {
			auraEl.value.style.opacity = String(
				Math.min(1, 0.1 + 0.45 * progress + 0.4 * b + 0.5 * finalSwell),
			)
			auraEl.value.style.transform = `scale(${1 + 0.25 * b + 0.7 * finalSwell})`
		}
		if (vignetteEl.value)
			vignetteEl.value.style.opacity = String(
				Math.min(1, 0.2 + 0.45 * progress + 0.35 * b + 0.3 * finalSwell),
			)
		if (dimEl.value) dimEl.value.style.opacity = String(0.55 * progress + 0.25 * finalSwell)

		// The whole app trembles with the beeps
		if (appRoot) {
			const amp = (0.5 + 3.5 * progress) * b + 5 * finalSwell
			appRoot.style.transform = `translate(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp}px)`
		}

		prepareSomePieces()
		if (t >= SOUND_BOOM) explode()
	}

	// --- Fire, smoke and embers ----------------------------------------------
	if (particles.length) stepParticles(now)

	// --- Flying buttons ------------------------------------------------------
	let moving = false
	if (phase.value === 'boom') moving = stepPieces(now)

	if (phase.value === 'boom' && !moving && now - boomAt > 3000) {
		phase.value = 'settled'
	}

	lastFrame = now
	const running =
		phase.value !== 'idle' && phase.value !== 'settled' && phase.value !== 'rebuilding'
	if (running || particles.length) {
		frame = requestAnimationFrame(tick)
	}
}

function clamp(value: number): number {
	return Math.min(1, Math.max(0, value))
}

function land(now: number) {
	bombLanded.value = true
	landedAt = now
	phase.value = 'charging'
	appRoot = document.getElementById('app')
	// Start copying the buttons now, a few per frame, so the explosion itself doesn't freeze
	pieces = []
	prepQueue = collectTargets()
	document.documentElement.classList.add('bomb-bump')
	later(250, () => document.documentElement.classList.remove('bomb-bump'))
}

function onBeat(strength: number, progress: number, now: number) {
	beatLevel = Math.max(beatLevel, 0.55 + 0.45 * strength)
	if (now - lastRing > 110) {
		lastRing = now
		spawnRing(0.5 + 0.5 * strength + 0.5 * progress)
	}
	if (progress > 0.2) spawnCrackles(progress > 0.6 ? 2 : 1)
	if (progress > 0.35) spawnMotes(3 + Math.floor(progress * 6))
}

function addFx(el: Element, lifetime: number) {
	const container = ringsEl.value
	if (!container) return
	container.appendChild(el)
	setTimeout(() => el.remove(), lifetime)
}

// Little pink electric arcs jumping off the bomb
function spawnCrackles(count: number) {
	for (let i = 0; i < count; i++) {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('class', 'bomb-crackle')
		svg.style.left = `${centerX.value}px`
		svg.style.top = `${landY.value}px`
		const angle = Math.random() * Math.PI * 2
		const startR = bombSize.value * 0.42
		const length = bombSize.value * (0.35 + Math.random() * 0.45)
		const points: string[] = []
		for (let k = 0; k <= 5; k++) {
			const r = startR + (length * k) / 5
			const a = angle + (Math.random() - 0.5) * 0.35
			points.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`)
		}
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
		line.setAttribute('points', points.join(' '))
		svg.appendChild(line)
		addFx(svg, 180)
	}
}

// Pink energy getting sucked into the bomb from all around
function spawnMotes(count: number) {
	for (let i = 0; i < count; i++) {
		const mote = document.createElement('div')
		mote.className = 'bomb-mote'
		const angle = Math.random() * Math.PI * 2
		const distance = bombSize.value * (1.6 + Math.random() * 1.6)
		mote.style.left = `${centerX.value}px`
		mote.style.top = `${landY.value}px`
		mote.style.setProperty('--dx', `${Math.cos(angle) * distance}px`)
		mote.style.setProperty('--dy', `${Math.sin(angle) * distance}px`)
		mote.style.setProperty('--a', `${angle}rad`)
		addFx(mote, 500)
	}
}

function spawnRing(strength: number) {
	const container = ringsEl.value
	if (!container) return
	const ring = document.createElement('div')
	ring.className = 'bomb-ring'
	ring.style.left = `${centerX.value}px`
	ring.style.top = `${landY.value}px`
	ring.style.width = ring.style.height = `${bombSize.value}px`
	ring.style.setProperty('--ring-scale', String(2.2 + 2 * strength))
	container.appendChild(ring)
	setTimeout(() => ring.remove(), 700)
}

function randomBolt(length: number): string {
	const angle = Math.random() * Math.PI * 2
	const segments = 7
	const points: string[] = []
	let x = 0
	let y = 0
	for (let i = 0; i <= segments; i++) {
		points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
		const step = length / segments
		const wobble = (Math.random() - 0.5) * step * 1.4
		x += Math.cos(angle) * step - Math.sin(angle) * wobble
		y += Math.sin(angle) * step + Math.cos(angle) * wobble
	}
	return points.join(' ')
}

function explode() {
	phase.value = 'boom'
	boomAt = performance.now()
	if (appRoot) appRoot.style.transform = ''
	launchPieces()
	bombVisible.value = false
	blast.value = true
	later(3200, () => (blast.value = false))

	const base = Math.min(window.innerWidth, window.innerHeight)
	bolts.value = Array.from({ length: 6 }, () => ({
		points: randomBolt(base * (0.25 + Math.random() * 0.25)),
		width: 2 + Math.random() * 3,
		delay: Math.random() * 0.25,
	}))
	spawnExplosion(base)

	if (vignetteEl.value) vignetteEl.value.style.opacity = '0'
	if (dimEl.value) dimEl.value.style.opacity = '0'

	document.documentElement.classList.add('bomb-shake')
	later(900, () => document.documentElement.classList.remove('bomb-shake'))
}

// Tint each smoke puff once (shaded by the texture, coloured by multiply) so drawing is cheap
function tintSprite(image: HTMLImageElement, index: number, color: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = SPRITE_SIZE
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
	const sx = index * SPRITE_SOURCE
	ctx.drawImage(image, sx, 0, SPRITE_SOURCE, SPRITE_SOURCE, 0, 0, SPRITE_SIZE, SPRITE_SIZE)
	ctx.globalCompositeOperation = 'multiply'
	ctx.fillStyle = color
	ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
	ctx.globalCompositeOperation = 'destination-in'
	ctx.drawImage(image, sx, 0, SPRITE_SOURCE, SPRITE_SOURCE, 0, 0, SPRITE_SIZE, SPRITE_SIZE)
	return canvas
}

function loadSmokeSprites() {
	if (fireSprites.length) return
	smokeImage = new Image()
	smokeImage.onload = () => {
		if (!smokeImage) return
		const image = smokeImage
		fireSprites = []
		smokeSprites = []
		for (let i = 0; i < SPRITE_COUNT; i++) {
			for (const color of FIRE_COLORS) fireSprites.push(tintSprite(image, i, color))
			for (const color of SMOKE_COLORS) smokeSprites.push(tintSprite(image, i, color))
		}
	}
	smokeImage.src = smokeSpriteSrc
}

function random(min: number, max: number): number {
	return min + Math.random() * (max - min)
}

function spawnExplosion(screenBase: number) {
	const base = screenBase * EXPLOSION_SIZE
	const canvas = fxCanvas.value
	if (canvas) {
		canvas.width = Math.ceil(window.innerWidth * CANVAS_SCALE)
		canvas.height = Math.ceil(window.innerHeight * CANVAS_SCALE)
	}
	const x = centerX.value
	const y = landY.value
	particles = []

	// Fireball: hot pink puffs bursting out and slowing down
	for (let i = 0; i < 50; i++) {
		const angle = -Math.PI / 2 + random(-1.9, 1.9)
		const speed = random(120, 650) * EXPLOSION_SPREAD
		particles.push({
			kind: 'fire',
			x: x + random(-0.03, 0.03) * base,
			y: y + random(-0.03, 0.03) * base,
			vx: Math.cos(angle) * speed * 1.2,
			vy: Math.sin(angle) * speed,
			size: base * random(0.14, 0.3),
			grow: random(2, 3.2),
			rotation: random(0, Math.PI * 2),
			spin: random(-1.5, 1.5),
			life: random(0.8, 1.6),
			age: 0,
			delay: random(0, 0.1),
			drag: 2.8,
			lift: -170,
			alpha: random(0.75, 1),
			sprite: Math.floor(Math.random() * SPRITE_COUNT * FIRE_COLORS.length),
		})
	}

	// Smoke: rolls outwards, rises like a mushroom cloud, slowly turns and thins out
	for (let i = 0; i < 64; i++) {
		const column = i < 14 // a few puffs shoot straight up to form the stem
		const angle = column ? -Math.PI / 2 + random(-0.25, 0.25) : random(-Math.PI, 0.35)
		const speed = (column ? random(250, 520) : random(60, 420)) * EXPLOSION_SPREAD
		particles.push({
			kind: 'smoke',
			x: x + random(-0.06, 0.06) * base,
			y: y + random(-0.04, 0.04) * base,
			vx: Math.cos(angle) * speed * 1.3,
			vy: Math.sin(angle) * speed * 0.7,
			size: base * random(0.14, 0.28),
			grow: random(2.2, 3.2),
			rotation: random(0, Math.PI * 2),
			spin: random(-0.5, 0.5),
			life: random(2, 3.4),
			age: 0,
			delay: random(0.2, 0.75),
			drag: 1.4,
			lift: random(-240, -100),
			alpha: random(0.4, 0.8),
			sprite: Math.floor(Math.random() * SPRITE_COUNT * SMOKE_COLORS.length),
		})
	}

	// Embers: bright sparks flying out and falling with gravity
	for (let i = 0; i < 46; i++) {
		const angle = -Math.PI / 2 + random(-1.7, 1.7)
		const speed = random(450, 1300) * EXPLOSION_SPREAD
		particles.push({
			kind: 'ember',
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: random(1.5, 3.5),
			grow: 1,
			rotation: 0,
			spin: 0,
			life: random(0.7, 1.6),
			age: 0,
			delay: random(0, 0.1),
			drag: 0.8,
			lift: 1100,
			alpha: 1,
			sprite: 0,
		})
	}
	lastFxFrame = performance.now()
}

function stepParticles(now: number) {
	const canvas = fxCanvas.value
	const ctx = canvas?.getContext('2d')
	const dt = Math.min(0.05, (now - lastFxFrame) / 1000)
	lastFxFrame = now
	if (!canvas || !ctx) {
		particles = []
		return
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)

	const alive: Particle[] = []
	// Smoke first, then fire and embers glowing on top
	for (const kind of ['smoke', 'fire', 'ember'] as const) {
		ctx.globalCompositeOperation = kind === 'smoke' ? 'source-over' : 'lighter'
		for (const p of particles) {
			if (p.kind !== kind) continue
			if (p.delay > 0) {
				p.delay -= dt
				alive.push(p)
				continue
			}
			p.age += dt
			if (p.age >= p.life) continue
			alive.push(p)

			const damping = Math.exp(-p.drag * dt)
			p.vx *= damping
			p.vy = p.vy * damping + p.lift * dt
			p.x += p.vx * dt
			p.y += p.vy * dt
			p.rotation += p.spin * dt

			const t = p.age / p.life
			if (kind === 'ember') {
				ctx.globalAlpha = 1 - t
				ctx.strokeStyle = t < 0.4 ? '#ffe6f7' : '#ff4fc0'
				ctx.lineWidth = p.size
				ctx.beginPath()
				ctx.moveTo(p.x, p.y)
				ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025)
				ctx.stroke()
				continue
			}

			const sprites = kind === 'fire' ? fireSprites : smokeSprites
			const sprite = sprites[p.sprite % Math.max(1, sprites.length)]
			if (!sprite) continue
			// Grows fast at first, then slowly (ease-out)
			const size = p.size * (1 + (p.grow - 1) * (1 - Math.pow(1 - t, 2.5)))
			const fadeIn = Math.min(1, p.age / (kind === 'fire' ? 0.06 : 0.3))
			const fadeOut = kind === 'fire' ? Math.pow(1 - t, 1.2) : Math.min(1, (1 - t) * 1.6)
			ctx.globalAlpha = p.alpha * fadeIn * fadeOut
			ctx.save()
			ctx.translate(p.x, p.y)
			ctx.rotate(p.rotation)
			ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
			ctx.restore()
		}
	}
	ctx.globalAlpha = 1
	ctx.globalCompositeOperation = 'source-over'
	particles = alive
	if (!particles.length) ctx.clearRect(0, 0, canvas.width, canvas.height)
}

// Copy the computed look of an element (and its children) onto its clone, so the clone
// still looks right once it's pulled out of its original container.
function inlineStyles(source: Element, target: Element, budget: { left: number }) {
	if (budget.left-- <= 0) return
	const computed = getComputedStyle(source)
	const style = (target as HTMLElement | SVGElement).style
	for (let i = 0; i < computed.length; i++) {
		const prop = computed[i]
		style.setProperty(prop, computed.getPropertyValue(prop))
	}
	for (let i = 0; i < source.children.length && i < target.children.length; i++) {
		inlineStyles(source.children[i], target.children[i], budget)
	}
}

function collectTargets(): HTMLElement[] {
	const width = window.innerWidth
	const height = window.innerHeight
	const candidates = Array.from(
		document.querySelectorAll<HTMLElement>(
			'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea',
		),
	).filter((el) => {
		if (layer.value?.contains(el)) return false
		const rect = el.getBoundingClientRect()
		if (rect.width < 6 || rect.height < 6) return false
		if (rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width) return false
		if (rect.width > width * 0.9 || rect.height > height * 0.8) return false
		const style = getComputedStyle(el)
		return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
	})

	// Skip buttons nested inside other buttons, so each piece flies on its own
	const set = new Set(candidates)
	return candidates
		.filter((el) => {
			for (let parent = el.parentElement; parent; parent = parent.parentElement) {
				if (set.has(parent)) return false
			}
			return true
		})
		.slice(0, MAX_PIECES)
}

// Copies one button into the debris layer (still invisible until the blast)
function preparePiece(original: HTMLElement) {
	const container = debris.value
	if (!container || !original.isConnected) return
	const rect = original.getBoundingClientRect()
	const clone = original.cloneNode(true) as HTMLElement
	clone.removeAttribute('id')
	inlineStyles(original, clone, { left: 60 })
	Object.assign(clone.style, {
		position: 'fixed',
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		right: 'auto',
		bottom: 'auto',
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		margin: '0',
		boxSizing: 'border-box',
		display: getComputedStyle(original).display === 'inline' ? 'inline-block' : clone.style.display,
		transform: 'none',
		transformOrigin: 'center',
		transition: 'none',
		animation: 'none',
		pointerEvents: 'none',
		zIndex: '1',
		visibility: 'hidden',
	})
	container.appendChild(clone)
	pieces.push({
		clone,
		original,
		previousVisibility: original.style.visibility,
		x0: rect.left,
		y0: rect.top,
		w: rect.width,
		h: rect.height,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		r: 0,
		vr: 0,
		delay: 0,
	})
}

// Prepares buttons for ~4 ms per frame while the bomb charges
function prepareSomePieces() {
	const deadline = performance.now() + 4
	while (prepQueue.length && performance.now() < deadline) {
		preparePiece(prepQueue.shift() as HTMLElement)
	}
}

function launchPieces() {
	while (prepQueue.length) preparePiece(prepQueue.shift() as HTMLElement)

	for (const piece of pieces) {
		piece.clone.style.visibility = 'visible'
		piece.original.style.visibility = 'hidden'

		// Push away from the bomb: stronger when close, plus an upward kick
		const dx = piece.x0 + piece.w / 2 - centerX.value
		const dy = piece.y0 + piece.h / 2 - landY.value
		const distance = Math.hypot(dx, dy) || 1
		const strength = BLAST_POWER / (distance / 250 + 1)
		piece.vx = (dx / distance) * strength + (Math.random() - 0.5) * 300
		piece.vy = (dy / distance) * strength - 600 - Math.random() * 400
		piece.vr = (Math.random() - 0.5) * 1000
		piece.delay = distance / 3000 // the shockwave reaches far buttons a little later
	}
}

function stepPieces(now: number): boolean {
	const dt = Math.min(0.033, (now - lastFrame) / 1000)
	const elapsed = (now - boomAt) / 1000
	const width = window.innerWidth
	const height = window.innerHeight
	let moving = false

	for (const p of pieces) {
		if (elapsed < p.delay) {
			moving = true
			continue
		}

		p.vy += GRAVITY * dt
		p.x += p.vx * dt
		p.y += p.vy * dt
		p.r += p.vr * dt

		if (p.x0 + p.x < 0) {
			p.x = -p.x0
			p.vx = Math.abs(p.vx) * 0.6
		} else if (p.x0 + p.x + p.w > width) {
			p.x = width - p.w - p.x0
			p.vx = -Math.abs(p.vx) * 0.6
		}

		const onFloor = p.y0 + p.y + p.h >= height
		if (onFloor) {
			p.y = height - p.h - p.y0
			p.vy = p.vy > 150 ? -p.vy * 0.45 : 0
			const friction = Math.pow(0.08, dt)
			p.vx *= friction
			p.vr *= friction
		}

		if (!onFloor || Math.abs(p.vx) > 6 || Math.abs(p.vy) > 6) moving = true
		p.clone.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`
	}

	return moving && elapsed < 10
}

function rebuild() {
	if (phase.value !== 'boom' && phase.value !== 'settled') return
	cancelAnimationFrame(frame)
	phase.value = 'rebuilding'
	blast.value = false
	for (const p of pieces) {
		p.clone.style.transition = `transform 0.7s cubic-bezier(0.5, 0, 0.2, 1.2) ${Math.random() * 0.3}s`
		p.clone.style.transform = 'translate(0px, 0px) rotate(0deg)'
	}
	later(1100, cleanUp)
}

function cleanUp() {
	cancelAnimationFrame(frame)
	timers.forEach(clearTimeout)
	timers = []
	for (const p of pieces) {
		p.original.style.visibility = p.previousVisibility
		p.clone.remove()
	}
	pieces = []
	prepQueue = []
	particles = []
	if (appRoot) appRoot.style.transform = ''
	appRoot = null
	portalSound?.pause()
	bombSound?.pause()
	portalSound = null
	bombSound = null
	portalOpen.value = false
	portalClosing.value = false
	bombVisible.value = false
	bombLanded.value = false
	blast.value = false
	landedAt = 0
	document.documentElement.classList.remove('bomb-shake', 'bomb-bump')
	window.removeEventListener('keydown', onKeydown)
	phase.value = 'idle'
}

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape') return
	if (phase.value === 'boom' || phase.value === 'settled') rebuild()
	else cleanUp() // cancel before it explodes
}

onBeforeUnmount(cleanUp)
</script>

<template>
	<button
		type="button"
		class="bomb-button"
		:class="`armed-${clicks}`"
		aria-label="Bomb"
		@click="press"
	>
		<img :src="bombImage" alt="" class="bomb-button-icon" draggable="false" />
	</button>

	<Teleport to="body">
		<div
			v-if="phase !== 'idle'"
			ref="layer"
			class="bomb-layer"
			:class="{ clickable: phase === 'settled' }"
			:style="{
				'--cx': `${centerX}px`,
				'--portal-y': `${portalY}px`,
				'--land-y': `${landY}px`,
				'--bomb-size': `${bombSize}px`,
			}"
			@click="rebuild"
		>
			<div ref="dimEl" class="dim" />
			<div ref="vignetteEl" class="vignette" />
			<div ref="debris" />
			<div ref="ringsEl" />

			<!-- Portal (cut out of the episode, spun and squashed back into perspective) -->
			<div v-if="portalOpen" class="portal" :class="{ closing: portalClosing }">
				<div class="portal-glow" />
				<img :src="portalImage" alt="" class="portal-tex" draggable="false" />
				<img :src="portalImage" alt="" class="portal-tex ghost" draggable="false" />
				<div class="portal-eye" />
				<span v-for="i in 16" :key="i" class="portal-spark" :style="{ '--i': i }" />
			</div>

			<!-- Bomb: clipped so it slides out from under the portal -->
			<div v-if="bombVisible" class="bomb-clip" :class="{ landed: bombLanded }">
				<div ref="bombEl" class="bomb" :class="{ landed: bombLanded }">
					<div ref="auraEl" class="bomb-aura" />
					<img :src="bombImage" alt="" class="bomb-img" draggable="false" />
					<img ref="glowEl" :src="bombLightsImage" alt="" class="bomb-glow" draggable="false" />
					<img ref="lightsEl" :src="bombLightsImage" alt="" class="bomb-lights" draggable="false" />
				</div>
				<div v-if="bombLanded" class="dust" />
			</div>

			<!-- Explosion -->
			<canvas v-show="phase === 'boom' || phase === 'settled'" ref="fxCanvas" class="fx-canvas" />
			<template v-if="blast">
				<div class="flash" />
				<div class="shockwave" />
				<div class="blast-origin">
					<svg class="bolts" viewBox="-600 -600 1200 1200">
						<polyline
							v-for="(b, i) in bolts"
							:key="`b${i}`"
							:points="b.points"
							:style="{ strokeWidth: b.width, animationDelay: `${b.delay}s` }"
						/>
					</svg>
				</div>
			</template>

			<div v-if="phase === 'settled'" class="rebuild-hint">🔨 Click anywhere to rebuild</div>
		</div>
	</Teleport>
</template>

<style scoped>
.bomb-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	padding: 0;
	border: 1px solid var(--surface-4);
	border-radius: var(--radius-md);
	background: transparent;
	cursor: pointer;
}

.bomb-button:hover {
	background: var(--surface-3);
}

.bomb-button-icon {
	width: 1.15rem;
	height: 1.15rem;
	object-fit: contain;
	pointer-events: none;
}

/* Wiggles harder with every click */
.armed-1 {
	animation: wiggle 0.3s ease;
}
.armed-2 {
	animation: wiggle 0.25s ease 2;
}
.armed-3 {
	animation: wiggle 0.15s ease infinite;
	filter: drop-shadow(0 0 4px #ff2fa8);
}

.bomb-layer {
	position: fixed;
	inset: 0;
	z-index: 10001;
	overflow: hidden;
}

.bomb-layer.clickable {
	cursor: pointer;
}

.dim {
	position: absolute;
	inset: 0;
	background: #05000a;
	opacity: 0;
	pointer-events: none;
}

.vignette {
	position: absolute;
	inset: 0;
	background: radial-gradient(
		ellipse at var(--cx) var(--land-y),
		transparent 18%,
		rgba(255, 20, 100, 0.35) 55%,
		rgba(120, 0, 40, 0.75) 100%
	);
	opacity: 0;
	pointer-events: none;
}

/* ---------- Portal ---------- */
.portal {
	--portal-w: calc(var(--bomb-size) * 2.7);
	position: absolute;
	left: var(--cx);
	top: var(--portal-y);
	width: var(--portal-w);
	height: calc(var(--portal-w) * 0.545);
	transform: translate(-50%, -50%);
	z-index: 3;
	animation: portal-open 0.6s cubic-bezier(0.18, 1.5, 0.4, 1) both;
}

.portal.closing {
	animation: portal-close 0.45s cubic-bezier(0.6, 0, 0.8, 0.4) forwards;
}

/* The texture is a circle: spin it, then squash it back into an ellipse */
.portal-tex {
	position: absolute;
	left: 0;
	top: 50%;
	width: var(--portal-w);
	height: var(--portal-w);
	margin-top: calc(var(--portal-w) / -2);
	pointer-events: none;
	user-select: none;
	filter: drop-shadow(0 0 18px rgba(120, 255, 60, 0.75));
	animation: portal-spin 2.4s linear infinite;
}

/* A second, faster layer on top makes the swirl look liquid */
.portal-tex.ghost {
	opacity: 0.35;
	mix-blend-mode: screen;
	filter: none;
	animation-duration: 1.3s;
}

.portal-glow {
	position: absolute;
	inset: -30% -15%;
	border-radius: 50%;
	background: radial-gradient(
		ellipse,
		rgba(140, 255, 70, 0.55) 0%,
		rgba(80, 220, 40, 0.25) 45%,
		transparent 70%
	);
	animation: portal-pulse 0.5s ease-in-out infinite alternate;
	pointer-events: none;
}

.portal-eye {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 22%;
	height: 26%;
	border-radius: 50%;
	background: radial-gradient(
		ellipse,
		rgba(255, 255, 220, 0.9) 0%,
		rgba(220, 255, 120, 0.5) 40%,
		transparent 72%
	);
	transform: translate(-50%, -50%);
	mix-blend-mode: screen;
	animation: eye-pulse 0.35s ease-in-out infinite alternate;
	pointer-events: none;
}

.portal-spark {
	position: absolute;
	left: calc(50% + cos(calc(var(--i) * 22.5deg)) * 46%);
	top: calc(50% + sin(calc(var(--i) * 22.5deg)) * 44%);
	width: 7px;
	height: 7px;
	margin: -3.5px;
	border-radius: 50%;
	background: #f2ffd0;
	box-shadow: 0 0 8px 3px rgba(150, 255, 80, 0.9);
	animation: spark-drip 0.9s ease-in infinite;
	animation-delay: calc(var(--i) * -0.13s);
	pointer-events: none;
}

/* ---------- Bomb ---------- */
.bomb-clip {
	position: absolute;
	inset: 0;
	z-index: 4;
	/* Soft edge at the portal's centre so the bomb seems to push out through it */
	-webkit-mask-image: linear-gradient(
		to bottom,
		transparent calc(var(--portal-y) - 4px),
		#000 calc(var(--portal-y) + 26px)
	);
	mask-image: linear-gradient(
		to bottom,
		transparent calc(var(--portal-y) - 4px),
		#000 calc(var(--portal-y) + 26px)
	);
}

.bomb-clip.landed {
	-webkit-mask-image: none;
	mask-image: none;
}

.bomb {
	position: absolute;
	left: var(--cx);
	top: 0;
	width: var(--bomb-size);
	height: var(--bomb-size);
	transform: translate(-50%, -150%);
	will-change: transform;
}

.bomb-img,
.bomb-glow,
.bomb-lights {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
	user-select: none;
}

.bomb-img {
	filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.65));
}

.bomb-lights {
	opacity: 0.3;
}

/* Pre-blurred copy of the lights: only its opacity changes, which is cheap */
.bomb-glow {
	inset: -8%;
	width: 116%;
	height: 116%;
	opacity: 0;
	filter: blur(8px) brightness(2.2) saturate(1.6);
	mix-blend-mode: screen;
}

.bomb-aura {
	position: absolute;
	inset: -75%;
	border-radius: 50%;
	background: radial-gradient(
		circle,
		rgba(255, 50, 160, 0.6) 0%,
		rgba(255, 20, 110, 0.28) 32%,
		transparent 62%
	);
	opacity: 0;
	pointer-events: none;
}

.bomb.landed .bomb-img {
	animation: squash 0.35s ease-out;
	transform-origin: 50% 100%;
}

.dust {
	position: absolute;
	left: var(--cx);
	top: calc(var(--land-y) + var(--bomb-size) * 0.42);
	width: calc(var(--bomb-size) * 2.2);
	height: calc(var(--bomb-size) * 0.5);
	border-radius: 50%;
	background: radial-gradient(
		ellipse,
		rgba(170, 160, 150, 0.55) 0%,
		rgba(120, 110, 100, 0.25) 45%,
		transparent 70%
	);
	transform: translate(-50%, -50%) scale(0.3);
	animation: dust 0.7s ease-out forwards;
}

/* ---------- Explosion ---------- */
.flash {
	position: absolute;
	inset: 0;
	background: #fff;
	z-index: 6;
	pointer-events: none;
	animation: flash 0.65s ease-out forwards;
}

.shockwave {
	position: absolute;
	left: var(--cx);
	top: var(--land-y);
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 6px solid rgba(255, 120, 210, 0.9);
	box-shadow:
		0 0 30px 10px rgba(255, 60, 180, 0.6),
		inset 0 0 30px 10px rgba(255, 60, 180, 0.4);
	transform: translate(-50%, -50%) scale(0);
	z-index: 4;
	pointer-events: none;
	animation: shockwave 0.7s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
}

.blast-origin {
	position: absolute;
	left: var(--cx);
	top: var(--land-y);
	width: 0;
	height: 0;
	z-index: 5;
	pointer-events: none;
}

.fx-canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 5;
	pointer-events: none;
}

.bolts {
	position: absolute;
	left: -600px;
	top: -600px;
	width: 1200px;
	height: 1200px;
	overflow: visible;
}

.bolts polyline {
	fill: none;
	stroke: #ffe6fa;
	stroke-linecap: round;
	stroke-linejoin: round;
	filter: drop-shadow(0 0 6px #ff3eb5) drop-shadow(0 0 14px #ff3eb5);
	opacity: 0;
	animation: bolt 0.45s steps(2, end) 2 forwards;
}

.rebuild-hint {
	position: absolute;
	top: 4rem;
	left: 50%;
	z-index: 7;
	padding: 0.6rem 1.2rem;
	border-radius: 999px;
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-weight: 600;
	transform: translateX(-50%);
	animation: hint-in 0.3s ease-out;
}

/* ---------- Keyframes ---------- */
@keyframes wiggle {
	0%,
	100% {
		transform: rotate(0);
	}
	25% {
		transform: rotate(-18deg) scale(1.1);
	}
	75% {
		transform: rotate(18deg) scale(1.1);
	}
}

@keyframes portal-open {
	0% {
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
		filter: brightness(3);
	}
	60% {
		opacity: 1;
		filter: brightness(1.6);
	}
	100% {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
		filter: brightness(1);
	}
}

@keyframes portal-close {
	0% {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
	25% {
		transform: translate(-50%, -50%) scale(1.08);
		filter: brightness(1.5);
	}
	100% {
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
		filter: brightness(2);
	}
}

@keyframes portal-spin {
	from {
		transform: scaleY(0.545) rotate(0deg);
	}
	to {
		transform: scaleY(0.545) rotate(-360deg);
	}
}

@keyframes portal-pulse {
	from {
		opacity: 0.7;
		transform: scale(0.96);
	}
	to {
		opacity: 1;
		transform: scale(1.04);
	}
}

@keyframes eye-pulse {
	from {
		opacity: 0.6;
		transform: translate(-50%, -50%) scale(0.85);
	}
	to {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.2);
	}
}

@keyframes spark-drip {
	0% {
		opacity: 0;
		translate: 0 0;
	}
	15% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		translate: 0 70px;
		scale: 0.4;
	}
}

@keyframes squash {
	0% {
		transform: scale(1.12, 0.82);
	}
	45% {
		transform: scale(0.94, 1.08);
	}
	100% {
		transform: scale(1, 1);
	}
}

@keyframes dust {
	0% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(0.3);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(1.3, 1);
	}
}

@keyframes flash {
	0%,
	18% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@keyframes shockwave {
	0% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(0);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(60);
		border-width: 1px;
	}
}

@keyframes bolt {
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.2;
	}
	100% {
		opacity: 0;
	}
}

@keyframes hint-in {
	from {
		opacity: 0;
		transform: translate(-50%, -0.5rem);
	}
	to {
		opacity: 1;
		transform: translateX(-50%);
	}
}
</style>

<style>
.bomb-ring {
	position: absolute;
	border-radius: 50%;
	border: 3px solid rgba(255, 90, 200, 0.85);
	box-shadow: 0 0 18px 4px rgba(255, 40, 170, 0.55);
	transform: translate(-50%, -50%) scale(0.6);
	pointer-events: none;
	z-index: 1;
	animation: bomb-ring 0.65s ease-out forwards;
}

@keyframes bomb-ring {
	from {
		opacity: 0.9;
		transform: translate(-50%, -50%) scale(0.6);
	}
	to {
		opacity: 0;
		transform: translate(-50%, -50%) scale(var(--ring-scale, 3));
	}
}

.bomb-crackle {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: visible;
	z-index: 5;
	pointer-events: none;
	animation: bomb-crackle 0.18s steps(3, end) forwards;
}

.bomb-crackle polyline {
	fill: none;
	stroke: #ffe3f6;
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	filter: drop-shadow(0 0 4px #ff2fa8);
}

@keyframes bomb-crackle {
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.3;
	}
	75% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

.bomb-mote {
	position: absolute;
	width: 26px;
	height: 3px;
	margin: -1.5px -13px;
	border-radius: 2px;
	background: linear-gradient(to right, #ffe0f5, #ff3eb5 50%, transparent);
	box-shadow: 0 0 6px #ff3eb5;
	pointer-events: none;
	z-index: 1;
	animation: bomb-mote 0.45s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes bomb-mote {
	from {
		opacity: 0;
		transform: translate(var(--dx), var(--dy)) rotate(var(--a)) scaleX(0.6);
	}
	20% {
		opacity: 1;
	}
	to {
		opacity: 0.8;
		transform: translate(0, 0) rotate(var(--a)) scaleX(1.6);
	}
}

html.bomb-bump body {
	animation: bomb-bump 0.25s ease-out;
}

@keyframes bomb-bump {
	30% {
		transform: translateY(5px);
	}
	60% {
		transform: translateY(-2px);
	}
}

html.bomb-shake body {
	animation: bomb-shake 0.9s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes bomb-shake {
	10%,
	90% {
		transform: translate(-4px, 3px);
	}
	20%,
	80% {
		transform: translate(8px, -6px);
	}
	30%,
	50%,
	70% {
		transform: translate(-16px, 10px);
	}
	40%,
	60% {
		transform: translate(16px, -10px);
	}
}
</style>
