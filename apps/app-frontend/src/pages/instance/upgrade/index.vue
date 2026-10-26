<template>
	<div class="upgrade-check flex flex-col gap-4">
		<section class="card">
			<h2 class="m-0 text-xl font-extrabold text-contrast">Upgrade check</h2>
			<p class="m-0 mt-1 text-secondary">
				Checks every mod in this instance against a newer Minecraft version, so you know what breaks
				before you change anything. Nothing changes until you press Upgrade.
			</p>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<span class="text-secondary"> {{ instance.game_version }} · {{ loaderLabel }} → </span>
				<Combobox
					v-model="target"
					class="w-max"
					:options="versionOptions"
					:disabled="busy || !choices.length"
					searchable
					search-placeholder="Search versions"
					placeholder="Pick a version"
					:max-height="320"
					dropdown-min-width="160px"
				/>
				<Button type="colored" color="brand" :disabled="busy || !target" @click="runCheck">
					<SearchIcon class="size-5" />
					Check
				</Button>
				<Button type="outlined" :disabled="busy || !choices.length" @click="findNewest">
					<ArrowBigUpDashIcon class="size-5" />
					Find newest that works
				</Button>
			</div>

			<p v-if="instance.loader === 'vanilla'" class="m-0 mt-3 text-secondary">
				This is a vanilla instance, only resource packs, shaders and datapacks are checked.
			</p>
			<p v-if="!choices.length && releases.length" class="m-0 mt-3 text-secondary">
				You're already on the newest release of Minecraft.
			</p>
		</section>

		<section
			v-if="upgradeResult && !busy"
			class="card verdict"
			:class="upgradeResult.failed.length ? 'bad' : 'good'"
		>
			<CheckCircleIcon v-if="!upgradeResult.failed.length" class="size-6 shrink-0" />
			<CircleAlertIcon v-else class="size-6 shrink-0" />
			<div>
				<b>Upgraded from {{ upgradeResult.from }} to {{ upgradeResult.to }}</b>
				<div class="text-secondary">
					{{ upgradeResult.updated.length }} updated · {{ upgradeResult.disabled.length }} disabled
					<template v-if="upgradeResult.disabled.length">
						({{ upgradeResult.disabled.join(', ') }})
					</template>
				</div>
				<div v-for="fail in upgradeResult.failed" :key="fail.name" class="text-secondary">
					Couldn't change <b>{{ fail.name }}</b
					>: {{ fail.error }}
				</div>
			</div>
		</section>

		<section v-if="busy" class="card flex items-center gap-2 text-secondary">
			<SpinnerIcon class="size-5 animate-spin" />
			{{ progress }}
		</section>

		<section v-else-if="error" class="card verdict bad">
			<CircleAlertIcon class="size-6 shrink-0" />
			<div>
				<b>{{ errorTitle }}</b>
				<div class="text-secondary">{{ error }}</div>
			</div>
		</section>

		<template v-else-if="report">
			<section v-if="scanNote" class="card text-secondary">{{ scanNote }}</section>

			<section class="card verdict" :class="report.canUpgrade ? 'good' : 'bad'">
				<CheckCircleIcon v-if="report.canUpgrade" class="size-6 shrink-0" />
				<CircleAlertIcon v-else class="size-6 shrink-0" />
				<div>
					<b v-if="report.canUpgrade">Looks good for {{ report.gameVersion }}!</b>
					<b v-else>
						{{ report.blocking.length + report.conflicts.length }}
						{{
							report.blocking.length + report.conflicts.length === 1
								? 'thing blocks'
								: 'things block'
						}}
						{{ report.gameVersion }}
					</b>
					<div class="text-secondary">
						{{ report.ready.length }} ready
						<template v-if="report.beta.length"> · {{ report.beta.length }} only in beta</template>
						<template v-if="report.blocking.length">
							· {{ report.blocking.length }} {{ report.blocking.length === 1 ? 'mod' : 'mods' }} not
							updated
						</template>
						<template v-if="report.optionalMissing.length">
							· {{ report.optionalMissing.length }}
							{{ report.optionalMissing.length === 1 ? 'pack' : 'packs' }} not updated
						</template>
						<template v-if="report.unknown.length">
							· {{ report.unknown.length }} not from Modrinth
						</template>
						<template v-if="report.disabledCount">
							· {{ report.disabledCount }} disabled, skipped</template
						>
					</div>
				</div>
			</section>

			<section v-if="!confirming" class="card flex flex-wrap items-center gap-3">
				<Button
					type="colored"
					:color="report.canUpgrade ? 'brand' : 'red'"
					@click="confirming = true"
				>
					<ArrowBigUpDashIcon class="size-5" />
					Upgrade to {{ report.gameVersion }}
				</Button>
				<span class="text-secondary">
					<template v-if="report.blocking.length">
						Updates everything, then disables the {{ report.blocking.length }}
						{{ report.blocking.length === 1 ? 'mod' : 'mods' }} that aren't updated yet.
					</template>
					<template v-else>Switches the version and updates all your mods.</template>
				</span>
			</section>

			<section v-else class="card confirm">
				<h3 class="group-title text-orange"><TriangleAlertIcon class="size-5" /> Are you sure?</h3>
				<p class="m-0">
					This switches <b>{{ instance.name }}</b> from <b>{{ instance.game_version }}</b> to
					<b>{{ report.gameVersion }}</b> and updates {{ updateCount }}
					{{ updateCount === 1 ? 'file' : 'files' }} to their {{ report.gameVersion }} versions.
				</p>
				<template v-if="report.blocking.length">
					<p class="m-0 mt-2">
						{{
							report.blocking.length === 1
								? 'This mod gets'
								: `These ${report.blocking.length} mods get`
						}}
						<b class="text-orange">disabled</b>, you can turn
						{{ report.blocking.length === 1 ? 'it' : 'them' }} back on from the Content tab once
						{{ report.blocking.length === 1 ? 'it gets' : 'they get' }} updated:
					</p>
					<ul class="m-0 mt-1">
						<li v-for="item in report.blocking" :key="item.file.path">{{ displayName(item) }}</li>
					</ul>
				</template>
				<p v-if="report.conflicts.length" class="m-0 mt-2 text-orange">
					There {{ report.conflicts.length === 1 ? 'is' : 'are' }} still
					{{ report.conflicts.length }}
					{{ report.conflicts.length === 1 ? 'conflict' : 'conflicts' }}, the game may crash until
					you remove one of the mods.
				</p>
				<p v-if="isPlainModpack" class="m-0 mt-2 text-secondary">
					It also gets unlinked from the modpack it came from, so all its files show up under
					Additional content.
				</p>
				<p
					v-if="report.optionalMissing.length || report.unknown.length"
					class="m-0 mt-2 text-secondary"
				>
					Packs that aren't updated and files not from Modrinth are kept as they are.
				</p>
				<p class="m-0 mt-2 text-secondary">
					Worlds opened in a newer version can't go back, back them up first if you care about them.
					This can't be undone.
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button type="outlined" @click="confirming = false">Cancel</Button>
					<Button type="colored" color="red" @click="startUpgrade">
						<template v-if="report.blocking.length">
							Disable {{ report.blocking.length }}
							{{ report.blocking.length === 1 ? 'mod' : 'mods' }} and upgrade
						</template>
						<template v-else>Upgrade to {{ report.gameVersion }}</template>
					</Button>
				</div>
			</section>

			<section v-if="report.blocking.length" class="card">
				<h3 class="group-title text-red">
					<XIcon class="size-5" /> Not updated for {{ report.gameVersion }} yet
				</h3>
				<p class="m-0 mb-2 text-secondary">
					The game won't start with these. Wait for an update, or remove them (check that no other
					mod needs them first).
				</p>
				<ItemRow
					v-for="item in report.blocking"
					:key="item.file.path"
					:item="item"
					@open="openProject"
				>
					<template v-if="item.latestSupported">supports up to {{ item.latestSupported }}</template>
					<template v-else>no release found</template>
				</ItemRow>
			</section>

			<section v-if="report.conflicts.length" class="card">
				<h3 class="group-title text-red"><CircleSlashIcon class="size-5" /> Conflicts</h3>
				<p class="m-0 mb-2 text-secondary">
					The new version of one mod says it doesn't work together with another one you have.
				</p>
				<div v-for="(conflict, i) in report.conflicts" :key="i" class="row">
					<b>{{ displayName(conflict.item) }}</b>
					<span class="text-secondary">is incompatible with</span>
					<b>{{ displayName(conflict.conflictsWith) }}</b>
				</div>
			</section>

			<section v-if="report.beta.length" class="card">
				<h3 class="group-title text-orange">
					<TriangleAlertIcon class="size-5" /> Only beta or alpha versions
				</h3>
				<p class="m-0 mb-2 text-secondary">These have a version, but it may still be buggy.</p>
				<ItemRow v-for="item in report.beta" :key="item.file.path" :item="item" @open="openProject">
					{{ item.target?.version_number }} ({{ item.target?.version_type }})
				</ItemRow>
			</section>

			<section v-if="report.optionalMissing.length" class="card">
				<h3 class="group-title text-orange">
					<TriangleAlertIcon class="size-5" /> Packs not marked for {{ report.gameVersion }}
				</h3>
				<p class="m-0 mb-2 text-secondary">
					Resource packs, shaders and datapacks won't crash the game. Many old ones still work, they
					just might look off.
				</p>
				<ItemRow
					v-for="item in report.optionalMissing"
					:key="item.file.path"
					:item="item"
					@open="openProject"
				>
					<template v-if="item.latestSupported">supports up to {{ item.latestSupported }}</template>
				</ItemRow>
			</section>

			<section v-if="report.unknown.length" class="card">
				<h3 class="group-title text-secondary"><InfoIcon class="size-5" /> Can't check these</h3>
				<p class="m-0 mb-2 text-secondary">
					These files aren't from Modrinth (CurseForge, a website, or edited), so check them
					yourself.
				</p>
				<ItemRow v-for="item in report.unknown" :key="item.file.path" :item="item" />
			</section>

			<section v-if="report.newDependencies.length" class="card text-secondary">
				<InfoIcon class="inline size-5 align-text-bottom" />
				The new versions also need {{ report.newDependencies.length }} extra
				{{ report.newDependencies.length === 1 ? 'library' : 'libraries' }} you don't have yet.
				Modrinth installs those for you when you update.
			</section>

			<section v-if="report.ready.length" class="card">
				<button class="group-title toggle" @click="showReady = !showReady">
					<CheckCircleIcon class="size-5 text-green" /> {{ report.ready.length }} ready
					<span class="text-secondary">{{ showReady ? 'hide' : 'show' }}</span>
				</button>
				<template v-if="showReady">
					<ItemRow
						v-for="item in report.ready"
						:key="item.file.path"
						:item="item"
						@open="openProject"
					>
						{{ item.target?.version_number }}
					</ItemRow>
				</template>
			</section>
		</template>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowBigUpDashIcon,
	CheckCircleIcon,
	CircleAlertIcon,
	CircleSlashIcon,
	InfoIcon,
	SearchIcon,
	SpinnerIcon,
	TriangleAlertIcon,
	XIcon,
} from '@modrinth/assets'
import { Button, Combobox, type ComboboxOption } from '@modrinth/ui'
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { install_existing_instance } from '@/helpers/install'
import {
	edit,
	get_projects,
	switch_project_version_with_dependencies,
	toggle_disable_project,
} from '@/helpers/instance'
import { get_loader_versions } from '@/helpers/metadata'
import { get_game_versions } from '@/helpers/tags.js'

