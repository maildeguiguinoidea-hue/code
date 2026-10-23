// What the Upgrade check tab shows for each instance, kept here so it's still there after
// visiting another tab (it lives until the app is closed).
import { reactive } from 'vue'

import type { UpgradeResult } from './upgrade-apply'
import type { PreparedCheck, UpgradeReport } from './upgrade-check'

export interface PageState {
	/** game version + loader the saved check was made on */
	basis: string
	target: string
	busy: boolean
	progress: string
	error: string
	errorTitle: string
	report: UpgradeReport | null
	scanNote: string
	confirming: boolean
	upgradeResult: (UpgradeResult & { from: string; to: string }) | null
	showReady: boolean
	prepared: PreparedCheck | null
}

const states = new Map<string, PageState>()

export function stateFor(instanceId: string): PageState {
	let state = states.get(instanceId)
	if (!state) {
		state = reactive<PageState>({
			basis: '',
			target: '',
			busy: false,
			progress: '',
			error: '',
			errorTitle: "Couldn't run the check.",
			report: null,
			scanNote: '',
			confirming: false,
			upgradeResult: null,
			showReady: false,
			prepared: null,
		}) as PageState
		states.set(instanceId, state)
	}
	return state
}
