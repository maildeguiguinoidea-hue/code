<template>
	<div
		v-if="accounts.length === 0"
		class="flex flex-col gap-3 bg-button-bg border border-solid border-surface-5 rounded-xl p-3 mt-2"
	>
		<span>{{ formatMessage(messages.notSignedIn) }}</span>
		<Button color="brand" @click="openOptions">
			<UserPlusIcon />
			{{ formatMessage(messages.addAccount) }}
		</Button>
	</div>
	<Accordion
		v-else
		class="w-full mt-2 bg-button-bg border border-solid border-surface-5 rounded-xl overflow-clip"
		button-class="button-base w-full bg-transparent px-3 py-2 border-0 cursor-pointer"
		:open-by-default="false"
	>
		<template #title>
			<div class="flex gap-2 w-full min-w-0">
				<Avatar
					size="36px"
					:src="
						selectedAccount
							? avatarUrl
							: 'https://launcher-files.modrinth.com/assets/steve_head.png'
					"
				/>
				<div class="flex flex-col items-start w-full min-w-0">
					<span class="truncate w-full text-left">{{
						selectedAccount ? selectedAccount.profile.name : formatMessage(messages.selectAccount)
					}}</span>
					<span class="text-secondary text-xs">{{ formatMessage(messages.minecraftAccount) }}</span>
				</div>
			</div>
		</template>
		<div class="bg-button-bg pt-1 pb-2 border-0 border-t border-solid border-surface-5">
			<template v-if="accounts.length > 0">
				<div v-for="account in accounts" :key="account.profile.id" class="flex gap-1 items-center">
					<button
						class="flex items-center flex-shrink flex-grow overflow-clip gap-2 p-2 border-0 bg-transparent cursor-pointer button-base min-w-0"
						@click="setAccount(account)"
					>
						<RadioButtonCheckedIcon
							v-if="selectedAccount && selectedAccount.profile.id === account.profile.id"
							class="w-5 h-5 text-brand shrink-0"
						/>
						<RadioButtonIcon v-else class="w-5 h-5 text-secondary shrink-0" />
						<Avatar :src="getAccountAvatarUrl(account)" size="24px" />
						<p
							class="m-0 truncate min-w-0"
							:class="
								selectedAccount && selectedAccount.profile.id === account.profile.id
									? 'text-contrast font-semibold'
									: 'text-primary'
							"
						>
							{{ account.profile.name }}
						</p>
					</button>
				</div>
			</template>
			<div class="flex flex-col gap-2 px-2 pt-2">
				<Button
					class="w-full !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)]"
					@click="openOptions"
				>
					<SettingsIcon />
					{{ formatMessage(messages.accountOptions) }}
				</Button>
			</div>
		</div>
	</Accordion>
	<NewModal
		ref="optionsModal"
		no-padding
		scrollable
		max-width="520px"
		width="520px"
		:header="formatMessage(messages.accountOptions)"
		:on-hide="resetOptions"
	>
		<div v-if="accounts.length > 0" class="flex flex-col gap-3 p-6">
			<span class="font-semibold text-contrast">{{ formatMessage(messages.yourAccounts) }}</span>
			<div class="flex flex-col gap-2">
				<div
					v-for="account in accounts"
					:key="account.profile.id"
					class="flex flex-col gap-1 rounded-xl bg-surface-2 px-3 py-2.5"
				>
					<Transition
						mode="out-in"
						enter-active-class="transition duration-150 ease-out"
						enter-from-class="opacity-0 -translate-y-1"
						leave-active-class="transition duration-100 ease-in"
						leave-to-class="opacity-0"
					>
						<form
							v-if="renamingId === account.profile.id"
							class="flex items-center gap-2"
							@submit.prevent="saveRename(account)"
						>
							<Avatar :src="getAccountAvatarUrl(account)" size="32px" />
							<Input
								v-model="renameInput"
								type="text"
								:maxlength="16"
								:error="!!renameError"
								:aria-label="formatMessage(messages.guestName)"
								wrapper-class="min-w-0 flex-1"
								@keydown.esc.stop="cancelRename()"
							/>
							<IconButton
								v-tooltip="formatMessage(messages.save)"
								type="quiet"
								:label="formatMessage(messages.save)"
								:disabled="!!renameError || renameBusy"
								@click="saveRename(account)"
							>
								<CheckIcon />
							</IconButton>
							<IconButton
								v-tooltip="formatMessage(messages.cancel)"
								type="quiet"
								:label="formatMessage(messages.cancel)"
								@click="cancelRename()"
							>
								<XIcon />
							</IconButton>
						</form>
						<div v-else class="flex min-w-0 items-center gap-3">
							<Avatar :src="getAccountAvatarUrl(account)" size="32px" />
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="truncate font-medium text-contrast">{{ account.profile.name }}</span>
								<span class="text-xs text-secondary">
									{{
										isGuest(account)
											? formatMessage(messages.localGuest)
											: formatMessage(messages.microsoftAccount)
									}}
								</span>
							</div>
							<span
								v-if="selectedAccount?.profile.id === account.profile.id"
								class="rounded-full border border-solid border-brand bg-brand-highlight px-2 py-0.5 text-xs font-medium text-brand"
							>
								{{ formatMessage(messages.active) }}
							</span>
							<IconButton
								v-if="isGuest(account)"
								v-tooltip="formatMessage(messages.renameAccount)"
								type="quiet"
								:label="formatMessage(messages.renameAccount)"
								@click="startRename(account)"
							>
								<EditIcon />
							</IconButton>
							<IconButton
								v-tooltip="formatMessage(messages.removeAccount)"
								type="quiet"
								color="red"
								:label="formatMessage(messages.removeAccount)"
								@click="logout(account.profile.id)"
							>
								<TrashIcon />
							</IconButton>
						</div>
					</Transition>
					<span v-if="renamingId === account.profile.id && renameError" class="text-xs text-red">
						{{ renameError }}
					</span>
				</div>
			</div>
		</div>

		<div v-if="accounts.length > 0" class="h-px bg-divider" />

		<div class="flex flex-col gap-4 bg-surface-2 p-6">
			<span class="font-semibold text-contrast">{{ formatMessage(messages.createAccount) }}</span>
			<div class="grid grid-cols-2 gap-3">
				<Button class="w-full" color="brand" :disabled="loginDisabled" @click="login()">
					<LogInIcon v-if="!loginDisabled" />
					<SpinnerIcon v-else class="animate-spin" />
					{{ formatMessage(messages.createOnline) }}
				</Button>
				<Button
					class="w-full"
					:aria-expanded="guestFormOpen"
					@click="guestFormOpen = !guestFormOpen"
				>
					<UserPlusIcon />
					{{ formatMessage(messages.createLocalGuest) }}
				</Button>
			</div>
			<Transition
				enter-active-class="transition duration-150 ease-out"
				enter-from-class="opacity-0 -translate-y-1"
				leave-active-class="transition duration-100 ease-in"
				leave-to-class="opacity-0"
			>
				<form
					v-if="guestFormOpen"
					class="flex flex-col gap-2"
					@submit.prevent="createGuest()"
				>
					<label for="guest-account-name" class="text-sm font-medium text-contrast">
						{{ formatMessage(messages.guestName) }}
					</label>
					<div class="flex gap-2">
						<Input
							id="guest-account-name"
							v-model="guestName"
							type="text"
							:maxlength="16"
							:error="!!guestNameError"
							:placeholder="formatMessage(messages.guestNamePlaceholder)"
							wrapper-class="min-w-0 flex-1"
						/>
						<Button
							color="brand"
							:disabled="!guestName || !!guestNameError || guestBusy"
							@click="createGuest()"
						>
							<CheckIcon />
							{{ formatMessage(messages.createGuest) }}
						</Button>
					</div>
					<span v-if="guestNameError" class="text-xs text-red">{{ guestNameError }}</span>
				</form>
			</Transition>
		</div>
	</NewModal>
