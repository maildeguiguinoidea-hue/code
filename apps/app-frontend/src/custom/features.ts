/**
 * On/off switches for this fork's own features, in one place.
 *
 * The value here is the default for everyone. Every switch here is listed
 * under "Added in this fork" in the Feature flags tab, which needs Developer
 * mode in Settings. The ones in USER_FEATURES are also in the Extras tab, which
 * everyone can see. Each switch needs a name and description in
 * `feature-messages.ts`.
 *
 * Add a new switch by adding a line here, then read it with
 * `useAppSettings().getFeatureFlag('your_flag')`.
 */
export const USER_FEATURES = {
	bomb_easter_egg: true,
	logo_easter_egg: true,
	getting_started_checklist: false,
	/** Blocks ads and Aternos's anti-adblock checks in the Aternos panel */
	aternos_adblock: true,
	/** Hides Aternos's help articles, promotions and other tips */
	aternos_hide_tips: false,
}

/** Experiments, only reachable with Developer mode on */
export const DEV_FEATURES = {}

export const CUSTOM_FEATURES = { ...USER_FEATURES, ...DEV_FEATURES }
