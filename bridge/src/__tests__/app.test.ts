/**
 * Unit tests for the bridge HTTP endpoints.
 *
 * These tests use a mocked bot (no real Minecraft server needed).
 * The mock extends EventEmitter so we can simulate mineflayer events
 * like "goal_reached" and "path_stop" during pathfinding tests.
 *
 * Run with: npm test
 */

import request from "supertest";
import { createApp } from "../app";
import { EventEmitter } from "events";

/**
 * Creates a mock bot with sensible defaults.
 * Uses EventEmitter as the base so bot.once/emit/removeListener work.
 * Any property can be overridden via the `overrides` param.
 */
function createMockBot(overrides: Record<string, any> = {}) {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    entity: { position: { x: 10, y: 64, z: 10 } },
    health: 20,
    food: 18,
    inventory: {
      items: () => [
        { name: "diamond", count: 3, slot: 0 },
      ],
    },
    pathfinder: {
      setGoal: jest.fn(),
    },
    blockAt: jest.fn(),
    dig: jest.fn().mockResolvedValue(undefined),
    chat: jest.fn(),
    ...overrides,
  }) as any;
}

// --- /health ---

describe("GET /health", () => {
  it("returns connected when bot has entity", async () => {
    const bot = createMockBot();
    const app = createApp(() => bot);

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("connected");
  });

  it("returns disconnected when bot has no entity", async () => {
    // Simulate a bot that hasn't spawned yet
    const bot = createMockBot({ entity: null });
    const app = createApp(() => bot);

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("disconnected");
  });
});

// --- /state ---

describe("GET /state", () => {
  it("returns bot position, health, food, and inventory", async () => {
    const bot = createMockBot();
    const app = createApp(() => bot);

    const res = await request(app).get("/state");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      position: { x: 10, y: 64, z: 10 },
      health: 20,
      food: 18,
      inventory: [{ name: "diamond", count: 3, slot: 0 }],
    });
  });

  it("returns 503 when bot is not ready", async () => {
    const bot = createMockBot({ entity: null });
    const app = createApp(() => bot);

    const res = await request(app).get("/state");
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Bot not ready");
  });
});

// --- /chat ---

describe("POST /chat", () => {
  it("sends a chat message and confirms bot.chat() was called", async () => {
    const bot = createMockBot();
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/chat")
      .send({ message: "hello world" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "sent", message: "hello world" });
    expect(bot.chat).toHaveBeenCalledWith("hello world");
  });
});

// --- /dig ---

describe("POST /dig", () => {
  it("digs a block successfully", async () => {
    const bot = createMockBot();
    bot.blockAt.mockReturnValue({ name: "stone" });
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/dig")
      .send({ x: 5, y: 64, z: 5 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("dug");
    expect(res.body.block.name).toBe("stone");
  });

  it("returns 400 when block is air", async () => {
    const bot = createMockBot();
    bot.blockAt.mockReturnValue({ name: "air" });
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/dig")
      .send({ x: 5, y: 64, z: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot dig air");
  });

  it("returns 400 when block is not loaded", async () => {
    // Coordinates far from the bot — blockAt returns null
    const bot = createMockBot();
    bot.blockAt.mockReturnValue(null);
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/dig")
      .send({ x: 999, y: 64, z: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Block not loaded or out of range");
  });
});

// --- /move ---

describe("POST /move", () => {
  it("resolves when goal is reached", async () => {
    const bot = createMockBot();
    // Simulate pathfinder reaching the goal on the next tick
    bot.pathfinder.setGoal.mockImplementation(() => {
      process.nextTick(() => bot.emit("goal_reached"));
    });
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/move")
      .send({ x: 20, y: 64, z: 20 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("arrived");
  });

  it("returns 500 when pathfinding fails", async () => {
    const bot = createMockBot();
    // Simulate pathfinder giving up — no valid path
    bot.pathfinder.setGoal.mockImplementation(() => {
      process.nextTick(() => bot.emit("path_stop"));
    });
    const app = createApp(() => bot);

    const res = await request(app)
      .post("/move")
      .send({ x: 20, y: 64, z: 20 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("no path found");
  });
});
