#!/bin/sh
# Install Coastty from its GitHub releases.
# Usage: curl -fsSL https://github.com/chiubaca/coastty/releases/latest/download/install.sh | sh

set -eu

repository="${COASTTY_REPOSITORY:-chiubaca/coastty}"
version="${COASTTY_VERSION:-latest}"
install_dir="${COASTTY_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
  printf '%s\n' "Error: $*" >&2
  exit 1
}

case "$(uname -s)" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *) fail "unsupported operating system: $(uname -s)" ;;
esac

case "$(uname -m)" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *) fail "unsupported CPU architecture: $(uname -m)" ;;
esac

binary="coastty-${os}-${arch}"
if [ "$version" = "latest" ]; then
  release_url="https://github.com/${repository}/releases/latest/download"
else
  release_url="https://github.com/${repository}/releases/download/${version}"
fi
temp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT HUP INT TERM

download() {
  url="$1"
  destination="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$destination"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "$destination"
  else
    fail "curl or wget is required"
  fi
}

printf 'Downloading Coastty for %s/%s...\n' "$os" "$arch"
download "${release_url}/${binary}" "${temp_dir}/${binary}"
download "${release_url}/checksums.txt" "${temp_dir}/checksums.txt"

expected_checksum="$(awk -v file="$binary" '$2 == file { print $1 }' "${temp_dir}/checksums.txt")"
[ -n "$expected_checksum" ] || fail "checksum for ${binary} was not found"

if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum="$(sha256sum "${temp_dir}/${binary}" | awk '{ print $1 }')"
elif command -v shasum >/dev/null 2>&1; then
  actual_checksum="$(shasum -a 256 "${temp_dir}/${binary}" | awk '{ print $1 }')"
else
  fail "sha256sum or shasum is required to verify the download"
fi

[ "$expected_checksum" = "$actual_checksum" ] || fail "checksum verification failed"

mkdir -p "$install_dir"
install_path="${install_dir}/coastty"
mv "${temp_dir}/${binary}" "$install_path"
chmod +x "$install_path"

printf 'Coastty installed to %s\n' "$install_path"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) printf 'Add %s to your PATH to run coastty from any directory.\n' "$install_dir" ;;
esac
