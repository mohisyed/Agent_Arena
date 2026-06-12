# Agent Arena — Canonical Build & Learning Plan (v3)

**Goal:** A backend platform that drives autonomous LLM agents in Minecraft — Spring Boot control plane, Postgres event-sourced persistence, raw Python agent loop, memory, eval harness, JVM MCP server, multi-agent coordination — **deployed to AWS** so "in production" is a true sentence, not a stretch.

**Pace:** 30 min–2 hr/day. Phases sized in *sessions* (one sitting). ~5 sessions/week ⇒ each phase is roughly 1.5–3 weeks.

**Learning rule:** Read the listed concepts FIRST (short days), build on long days. AI assistance is allowed for scaffolding/boilerplate only — the per-phase contract says exactly what you must write yourself, because that's what interviews probe.

**Stack (locked):**
- **Control plane: Java/Spring Boot** — REST + WebSocket, the TAPI-mirror. You write this.
- **Agent brain: Python, raw ReAct loop, no framework** — interview lingua franca. You write this.
- **Game bridge: Node.js + Mineflayer** — thin translation layer. AI scaffolds this.
- **Database: Postgres + pgvector** — one database for runs, events, LLM telemetry, AND vector memory. (ChromaDB is the fallback if pgvector fights you — you know it from JPOS-MCP — but pgvector keeps the "one DB, real schema" story.)
- **MCP server: Spring AI or LangChain4j** — your JVM differentiator.
- **Infra: Docker everywhere, GitHub Actions from day one, AWS at the end.**

The pitch this produces: *polyglot agent platform — Java control plane, Python agent, JVM MCP layer, event-sourced Postgres, evaluated and deployed.* Nobody else in the portfolio pile has that combination.

---

## 🐳 Docker Learning Track (woven through every phase)

You don't learn Docker in a sidebar; you learn it by needing it. Each phase below has a **Docker rung**. By Phase 8 you'll have climbed from "run a container" to "design and ship a multi-service containerized system to the cloud" — which is the actual job skill.

| Phase | Docker rung |
|---|---|
| 0 | Images vs. containers, `docker run`, Compose basics, volumes, port mapping |
| 1 | Write your own Dockerfiles (multi-stage build for Spring Boot; slim Python image), Compose networking, healthchecks, `depends_on` |
| 2–3 | Dev workflow: bind mounts for hot reload, container logs, exec-ing into containers to debug, .dockerignore and build context |
| 4–5 | Resource limits, restart policies, running one-off containers (eval jobs as containers), image layering and cache optimization |
| 6 | Compose profiles (run with/without the MCP service), container-to-container service discovery |
| 7 | Scaling a service (`--scale agent=3`), why Compose stops being enough — the bridge to orchestration concepts |
| 8 | Pushing to a registry (ECR), running containers in the cloud (ECS Fargate / EC2), env-based config, secrets, log shipping |

**Read once, early (Phase 0–1):** Docker's official "Get Started" guide end-to-end, then *"Dockerfile best practices"* from Docker docs. That's genuinely sufficient; everything else you learn by hitting it.

---

## Phase 0 — Environment & Plumbing (3–5 sessions)

**What you build**
- Dockerized Minecraft server (itzg/minecraft-server, offline mode for dev)
- Node bridge: Mineflayer bot connects, walks, chats, digs — driven by simple HTTP/WS endpoints
- Repo: Docker Compose (server + bridge), README skeleton, CI that lints + smoke-tests

**Docker rung:** Don't just run the compose file — be able to explain every line. What's a volume and why does the world persist? What does the port mapping do? What happens on `docker compose down` vs `down -v`?

**AI contract:** Heavy scaffolding fine. The bridge is plumbing.

**Done when:** `docker compose up` → world + bot + curl makes it move. 10-second clip in the README.

**Trap:** Modding rabbit holes. Vanilla, offline mode, done.

---

## Phase 1 — Control Plane & Schema (8–12 sessions) ← your API/DB depth lives here

**What you build**
- Spring Boot service between you and the bridge. The bridge stays dumb; all intelligence and state live here.
- **Schema v1 (design carefully — everything later reads from it):**
  - `bots` (id, name, status, created_at)
  - `runs` (id, bot_id, objective, status, started_at, ended_at)
  - `commands` (id, run_id, idempotency_key, type, params jsonb, status, issued_at, completed_at, error)
  - `events` (id, run_id, seq, type, payload jsonb, observed_at) — **append-only, never updated**
