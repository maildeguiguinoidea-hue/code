import { defineMessages, type MessageDescriptor } from '@modrinth/ui'

import type { CUSTOM_FEATURES } from './features'

const messages = defineMessages({
	bombDescription: {
		id: 'app.custom-features.bomb-easter-egg.description',
		defaultMessage: 'Show the bomb button next to the back and forward arrows.',
	},
	logoDescription: {
		id: 'app.custom-features.logo-easter-egg.description',
		defaultMessage: 'Double-click the Modrinth logo in the title bar for a surprise.',
	},
	checklistDescription: {
		id: 'app.custom-features.getting-started-checklist.description',
		defaultMessage: 'Show the getting started checklist in the sidebar.',
	},
	aternosAdblockDescription: {
		id: 'app.custom-features.aternos-adblock.description',
		defaultMessage: "Block ads on the Aternos page and get past Aternos's ad blocker check.",
	},
	aternosTipsDescription: {
		id: 'app.custom-features.aternos-hide-tips.description',
		defaultMessage: 'Hide help articles, promotions and other tips on the Aternos page.',
	},
})

/** What each of this fork's switches does, shown under its name in Settings */
export const CUSTOM_FEATURE_DESCRIPTIONS: Record<keyof typeof CUSTOM_FEATURES, MessageDescriptor> =
	{
		bomb_easter_egg: messages.bombDescription,
		logo_easter_egg: messages.logoDescription,
		getting_started_checklist: messages.checklistDescription,
		aternos_adblock: messages.aternosAdblockDescription,
		aternos_hide_tips: messages.aternosTipsDescription,
	}

/** A flag's name as Settings shows it, such as "bomb easter egg" */
export function featureFlagName(flag: string): string {
	return flag.replaceAll('_', ' ')
}
