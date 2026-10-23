const playableUrls = new Map<string, Promise<string>>()

/**
 * Returns a URL that `<audio>` and `<video>` can load.
 *
 * On Linux, WebKitGTK's media player only accepts http(s), file, blob and data
 * URLs, so the app's own files (served from `tauri://` in release builds) fail
 * with a FormatError. They are fetched once and played from a blob URL instead.
 */
export function playableMediaUrl(src: string): Promise<string> {
	if (/^(https?|blob|data):/.test(src)) return Promise.resolve(src)

	let url = playableUrls.get(src)
	if (!url) {
		url = fetch(src)
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`)
				return response.blob()
			})
			.then((blob) => URL.createObjectURL(blob))
			.catch((error) => {
				console.warn(`Failed to preload media ${src}:`, error)
				return src
			})
		playableUrls.set(src, url)
	}
	return url
}
