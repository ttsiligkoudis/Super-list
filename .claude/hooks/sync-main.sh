#!/usr/bin/env bash
# Κρατά κάθε συνεδρία του Claude Code συγχρονισμένη με το main, που κάνει αυτόματα deploy (Cloudflare).
#   sync-main.sh start  -> (SessionStart) φέρνει το origin/main και το ενώνει στο τρέχον branch
#   sync-main.sh push|stop -> (μετά από git commit / στο τέλος κάθε απάντησης) ενώνει το origin/main και στέλνει το HEAD στο main
# Ποτέ force push. Σε σύγκρουση (conflict) σταματά, αναιρεί το merge και το αναφέρει.
set -u
mode="${1:-push}"
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

say() {
  if [ "$2" = Stop ]; then jq -cn --arg m "$1" '{systemMessage: $m}' 2>/dev/null || echo "$1"
  else jq -cn --arg m "$1" --arg ev "$2" '{systemMessage: $m, hookSpecificOutput: {hookEventName: $ev, additionalContext: $m}}' 2>/dev/null || echo "$1"; fi
}
retry() { local n=0; until "$@"; do n=$((n+1)); [ $n -ge 4 ] && return 1; sleep $((2**n)); done; }

case "$mode" in start) ev=SessionStart ;; stop) ev=Stop ;; *) ev=PostToolUse ;; esac
retry git fetch -q origin main || { say "sync-main: δεν έγινε fetch του origin/main." "$ev"; exit 0; }

# Ενώνει το origin/main στο τρέχον branch (αν λείπει κάτι από αυτό)
merge_main() {
  git merge-base --is-ancestor origin/main HEAD && return 0
  if ! git merge --no-edit -q origin/main >/dev/null 2>&1; then
    git merge --abort >/dev/null 2>&1
    say "sync-main: σύγκρουση με το origin/main — το merge αναιρέθηκε. Λύσε τη σύγκρουση (git merge origin/main) και κάνε commit· μετά θα σταλεί στο main." "$ev"
    exit 0
  fi
}

if [ "$mode" = start ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    say "sync-main: υπάρχουν αλλαγές χωρίς commit, δεν έγινε merge του origin/main." "$ev"; exit 0
  fi
  before=$(git rev-parse HEAD); merge_main
  [ "$before" != "$(git rev-parse HEAD)" ] && say "sync-main: έγινε merge του origin/main στο $(git branch --show-current)." "$ev"
  exit 0
fi

# push: μόνο αν το HEAD έχει commits που δεν είναι στο main
git merge-base --is-ancestor HEAD origin/main && exit 0
merge_main
if retry git push -q origin HEAD:main; then
  b=$(git branch --show-current)
  [ -n "$b" ] && [ "$b" != main ] && retry git push -q -u origin "$b" >/dev/null 2>&1
  say "sync-main: στάλθηκε στο main ($(git rev-parse --short HEAD)) — ξεκινά deploy." "$ev"
else
  say "sync-main: το push στο main απέτυχε (ίσως νεότερο main ή δικαιώματα). Τίποτα δεν στάλθηκε με force." "$ev"
fi
exit 0