import { injectInstancePage } from '../instance-context'
import ItemRow from './item-row.vue'
import { type PageState, stateFor } from './page-state'
import { applyUpgrade, errorText, toUpdate } from './upgrade-apply'
import {
	checkTarget,
	displayName,
	type InstalledFile,
	newerReleases,
	prepareCheck,
	type PreparedCheck,
	type UpgradeReport,
} from './upgrade-check'

const router = useRouter()
const instancePage = injectInstancePage()
const instance = instancePage.instance

const releases = ref<string[]>([])

// Each field reads/writes the saved state of the instance being shown, so results survive
// switching tabs (the state lives outside this component until the app is closed)
const page = computed(() => stateFor(instance.value.id))
function field<K extends keyof PageState>(key: K) {
	return computed<PageState[K]>({
		get: () => page.value[key],
		set: (value) => (page.value[key] = value),
	})
}
const target = field('target')
const busy = field('busy')
const progress = field('progress')
const error = field('error')
const errorTitle = field('errorTitle')
const report = field('report')
const scanNote = field('scanNote')
const confirming = field('confirming')
const upgradeResult = field('upgradeResult')
const showReady = field('showReady')
// Shared and server instances keep their link, those are managed by someone else
const isPlainModpack = computed(() =>
	['modrinth_modpack', 'imported_modpack'].includes(instance.value.link?.type ?? ''),
)
const updateCount = computed(() => (report.value ? toUpdate(report.value).length : 0))

