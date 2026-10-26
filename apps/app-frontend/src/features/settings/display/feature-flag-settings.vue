<script setup lang="ts">
import { SearchIcon } from '@modrinth/assets'
import { Button, Input, Toggle, useVIntl } from '@modrinth/ui'
import Fuse from 'fuse.js'
import { computed, ref } from 'vue'

import {
	DEFAULT_FEATURE_FLAGS,
	type FeatureFlag,
	useAppSettings,
} from '@/composables/use-app-settings.ts'
import { CUSTOM_FEATURE_DESCRIPTIONS, featureFlagName } from '@/custom/feature-messages'
import { CUSTOM_FEATURES } from '@/custom/features'

import { useFeatureFlagSetter } from './use-feature-flag-setter'

const appSettings = useAppSettings()
const { formatMessage } = useVIntl()
const setFeatureFlag = await useFeatureFlagSetter()

const searchQuery = ref('')

function isCustom(flag: FeatureFlag): flag is keyof typeof CUSTOM_FEATURES {
	return flag in CUSTOM_FEATURES
}

const allFlags = computed(() =>
	(Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlag[]).map((key) => ({
		key,
		title: featureFlagName(key),
		description: isCustom(key) ? formatMessage(CUSTOM_FEATURE_DESCRIPTIONS[key]) : null,
	})),
)

const fuse = computed(
	() =>
		new Fuse(allFlags.value, {
			keys: ['title'],
			threshold: 0.4,
		}),
)

const filteredFlags = computed(() => {
	if (!searchQuery.value.trim()) {
		return allFlags.value
	}
	return fuse.value.search(searchQuery.value).map((result) => result.item)
})

const groups = computed(() =>
	[
		{
			title: 'Added in this fork',
			flags: filteredFlags.value.filter((flag) => isCustom(flag.key)),
		},
		{
			title: 'Modrinth',
			flags: filteredFlags.value.filter((flag) => !isCustom(flag.key)),
		},
	].filter((group) => group.flags.length > 0),
)
</script>
<template>
	<div class="flex flex-col gap-4">
		<Input
			v-model="searchQuery"
			type="search"
			:icon="SearchIcon"
			placeholder="Search flags..."
			wrapper-class="w-full"
		/>
		<section
			v-for="group in groups"
			:key="group.title"
			class="overflow-hidden rounded-2xl border border-solid border-divider"
		>
			<div
				class="flex items-center gap-2 border-0 border-b border-solid border-divider bg-bg-raised px-4 py-3"
			>
				<h2 class="m-0 text-sm font-bold uppercase tracking-wider text-secondary">
					{{ group.title }}
				</h2>
				<span class="rounded-full bg-button-bg px-2 text-xs font-semibold text-secondary">
					{{ group.flags.length }}
				</span>
			</div>
			<div class="flex flex-col gap-4 p-4">
				<div
					v-for="flag in group.flags"
					:key="flag.key"
					class="flex items-center justify-between gap-4"
				>
					<div>
						<h3 class="m-0 text-lg font-semibold text-contrast capitalize">
							{{ flag.title }}
						</h3>
						<p v-if="flag.description" class="m-0 mt-1 text-secondary">{{ flag.description }}</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Button
							type="quiet"
							:disabled="appSettings.getFeatureFlag(flag.key) === DEFAULT_FEATURE_FLAGS[flag.key]"
							@click="setFeatureFlag(flag.key, DEFAULT_FEATURE_FLAGS[flag.key])"
						>
							Reset to default
						</Button>
						<Toggle
							:id="`feature-flag-${flag.key}`"
							:model-value="appSettings.getFeatureFlag(flag.key)"
							@update:model-value="setFeatureFlag(flag.key, !appSettings.getFeatureFlag(flag.key))"
						/>
					</div>
				</div>
			</div>
		</section>
		<p v-if="filteredFlags.length === 0" class="text-center text-secondary">
			No flags found matching "{{ searchQuery }}"
		</p>
	</div>
</template>
