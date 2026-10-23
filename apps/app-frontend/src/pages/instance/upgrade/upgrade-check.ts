// Checks whether an instance's content would still work on another Minecraft version,
// by asking Modrinth for a compatible version of every installed file (matched by hash).

export type ContentType = 'mod' | 'resourcepack' | 'shaderpack' | 'datapack'

export interface InstalledFile {
	path: string
	fileName: string
	hash: string
	projectType: ContentType
	enabled: boolean
}

export interface ModrinthDependency {
	project_id: string | null
	version_id: string | null
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface ModrinthVersion {
	id: string
	project_id: string
	name: string
	version_number: string
	version_type: 'release' | 'beta' | 'alpha'
	game_versions: string[]
	loaders: string[]
	dependencies: ModrinthDependency[]
}

export interface ModrinthProject {
	id: string
	slug: string
	title: string
	icon_url: string | null
	game_versions: string[]
}

export interface UpgradeApi {
	versionsByHash(hashes: string[]): Promise<Record<string, ModrinthVersion>>
	updatesByHash(
		hashes: string[],
		loaders: string[],
		gameVersion: string,
	): Promise<Record<string, ModrinthVersion>>
	projects(ids: string[]): Promise<ModrinthProject[]>
}

export type ItemStatus = 'ready' | 'beta' | 'missing' | 'unknown'

export interface CheckedItem {
	file: InstalledFile
	project?: ModrinthProject
	current?: ModrinthVersion
	target?: ModrinthVersion
	status: ItemStatus
	/** Missing mods break the game; missing resource packs/shaders usually don't */
	blocking: boolean
	/** Newest release version of Minecraft this project supports */
	latestSupported?: string
}

export interface Conflict {
	item: CheckedItem
	conflictsWith: CheckedItem
}

export interface UpgradeReport {
	gameVersion: string
	loader: string
	items: CheckedItem[]
	blocking: CheckedItem[]
	beta: CheckedItem[]
	unknown: CheckedItem[]
	optionalMissing: CheckedItem[]
	ready: CheckedItem[]
	conflicts: Conflict[]
	/** Required libraries the new versions need that aren't installed yet (added automatically) */
	newDependencies: string[]
	disabledCount: number
	canUpgrade: boolean
}

export interface PreparedCheck {
	files: InstalledFile[]
	disabledCount: number
	current: Record<string, ModrinthVersion>
	projects: Record<string, ModrinthProject>
	/** Release versions of Minecraft, newest first */
	releaseOrder: string[]
}

const API_URL = 'https://api.modrinth.com/v2/'
const BATCH = 200

function chunk<T>(list: T[], size: number): T[][] {
	const out: T[][] = []
	for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
	return out
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(API_URL + path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!response.ok) throw new Error(`Modrinth API ${path} failed (${response.status})`)
	return (await response.json()) as T
}

export const modrinthUpgradeApi: UpgradeApi = {
	async versionsByHash(hashes) {
		const result: Record<string, ModrinthVersion> = {}
		for (const part of chunk(hashes, BATCH)) {
			Object.assign(result, await postJson('version_files', { hashes: part, algorithm: 'sha1' }))
		}
		return result
	},
	async updatesByHash(hashes, loaders, gameVersion) {
		const result: Record<string, ModrinthVersion> = {}
		for (const part of chunk(hashes, BATCH)) {
			Object.assign(
				result,
				await postJson('version_files/update', {
					hashes: part,
					algorithm: 'sha1',
					loaders,
					game_versions: [gameVersion],
				}),
			)
		}
		return result
	},
	async projects(ids) {
		const result: ModrinthProject[] = []
		for (const part of chunk(ids, 100)) {
			const response = await fetch(`${API_URL}projects?ids=${encodeURIComponent(JSON.stringify(part))}`)
			if (!response.ok) throw new Error(`Modrinth API projects failed (${response.status})`)
			result.push(...((await response.json()) as ModrinthProject[]))
		}
		return result
	},
}

/** Which Modrinth "loaders" a file of this type can use on an instance with this loader */
export function loadersFor(type: ContentType, loader: string): string[] {
	switch (type) {
		case 'mod':
			// Quilt runs Fabric mods too
			return loader === 'quilt' ? ['quilt', 'fabric'] : [loader]
		case 'resourcepack':
			return ['minecraft']
		case 'shaderpack':
			return ['iris', 'optifine', 'canvas', 'vanilla']
		case 'datapack':
			return ['datapack']
	}
}

/** Fetches what's installed now (done once, then reused for every version checked) */
export async function prepareCheck(
	files: InstalledFile[],
	releaseOrder: string[],
	api: UpgradeApi = modrinthUpgradeApi,
): Promise<PreparedCheck> {
	const enabled = files.filter((file) => file.enabled && file.hash)
	const current = await api.versionsByHash(enabled.map((file) => file.hash))
	const projectIds = [...new Set(Object.values(current).map((version) => version.project_id))]
	const projectList = projectIds.length ? await api.projects(projectIds) : []
	return {
		files: enabled,
		disabledCount: files.length - enabled.length,
		current,
		projects: Object.fromEntries(projectList.map((project) => [project.id, project])),
		releaseOrder,
	}
}

function newestRelease(project: ModrinthProject | undefined, releaseOrder: string[]): string | undefined {
	if (!project) return undefined
	const supported = new Set(project.game_versions)
	return releaseOrder.find((version) => supported.has(version))
}

/** Checks every installed file against one target version + loader */
export async function checkTarget(
	prepared: PreparedCheck,
	gameVersion: string,
	loader: string,
	api: UpgradeApi = modrinthUpgradeApi,
): Promise<UpgradeReport> {
	// One request per kind of loader list (mods, resource packs, shaders, datapacks)
	const groups = new Map<string, InstalledFile[]>()
	for (const file of prepared.files) {
		if (!prepared.current[file.hash]) continue
		const key = loadersFor(file.projectType, loader).join('+')
		groups.set(key, [...(groups.get(key) ?? []), file])
	}
	const targets: Record<string, ModrinthVersion> = {}
	for (const [key, files] of groups) {
		Object.assign(
			targets,
			await api.updatesByHash(
				files.map((file) => file.hash),
				key.split('+'),
				gameVersion,
			),
		)
	}

	const items: CheckedItem[] = prepared.files.map((file) => {
		const current = prepared.current[file.hash]
		if (!current) return { file, status: 'unknown', blocking: false }
		const project = prepared.projects[current.project_id]
		let target: ModrinthVersion | undefined = targets[file.hash]
		// Only count it if it really lists the target version and a matching loader
		if (
			target &&
			(!target.game_versions.includes(gameVersion) ||
				!target.loaders.some((l) => loadersFor(file.projectType, loader).includes(l)))
		) {
			target = undefined
		}
		const status: ItemStatus = !target ? 'missing' : target.version_type === 'release' ? 'ready' : 'beta'
		return {
			file,
			project,
			current,
			target,
			status,
			blocking: status === 'missing' && file.projectType === 'mod',
			latestSupported: status === 'missing' ? newestRelease(project, prepared.releaseOrder) : undefined,
		}
	})

	// Conflicts: a new version that declares another installed mod as incompatible
	const byProject = new Map(items.filter((i) => i.project).map((i) => [i.project!.id, i]))
	const conflicts: Conflict[] = []
	const newDependencies = new Set<string>()
	for (const item of items) {
		for (const dependency of item.target?.dependencies ?? []) {
			if (!dependency.project_id) continue
			const other = byProject.get(dependency.project_id)
			if (dependency.dependency_type === 'incompatible' && other && other !== item) {
				conflicts.push({ item, conflictsWith: other })
			}
			if (dependency.dependency_type === 'required' && !other) {
				newDependencies.add(dependency.project_id)
			}
		}
	}

	const blocking = items.filter((i) => i.blocking)
	return {
		gameVersion,
		loader,
		items,
		blocking,
		beta: items.filter((i) => i.status === 'beta'),
		unknown: items.filter((i) => i.status === 'unknown'),
		optionalMissing: items.filter((i) => i.status === 'missing' && !i.blocking),
		ready: items.filter((i) => i.status === 'ready'),
		conflicts,
		newDependencies: [...newDependencies],
		disabledCount: prepared.disabledCount,
		canUpgrade: blocking.length === 0 && conflicts.length === 0,
	}
}

/** Release versions newer than the current one, newest first */
export function newerReleases(releaseOrder: string[], current: string): string[] {
	const index = releaseOrder.indexOf(current)
	return index === -1 ? releaseOrder.slice(0, 15) : releaseOrder.slice(0, index)
}

export function displayName(item: CheckedItem): string {
	return item.project?.title ?? item.file.fileName.replace(/\.(jar|zip)(\.disabled)?$/, '')
}
