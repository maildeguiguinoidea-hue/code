// Shows Aternos's notifications (such as "your server is online") as the
// app's own desktop notifications. The app's browser refuses web
// notifications, so Aternos would otherwise ask for them on every visit.
// The page has no access to the app, so each notification is handed over by
// briefly setting the page title to a marked message, which the app watches.
;(() => {
	const MARKER = '⁣modrinth-notification:'
	let originalTitle = null

	function send(title, body) {
		if (originalTitle === null) originalTitle = document.title
		document.title = MARKER + JSON.stringify({ title, body })
		setTimeout(() => {
			if (document.title.startsWith(MARKER)) document.title = originalTitle
			originalTitle = null
		}, 100)
	}

	class AppNotification extends EventTarget {
		static get permission() {
			return 'granted'
		}

		static requestPermission(callback) {
			callback?.('granted')
			return Promise.resolve('granted')
		}

		constructor(title, options = {}) {
			super()
			this.title = String(title ?? '')
			this.body = String(options.body ?? '')
			this.onclick = this.onclose = this.onerror = this.onshow = null
			// Aternos creates an empty one only to test for support
			if (this.title || this.body) send(this.title, this.body)
		}

		close() {}
	}

	// The app's notification plugin puts its own Notification into every page,
	// which the Aternos page is not allowed to use, so this one is locked in
	Object.freeze(AppNotification)
	Object.defineProperty(window, 'Notification', {
		get: () => AppNotification,
		set: () => {},
		configurable: false,
	})
})()
