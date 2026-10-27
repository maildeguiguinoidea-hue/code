<script setup lang="ts">
import type { Labrinth } from '@modrinth/api-client'
import { FileIcon, SearchIcon } from '@modrinth/assets'
import {
	Avatar,
	Combobox,
	type ComboboxOption,
	defineMessages,
	EmptyState,
	Input,
	useVIntl,
} from '@modrinth/ui'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { get_project_many, get_version_many } from '@/helpers/cache.js'

type PackEntry = {
	key: string
	title: string
	projectId: string | null
	projectType: string | null
	iconUrl: string | null
	versionNumber: string | null
	fileName: string | null
}

const props = defineProps<{
	project: Labrinth.Projects.v2.Project
	versions: Labrinth.Versions.v2.Version[]
}>()

const { formatMessage } = useVIntl()
const messages = defineMessages({
	search: { id: 'app.project.mods.search', defaultMessage: 'Search contents' },
	packVersion: { id: 'app.project.mods.pack-version', defaultMessage: 'Pack version' },
	count: {
		id: 'app.project.mods.count',
		defaultMessage: '{count, plural, one {# item} other {# items}}',
	},
	notOnModrinth: { id: 'app.project.mods.not-on-modrinth', defaultMessage: 'Not on Modrinth' },
	emptyHeading: { id: 'app.project.mods.empty-heading', defaultMessage: 'No contents listed' },
	emptyDescription: {
		id: 'app.project.mods.empty-description',
		defaultMessage: 'Modrinth has no list of files for this version of the modpack.',
	},
	noResults: { id: 'app.project.mods.no-results', defaultMessage: 'Nothing matches your search.' },
	loadError: {
		id: 'app.project.mods.load-error',
		defaultMessage: 'The modpack contents could not be loaded.',
	},
})

const selectedVersionId = ref<string | undefined>(props.versions[0]?.id)
watch(
	() => props.versions,
	(versions) => {
		if (!versions.some((version) => version.id === selectedVersionId.value)) {
			selectedVersionId.value = versions[0]?.id
		}
	},
)

const versionOptions = computed<ComboboxOption<string>[]>(() =>
	props.versions.map((version) => ({
		value: version.id,
		label: version.version_number,
		subLabel: version.game_versions?.join(', '),
	})),
)

const selectedVersion = computed(() =>
	props.versions.find((version) => version.id === selectedVersionId.value),
)

const search = ref('')

const contentsQuery = useQuery({
	queryKey: computed(() => ['project-modpack-contents', selectedVersionId.value]),
	enabled: computed(() => Boolean(selectedVersion.value)),
	queryFn: async (): Promise<PackEntry[]> => {
		const dependencies = (selectedVersion.value?.dependencies ?? []).filter(
			(dependency) => dependency.dependency_type === 'embedded',
		) as (Labrinth.Versions.v2.Dependency & { version_id?: string | null })[]

		const projectIds = [
			...new Set(dependencies.flatMap((dependency) => dependency.project_id ?? [])),
		]
		const versionIds = [
			...new Set(dependencies.flatMap((dependency) => dependency.version_id ?? [])),
		]

		const [projects, versions]: [Labrinth.Projects.v2.Project[], Labrinth.Versions.v2.Version[]] =
			await Promise.all([
				projectIds.length > 0 ? get_project_many(projectIds, 'must_revalidate') : [],
				versionIds.length > 0 ? get_version_many(versionIds, 'must_revalidate') : [],
			])
		const projectsById = new Map(projects.map((project) => [project.id, project]))
		const versionsById = new Map(versions.map((version) => [version.id, version]))

		return dependencies
			.map((dependency, index): PackEntry => {
				const version = dependency.version_id ? versionsById.get(dependency.version_id) : undefined
				const projectId = dependency.project_id ?? version?.project_id ?? null
				const project = projectId ? projectsById.get(projectId) : undefined
				return {
					key: dependency.version_id ?? projectId ?? `${dependency.file_name}-${index}`,
					title: project?.title ?? dependency.file_name ?? projectId ?? 'Unknown',
					projectId: project ? projectId : null,
					projectType: project?.project_type ?? null,
					iconUrl: project?.icon_url ?? null,
					versionNumber: version?.version_number ?? null,
					fileName: dependency.file_name ?? version?.files?.[0]?.filename ?? null,
				}
			})
			.sort((left, right) => left.title.localeCompare(right.title))
	},
})

const filteredEntries = computed(() => {
	const query = search.value.trim().toLowerCase()
	const entries = contentsQuery.data.value ?? []
	if (!query) return entries
	return entries.filter(
		(entry) =>
			entry.title.toLowerCase().includes(query) || entry.fileName?.toLowerCase().includes(query),
	)
})
</script>

<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<Input
				v-model="search"
				:icon="SearchIcon"
				type="text"
				:placeholder="formatMessage(messages.search)"
				clearable
				wrapper-class="min-w-[16rem] flex-1"
			/>
			<Combobox
				v-if="versionOptions.length > 0"
				v-model="selectedVersionId"
				class="w-max"
				:options="versionOptions"
				:searchable="versionOptions.length > 8"
				:aria-label="formatMessage(messages.packVersion)"
				dropdown-min-width="220px"
			/>
		</div>

		<EmptyState
			v-if="contentsQuery.isError.value"
			type="error"
			:heading="formatMessage(messages.loadError)"
		/>
		<div v-else-if="contentsQuery.isPending.value" class="flex flex-col gap-2">
			<div v-for="index in 6" :key="index" class="h-16 animate-pulse rounded-2xl bg-bg-raised" />
		</div>
		<EmptyState
			v-else-if="(contentsQuery.data.value ?? []).length === 0"
			type="empty"
			:heading="formatMessage(messages.emptyHeading)"
			:description="formatMessage(messages.emptyDescription)"
		/>
		<template v-else>
			<span class="text-sm text-secondary">
				{{ formatMessage(messages.count, { count: filteredEntries.length }) }}
			</span>
			<p v-if="filteredEntries.length === 0" class="m-0 text-secondary">
				{{ formatMessage(messages.noResults) }}
			</p>
			<div class="flex flex-col gap-2">
				<component
					:is="entry.projectId ? 'RouterLink' : 'div'"
					v-for="entry in filteredEntries"
					:key="entry.key"
					:to="entry.projectId ? `/project/${entry.projectId}` : undefined"
					class="flex items-center gap-3 rounded-2xl bg-bg-raised p-3 text-primary no-underline"
					:class="{ 'transition-[filter] hover:brightness-110': entry.projectId }"
				>
					<Avatar v-if="entry.projectId" :src="entry.iconUrl" :alt="entry.title" size="40px" />
					<div
						v-else
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-button-bg"
					>
						<FileIcon class="size-5 text-secondary" />
					</div>
					<div class="flex min-w-0 flex-col">
						<span class="truncate font-semibold text-contrast">{{ entry.title }}</span>
						<span class="truncate text-sm text-secondary">
							{{
								entry.projectId
									? (entry.versionNumber ?? entry.fileName)
									: formatMessage(messages.notOnModrinth)
							}}
						</span>
					</div>
					<span
						v-if="entry.projectType && entry.projectType !== 'mod'"
						class="ml-auto shrink-0 rounded-full bg-button-bg px-2 py-0.5 text-xs capitalize text-secondary"
					>
						{{ entry.projectType }}
					</span>
				</component>
			</div>
		</template>
	</div>
</template>