const choices = computed(() => newerReleases(releases.value, instance.value.game_version))
const versionOptions = computed<ComboboxOption<string>[]>(() =>
	choices.value.map((version) => ({ value: version, label: version })),
)
const loaderLabel = computed(() => {
	const loader = instance.value.loader
	return loader.charAt(0).toUpperCase() + loader.slice(1)
})

// A saved check is only valid for the version + loader it was made on
function resetIfOutdated() {
	const basis = `${instance.value.game_version}|${instance.value.loader}`
	if (page.value.basis === basis) return
	page.value.basis = basis
	page.value.prepared = null
	page.value.report = null
	page.value.confirming = false
	page.value.target = ''
}

function defaultTarget() {
	if (!choices.value.includes(target.value)) target.value = choices.value[0] ?? ''
}

onMounted(async () => {
	resetIfOutdated()
	try {
		const versions: { version: string; version_type: string; date: string }[] =
			await get_game_versions()
		releases.value = versions
			.filter((v) => v.version_type === 'release')
			.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
			.map((v) => v.version)
		defaultTarget()
	} catch (e) {
		error.value = errorText(e)
	}
})

watch(
	() => [instance.value.id, instance.value.game_version, instance.value.loader],
	() => {
		resetIfOutdated()
		defaultTarget()
	},
)

