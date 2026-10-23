#!/usr/bin/env bash
# Window 2: the app itself. Start it after dev-frontend.sh says "VITE ready".
cd "$(dirname "$0")"
source "$HOME/.cargo/env"
export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"
set -a; source packages/app-lib/.env; set +a
export CARGO_PROFILE_DEV_DEBUG=0
cd apps/app
cargo run --no-default-features --features export-app-events
