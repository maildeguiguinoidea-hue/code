// Recolors aternos.org with the app's theme. Aternos draws almost everything
// with the CSS variables below, so swapping them restyles the whole site.
// The app calls window.__modrinthAternosTheme(palette) with its own colors.
// Aternos's own dark mode is always on, since only it draws the page area
// from these variables; in a light app theme they simply hold light colors.
;(() => {
	const STYLE_ID = 'modrinth-theme'
	const THEME_SWITCH_CLASSES = ['default', 'dark-auto', 'dark', 'light']
	const FONT_URL = 'https://cdn.modrinth.com/fonts/inter/Inter'

	const fontFaces = [
		['Regular', 400],
		['Medium', 500],
		['SemiBold', 600],
		['Bold', 700],
		['ExtraBold', 800],
	]
		.map(
			([name, weight]) =>
				`@font-face{font-family:inter;font-weight:${weight};font-display:swap;` +
				`src:url('${FONT_URL}-${name}.woff2?v=3.19') format('woff2')}`,
		)
		.join('')

	const statusTint = (status, color) => `
.server-status .status.${status} { background: color-mix(in srgb, var(${color}) 18%, transparent) !important; }
.server-status .status.${status}, .server-status .status.${status} * { color: var(${color}) !important; }`

	const baseCss = `${fontFaces}
html { background: var(--color-dark-mode) !important; }
.header-link-exaroton, .exaroton-header-leaderboard, .exaroton-billboard, .exaroton-skyscraper,
.exaroton-video { display: none !important; }
body { font-family: var(--font-main) !important; }
.btn:not([class*="join-"]) { border-radius: 12px !important; }
.btn.join-left { border-radius: 12px 0 0 12px !important; }
.btn.join-right { border-radius: 0 12px 12px 0 !important; }
.btn.btn-main, .btn-main, .btn.btn-success, .btn-green, .btn.btn-danger, .btn-red,
.btn.btn-warn, .btn.btn-orange { --button-color: var(--modrinth-on-accent) !important; }
.server-info-box-head, .server-info-box-head * { color: var(--modrinth-on-accent) !important; }
.navigation-server { background: var(--color-dark-mark) !important; }
.navigation-server-info { color: var(--color-light) !important; }
.live-status-box { background: var(--color-dark) !important; text-shadow: none !important; }
.live-status-box-label { color: var(--color-light-fade) !important; }
.live-status-box-value { color: var(--color-light) !important; }
.live-status-box-icon, .live-status-box-icon * { color: var(--color-main) !important; }
.end-countdown { background: var(--color-dark-mark) !important; }
.end-countdown, .end-countdown * { color: var(--color-light) !important; }
.end-countdown i { color: var(--color-success) !important; }
.server-message-head, .server-message-head * { color: var(--modrinth-on-accent) !important; }
.domain-status, .domain-port-mapping { color: var(--color-light) !important; }
.config-option-output { color: var(--color-light-fade) !important; }
.dropdown-item { border-top-color: var(--color-dark-mark) !important; }
.mcformat-toolbar-menu { background: var(--color-dark-mark) !important; }
.mcformat-toolbar-menu::before { border-bottom-color: var(--color-dark-mark) !important; }
.mcformat-toolbar-menu.mcformat-toolbar-menu-top::before { border-top-color: var(--color-dark-mark) !important; }
.toggle-save-container .toggle-save, .log .line-number { color: var(--color-light-fade) !important; }
.get-more-ram-alert .steps .item i, .boost-friends-alert .steps .item i { color: var(--color-light-fade) !important; }
.multiselect input { color: var(--color-light) !important; }
.radio-select-server { border-left-color: var(--color-light) !important; }
.langswitch .langswitch-dropdown { border-color: var(--color-dark-mark) !important; }
.langswitch .langswitch-dropdown .arrow-up { border-bottom-color: var(--color-dark-mark) !important; }
.blueprint-alert-body .blueprint-version-wrapper { border-top-color: var(--color-dark-mark) !important; }
.cm-editor .cm-panels.cm-panels-top, .cm-editor .cm-panels.cm-panels-bottom { border-color: var(--color-dark-mark) !important; }
.deleted-server-alert .last-backup { background: var(--color-dark-mark) !important; }
.resource-pack-wrapper .resource-pack.resource-pack-warning { background: color-mix(in srgb, var(--color-danger) 30%, var(--color-dark)) !important; }
${statusTint('offline', '--color-danger')}
${statusTint('online', '--color-success')}
${statusTint('queueing', '--color-warn')}
${statusTint('loading', '--color-light-fade')}
${statusTint('status-pending', '--color-light-fade')}
`

	/** Aternos's help articles, promotions and other tips, hidden on request */
	const hideTipsCss = `.help-center-articles, .headline-help-article, .promo-carousel-wrapper,
.backup-cta { display: none !important; }`

	/** Aternos's logo is white, so it is darkened on a light theme */
	const lightCss = `.logo img { filter: invert(1) brightness(0.3); }`

	function variables(palette) {
		return {
			'--font-main': 'inter, sans-serif',
			'--modrinth-on-accent': palette.accentContrast,
			'--color-dark': palette.raisedBg,
			'--color-dark-mode': palette.bg,
			'--color-dark-mark': palette.buttonBg,
			'--color-dark-hover': palette.buttonBg,
			'--color-dark-text': palette.secondary,
			'--color-light': palette.contrast,
			'--color-light-fade': palette.secondary,
			'--color-loading': palette.secondary,
			'--color-main': palette.brand,
			'--color-success': palette.green,
			'--color-danger': palette.red,
			'--color-warn': palette.orange,
		}
	}

	function forceDarkMode() {
		for (const element of document.querySelectorAll('#theme-switch, .dark-auto')) {
			element.classList.remove(...THEME_SWITCH_CLASSES)
			element.classList.add('dark')
		}
	}

	const STORAGE_KEY = 'modrinth-theme'

	/** The last theme is kept by the page too, so later pages start with it */
	function loadSaved() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY))
		} catch {
			return null
		}
	}

	let current = loadSaved()

	function apply() {
		if (!current) return
		forceDarkMode()
		const parent = document.head || document.documentElement
		if (!parent) return
		let style = document.getElementById(STYLE_ID)
		if (!style) {
			style = document.createElement('style')
			style.id = STYLE_ID
			parent.appendChild(style)
		}
		const vars = Object.entries(variables(current))
			.filter(([, value]) => typeof value === 'string' && value)
			.map(([name, value]) => `${name}: ${value} !important;`)
			.join(' ')
		const css = `${baseCss}${current.dark ? '' : lightCss}${current.hideTips ? hideTipsCss : ''}:root { ${vars} }`
		// Writing the same text again would count as a change and wake the observer below
		if (style.textContent !== css) style.textContent = css
	}

	// Applied again as the page is built, so it never shows unthemed first
	const observer = new MutationObserver(apply)
	observer.observe(document, { childList: true, subtree: true })
	document.addEventListener('DOMContentLoaded', () => {
		apply()
		observer.disconnect()
	})

	window.__modrinthAternosTheme = (palette) => {
		current = palette
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(palette))
		} catch {}
		apply()
	}
})()
