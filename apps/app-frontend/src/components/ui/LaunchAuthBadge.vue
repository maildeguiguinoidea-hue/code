<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { get_launch_auth_status, type LaunchAuthStatus } from '@/helpers/launch-auth-status'

const POLL_INTERVAL_MS = 15_000

const status = ref<LaunchAuthStatus>({ mode: 'unknown' })
let timer: ReturnType<typeof setInterval> | undefined

async function refresh() {
	try {
		status.value = await get_launch_auth_status()
	} catch (err) {
		console.warn('Failed to read launch auth status', err)
	}
}

const offline = computed(() => (status.value.mode === 'offline_cached' ? status.value : null))
const sinceLabel = computed(() =>
	offline.value ? new Date(offline.value.since).toLocaleTimeString() : '',
)

onMounted(() => {
	refresh()
	timer = setInterval(refresh, POLL_INTERVAL_MS)
	window.addEventListener('focus', refresh)
})

onUnmounted(() => {
	clearInterval(timer)
	window.removeEventListener('focus', refresh)
})

defineExpose({ refresh })
</script>

<template>
	<span
		v-if="offline"
		class="launch-auth-badge"
		role="status"
		:title="`Microsoft servers unreachable since ${sinceLabel}. Servers that verify accounts won't accept this session.`"
	>
		<span class="dot" aria-hidden="true" />
		Launching offline with cached profile ({{ offline.username }})
	</span>
</template>

<style scoped>
.launch-auth-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.2rem 0.6rem;
	border-radius: 999px;
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--color-orange);
	background: color-mix(in srgb, var(--color-orange) 15%, transparent);
}

.dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
	background: currentColor;
}
</style>