</template>

<script setup lang="ts">
import {
	CheckIcon,
	EditIcon,
	LogInIcon,
	RadioButtonCheckedIcon,
	RadioButtonIcon,
	SettingsIcon,
	SpinnerIcon,
	TrashIcon,
	UserPlusIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Accordion,
	Avatar,
	Button,
	defineMessages,
	IconButton,
	injectNotificationManager,
	Input,
	NewModal,
	useVIntl,
} from '@modrinth/ui'
import type { Ref } from 'vue'
import { computed, onUnmounted, ref } from 'vue'

import { useAppEvent } from '@/composables/use-app-event'
import { handleSevereError } from '@/composables/use-error.js'
import { trackEvent } from '@/helpers/analytics'
import {
	create_local_guest_account,
	get_default_user,
	login as login_flow,
	remove_user,
	rename_local_account,
	set_default_user,
	users,
} from '@/helpers/auth'
import { getPlayerHeadUrl } from '@/helpers/rendering/player-head'
import type { Skin } from '@/helpers/skins'
import { get_available_skins } from '@/helpers/skins'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const emit = defineEmits<{
	change: []
}>()

type MinecraftCredential = {
	profile: {
		id: string
		name: string
	}
	account_type?: 'microsoft' | 'guest'
}

const GUEST_NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/

