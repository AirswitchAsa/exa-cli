#!/usr/bin/env sh
# Resolve the exa-cli executable for the `exa` skill.
#
#   ensure-exa.sh             prints the resolved command (e.g. `exa`) and exits 0
#   ensure-exa.sh <args...>   execs the resolved command with those args
#
# Resolution order: an `exa-cli` already on PATH, then `npx`, then a failure
# message with install instructions.
#
# Note: an unrelated `exa` file-lister shares the binary name. Before trusting a
# PATH `exa`, this script checks the help text to confirm it is exa-cli.
set -eu

is_exa_cli() {
  "$1" --help 2>&1 | grep -qi "command-line interface for the exa api"
}

if command -v exa >/dev/null 2>&1 && is_exa_cli exa; then
  if [ "$#" -eq 0 ]; then
    printf '%s\n' "exa"
    exit 0
  fi
  exec exa "$@"
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
exa-cli is not available.

Install it with one of:
  npm install -g @spicadust/exa-cli
  curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh

Or download a prebuilt binary (no Node.js needed):
  https://github.com/AirswitchAsa/exa-cli/releases/latest

Or run it ephemerally when npx is available:
  npx -y @spicadust/exa-cli <command>
EOF
exit 1
