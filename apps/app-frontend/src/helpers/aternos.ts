import { invoke } from '@tauri-apps/api/core'

export type AternosBounds = { x: number; y: number; width: number; height: number }

/** The app's theme colors, which the Aternos page is recolored with */
export type AternosPalette = {
	dark: boolean
	hideTips: boolean
	accentContrast: string
	bg: string
	raisedBg: string
	buttonBg: string
	secondary: string
	contrast: string
	brand: string
	red: string
	green: string
	orange: string
}

export async function aternos_show(bounds: AternosBounds, adblock: boolean): Promise<void> {
	return await invoke('plugin:aternos|aternos_show', { bounds, adblock })
}

/** Goes back to Aternos's list of servers */
export async function aternos_go_home(): Promise<void> {
	return await invoke('plugin:aternos|aternos_go_home')
}

export async function aternos_reload(): Promise<void> {
	return await invoke('plugin:aternos|aternos_reload')
}

export async function aternos_hide(): Promise<void> {
	return await invoke('plugin:aternos|aternos_hide')
}

/** Hides the Aternos view while something, such as a modal, is drawn over it */
export async function aternos_update_hold(acquire: boolean): Promise<void> {
	return await invoke('plugin:aternos|aternos_update_hold', { acquire })
}

/** `background` is the app's background as red, green and blue */
export async function aternos_set_theme(
	theme: AternosPalette,
	background: [number, number, number],
): Promise<void> {
	return await invoke('plugin:aternos|aternos_set_theme', { theme, background })
}