const accounts: Ref<MinecraftCredential[]> = ref([])
const loginDisabled = ref(false)
const defaultUser = ref<string | undefined>()
const equippedSkin = ref<Skin | null>(null)
const equippedHeadUrl = ref<string>()
let headRequest = 0

async function updateHeadUrl(skin: Skin | null) {
	const request = ++headRequest
	if (equippedHeadUrl.value) URL.revokeObjectURL(equippedHeadUrl.value)
	equippedHeadUrl.value = undefined
	if (!skin) return
	const url = await getPlayerHeadUrl(skin)
	if (request !== headRequest) URL.revokeObjectURL(url)
	else equippedHeadUrl.value = url
}

onUnmounted(() => {
	headRequest++
	if (equippedHeadUrl.value) URL.revokeObjectURL(equippedHeadUrl.value)
})

async function refreshValues() {
	defaultUser.value = await get_default_user().catch(handleError)
	const userList = await users().catch(handleError)
	accounts.value = Array.isArray(userList) ? [...userList] : []
	accounts.value.sort((a, b) => (a.profile?.name ?? '').localeCompare(b.profile?.name ?? ''))

	try {
		const skins = await get_available_skins()
		equippedSkin.value = skins.find((skin) => skin.is_equipped) ?? null

		await updateHeadUrl(equippedSkin.value)
	} catch {
		equippedSkin.value = null
		void updateHeadUrl(null)
	}
}

async function setEquippedSkin(skin: Skin) {
	equippedSkin.value = skin

	try {
		await updateHeadUrl(skin)
	} catch (error) {
		console.warn('Failed to get head render for equipped skin:', error)
	}
}

function setLoginDisabled(value: boolean) {
	loginDisabled.value = value
}

defineExpose({
	refreshValues,
	setEquippedSkin,
	setLoginDisabled,
	login,
	loginDisabled,
})

await refreshValues()

const selectedAccount = computed(() =>
	accounts.value.find((account) => account.profile.id === defaultUser.value),
)

const avatarUrl = computed(() => {
	if (equippedSkin.value?.texture_key) {
		const cachedUrl = equippedHeadUrl.value
		if (cachedUrl) {
			return cachedUrl
		}
		return `https://mc-heads.net/avatar/${equippedSkin.value.texture_key}/128`
	}
	if (selectedAccount.value?.profile?.id) {
		return `https://mc-heads.net/avatar/${selectedAccount.value.profile.id}/128`
	}
	return 'https://launcher-files.modrinth.com/assets/steve_head.png'
})

function getAccountAvatarUrl(account: MinecraftCredential) {
	if (
		account.profile.id === selectedAccount.value?.profile?.id &&
		equippedSkin.value?.texture_key
	) {
		const cachedUrl = equippedHeadUrl.value
		if (cachedUrl) {
			return cachedUrl
		}
	}
	return `https://mc-heads.net/avatar/${account.profile.id}/128`
}

async function setAccount(account: MinecraftCredential) {
	defaultUser.value = account.profile.id
	await set_default_user(account.profile.id).catch(handleError)
	await refreshValues()
	emit('change')
}

async function login() {
	loginDisabled.value = true
	const loggedIn = await login_flow().catch(handleSevereError)

	if (loggedIn) {
		await setAccount(loggedIn)
	}

	trackEvent('AccountLogIn')
	loginDisabled.value = false
}

const optionsModal = ref<InstanceType<typeof NewModal>>()
const guestFormOpen = ref(false)
const guestName = ref('')
const guestBusy = ref(false)
const renamingId = ref<string | null>(null)
const renameInput = ref('')
const renameBusy = ref(false)

