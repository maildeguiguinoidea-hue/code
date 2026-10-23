#!/usr/bin/env bash
# Starts the Modrinth dev app: opens the two terminals for you, in the right order.
cd "$HOME/modrinth"

# Pick whichever terminal app is installed (Linux Mint has gnome-terminal)
open_terminal() {
	local title="$1" cmd="$2"
	if command -v gnome-terminal >/dev/null; then
		gnome-terminal --title="$title" -- bash -c "$cmd; echo; read -rp 'Press Enter to close'"
	else
		x-terminal-emulator -T "$title" -e bash -c "$cmd; echo; read -rp 'Press Enter to close'"
	fi
}

# Already running from last time? Stop it so the port is free
if lsof -ti :1420 >/dev/null 2>&1; then
	echo "Stopping the old interface..."
	kill $(lsof -ti :1420) 2>/dev/null
	sleep 1
fi

open_terminal "Modrinth interface" "$HOME/modrinth/dev-frontend.sh"

echo "Waiting for the interface to be ready..."
for _ in $(seq 1 120); do
	curl -s -o /dev/null http://localhost:1420 && break
	sleep 1
done

open_terminal "Modrinth app" "$HOME/modrinth/dev-app.sh"
echo "Started! The app window opens when it finishes compiling."
