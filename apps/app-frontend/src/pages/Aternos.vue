<script setup lang="ts">
import { HomeIcon, RefreshCwIcon, ServerIcon } from '@modrinth/assets'
import { defineMessages, IconButton, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useAppSettings } from '@/composables/use-app-settings'
import {
	aternos_go_home,
	aternos_hide,
	aternos_reload,
	aternos_set_theme,
	aternos_show,
	type AternosPalette,
} from '@/helpers/aternos'
import { useRootBreadcrumb } from '@/shared/breadcrumbs'

const { handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()
const appSettings = useAppSettings()
const host = ref<HTMLElement | null>(null)

useRootBreadcrumb({
	slot: 'root',
	id: 'aternos',
	label: () => formatMessage(messages.title),
	visual: { type: 'icon', component: ServerIcon },
})

function goHome() {
	aternos_go_home().catch(handleError)
}

function reload() {
	aternos_reload().catch(handleError)
}

/** The Aternos view is a separate native view, so it is placed over this element's area */
function place() {
	if (!host.value) return
	const rect = host.value.getBoundingClientRect()
	aternos_show(
		{ x: rect.left, y: rect.top, width: rect.width, height: rect.height },
		appSettings.getFeatureFlag('aternos_adblock'),
	).catch(handleError)
}

function readPalette(): AternosPalette {
	const style = getComputedStyle(document.body)
	const color = (name: string) => style.getPropertyValue(name).trim()
	return {
		dark: !document.documentElement.classList.contains('light-mode'),
		hideTips: appSettings.getFeatureFlag('aternos_hide_tips'),
		accentContrast: color('--color-accent-contrast'),
		bg: color('--color-bg'),
		raisedBg: color('--color-raised-bg'),
		buttonBg: color('--color-button-bg'),
		secondary: color('--color-secondary'),
		contrast: color('--color-contrast'),
		brand: color('--color-brand'),
		red: color('--color-red'),
		green: color('--color-green'),
		orange: color('--color-orange'),
	}
}

/** The app's background as red, green and blue, whatever format the theme writes it in */
function readBackground(): [number, number, number] {
	const [red = 0, green = 0, blue = 0] =
		getComputedStyle(document.body)
			.backgroundColor.match(/\d+(\.\d+)?/g)
			?.map(Number) ?? []
	return [red, green, blue]
}

async function sendTheme() {
	await aternos_set_theme(readPalette(), readBackground()).catch(handleError)
}

const resizeObserver = new ResizeObserver(place)
watch(() => appSettings.getFeatureFlag('aternos_adblock'), place)
watch(() => appSettings.getFeatureFlag('aternos_hide_tips'), sendTheme)
const themeObserver = new MutationObserver(sendTheme)

onMounted(async () => {
	// The view is made with the theme it is first shown with, so it goes first
	await sendTheme()
	place()
	if (host.value) resizeObserver.observe(host.value)
	window.addEventListener('resize', place)
	for (const element of [document.documentElement, document.body]) {
		themeObserver.observe(element, { attributes: true, attributeFilter: ['class'] })
	}
})

onBeforeUnmount(() => {
	resizeObserver.disconnect()
	themeObserver.disconnect()
	window.removeEventListener('resize', place)
	aternos_hide().catch(handleError)
})

const messages = defineMessages({
	title: { id: 'app.aternos.title', defaultMessage: 'Aternos' },
	servers: { id: 'app.aternos.servers', defaultMessage: 'Servers' },
	reload: { id: 'app.aternos.reload', defaultMessage: 'Reload' },
})
</script>

<template>
	<Teleport to="#title-bar-page-actions">
		<IconButton
			v-tooltip="formatMessage(messages.servers)"
			type="outlined"
			:label="formatMessage(messages.servers)"
			class="!h-7 !min-w-7 !w-7 !border !border-surface-4 !p-0"
			@click="goHome"
		>
			<HomeIcon class="!size-4 !text-primary" />
		</IconButton>
		<IconButton
			v-tooltip="formatMessage(messages.reload)"
			type="outlined"
			:label="formatMessage(messages.reload)"
			class="!h-7 !min-w-7 !w-7 !border !border-surface-4 !p-0"
			@click="reload"
		>
			<RefreshCwIcon class="!size-4 !text-primary" />
		</IconButton>
	</Teleport>
	<div ref="host" class="h-full w-full" />
</template>