function isGuest(account: MinecraftCredential) {
	return account.account_type === 'guest'
}

function openOptions(event?: MouseEvent) {
	optionsModal.value?.show(event)
}

function resetOptions() {
	cancelRename()
	guestFormOpen.value = false
	guestName.value = ''
}

function validateGuestName(name: string) {
	return GUEST_NAME_PATTERN.test(name) ? undefined : formatMessage(messages.invalidGuestName)
}

const guestNameError = computed(() =>
	guestName.value ? validateGuestName(guestName.value) : undefined,
)
const renameError = computed(() => validateGuestName(renameInput.value))

async function createGuest() {
	if (!guestName.value || guestNameError.value || guestBusy.value) return

	guestBusy.value = true
	try {
		const created = await create_local_guest_account(guestName.value)
		guestName.value = ''
		guestFormOpen.value = false
		await setAccount(created)
	} catch (error) {
		handleError(error as Error)
	} finally {
		guestBusy.value = false
	}
}

function startRename(account: MinecraftCredential) {
	renamingId.value = account.profile.id
	renameInput.value = account.profile.name
}

function cancelRename() {
	renamingId.value = null
	renameInput.value = ''
}

async function saveRename(account: MinecraftCredential) {
	if (renameError.value || renameBusy.value) return

	renameBusy.value = true
	try {
		await rename_local_account(account.profile.id, renameInput.value)
		cancelRename()
		await refreshValues()
		emit('change')
	} catch (error) {
		handleError(error as Error)
	} finally {
		renameBusy.value = false
	}
}

async function logout(id: string) {
	await remove_user(id).catch(handleError)
	await refreshValues()
	if (!selectedAccount.value && accounts.value.length > 0) {
		await setAccount(accounts.value[0])
	} else {
		emit('change')
	}
	trackEvent('AccountLogOut')
}

useAppEvent('process', async (e) => {
	if (e.event === 'launched') {
		await refreshValues()
	}
})

const messages = defineMessages({
	addAccount: {
		id: 'minecraft-account.add-account',
		defaultMessage: 'Add Account',
	},
	notSignedIn: {
		id: 'minecraft-account.not-signed-in',
		defaultMessage: 'Not signed in',
	},
	accountOptions: {
		id: 'minecraft-account.account-options',
		defaultMessage: 'Account Options',
	},
	yourAccounts: {
		id: 'minecraft-account.your-accounts',
		defaultMessage: 'Your accounts',
	},
	active: {
		id: 'minecraft-account.active',
		defaultMessage: 'Active',
	},
	microsoftAccount: {
		id: 'minecraft-account.type.microsoft',
		defaultMessage: 'Microsoft account',
	},
	localGuest: {
		id: 'minecraft-account.type.local-guest',
		defaultMessage: 'Local guest',
	},
	renameAccount: {
		id: 'minecraft-account.rename-account',
		defaultMessage: 'Rename account',
	},
	save: {
		id: 'minecraft-account.save',
		defaultMessage: 'Save',
	},
	cancel: {
		id: 'minecraft-account.cancel',
		defaultMessage: 'Cancel',
	},
	createAccount: {
		id: 'minecraft-account.create-account',
		defaultMessage: 'Create account',
	},
	createOnline: {
		id: 'minecraft-account.create-online',
		defaultMessage: 'Online Account',
	},
	createLocalGuest: {
		id: 'minecraft-account.create-local-guest',
		defaultMessage: 'Local Guest',
	},
	guestName: {
		id: 'minecraft-account.guest-name',
		defaultMessage: 'Guest name',
	},
	guestNamePlaceholder: {
		id: 'minecraft-account.guest-name-placeholder',
		defaultMessage: 'Nickname',
	},
	invalidGuestName: {
		id: 'minecraft-account.invalid-guest-name',
		defaultMessage: 'Use 1 to 16 letters, digits or underscores.',
	},
	createGuest: {
		id: 'minecraft-account.create-guest',
		defaultMessage: 'Create guest',
	},
	removeAccount: {
		id: 'minecraft-account.remove-account',
		defaultMessage: 'Remove account',
	},
	selectAccount: {
		id: 'minecraft-account.select-account',
		defaultMessage: 'Select account',
	},
	minecraftAccount: {
		id: 'minecraft-account.label',
		defaultMessage: 'Minecraft account',
	},
})
</script>
