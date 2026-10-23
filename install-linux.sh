#!/usr/bin/env bash
# Builds your version of the app and installs it on this computer.
cd "$(dirname "$0")"
source "$HOME/.cargo/env"
export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"
set -euo pipefail
set -a; source packages/app-lib/.env; set +a
export CARGO_PROFILE_RELEASE_LTO=thin
cd apps/app
(cd ../.. && pnpm -w i18n:coverage)
pnpm tauri build --bundles deb
sudo apt-get install -y --reinstall "$(ls -t ../../target/release/bundle/deb/*.deb | head -1)"
echo "Installed! Open 'Modrinth App' from your app menu."
