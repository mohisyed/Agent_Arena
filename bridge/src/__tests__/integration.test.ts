/**
 * Integration tests for the bridge HTTP endpoints.
 *
 * These tests hit the REAL running bridge service — they require:
 *   1. Minecraft server running (docker compose up)
 *   2. Bridge running (cd bridge && npm start)
 *
 * Run with: npm run test:live
 *
 * Override the bridge URL with: BRIDGE_URL=http://host:port npm run test:live
 */

import request from "supertest";

const BASE_URL = process.env.BRIDGE_URL || "http://localhost:3001";

describe("Integration: Bridge API (requires running server + bridge)", () => {

  // --- /health ---

  describe("GET /health", () => {
    it("returns connected status", async () => {
      const res = await request(BASE_URL).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("connected");
    });
  });

  // --- /state ---

  describe("GET /state", () => {
    it("returns position, health, food, and inventory", async () => {
      const res = await request(BASE_URL).get("/state");
      expect(res.status).toBe(200);

      // Verify the shape of the response — values will vary
      expect(res.body).toHaveProperty("position");
      expect(res.body.position).toHaveProperty("x");
      expect(res.body.position).toHaveProperty("y");
      expect(res.body.position).toHaveProperty("z");
      expect(typeof res.body.health).toBe("number");
      expect(typeof res.body.food).toBe("number");
      expect(Array.isArray(res.body.inventory)).toBe(true);
    });
  });

  // --- /chat ---

  describe("POST /chat", () => {
    it("sends a chat message", async () => {
      const res = await request(BASE_URL)
        .post("/chat")
        .send({ message: "integration test!" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "sent", message: "integration test!" });
    });
  });

  // --- /dig ---

  describe("POST /dig", () => {
    it("rejects digging air", async () => {
      // Get the bot's position, then target the air block 3 above its head
      const state = await request(BASE_URL).get("/state");
      const { x, y, z } = state.body.position;

      const res = await request(BASE_URL)
        .post("/dig")
        .send({ x: Math.floor(x), y: Math.floor(y) + 3, z: Math.floor(z) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Cannot dig air");
    });

    it("digs a real block below the bot", async () => {
      // Target the block directly under the bot's feet
      const state = await request(BASE_URL).get("/state");
      const { x, y, z } = state.body.position;

      const res = await request(BASE_URL)
        .post("/dig")
        .send({ x: Math.floor(x), y: Math.floor(y) - 1, z: Math.floor(z) });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("dug");
      expect(res.body.block.name).not.toBe("air");
    });
  });

  // --- /move ---

  describe("POST /move", () => {
    it("moves the bot to nearby coordinates", async () => {
      // Move 3 blocks in X and Z from current position (stay at same Y)
      const state = await request(BASE_URL).get("/state");
      const { x, y, z } = state.body.position;

      const targetX = Math.floor(x) + 3;
      const targetZ = Math.floor(z) + 3;

      const res = await request(BASE_URL)
        .post("/move")
        .send({ x: targetX, y: Math.floor(y), z: targetZ });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("arrived");
      expect(res.body.position).toHaveProperty("x");
    }, 30000); // pathfinding can take a while
  });

  // --- Resilience ---

  describe("Bot resilience", () => {
    it("bridge still responds after rapid-fire requests", async () => {
      // Send 5 chat messages in quick succession
      for (let i = 0; i < 5; i++) {
        await request(BASE_URL).post("/chat").send({ message: `spam ${i}` });
      }

      // Bridge should still be responsive
      const res = await request(BASE_URL).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("connected");
    });
  });
});