async function prepare(): Promise<PreparedCheck> {
	progress.value = 'Reading installed content…'
	const projects = await get_projects(instance.value.id)
	const files: InstalledFile[] = Object.entries(projects).map(([path, file]) => {
		const raw = file as unknown as {
			hash: string
			file_name: string
			enabled: boolean
			project_type: InstalledFile['projectType']
		}
		return {
			path,
			fileName: raw.file_name,
			hash: raw.hash,
			projectType: raw.project_type,
			enabled: raw.enabled,
		}
	})
	progress.value = `Looking up ${files.length} files on Modrinth…`
	page.value.prepared = markRaw(await prepareCheck(files, releases.value))
	return page.value.prepared
}

async function run(task: () => Promise<void>, failTitle = "Couldn't run the check.") {
	errorTitle.value = failTitle
	busy.value = true
	error.value = ''
	scanNote.value = ''
	report.value = null
	showReady.value = false
	confirming.value = false
	upgradeResult.value = null
	try {
		await task()
	} catch (e) {
		error.value = errorText(e)
	} finally {
		busy.value = false
	}
}

function runCheck() {
	return run(async () => {
		const data = page.value.prepared ?? (await prepare())
		progress.value = `Checking ${target.value}…`
		report.value = await checkTarget(data, target.value, instance.value.loader)
	})
}

// Walks from the newest release down until everything works
function findNewest() {
	return run(async () => {
		const data = page.value.prepared ?? (await prepare())
		let fewestBlocked: UpgradeReport | null = null
		for (const version of choices.value) {
			progress.value = `Checking ${version}…`
			const result = await checkTarget(data, version, instance.value.loader)
			if (result.canUpgrade) {
				target.value = version
				report.value = result
				if (version !== choices.value[0]) {
					scanNote.value = `${choices.value[0]} isn't possible yet. ${version} is the newest version everything works on.`
				}
				return
			}
			if (!fewestBlocked || result.blocking.length < fewestBlocked.blocking.length) {
				fewestBlocked = result
			}
		}
		if (fewestBlocked) {
			target.value = fewestBlocked.gameVersion
			report.value = fewestBlocked
			scanNote.value = `No newer version works with everything you have. ${fewestBlocked.gameVersion} is the closest, with the fewest mods missing.`
		}
	})
}

function startUpgrade() {
	const checked = report.value
	if (!checked) return
	const id = instance.value.id
	const from = instance.value.game_version
	const linked = isPlainModpack.value
	return run(async () => {
		const result = await applyUpgrade(
			checked,
			{
				loaderManifest: (loader) => get_loader_versions(loader === 'neoforge' ? 'neo' : loader),
				disableFile: async (path) => {
					await toggle_disable_project(id, path, false)
				},
				setVersion: (gameVersion, loaderVersion) =>
					edit(id, {
						game_version: gameVersion,
						...(loaderVersion ? { loader_version: loaderVersion } : {}),
					} as Parameters<typeof edit>[1]),
				switchFile: async (path, versionId) => {
					await switch_project_version_with_dependencies(id, path, versionId)
				},
				installGame: async () => {
					await install_existing_instance(id, false)
				},
				unlinkModpack: linked
					? () => edit(id, { link: null } as unknown as Parameters<typeof edit>[1])
					: undefined,
			},
			(message) => (progress.value = message),
		)
		page.value.prepared = null
		upgradeResult.value = { ...result, from, to: checked.gameVersion }
		await instancePage.refreshInstance()
	}, "Couldn't upgrade.")
}

function openProject(projectId: string) {
	router.push(`/project/${projectId}`)
}
</script>

<style scoped>
.card {
	padding: 1rem 1.25rem;
	border-radius: var(--radius-lg);
	background: var(--color-raised-bg);
}

.verdict {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	border-left: 4px solid;
}

.verdict.good {
	border-color: var(--color-green);
	color: var(--color-green);
}

.verdict.bad {
	border-color: var(--color-red);
	color: var(--color-red);
}

.verdict b {
	color: var(--color-contrast);
}

.group-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin: 0 0 0.25rem;
	font-size: 1rem;
	font-weight: 700;
}

.toggle {
	width: 100%;
	padding: 0;
	border: none;
	background: none;
	color: var(--color-contrast);
	font: inherit;
	font-weight: 700;
	cursor: pointer;
}

.confirm {
	border: 2px solid var(--color-orange);
}

.confirm ul {
	padding-left: 1.25rem;
	color: var(--color-contrast);
}

.row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	padding: 0.35rem 0;
}
</style>
