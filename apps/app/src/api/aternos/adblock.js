// Blocks Aternos's ads and anti-adblock scripts, hides the overlay, and makes
// Start/Download work. Ported from the "Aternos – all-in-one fix" userscript
// (jc.aternos.fix v2.0), with Violentmonkey's GM_* calls swapped for plain
// page APIs. Runs before the page's own scripts.
;(() => {
	const log = (...a) => console.log('[aternos-fix]', ...a)
	// Kept from before the page's scripts run, in case they replace them
	const nativeFetch = window.fetch.bind(window)
	const NativeFunction = Function

	// A MutationObserver sees every <script> the moment the HTML parser adds it.
	// Browsers run pending observers right before executing a parsed script, so
	// the bad ones (ads + anti-adblock) are neutered before they ever run.
	const BLOCK_SRC = [
		/^data:text\/javascript/i, // obfuscated hook script in <head>
		/snigelweb\.com/i,
		/adengine/i, // Aternos's ad loader
		/googlesyndication\.com/i,
		/doubleclick\.net/i,
		/googletagservices\.com/i,
		/amazon-adsystem\.com/i,
		/adnxs\.com/i,
		/pubmatic\.com/i,
		/rubiconproject\.com/i,
		/criteo\.(com|net)/i,
		/taboola\.com/i,
		/outbrain\.com/i,
		/admiral/i,
		/getadmiral/i,
	]
	const BLOCK_TEXT = [
		/\(\(\)=>\{\}\)\.constructor\(/, // the while(true) freeze script
		/cache_is_blocking_ads/, // anti-adblock hook
		/ZnVuY3Rpb24/, // base64 "function" loader
	]
	const BLOCK_ATTR = ['nowprocket']

	function isBad(s) {
		const src = s.getAttribute('src') || ''
		if (src && BLOCK_SRC.some((r) => r.test(src))) return 'src ' + src.slice(0, 60)
		if (BLOCK_ATTR.some((a) => s.hasAttribute(a))) return 'attr'
		const t = s.textContent
		if (t && BLOCK_TEXT.some((r) => r.test(t))) return 'text ' + t.slice(0, 40).replace(/\s+/g, ' ')
		return null
	}

	function kill(s) {
		const why = isBad(s)
		if (!why) return
		s.type = 'javascript/blocked'
		s.removeAttribute('src')
		s.textContent = ''
		s.remove()
		log('blocked script:', why)
	}

	new MutationObserver((muts) => {
		for (const m of muts)
			for (const n of m.addedNodes) {
				if (n.nodeName === 'SCRIPT') kill(n)
				else if (n.querySelectorAll) n.querySelectorAll('script').forEach(kill)
			}
	}).observe(document, { childList: true, subtree: true })

	const style = document.createElement('style')
	style.textContent = `
		span:has(> div[style*="z-index: 10991"]),
		div[style*="position: fixed"][style*="#F62451"],
		.display.leaderboard, .display.skyscraper, .display.rectangle, .ad-replacement,
		.promo-carousel-wrapper, .instream
		{ display: none !important; }`
	function addStyle() {
		const parent = document.head || document.documentElement
		if (!parent) return false
		parent.appendChild(style)
		return true
	}
	if (!addStyle()) {
		const waitForRoot = new MutationObserver(() => addStyle() && waitForRoot.disconnect())
		waitForRoot.observe(document, { childList: true })
	}

	// The "hidden variable" Start/Download check. Known values, one per Aternos
	// build, are set right away.
	const KNOWN = {
		DQWheQmbl: 'cYnw@UQ!SS_&}>YD4BTBY', // 2026-10-18
		vhyfaVDTAFSxzToqI: 'a<Nj5yJu/uXm', // 2026-10-19
		bwFNrfsHZ: '3BYsY6A]J9g5Ny"|f]Q?_dmf]wToF2n', // 2026-10-20
	}
	for (const [k, v] of Object.entries(KNOWN)) window[k] = v

	// Aternos changes names, values and the shape of the check every build, so
	// they are also read from its own JS files. Any  if(...)return  whose
	// condition compares self[...] / self.x with a string is treated as a gate:
	//   if(!( self[k]===v && ... ))return   -> set k = v   (=== must be true)
	//   if( v!==self[k] || ... )return      -> set k = v   (!== must be false)
	function splitTop(s, op) {
		const out = []
		let depth = 0,
			q = null,
			cur = ''
		for (let i = 0; i < s.length; i++) {
			const c = s[i]
			if (q) {
				cur += c
				if (c === '\\') {
					cur += s[++i]
				} else if (c === q) q = null
				continue
			}
			if (c === '"' || c === "'" || c === '`') {
				q = c
				cur += c
				continue
			}
			if (c === '(' || c === '[' || c === '{') depth++
			if (c === ')' || c === ']' || c === '}') depth--
			if (depth === 0 && c === op[0] && s[i + 1] === op[1]) {
				out.push(cur)
				cur = ''
				i++
				continue
			}
			cur += c
		}
		out.push(cur)
		return out
	}

	function matchParen(s, start) {
		let depth = 0,
			q = null
		for (let i = start; i < s.length; i++) {
			const c = s[i]
			if (q) {
				if (c === '\\') i++
				else if (c === q) q = null
				continue
			}
			if (c === '"' || c === "'" || c === '`') {
				q = c
				continue
			}
			if (c === '(') depth++
			if (c === ')' && --depth === 0) return i
		}
		return -1
	}

	const evalExpr = (x) => NativeFunction('"use strict";return (' + x + ')')()

	function parseCmp(part, op) {
		const i = part.indexOf(op)
		if (i < 0) return null
		let a = part.slice(0, i).trim(),
			b = part.slice(i + 3).trim()
		if (!/^self[[.]/.test(a)) [a, b] = [b, a]
		const km = a.match(/^self\[(.*)\]$/s)
		const kd = a.match(/^self\.([A-Za-z_$][\w$]*)$/)
		try {
			const key = km ? evalExpr(km[1]) : kd ? kd[1] : null
			if (key === null) return null
			const val = evalExpr(b)
			return typeof key === 'string' && typeof val === 'string' ? [key, val] : null
		} catch {
			return null
		}
	}

	function extractGates(code) {
		const found = {}
		const re = /if\(/g
		let m
		while ((m = re.exec(code))) {
			const open = m.index + 2
			const close = matchParen(code, open)
			if (close < 0) continue
			if (!/^\)?\s*return\b/.test(code.slice(close + 1, close + 12).replace(/^\)/, ''))) continue
			const cond = code.slice(open + 1, close)
			if (!/self[[.]/.test(cond)) continue
			if (cond.startsWith('!(') && matchParen(cond, 1) === cond.length - 1) {
				for (const part of splitTop(cond.slice(2, -1), '&&')) {
					const kv = parseCmp(part, '===')
					if (kv) found[kv[0]] = kv[1]
				}
			} else {
				for (const part of splitTop(cond, '||')) {
					const kv = parseCmp(part, '!==')
					if (kv) found[kv[0]] = kv[1]
				}
			}
		}
		return found
	}

	function scanGates() {
		const urls = [
			...document.querySelectorAll('script[src*="assets.aternos.org/assets/panel/js/"]'),
		].map((s) => s.src)
		for (const url of urls) {
			nativeFetch(url)
				.then((r) => r.text())
				.then((code) => {
					for (const [k, v] of Object.entries(extractGates(code))) {
						window[k] = v
						log('set', k, 'from', url.split('/').pop())
					}
				})
				.catch((e) => log('gate scan failed', e))
		}
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanGates)
	else scanGates()
})()
