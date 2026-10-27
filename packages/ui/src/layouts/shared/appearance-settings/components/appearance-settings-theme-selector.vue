<script setup lang="ts" generic="T extends string">
import { MoonIcon, RadioButtonCheckedIcon, RadioButtonIcon, SunIcon } from '@modrinth/assets'

import { defineMessages, useVIntl } from '#ui/composables/i18n'

const { formatMessage } = useVIntl()

const { ariaLabel, modelValue, themeOptions, systemThemeColor, preferredDarkTheme } = defineProps<{
	ariaLabel: string
	modelValue: T
	themeOptions: readonly T[]
	systemThemeColor: T
	preferredDarkTheme: T
}>()

const emit = defineEmits<{
	'update:modelValue': [theme: T]
}>()

const themeLabels = defineMessages({
	system: {
		id: 'settings.display.theme.system',
		defaultMessage: 'Sync with system',
	},
	light: {
		id: 'settings.display.theme.light',
		defaultMessage: 'Light',
	},
	dark: {
		id: 'settings.display.theme.dark',
		defaultMessage: 'Dark',
	},
	oled: {
		id: 'settings.display.theme.oled',
		defaultMessage: 'OLED',
	},
	purple: {
		id: 'settings.display.theme.purple',
		defaultMessage: 'Purple',
	},
	christmas: {
		id: 'settings.display.theme.christmas',
		defaultMessage: 'Christmas',
	},
	retro: {
		id: 'settings.display.theme.retro',
		defaultMessage: 'Retro',
	},
})

const themeTooltips = defineMessages({
	preferredLight: {
		id: 'settings.display.theme.preferred-light-theme',
		defaultMessage: 'Preferred light theme',
	},
	preferredDark: {
		id: 'settings.display.theme.preferred-dark-theme',
		defaultMessage: 'Preferred dark theme',
	},
})

function formatTheme(theme: T): string {
	const message = themeLabels[theme as keyof typeof themeLabels]
	return message ? formatMessage(message) : theme
}

function getPreviewClass(option: T): string {
	const base = option === 'system' ? systemThemeColor : option
	return base.endsWith('-mode') ? base : `${base}-mode`
}
</script>

<template>
	<div class="theme-options" role="group" :aria-label="ariaLabel">
		<button
			v-for="option in themeOptions"
			:key="option"
			type="button"
			class="preview-radio button-base"
			:class="{ selected: modelValue === option }"
			:aria-pressed="modelValue === option"
			@click="emit('update:modelValue', option)"
		>
			<div class="preview" :class="getPreviewClass(option)" aria-hidden="true">
				<div class="example-card rounded-lg border border-solid border-surface-4 bg-surface-3">
					<div class="example-icon"></div>
					<div class="example-text-1"></div>
					<div class="example-text-2"></div>
				</div>
			</div>
			<div class="label">
				<RadioButtonCheckedIcon
					v-if="modelValue === option"
					class="radio shrink-0"
					aria-hidden="true"
				/>
				<RadioButtonIcon v-else class="radio shrink-0" aria-hidden="true" />
				{{ formatTheme(option) }}
				<SunIcon
					v-if="'light' === option"
					v-tooltip="formatMessage(themeTooltips.preferredLight)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
				<MoonIcon
					v-else-if="option === preferredDarkTheme"
					v-tooltip="formatMessage(themeTooltips.preferredDark)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
			</div>
		</button>
	</div>
</template>

