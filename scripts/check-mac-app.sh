#!/usr/bin/env bash
# Verifies that a packaged macOS .app is self-contained for node-libpd-napi:
#   1. every native binary has no absolute (machine-specific) rpath or dependency
#   2. every @rpath / @loader_path dependency resolves inside the bundle
#   3. the addon loads with the app's own Electron binary (ELECTRON_RUN_AS_NODE)
#   4. Pd patches are unpacked (libpd cannot read inside app.asar)
# Usage: scripts/check-mac-app.sh [path/to/App.app]

set -u

APP="${1:-$(find "$(dirname "$0")/../example/electron/dist" -maxdepth 2 -name '*.app' | head -1)}"
[ -d "$APP" ] || { echo "No .app found (pass its path as argument)"; exit 2; }
APP="$(cd "$APP" && pwd)"
# Failure marker file: works from subshells (pipelines), unlike a variable
FAIL_MARK="$(mktemp)"; rm -f "$FAIL_MARK"
trap 'rm -f "$FAIL_MARK"' EXIT

ok()   { echo "  OK   $*"; }
warn() { echo "  WARN $*"; }
fail() { echo "  FAIL $*"; touch "$FAIL_MARK"; }

echo "App: $APP"

# Native binaries we ship (Electron's own frameworks are excluded)
BINARIES=()
while IFS= read -r f; do BINARIES+=("$f"); done < <(
    find "$APP/Contents/Resources" \( -name '*.node' -o -name '*.dylib' \) -type f
)
[ ${#BINARIES[@]} -gt 0 ] || fail "no .node/.dylib found in Resources"

for bin in "${BINARIES[@]}"; do
    echo "== ${bin#$APP/}"
    dir="$(dirname "$bin")"

    # rpaths: anything not starting with @ is tied to the build machine.
    # It only matters if this binary actually has @rpath dependencies.
    rpaths=$(otool -l "$bin" | awk '/cmd LC_RPATH/{getline; getline; print $2}')
    uses_rpath=$(otool -L "$bin" | tail -n +2 | awk '{print $1}' | grep -v "^$(otool -D "$bin" | tail -n +2)$" | grep -c '^@rpath/')
    for rp in $rpaths; do
        case "$rp" in
            @*) ok "rpath $rp" ;;
            *)  if [ "$uses_rpath" -gt 0 ]; then fail "absolute rpath $rp"; else warn "unused absolute rpath $rp"; fi ;;
        esac
    done

    # dependencies (skip the first line = file name, and the install id)
    id=$(otool -D "$bin" | tail -n +2)
    otool -L "$bin" | tail -n +2 | awk '{print $1}' | while read -r dep; do
        [ "$dep" = "$id" ] && continue
        case "$dep" in
            /System/*|/usr/lib/*) ;;  # provided by macOS
            @rpath/*)
                name="${dep#@rpath/}"; found=""
                for rp in $rpaths; do
                    case "$rp" in @*) ;; *) continue ;; esac  # only in-bundle paths count
                    cand="${rp/@loader_path/$dir}"; cand="${cand/@executable_path/$APP/Contents/MacOS}"
                    [ -f "$cand/$name" ] && found="$cand/$name"
                done
                [ -n "$found" ] && ok "$dep -> ${found#$APP/}" || fail "$dep not resolvable inside the bundle"
                ;;
            @loader_path/*)
                [ -f "$dir/${dep#@loader_path/}" ] && ok "$dep" || fail "$dep missing"
                ;;
            *) fail "absolute dependency $dep" ;;
        esac
    done
done

echo "== Runtime load with the app's own Electron"
EXE="$APP/Contents/MacOS/$(defaults read "$APP/Contents/Info.plist" CFBundleExecutable)"
printf '%s\n' "${BINARIES[@]}" | grep '\.node$' | while IFS= read -r node; do
    out=$(cd / && ELECTRON_RUN_AS_NODE=1 "$EXE" -e "require(process.argv[1]); console.log('loaded')" "$node" 2>&1)
    [ "$out" = "loaded" ] && ok "require ${node##*/}" || { fail "require ${node##*/}"; echo "$out" | sed 's/^/       /'; }
done

echo "== Pd patches unpacked"
PATCHES="$APP/Contents/Resources/app.asar.unpacked/patches"
ls "$PATCHES"/*.pd >/dev/null 2>&1 && ok "$(ls "$PATCHES"/*.pd | wc -l | tr -d ' ') patch(es) in app.asar.unpacked/patches" || fail "no .pd in $PATCHES"

echo
[ -e "$FAIL_MARK" ] && { echo "RESULT: FAIL"; exit 1; }
echo "RESULT: PASS"
