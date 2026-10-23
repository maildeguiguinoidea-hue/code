// Moves an instance to the version an UpgradeReport was made for: removes the mods that have no
// version there, switches the instance's Minecraft + loader version, then updates every file.

import type { CheckedItem, UpgradeReport } from './upgrade-check'
import { displayName } from './upgrade-check'

interface LoaderVersion {
	id: string
	stable: boolean
}

interface LoaderManifest {
	gameVersions: { id: string; versionGroup?: string; loaders: LoaderVersion[] }[]
	versionGroups?: { id: string; loaders: LoaderVersion[] }[]
}

export interface UpgradeActions {
	loaderManifest(loader: string): Promise<LoaderManifest>
	removeFile(path: string): Promise<void>
	setVersion(gameVersion: string, loaderVersion: string | undefined): Promise<void>
	switchFile(path: string, versionId: string): Promise<void>
	installGame(): Promise<void>
	/** Only given when the instance came from a modpack */
	unlinkModpack?: () => Promise<void>
}

/** App errors come back as objects, turn them into something readable */
export function errorText(e: unknown): string {
	if (e instanceof Error) return e.message
	if (typeof e === 'string') return e
	if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
	return JSON.stringify(e)
}

export interface UpgradeResult {
	removed: string[]
	updated: string[]
	failed: { name: string; error: string }[]
}

/** Loader version picked the same way the instance settings do: the newest one (stable if possible) */
export function pickLoaderVersion(manifest: LoaderManifest, gameVersion: string): string | undefined {
	const entry = manifest.gameVersions.find((v) => v.id === gameVersion)
	let loaders: LoaderVersion[]
	if (entry?.versionGroup) {
		loaders = manifest.versionGroups?.find((g) => g.id === entry.versionGroup)?.loaders ?? []
	} else {
		// Fabric and Quilt list every Minecraft version, but keep the loader versions under one
		// placeholder entry that works for all of them
		const placeholder = manifest.gameVersions.find((v) => v.id === '${modrinth.gameVersion}')
		loaders = placeholder ? (entry ? placeholder.loaders : []) : (entry?.loaders ?? [])
	}
	return (loaders.find((l) => l.stable) ?? loaders[0])?.id
}

export function toRemove(report: UpgradeReport): CheckedItem[] {
	return report.blocking
}

export function toUpdate(report: UpgradeReport): CheckedItem[] {
	return report.items.filter((item) => item.target && item.target.id !== item.current?.id)
}

export async function applyUpgrade(
	report: UpgradeReport,
	actions: UpgradeActions,
	onProgress: (message: string) => void = () => {},
): Promise<UpgradeResult> {
	const result: UpgradeResult = { removed: [], updated: [], failed: [] }

	let loaderVersion: string | undefined
	if (report.loader !== 'vanilla') {
		onProgress(`Finding a ${report.loader} version for ${report.gameVersion}…`)
		loaderVersion = pickLoaderVersion(await actions.loaderManifest(report.loader), report.gameVersion)
		// Nothing has been touched yet, so it's safe to stop here
		if (!loaderVersion) {
			throw new Error(`${report.loader} isn't available for Minecraft ${report.gameVersion} yet.`)
		}
	}

	for (const item of toRemove(report)) {
		onProgress(`Deleting ${displayName(item)}…`)
		try {
			await actions.removeFile(item.file.path)
			result.removed.push(displayName(item))
		} catch (e) {
			result.failed.push({ name: displayName(item), error: errorText(e) })
		}
	}

	onProgress(`Switching to ${report.gameVersion}…`)
	await actions.setVersion(report.gameVersion, loaderVersion)

	const updates = toUpdate(report)
	for (const [i, item] of updates.entries()) {
		onProgress(`Updating ${displayName(item)} (${i + 1}/${updates.length})…`)
		try {
			await actions.switchFile(item.file.path, item.target!.id)
			result.updated.push(displayName(item))
		} catch (e) {
			result.failed.push({ name: displayName(item), error: errorText(e) })
		}
	}

	// The pack no longer matches the modpack it came from, so stop treating its files as modpack files
	if (actions.unlinkModpack) {
		onProgress('Unlinking from the modpack…')
		await actions.unlinkModpack()
	}

	onProgress(`Downloading Minecraft ${report.gameVersion}…`)
	await actions.installGame()
	return result
}
