#!/usr/bin/env bash
# Window 1: the app's interface (Vite). Leave it running.
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"; source "$NVM_DIR/nvm.sh"
pnpm -w i18n:coverage && pnpm turbo run dev --filter=@modrinth/app-frontend
