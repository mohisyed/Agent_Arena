# Agent Arena

A backend platform that drives autonomous LLM agents inside a live Minecraft world. The bot perceives game state, reasons via tool-calling, and acts — collecting resources, building structures, and coordinating with other agents. The goal is a production-credible AI engineering portfolio: a ReAct loop built from scratch, a memory layer backed by a vector store, a structured eval harness with real success metrics, and a polyglot MCP server in Java/Spring AI that exposes the whole platform to Claude.

## Stack

| Layer | Tech |
|---|---|
| Agent brain | Python (ReAct loop, memory, evals) |
| Game I/O bridge | Node.js + Mineflayer |
| Game server | Minecraft via Docker (`itzg/minecraft-server`) |
| MCP layer (Phase 5) | Java + Spring AI |
| Infra | Docker Compose + GitHub Actions |

## Structure

```
bridge/    Node.js Mineflayer bridge — exposes bot actions over HTTP
agent/     Python agent service — LLM loop, memory, tools, evals
```

## Phases

- **Phase 0** — Environment & plumbing (this phase)
- **Phase 1** — ReAct agent loop + tool calling
- **Phase 2** — Failure handling & composite skills
- **Phase 3** — Memory (working + episodic + retrieval)
- **Phase 4** — Eval harness & observability
- **Phase 5** — MCP server in Java/Spring AI
- **Phase 6** — Multi-agent coordination

See [`agent-arena-plan.md`](agent-arena-plan.md) for the full build plan.
