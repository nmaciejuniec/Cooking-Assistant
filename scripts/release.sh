#!/usr/bin/env bash
# Publishes the apps to ONE GitHub release called "latest" (no version numbers to keep track of).
#   release.sh apk out/CookingAssistant.apk   -> moves "latest" to this build, replaces the APK, removes any other release
#   release.sh dmg CookingAssistant.dmg       -> replaces the Mac DMG in "latest"
# Needs GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA and BUILD_DATE in the environment.
set -euo pipefail
KIND="$1"; FILE="$2"; R="$GITHUB_REPOSITORY"
notes() {
  cat <<NOTES
Download:
- **CookingAssistant.apk**: Android tablet / phone (built $BUILD_DATE)
- **CookingAssistant.dmg**: Mac, Apple Silicon and Intel ($1)

Each new build replaces these files. The files ending in **-previous** are the build before, in case you need to go back.
Installation steps are in the README.
NOTES
}
# The file being replaced is kept once as "...-previous", so there is always one version to go back to.
keep_previous() {
  local tmp; tmp="$(mktemp -d)"
  if gh release download latest -R "$R" -p "$1" -D "$tmp" 2>/dev/null; then
    mv "$tmp/$1" "$tmp/$2" && gh release upload latest "$tmp/$2" -R "$R" --clobber
  fi
  rm -rf "$tmp"
}
if [ "$KIND" = apk ]; then
  if gh release view latest -R "$R" >/dev/null 2>&1; then
    gh api -X PATCH "repos/$R/git/refs/tags/latest" -f sha="$GITHUB_SHA" -F force=true >/dev/null \
      || gh api -X POST "repos/$R/git/refs" -f ref=refs/tags/latest -f sha="$GITHUB_SHA" >/dev/null
    gh release edit latest -R "$R" --title "Cooking Assistant" --notes "$(notes 'replaced when the Mac build finishes; until then it is the previous build')" --latest
  else
    gh release create latest -R "$R" --target "$GITHUB_SHA" --title "Cooking Assistant" --notes "$(notes 'added when the Mac build finishes')" --latest
  fi
  keep_previous CookingAssistant.apk CookingAssistant-previous.apk
  gh release upload latest "$FILE" -R "$R" --clobber
  for t in $(gh release list -R "$R" --limit 200 --json tagName --jq '.[].tagName'); do
    if [ "$t" != latest ]; then echo "Removing old release $t"; gh release delete "$t" -R "$R" --yes --cleanup-tag; fi
  done
else
  keep_previous CookingAssistant.dmg CookingAssistant-previous.dmg
  gh release upload latest "$FILE" -R "$R" --clobber
  gh release edit latest -R "$R" --notes "$(notes "built $BUILD_DATE")"
fi
