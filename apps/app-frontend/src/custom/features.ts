/**
 * On/off switches for this fork's own features, in one place.
 *
 * The value here is the default for everyone. To flip one on a single machine
 * while testing, turn on Developer mode in Settings and use the Feature flags
 * tab, which lists these alongside Modrinth's own flags.
 *
 * Add a new switch by adding a line here, then read it with
 * `useAppSettings().getFeatureFlag('your_flag')`.
 */
export const CUSTOM_FEATURES = {
	guest_accounts: true,
	bomb_easter_egg: true,
	logo_easter_egg: true,
	getting_started_checklist: false,
}
