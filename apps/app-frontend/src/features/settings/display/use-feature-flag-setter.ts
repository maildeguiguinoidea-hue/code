import { ref, watch } from 'vue'

import { type FeatureFlag, useAppSettings } from '@/composables/use-app-settings.ts'
import { get as getSettings, set as setSettings } from '@/helpers/settings.ts'

/** Returns a function that turns a feature flag on or off and saves it. */
export async function useFeatureFlagSetter() {
	const appSettings = useAppSettings()
	const settings = ref(await getSettings())

	watch(
		settings,
		async () => {
			await setSettings(settings.value)
		},
		{ deep: true },
	)

	return (key: FeatureFlag, value: boolean) => {
		appSettings.featureFlags[key] = value
		settings.value.feature_flags[key] = value
	}
}