- Command lifecycle: `QUEUED → EXECUTING → SUCCEEDED / FAILED / TIMED_OUT`, async execution, per-bot queue
- State endpoint: `GET /bots/{id}/state` returning a structured, LLM-friendly summary (position, inventory, health, nearby blocks)
- Live event stream: WebSocket `/runs/{id}/events`
- OpenAPI spec, README curl examples, Testcontainers integration tests

**Design rules (cheap now, painful to retrofit):**
- Commands idempotent (client-supplied key) and granular — an LLM will retry and mis-sequence
- Events append-only; evals, replays, and memory all read from this later
- Design state responses as if a model will read them — because one will

**What you learn:** Event sourcing basics, async command execution in Spring, WebSocket on the server side (continuity with your arena-game project), schema design for append-heavy workloads.

**Docker rung:** Write the Spring Boot Dockerfile yourself — multi-stage (Maven build stage → slim JRE runtime). Add Postgres to Compose with a healthcheck; make the control plane wait on it. Understand Compose networking (why `jdbc:postgresql://postgres:5432` works).

**AI contract:** Scaffolding for entity boilerplate OK. **You write the command lifecycle, the schema, and the state summarization.**

**Done when:** You drive the bot through "gather wood → craft planks" using only curl/Postman, watch the live event stream, and every command + event is queryable in Postgres. Demo clip #1.

**Resume bullet unlocked:** *"Built a Spring Boot control plane with event-sourced Postgres persistence, idempotent async command execution, and WebSocket streaming for real-time game agents; Testcontainers integration suite."*

---

## Phase 2 — The Agent Loop (6–10 sessions) ← the heart of the project

**What you build**
- Raw ReAct loop in Python, **no framework**: observe (GET state from YOUR API) → LLM picks an action via native tool calling → execute (POST command to YOUR API) → observe result → repeat until done or budget exhausted
- 5–8 typed tools whose schemas mirror your control-plane endpoints: `move_to`, `find_block`, `mine_block`, `craft_item`, `check_inventory`, `chat`
- Structured outputs, retry-on-malformed, max-iteration and max-cost budgets, graceful failure
- **Instrumentation from the very first call:** `llm_calls` table (run_id, model, prompt_version, input/output tokens, cost, latency_ms) — this is your eval baseline, and it goes in YOUR Postgres, written via a small internal endpoint or direct connection
- First autonomous task: "collect 10 wood and craft a crafting table"

**What you learn (read first):** ReAct paper (skim — Thought → Action → Observation); Anthropic tool-use docs (how tool_use/tool_result blocks work on the wire); Anthropic "Building Effective Agents" (workflows vs. agents, when loops beat chains).

**Why no framework:** "I built the loop raw" earns far more interview respect than "I called create_react_agent()". You'll use frameworks at work; here you're proving you understand what they hide.

**Docker rung:** Containerize the agent service (slim Python image), add to Compose. Bind-mount source for hot reload during dev. Get comfortable with `docker compose logs -f agent` and exec-ing in to debug.

**AI contract:** API client + schema boilerplate OK. **You write the loop control flow.** #1 interview topic.

**Done when:** Wood task completes end-to-end 3× in a row, every step traced in `events` and `llm_calls`, and you can whiteboard the loop without looking at code. **Post publicly (milestone 1 of 3).**

**Trap:** Freeform text parsed with regex. Native tool calling from the start.

---

## Phase 3 — Failure Handling & Skills (5–8 sessions)

**What you build**
- Composite skills from primitives (`gather_wood(n)` = find → path → mine → repeat)
- Error taxonomy with distinct recoveries: tool failed (retry) vs. LLM chose badly (replan) vs. world changed underneath you (re-observe). Failures land in the `events` table with their classification.
- Scratchpad plan the agent writes and revises
- Harder tier: "build a 3×3 shelter", "craft stone tools"

**What you learn:** What retries fix vs. what needs replanning; context-window management — what stays in the prompt every turn vs. what gets dropped (the start of "context engineering," a phrase in real job posts now).

**Done when:** Spawn the bot in a hole mid-task and watch it replan instead of looping forever — with the replan visible in the event log.

---

## Phase 4 — Memory (6–9 sessions)

