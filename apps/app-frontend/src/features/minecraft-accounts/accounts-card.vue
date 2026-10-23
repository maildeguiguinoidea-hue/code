<template>
	<div
		v-if="accounts.length === 0"
		class="flex flex-col gap-3 bg-button-bg border border-solid border-surface-5 rounded-xl p-3 mt-2"
	>
		<span>{{ formatMessage(messages.notSignedIn) }}</span>
		<Button type="colored" color="brand" :disabled="loginDisabled" @click="login()">
			<LogInIcon v-if="!loginDisabled" />
			<SpinnerIcon v-else class="animate-spin" />
			{{ formatMessage(messages.signInToMinecraft) }}
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
					<IconButton
						v-tooltip="formatMessage(messages.removeAccount)"
						type="quiet"
						color="red"
						:label="formatMessage(messages.removeAccount)"
						class="mr-2 !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)] hover:!bg-red focus-visible:!bg-red hover:!text-[var(--color-accent-contrast)] focus-visible:!text-[var(--color-accent-contrast)]"
						@click="logout(account.profile.id)"
					>
						<TrashIcon />
					</IconButton>
				</div>
			</template>
			<div class="flex flex-col gap-2 px-2 pt-2">
				<Button
					class="w-full !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)]"
					:aria-expanded="optionsOpen"
					@click="optionsOpen = !optionsOpen"
				>
					<SettingsIcon />
					{{ formatMessage(messages.accountOptions) }}
					<ChevronDownIcon
						class="ml-auto transition-transform"
						:class="{ 'rotate-180': optionsOpen }"
					/>
				</Button>
				<div
					v-if="optionsOpen"
					class="flex flex-col gap-2 rounded-xl border border-solid border-surface-5 bg-surface-3 p-2"
				>
					<div v-for="account in accounts" :key="account.profile.id" class="flex flex-col gap-1">
						<form
							v-if="renamingId === account.profile.id"
							class="flex gap-1 items-center"
							@submit.prevent="saveRename(account)"
						>
							<Input
								v-model="renameInput"
								type="text"
								size="small"
								:maxlength="16"
								:error="!!renameError"
								:aria-label="formatMessage(messages.guestName)"
								wrapper-class="min-w-0 flex-1"
								@keydown.esc="cancelRename()"
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
						<div v-else class="flex gap-2 items-center min-w-0">
							<Avatar :src="getAccountAvatarUrl(account)" size="24px" />
							<div class="flex flex-col min-w-0 flex-1">
								<span class="truncate text-primary">{{ account.profile.name }}</span>
								<span class="text-secondary text-xs">
									{{
										isGuest(account)
											? formatMessage(messages.localGuest)
											: formatMessage(messages.microsoftAccount)
									}}
								</span>
							</div>
							<IconButton
								v-if="isGuest(account)"
								v-tooltip="formatMessage(messages.renameAccount)"
								type="quiet"
								:label="formatMessage(messages.renameAccount)"
								@click="startRename(account)"
							>
								<EditIcon />
							</IconButton>
						</div>
						<span v-if="renamingId === account.profile.id && renameError" class="text-red text-xs">
							{{ renameError }}
						</span>
					</div>

					<div class="border-0 border-t border-solid border-surface-5 pt-2 flex flex-col gap-2">
						<span class="text-secondary text-xs font-semibold">
							{{ formatMessage(messages.createAccount) }}
						</span>
						<Chips
							v-model="newAccountKind"
							:items="newAccountKinds"
							:format-label="formatAccountKind"
							:capitalize="false"
							size="small"
							:aria-label="formatMessage(messages.createAccount)"
						/>
						<Button
							v-if="newAccountKind === 'online'"
							class="w-full"
							color="brand"
							:disabled="loginDisabled"
							@click="login()"
						>
							<LogInIcon v-if="!loginDisabled" />
							<SpinnerIcon v-else class="animate-spin" />
							{{ formatMessage(messages.signInWithMicrosoft) }}
						</Button>
						<template v-else>
							<p v-if="!hasMicrosoftAccount" class="m-0 text-secondary text-xs">
								{{ formatMessage(messages.guestRequiresMicrosoft) }}
							</p>
							<form v-else class="flex flex-col gap-2" @submit.prevent="createGuest()">
								<Input
									v-model="guestName"
									type="text"
									size="small"
									:maxlength="16"
									:error="!!guestNameError"
									:placeholder="formatMessage(messages.guestNamePlaceholder)"
									:aria-label="formatMessage(messages.guestName)"
									wrapper-class="w-full"
								/>
								<span v-if="guestNameError" class="text-red text-xs">{{ guestNameError }}</span>
								<Button
									class="w-full"
									color="brand"
									:disabled="!guestName || !!guestNameError || guestBusy"
									@click="createGuest()"
								>
									<UserPlusIcon />
									{{ formatMessage(messages.createGuest) }}
								</Button>
							</form>
						</template>
					</div>
				</div>
			</div>
		</div>
	</Accordion>
</template>

<script setup lang="ts">
import {
	CheckIcon,
	ChevronDownIcon,
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
	Chips,
	defineMessages,
	IconButton,
	injectNotificationManager,
	Input,
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

type NewAccountKind = 'online' | 'guest'

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

const optionsOpen = ref(false)
const newAccountKinds: NewAccountKind[] = ['online', 'guest']
const newAccountKind = ref<NewAccountKind>('online')
const guestName = ref('')
const guestBusy = ref(false)
const renamingId = ref<string | null>(null)
const renameInput = ref('')
const renameBusy = ref(false)

const hasMicrosoftAccount = computed(() => accounts.value.some((account) => !isGuest(account)))

function isGuest(account: MinecraftCredential) {
	return account.account_type === 'guest'
}

function formatAccountKind(kind: NewAccountKind) {
	return formatMessage(kind === 'online' ? messages.createOnline : messages.createLocalGuest)
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
	notSignedIn: {
		id: 'minecraft-account.not-signed-in',
		defaultMessage: 'Not signed in',
	},
	accountOptions: {
		id: 'minecraft-account.account-options',
		defaultMessage: 'Account Options',
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
		defaultMessage: 'Create Account (Online)',
	},
	createLocalGuest: {
		id: 'minecraft-account.create-local-guest',
		defaultMessage: 'Create Account (Local Guest)',
	},
	signInWithMicrosoft: {
		id: 'minecraft-account.sign-in-with-microsoft',
		defaultMessage: 'Sign in with Microsoft',
	},
	guestRequiresMicrosoft: {
		id: 'minecraft-account.guest-requires-microsoft',
		defaultMessage: 'Sign in with a Microsoft account first to create local guest accounts.',
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
	signInToMinecraft: {
		id: 'minecraft-account.sign-in',
		defaultMessage: 'Sign in to Minecraft',
	},
})
</script>
