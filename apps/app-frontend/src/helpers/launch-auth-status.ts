import { invoke } from '@tauri-apps/api/core'

export type LaunchAuthStatus =
	| { mode: 'unknown' }
	| { mode: 'online' }
	| { mode: 'offline_cached'; username: string; uuid: string; since: string }
	| { mode: 'guest'; username: string; uuid: string }

export async function get_launch_auth_status(): Promise<LaunchAuthStatus> {
	return await invoke<LaunchAuthStatus>('plugin:auth|get_launch_auth_status')
}
