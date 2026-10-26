<script setup lang="ts">
import { Toggle, useVIntl } from '@modrinth/ui'

import { useAppSettings } from '@/composables/use-app-settings.ts'
import { CUSTOM_FEATURE_DESCRIPTIONS, featureFlagName } from '@/custom/feature-messages'
import { USER_FEATURES } from '@/custom/features'

import { useFeatureFlagSetter } from './use-feature-flag-setter'

const appSettings = useAppSettings()
const { formatMessage } = useVIntl()
const setFeatureFlag = await useFeatureFlagSetter()

const options = Object.keys(USER_FEATURES) as (keyof typeof USER_FEATURES)[]
</script>

<template>
	<div class="flex flex-col gap-6">
		<div v-for="key in options" :key="key" class="flex items-center justify-between gap-4">
			<div>
				<h2 :id="`extras-${key}-label`" class="m-0 text-lg font-semibold text-contrast capitalize">
					{{ featureFlagName(key) }}
				</h2>
				<p class="m-0 mt-1 text-secondary">
					{{ formatMessage(CUSTOM_FEATURE_DESCRIPTIONS[key]) }}
				</p>
			</div>
			<Toggle
				:id="`extras-${key}`"
				:model-value="appSettings.getFeatureFlag(key)"
				:aria-labelledby="`extras-${key}-label`"
				@update:model-value="setFeatureFlag(key, $event)"
			/>
		</div>
	</div>
</template>
