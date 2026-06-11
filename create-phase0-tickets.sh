#!/usr/bin/env bash
# Phase 0 tickets for Agent Arena.
# Usage: create your repo first, cd into it, make sure `gh` CLI is authed, then:
#   chmod +x create-phase0-tickets.sh && ./create-phase0-tickets.sh
set -euo pipefail

gh label create "phase-0" --color "0E8A16" --description "Environment & plumbing" --force

gh issue create --label "phase-0" \
  --title "P0-1: Repo skeleton" \
  --body "$(cat <<'EOF'
**Goal:** A repo that looks intentional from commit one.

**Tasks**
- [ ] README with one-paragraph project pitch (what Agent Arena is, what it will prove)
- [ ] .gitignore (Node + Python), MIT license
- [ ] Empty `bridge/` and `agent/` directories with placeholder READMEs
- [ ] Commit `agent-arena-plan.md` to the repo root

**Done when:** Repo is public, pitch is readable, structure is in place.
**Size:** 1 session (short day OK)
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-2: Minecraft server in Docker" \
  --body "$(cat <<'EOF'
**Goal:** Reproducible game server, zero local install.

**Tasks**
- [ ] `docker-compose.yml` using `itzg/minecraft-server`
- [ ] Offline mode for dev (`ONLINE_MODE: "false"`)
- [ ] PIN the Minecraft version explicitly (e.g. `VERSION: "1.21.1"`) — check Mineflayer's currently supported versions FIRST and pick one it supports
- [ ] Persistent world volume

**Done when:** `docker compose up` starts the server and you can join the world from your own Minecraft client.
**Size:** 1 session
**Trap:** Do not browse mods. Vanilla only.
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-3: Mineflayer bot connects" \
  --body "$(cat <<'EOF'
**Goal:** A bot exists in the world.

**Tasks**
- [ ] `npm init` in `bridge/`, install mineflayer (pin the version in package.json)
- [ ] Bot connects to the dockerized server in offline mode
- [ ] Bot says "hello" in chat on spawn
- [ ] Log basic spawn events to console

**Done when:** You join the world and see the bot standing there; it greeted you in chat.
**Size:** 1 session
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-4: Bot moves and digs" \
  --body "$(cat <<'EOF'
**Goal:** Prove the two primitive actions everything else builds on.

**Tasks**
- [ ] Install mineflayer-pathfinder (pin version)
- [ ] Function: walk to given x/y/z coordinates
- [ ] Function: dig the block at a given position (walk into range first)
- [ ] Trigger both from a quick test script

**Done when:** You can watch the bot walk somewhere and dig a block, driven purely from code.
**Size:** 1 session
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-5: Bridge HTTP API" \
  --body "$(cat <<'EOF'
**Goal:** The bot becomes a service. Dumb pipe — no cleverness.

**Tasks**
- [ ] Small Express server in `bridge/`
- [ ] `POST /move` {x, y, z}
- [ ] `POST /dig` {x, y, z}
- [ ] `POST /chat` {message}
- [ ] `GET /state` → position, health, inventory, nearby blocks (basic)
- [ ] Return errors as JSON with sane status codes

**Done when:** `curl` commands make the bot move, dig, and talk; `/state` returns real data.
**Size:** 1–2 sessions
**Trap:** Resist adding queueing, auth, or websockets. Phase 1 will tell you what the API actually needs.
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-6: Python agent service calls bridge" \
  --body "$(cat <<'EOF'
**Goal:** The language boundary works end to end.

**Tasks**
- [ ] Python project in `agent/` (uv or pip + venv, your call — commit the lockfile)
- [ ] Thin client module wrapping the bridge endpoints (requests or httpx)
- [ ] Script: read state, command the bot to walk somewhere, print new position

**Done when:** One `python` command moves the bot and prints where it ended up.
**Size:** 1 session
EOF
)"

gh issue create --label "phase-0" \
  --title "P0-7: CI + demo clip" \
  --body "$(cat <<'EOF'
**Goal:** Quality gates from day one, and the first public artifact.

**Tasks**
- [ ] GitHub Action: lint bridge (eslint) + agent (ruff)
- [ ] Smoke test that runs in CI without a game server (e.g. unit test the bridge client with the server mocked)
- [ ] Record 10-second clip of the bot walking/digging, embed as GIF in README
- [ ] Add docker-compose for the full stack: server + bridge together

**Done when:** CI is green on main, README has the clip.
**Size:** 1–2 sessions
**This closes Phase 0.** Next session: write your own Phase 1 tickets (the deal stands — draft them and I'll review).
EOF
)"

echo "Phase 0 tickets created. Go look at your issues tab."
