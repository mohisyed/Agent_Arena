# Agent Arena — Build & Learning Plan

**Goal:** A backend platform that drives autonomous LLM agents in Minecraft, with tool-calling, memory, an MCP server, an eval harness, and multi-agent coordination. One flagship repo that proves you can do AI engineering, not just use AI tools.

**Pace:** 30 min–2 hr/day. Phases are sized in *sessions*, not weeks — a session is one sitting. ~5 sessions/week means each phase is roughly 1.5–3 weeks.

**Learning rule:** Before each phase, read/watch the listed concepts FIRST (use your short days for this). Build on your long days. Use AI for scaffolding and boilerplate only — write the agent loop, memory logic, and eval logic yourself, because that's the stuff you'll be asked about in interviews.

**Stack decision (make it now):**
- **Agent service: Python.** Mineflayer is JS, but you'll wrap it — your agent brain, memory, and evals live in a Python service. Python because that's the interview lingua franca for AI roles.
- **Game I/O bridge: Node.js + Mineflayer.** Thin layer, mostly scaffolded. Exposes bot actions over a local HTTP/WebSocket API.
- **MCP server + tool layer (Phase 5): Java/Spring AI.** Your unfair advantage. Almost nobody has JVM AI work on GitHub.
- **Infra: Docker Compose** (Minecraft server + bridge + agent service), GitHub Actions from day one.

This split is itself a resume point: polyglot system with a clean service boundary, like a real production architecture.

---

## Phase 0 — Environment & Plumbing (3–5 sessions)

**What you build**
- Dockerized Minecraft server (itzg/minecraft-server image, offline mode for dev)
- Node bridge: Mineflayer bot connects, walks to coordinates, chats, digs a block — driven by HTTP endpoints
- Python service that calls the bridge ("move to X", "what do you see")
- Repo with Docker Compose, README skeleton, CI that lints + runs a smoke test

**What you learn**
- Mineflayer's API model: events, bot state, pathfinding (mineflayer-pathfinder plugin)
- Nothing AI yet — this is deliberately your wheelhouse so you get a fast win

**AI assistance:** Heavy scaffolding is fine here. The bridge is plumbing, not learning material.

**Done when:** `docker compose up` gives you a world, a bot, and `curl` commands that make it move. Record a 10-second clip. Commit it to the README.

**Trap to avoid:** Modding rabbit holes. Vanilla server, offline mode, done.

---

## Phase 1 — The Agent Loop (6–10 sessions) ← the heart of the project

**What you build**
- A ReAct-style loop in Python, **from scratch, no framework**: observe game state → LLM picks an action via tool calling → execute via bridge → feed result back → repeat until goal met or budget exhausted
- 5–8 typed tools with JSON schemas: `move_to`, `find_block`, `mine_block`, `craft_item`, `check_inventory`, `chat`
- Structured outputs, retry-on-malformed-response, max-iteration budget, graceful failure
- First real task: "collect 10 wood and craft a crafting table" — fully autonomous

**What you learn (read before building)**
- The ReAct paper (skim it — the pattern is: Thought → Action → Observation)
- Anthropic's tool use docs: how tool schemas, tool_use blocks, and tool_result blocks actually work on the wire
- Anthropic's "Building effective agents" post — specifically why workflows ≠ agents and when loops beat chains
- Why frameworks (LangChain etc.) are skipped here: interviewers respect "I built the loop raw" far more than "I called `create_react_agent()`"

**AI assistance:** Scaffolding for the API client and schemas OK. **Write the loop control flow yourself.** This is the #1 interview topic.

**Done when:** The bot completes the wood task end-to-end 3 times in a row, and you can sketch the loop on a whiteboard without looking at code.

**Trap to avoid:** Letting the LLM emit freeform text you parse with regex. Use native tool calling from the start.

---

## Phase 2 — Failure Handling & Skills (5–8 sessions)

**What you build**
- Composite skills: multi-step tools built from primitives (`gather_wood(n)` = find → path → mine → repeat)
- Error taxonomy: tool failed vs. LLM chose badly vs. game state changed underneath you — each with a different recovery (retry, replan, abort)
- A "scratchpad" plan the agent writes and revises (cheap planning, big quality win)
- Harder task tier: "build a 3x3 shelter", "craft stone tools"

**What you learn**
- Error handling in agent systems — what retries can fix and what needs replanning
- Context window management: what to keep in the prompt every turn (inventory, position, recent events) vs. what to drop. This is the start of "context engineering," a phrase that shows up in actual job posts now.

**Done when:** You can kill a task halfway (e.g., spawn the bot in a hole) and watch it replan instead of looping forever.

---

## Phase 3 — Memory (6–9 sessions)

**What you build**
- **Working memory:** rolling summary of the current episode, so long tasks don't blow the context window
- **Episodic memory:** after each task, the agent writes a postmortem ("tried X, failed because Y, Z worked") into a vector store (ChromaDB — you know it from JPOS-MCP)
- **Retrieval:** before planning a new task, query memory for relevant past episodes and inject the top hits into the prompt
- Measure it: same task suite with memory on vs. off