**What you build**
- **Working memory:** rolling episode summary so long tasks don't blow the context window
- **Episodic memory:** post-task postmortem ("tried X, failed because Y, Z worked") embedded into pgvector (`memories` table in the same Postgres)
- **Retrieval:** before planning, query for relevant past episodes, inject top hits
- Measure it: same task suite, memory on vs. off — the numbers come straight from `llm_calls` and `runs`

**What you learn (read first):** Voyager paper (skill libraries — store what worked); summarization vs. retrieval memory and failure modes of each; RAG over *experience* vs. RAG over docs (stale memories, wrong-episode retrieval).

**Docker rung:** pgvector via the official `pgvector/pgvector` image — swap it into Compose, understand image tags and what changed.

**AI contract:** Embedding wiring scaffolded OK. **You design the memory schema** — what's stored, when, how retrieved and ranked.

**Done when:** A task the agent failed cold completes faster on attempt two *because* of a retrieved memory — and the event log proves it.

---

## Phase 5 — Eval Harness & Observability (7–10 sessions) ← the credibility layer

**What you build**
- Task suite (YAML defs): programmatic success checks **evaluated against the `events` table** (inventory contains X, structure exists at Y), step budget, timeout
- Runner: N runs per configuration → success rate, avg steps, tokens, cost, latency — all computed by SQL over `runs`/`llm_calls`, results stored in an `experiments` table
- **LLM-as-judge** for fuzzy dimensions (plan quality, tool-choice sanity) with a hand-calibration check
- Tracing: Langfuse or Arize Phoenix (self-hosted, in Compose) so every run has an inspectable trace; OpenTelemetry spans through control plane + agent
- Results chart in the README: model A vs. B, memory on/off, prompt v1 vs. v2
- CI regression: nightly suite on the cheap model, alert on success-rate drop

**What you learn (read first):** LLM-as-judge biases (position, verbosity, self-preference) and sanity checks; why success-rate-over-N-runs matters for stochastic systems; OTel basics for LLM spans.

**Docker rung:** Langfuse self-hosted is itself a multi-container app — composing someone *else's* stack into yours is a real skill. Run eval jobs as one-off containers (`docker compose run`).

**AI contract:** Plotting/dashboard code scaffolded. **You design the metrics and success criteria** — "how would you evaluate an agent?" is a real interview question most candidates whiff.

**Done when:** You can say, with a chart and the SQL behind it: "memory + prompt v3 took success from 40% to 75% across 20 runs and cut cost 30%." **Post publicly (milestone 2 of 3).**

---

## Phase 6 — MCP Server in Java/Spring (5–8 sessions)

**What you build**
- Spring AI (or LangChain4j) MCP server exposing the platform: `run_task`, `get_eval_results`, `query_agent_memory`, `get_trace`
- Claude Desktop/Code drives your arena: "run the shelter task with Haiku and show me the eval diff" works from a chat window. Demo clip of exactly that.

**What you learn:** MCP at the spec level, on a second runtime — protocol understanding, not just FastMCP's abstractions; Spring AI's MCP support.

**Docker rung:** Compose profiles — `docker compose --profile mcp up` runs with the MCP service, default runs without.

**Why it matters:** Python agent + JVM MCP layer = the enterprise-credible polyglot profile. Direct conversation starter with NYC banks.

**Done when:** Claude Desktop kicks off an eval run and reads back the results.

---

## Phase 7 — Multi-Agent (8–12 sessions, the flashy finale)

**What you build**
- 2–3 agents, each its own loop, coordinating only through a channel (in-game chat, or Redis pub/sub — Kafka only if you want the keyword and accept the ops tax)
- Coordination task: "together, build this structure" / mine–craft–build role split
- Measure the coordination tax from your own tables: solo vs. duo vs. trio success rate, steps, tokens (reproduce the MineCollab communication-bottleneck finding and write it up)
- THE demo clip: agents chatting to each other while building. LinkedIn gold.

**What you learn:** Orchestrator-worker vs. peer-to-peer; shared memory vs. message passing; why multi-agent often *underperforms* single-agent + better tools — knowing that trade-off cold is senior signal.

**Docker rung:** `docker compose up --scale agent=3`, per-instance env config — and a written paragraph in the README on why Compose stops being enough at real scale (your bridge to orchestration concepts without actually adopting K8s).

