<template>
	<div class="item-row">
		<img v-if="item.project?.icon_url" :src="item.project.icon_url" alt="" class="icon" />
		<div v-else class="icon placeholder" />
		<div class="min-w-0 flex-1">
			<button v-if="item.project" class="name link" @click="emit('open', item.project.id)">
				{{ displayName(item) }}
			</button>
			<div v-else class="name">{{ displayName(item) }}</div>
			<div class="truncate text-sm text-secondary">{{ item.file.fileName }}</div>
		</div>
		<div class="detail text-secondary"><slot /></div>
	</div>
</template>

<script setup lang="ts">
import { type CheckedItem, displayName } from './upgrade-check'

defineProps<{ item: CheckedItem }>()
const emit = defineEmits<{ open: [projectId: string] }>()
</script>

<style scoped>
.item-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.4rem 0;
}

.item-row + .item-row {
	border-top: 1px solid var(--color-divider);
}

.icon {
	width: 2.25rem;
	height: 2.25rem;
	flex-shrink: 0;
	border-radius: var(--radius-md);
	object-fit: cover;
}

.placeholder {
	background: var(--color-button-bg);
}

.name {
	padding: 0;
	border: none;
	background: none;
	color: var(--color-contrast);
	font: inherit;
	font-weight: 600;
	text-align: left;
}

.link {
	cursor: pointer;
}

.link:hover {
	text-decoration: underline;
}

.detail {
	flex-shrink: 0;
	font-size: 0.875rem;
	text-align: right;
}
</style>