<style scoped lang="scss">
.theme-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	gap: var(--gap-lg);

	.preview {
		&.light-mode {
			@extend .light-mode;
		}

		&.dark-mode {
			@extend .dark-mode;
		}

		&.oled-mode {
			@extend .oled-mode;
		}

		&.retro-mode {
			@extend .retro-mode;
		}

		&.purple-mode {
			@extend .purple-mode;
		}

		&.christmas-mode {
			@extend .christmas-mode;
			position: relative;
			overflow: hidden;
			image-rendering: pixelated;
			background:
				url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 5' width='5' height='5' shape-rendering='crispEdges'%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='1' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='2' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='2' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='4' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='3' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='4' width='1' height='1' fill='%23ffffff'/%3E%3C/svg%3E")
					18% 55% / 10px 10px no-repeat,
				url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 7 7' width='7' height='7' shape-rendering='crispEdges'%3E%3Crect x='0' y='0' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='0' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='6' y='0' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='5' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='2' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='3' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='4' y='3' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='4' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='5' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='5' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='5' y='5' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='6' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='6' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='6' y='6' width='1' height='1' fill='%23ffffff'/%3E%3C/svg%3E")
					62% 40% / 14px 14px no-repeat,
				url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 5' width='5' height='5' shape-rendering='crispEdges'%3E%3Crect x='2' y='0' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='1' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='3' y='1' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='2' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='2' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='4' y='2' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='3' width='1' height='1' fill='%23cfe8ff'/%3E%3Crect x='3' y='3' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='4' width='1' height='1' fill='%23ffffff'/%3E%3C/svg%3E")
					86% 72% / 10px 10px no-repeat,
				linear-gradient(160deg, #13261b 0%, #08110c 100%);

			/* pixel garland across the top and a strip of snow along the bottom */
			&::before,
			&::after {
				content: '';
				position: absolute;
				inset: 0 0 auto;
				height: 16px;
				background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 8' width='16' height='8' shape-rendering='crispEdges'%3E%3Crect x='2' y='0' width='1' height='1' fill='%234caf50'/%3E%3Crect x='5' y='0' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='9' y='0' width='1' height='1' fill='%234caf50'/%3E%3Crect x='13' y='0' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='1' y='1' width='1' height='1' fill='%234caf50'/%3E%3Crect x='2' y='1' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='5' y='1' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='7' y='1' width='1' height='1' fill='%234caf50'/%3E%3Crect x='9' y='1' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='12' y='1' width='1' height='1' fill='%234caf50'/%3E%3Crect x='13' y='1' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='0' y='2' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='1' y='2' width='1' height='1' fill='%237bd67f'/%3E%3Crect x='2' y='2' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='4' y='2' width='1' height='1' fill='%234caf50'/%3E%3Crect x='5' y='2' width='4' height='1' fill='%232e7d32'/%3E%3Crect x='9' y='2' width='1' height='1' fill='%237bd67f'/%3E%3Crect x='10' y='2' width='3' height='1' fill='%232e7d32'/%3E%3Crect x='13' y='2' width='1' height='1' fill='%234caf50'/%3E%3Crect x='14' y='2' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='0' y='3' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='2' y='3' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='3' y='3' width='3' height='1' fill='%232e7d32'/%3E%3Crect x='6' y='3' width='1' height='1' fill='%237bd67f'/%3E%3Crect x='7' y='3' width='3' height='1' fill='%232e7d32'/%3E%3Crect x='10' y='3' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='11' y='3' width='3' height='1' fill='%232e7d32'/%3E%3Crect x='14' y='3' width='1' height='1' fill='%237bd67f'/%3E%3Crect x='15' y='3' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='0' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='1' y='4' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='3' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='4' y='4' width='3' height='1' fill='%232e7d32'/%3E%3Crect x='7' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='8' y='4' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='9' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='10' y='4' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='12' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='13' y='4' width='2' height='1' fill='%232e7d32'/%3E%3Crect x='15' y='4' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='0' y='5' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='1' y='5' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='2' y='5' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='3' y='5' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='4' y='5' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='5' y='5' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='6' y='5' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='7' y='5' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='8' y='5' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='9' y='5' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='10' y='5' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='11' y='5' width='2' height='1' fill='%231f5a2a'/%3E%3Crect x='13' y='5' width='1' height='1' fill='%232e7d32'/%3E%3Crect x='14' y='5' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='15' y='5' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='1' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='2' y='6' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='4' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='5' y='6' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='6' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='8' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='9' y='6' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='11' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='12' y='6' width='1' height='1' fill='%231f5a2a'/%3E%3Crect x='13' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='15' y='6' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='2' y='7' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='5' y='7' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='9' y='7' width='1' height='1' fill='%23123d1b'/%3E%3Crect x='12' y='7' width='1' height='1' fill='%23123d1b'/%3E%3C/svg%3E")
					repeat-x 0 0 / 32px 16px;
			}

			&::after {
				inset: auto 0 0;
				height: 12px;
				background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 6' width='16' height='6' shape-rendering='crispEdges'%3E%3Crect x='4' y='0' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='12' y='0' width='2' height='1' fill='%23ffffff'/%3E%3Crect x='2' y='1' width='7' height='1' fill='%23ffffff'/%3E%3Crect x='11' y='1' width='4' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='2' width='4' height='1' fill='%23ffffff'/%3E%3Crect x='4' y='2' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='5' y='2' width='8' height='1' fill='%23ffffff'/%3E%3Crect x='13' y='2' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='14' y='2' width='2' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='3' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='1' y='3' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='2' y='3' width='5' height='1' fill='%23ffffff'/%3E%3Crect x='7' y='3' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='8' y='3' width='3' height='1' fill='%23ffffff'/%3E%3Crect x='11' y='3' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='12' y='3' width='4' height='1' fill='%23ffffff'/%3E%3Crect x='0' y='4' width='2' height='1' fill='%23dbeeff'/%3E%3Crect x='2' y='4' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='3' y='4' width='2' height='1' fill='%23dbeeff'/%3E%3Crect x='5' y='4' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='6' y='4' width='3' height='1' fill='%23dbeeff'/%3E%3Crect x='9' y='4' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='10' y='4' width='2' height='1' fill='%23dbeeff'/%3E%3Crect x='12' y='4' width='1' height='1' fill='%23ffffff'/%3E%3Crect x='13' y='4' width='3' height='1' fill='%23dbeeff'/%3E%3Crect x='0' y='5' width='2' height='1' fill='%23a9c9e8'/%3E%3Crect x='2' y='5' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='3' y='5' width='2' height='1' fill='%23a9c9e8'/%3E%3Crect x='5' y='5' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='6' y='5' width='3' height='1' fill='%23a9c9e8'/%3E%3Crect x='9' y='5' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='10' y='5' width='2' height='1' fill='%23a9c9e8'/%3E%3Crect x='12' y='5' width='1' height='1' fill='%23dbeeff'/%3E%3Crect x='13' y='5' width='3' height='1' fill='%23a9c9e8'/%3E%3C/svg%3E")
					repeat-x 0 0 / 32px 12px;
			}
		}
	}

	.preview .example-card {
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template: 'icon text1' 'icon text2';
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		outline: 2px solid transparent;

		.example-icon {
			grid-area: icon;
			width: 2rem;
			height: 2rem;
			background-color: var(--color-button-bg);
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1,
		.example-text-2 {
			height: 0.5rem;
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1 {
			grid-area: text1;
			width: 100%;
			background-color: var(--color-base);
		}

		.example-text-2 {
			grid-area: text2;
			width: 60%;
			background-color: var(--color-secondary);
		}
	}
}
</style>
