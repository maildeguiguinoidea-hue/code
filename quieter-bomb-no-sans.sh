#!/usr/bin/env bash
# Makes the bomb as loud as the logo video, and removes the Sans easter egg completely.
# Run it with:   bash quieter-bomb-no-sans.sh
set -euo pipefail
REPO="$HOME/modrinth"
TITLE_BAR="$REPO/apps/app-frontend/src/app/shell/title-bar"
ok() { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
cd "$REPO"

# --- 1. Bomb volume (the sound files are ~5x louder than the video, so turn them down) ---
BOMB="$TITLE_BAR/bomb-easter-egg.vue"
sed -i 's/playSound(portalSoundSrc, 0\.[0-9]*)/playSound(portalSoundSrc, 0.24)/; s/bombSound\.volume = 0\.[0-9]*/bombSound.volume = 0.18/' "$BOMB"
grep -q "bombSound.volume = 0.18" "$BOMB" && grep -q "portalSoundSrc, 0.24" "$BOMB" && ok "Bomb and portal sounds turned down"

# --- 2. Remove Sans ---
rm -f "$TITLE_BAR/sans-easter-egg.vue"
sed -i "/import SansEasterEgg from '.\/sans-easter-egg.vue'/d; /<SansEasterEgg \/>/d" "$TITLE_BAR/index.vue"
rm -rf apps/app-frontend/public/sans
sed -i '\#^apps/app-frontend/public/sans/$#d' .gitignore
ok "Sans removed"

# Put the app's security rules back to how they were before Sans
python3 - apps/app/tauri.conf.json <<'PY'
import json, sys
p = sys.argv[1]
conf = json.load(open(p, encoding='utf-8'))
security = conf['app']['security']
csp = security['csp']
def remove(directive, *sources):
    if directive not in csp: return
    value = csp[directive]
    items = value.split() if isinstance(value, str) else list(value)
    items = [i for i in items if i not in sources]
    csp[directive] = ' '.join(items) if isinstance(value, str) else items
remove('script-src', "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'data:', 'https://extensions.turbowarp.org')
remove('font-src', 'data:')
remove('worker-src', "'self'", 'blob:')
if not csp.get('worker-src'): csp.pop('worker-src', None)
security.pop('dangerousDisableAssetCspModification', None)
json.dump(conf, open(p, 'w', encoding='utf-8'), indent='\t', ensure_ascii=False)
open(p, 'a', encoding='utf-8').write('\n')
PY
ok "Security rules restored (the logo video still works)"

grep -rq "SansEasterEgg" apps/app-frontend/src && echo "  ! Something still mentions Sans, tell Claude" || true
echo
echo "Done! Restart both dev windows (Ctrl+C, then dev-frontend.sh and dev-app.sh)."
echo "Then save it:  git add -A && git commit -m 'Quieter bomb, remove Sans' && git push"
