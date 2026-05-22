#!/usr/bin/env sh
# Resolve the exa-cli executable for the `exa` skill.
#
#   ensure-exa.sh             prints the resolved command (e.g. `exa-cli`) and exits 0
#   ensure-exa.sh <args...>   execs the resolved command with those args
#
# Resolution order: an `exa-cli` already on PATH, then `npx`, then a failure
# message with install instructions.
set -eu

if command -v exa-cli >/dev/null 2>&1; then
  if [ "$#" -eq 0 ]; then
    printf '%s\n' "exa-cli"
    exit 0
  fi
  exec exa-cli "$@"
fi

if command -v npx >/dev/null 2>&1; then
  if npx -y @spicadust/exa-cli --help >/dev/null 2>&1; then
    if [ "$#" -eq 0 ]; then
      printf '%s\n' "npx -y @spicadust/exa-cli"
      exit 0
    fi
    exec npx -y @spicadust/exa-cli "$@"
  fi
fi

cat >&2 <<'EOF'
exa-cli is not available, and npx was not found to run it.

Ask the user to install it with one of:
  npm install -g @spicadust/exa-cli
  curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh

Or to download a prebuilt binary (no Node.js needed):
  https://github.com/AirswitchAsa/exa-cli/releases/latest

Do not install it on the user's behalf.
EOF
exit 1
