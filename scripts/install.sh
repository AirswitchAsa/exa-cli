#!/usr/bin/env sh
# Install the exa-cli standalone binary (no Node.js runtime required).
#
#   curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh
#
# Overridable via environment:
#   EXA_CLI_INSTALL_REPO     default AirswitchAsa/exa-cli
#   EXA_CLI_INSTALL_VERSION  default latest (or a tag like v0.1.0)
#   EXA_CLI_INSTALL_DIR      default $HOME/.local/bin
set -eu

REPO="${EXA_CLI_INSTALL_REPO:-AirswitchAsa/exa-cli}"
VERSION="${EXA_CLI_INSTALL_VERSION:-latest}"
INSTALL_DIR="${EXA_CLI_INSTALL_DIR:-$HOME/.local/bin}"

err() { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*" >&2; }

uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "$uname_s" in
  Darwin) os="darwin" ;;
  Linux)  os="linux" ;;
  *)      err "unsupported OS: $uname_s (Windows: download exa-windows-x64.exe from https://github.com/$REPO/releases/latest)" ;;
esac

case "$uname_m" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64)  arch="x64" ;;
  *)             err "unsupported arch: $uname_m" ;;
esac

if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
  err "Intel macOS binaries are not published. Install with 'npm install -g @spicadust/exa-cli', or build from source."
fi

asset="exa-${os}-${arch}"

if [ "$VERSION" = "latest" ]; then
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
else
  url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
fi

command -v curl >/dev/null 2>&1 || err "curl is required"
mkdir -p "$INSTALL_DIR"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

info "downloading $asset from $url"
if ! curl -fsSL --retry 3 -o "$tmp" "$url"; then
  err "download failed (asset may not exist for this platform: $asset)"
fi

target="$INSTALL_DIR/exa"
mv "$tmp" "$target"
chmod +x "$target"
trap - EXIT

info "installed: $target"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) info "warning: $INSTALL_DIR is not on PATH. Add it, e.g.: export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
esac

"$target" --help >/dev/null 2>&1 || err "installed binary failed self-check"
info "ok: run 'exa --help' to verify"