**What you learn (read before building)**
- The Voyager paper's skill-library idea — agents that store *what worked* and reuse it
- Summarization-based vs. retrieval-based memory and when each fails
- Embedding model choice and chunking decisions (you've done RAG over docs; RAG over *experience* has different failure modes — stale memories, retrieving the wrong episode)

**AI assistance:** ChromaDB wiring can be scaffolded. Design the memory schema (what gets stored, when, how it's retrieved and ranked) yourself.

**Done when:** A task the agent failed cold gets completed faster on the second attempt *because* of a retrieved memory — and you have the log to prove it.

---

## Phase 4 — Eval Harness & Observability (7–10 sessions) ← the credibility layer

**What you build**
- Task suite in YAML/JSON: each task has a programmatic success check (inventory contains X, structure exists at Y), a step budget, and a timeout
- Runner: execute the suite N times per configuration, output success rate, avg steps, tokens, cost, latency
- **LLM-as-judge** for the fuzzy stuff: plan quality, tool-choice sanity — with a calibration check (judge a handful by hand, compare)
- Tracing: wire in Langfuse or Arize Phoenix (both self-hostable) so every run has an inspectable trace
- Results table in the README: model A vs. B, memory on vs. off, prompt v1 vs. v2

**What you learn (read before building)**
- LLM-as-judge: known biases (position, verbosity, self-preference) and how to sanity-check a judge
- Why pass@k / success-rate-over-N-runs matters for stochastic systems — a single run proves nothing
- OpenTelemetry basics for LLM spans

**AI assistance:** Dashboard/plotting code, scaffold away. **Design the metrics and success criteria yourself** — "how would you evaluate an agent?" is a real interview question and most candidates have no answer.

**Done when:** You can say, with a chart: "memory + prompt v3 took task success from 40% to 75% across 20 runs and cut cost 30%." That sentence is the resume bullet.

---

## Phase 5 — MCP Server in Java/Spring (5–8 sessions)

**What you build**
- A Spring AI (or LangChain4j) MCP server exposing the agent platform: `run_task`, `get_eval_results`, `query_agent_memory`, `get_trace`
- Now Claude Desktop/Code can drive your arena — "run the shelter task with Haiku and show me the eval diff" works from a chat window
- Demo clip of exactly that

**What you learn**
- MCP from the *spec* side this time, on a second runtime — you'll understand the protocol, not just FastMCP's abstractions
- Spring AI's MCP support (GA, well-documented)

**Why this phase matters:** Python agent platform + JVM MCP layer = the polyglot, enterprise-credible profile nobody else in the portfolio pile has. Direct conversation starter with NYC banks/enterprises.

**Done when:** Claude Desktop kicks off an eval run on your machine and reads back the results.

---

## Phase 6 — Multi-Agent (8–12 sessions, the flashy finale)

**What you build**
- 2–3 agents in the same world, each its own loop, sharing it only through a coordination channel (in-game chat or a message bus — Kafka if you want the resume keyword, Redis pub/sub if you want your life back)
- A coordination task: "together, build this structure" or "one mines, one crafts, one builds"
- Measure the coordination tax: same task solo vs. duo vs. trio — success rate, steps, tokens. (The MineCollab paper found communication is the bottleneck; reproduce that finding in your own system and write it up.)
- THE demo clip: agents talking to each other in chat while building. This is what goes on LinkedIn.

**What you learn**
- Multi-agent patterns: orchestrator-worker vs. peer-to-peer, shared memory vs. message passing
- Why multi-agent often *underperforms* single-agent + better tools — knowing this trade-off cold is senior-level signal

**Done when:** Two agents complete a task neither completes alone within the same step budget — or you can explain precisely why they don't, with data.

---

## Working Rhythm

- **Short day (30 min):** read a paper section, write README docs, review traces, tune one prompt
- **Long day (2 hr):** build features, run eval suites
- **Every phase ends with:** README updated, demo clip, eval numbers if applicable. A polished Phase 4 beats a half-built Phase 6 — descope ruthlessly.
- **Post publicly at three points:** first autonomous task (Phase 1), the eval results chart (Phase 4), the multi-agent clip (Phase 6).

## Reading List (in order of need)

1. ReAct paper (Yao et al., 2022) — Phase 1
2. Anthropic: "Building effective agents" + tool use docs — Phase 1
3. Voyager paper (arXiv:2305.16291) — Phase 3
4. Anthropic: "Building effective agents" memory/context sections + context-engineering writeups — Phases 2–3
5. LLM-as-judge survey or Langfuse/Phoenix eval docs — Phase 4
6. MCP spec + Spring AI MCP docs — Phase 5
7. MineCollab paper (arXiv:2504.17950) — Phase 6

## What "Job-Ready" Looks Like at the End

You can whiteboard an agent loop, explain memory architecture trade-offs, describe how you'd evaluate a stochastic system, speak to MCP at the protocol level, and explain when multi-agent is the wrong answer — all backed by a repo with numbers in the README. That's the interview, covered.