**Done when:** Two agents complete a task neither completes alone in the same step budget — or you can explain precisely why not, with data. **Post publicly (milestone 3 of 3).**

---

## Phase 8 — Ship It: AWS Deployment (6–10 sessions) ← "in production"

**Recommendation: AWS over GCP.** Reasons: it dominates job-post keywords (especially NYC banks/enterprise), you already touch S3 at work so the console isn't foreign, and ECS Fargate is the gentlest real container-deployment path. GCP Cloud Run is arguably nicer tech, but AWS is the better resume keyword for your target market. Everything below has a GCP equivalent if you change your mind.

**The honest cost reality:** a Minecraft server running 24/7 in the cloud costs real money and serves no one. So "production" here means: **the platform (control plane + Postgres + dashboard/MCP) is always-on; the game world and agents spin up on demand for eval runs, then spin down.** That's not a cop-out — on-demand ephemeral workloads is a *more* impressive architecture than "I left an EC2 box running."

**What you build**
- ECR repos; GitHub Actions builds and pushes images on merge to main (you already have CI — this extends it to CD)
- Control plane on **ECS Fargate** (1 small task), Postgres on **RDS** (db.t4g.micro) or as a Fargate sidecar with EBS if you want to stay cheap
- Secrets via SSM Parameter Store (API keys never in images or env files — talk about this in interviews)
- Logs to CloudWatch; one alarm (task crash-looping)
- On-demand eval runs: a GitHub Actions workflow (or a `run_eval` MCP tool) that launches the Minecraft server + agent as ephemeral Fargate tasks, runs the suite, writes results to RDS, tears down
- A tiny public read-only piece — the eval results dashboard or a status endpoint — so there's a URL on your resume

**What you learn (read first):** ECS concepts (task definition, service, cluster — they map cleanly onto what you know from Compose); IAM roles for tasks; the "12-factor app" config-via-environment idea you've been practicing all along.

**Cost guardrails:** Fargate task + RDS micro + ECR + CloudWatch ≈ **$15–30/month** if the game world is on-demand only. Set a billing alarm at $25 on day one. If even that's too much, the fallback is a single Lightsail/EC2 t4g.small running your Compose stack (~$10/month) — less impressive architecturally, still a deployed system.

**AI contract:** Terraform/CloudFormation scaffolding OK (or skip IaC entirely the first pass and click-ops it, then codify). **You design the deployment architecture and write the CD pipeline.**

**Done when:** Merging to main deploys automatically; you can trigger an eval run from your phone via the MCP tool or a GitHub Action; the results show up at a public URL.

**Resume bullet unlocked:** *"Deployed the platform to AWS (ECS Fargate, RDS, ECR) with GitHub Actions CD, SSM-managed secrets, CloudWatch alarms, and on-demand ephemeral eval workloads."*

---

## Working Rhythm

- **Short day (30 min):** read a paper/doc section, README, review traces, tune one prompt, one Docker concept
- **Long day (2 hr):** build features, run eval suites
- **Every phase ends with:** README updated, demo clip, eval numbers where applicable
- **Descope rule:** a polished Phase 5 beats a half-built Phase 7. If time collapses, the cut order is: Phase 7 → Phase 6 → Phase 8 becomes the Lightsail fallback. Phases 0–5 are the non-negotiable core.

## Reading List (in order of need)

1. Docker "Get Started" guide + Dockerfile best practices — Phase 0–1
2. ReAct paper (Yao et al., 2022) — Phase 2
3. Anthropic: "Building Effective Agents" + tool-use docs — Phase 2
4. Voyager paper (arXiv:2305.16291) — Phase 4
5. Context-engineering writeups (Anthropic engineering blog) — Phases 3–4
6. LLM-as-judge survey or Langfuse/Phoenix eval docs — Phase 5
7. MCP spec + Spring AI MCP docs — Phase 6
8. MineCollab paper (arXiv:2504.17950) — Phase 7
9. AWS ECS workshop (the official one) + 12-factor app — Phase 8

## What "Job-Ready" Looks Like at the End

You can whiteboard a raw agent loop, defend an event-sourced schema, explain memory trade-offs, describe how to evaluate a stochastic system with numbers from your own tables, speak MCP at the protocol level, explain when multi-agent is the wrong answer, walk through your Dockerfiles line by line, and point at a live AWS deployment with a CD pipeline. That's the backend interview *and* the AI interview, covered by one repo.