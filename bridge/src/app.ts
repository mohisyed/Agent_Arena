/**
 * app.ts — Express HTTP routes for the Mineflayer bridge.
 *
 * Separated from index.ts so the app can be imported in tests
 * without starting a real bot or listening on a port.
 *
 * Takes a `getBot` function instead of a direct bot reference,
 * so routes always use the current bot (even after reconnects).
 */

import express, { Request, Response } from "express";
import { goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";

export function createApp(getBot: () => Bot) {
  const app = express();
  app.use(express.json());

  /**
   * POST /move — Pathfind the bot to {x, y, z}.
   *
   * Uses mineflayer-pathfinder's GoalBlock. The request blocks until
   * the bot reaches the goal ("goal_reached" event) or gives up
   * ("path_stop" event). We clean up listeners either way to prevent leaks.
   */
  app.post("/move", async (_req: Request, res: Response) => {
    try {
      const bot = getBot();
      const { x, y, z } = _req.body;
      const goal = new goals.GoalBlock(x, y, z);
      bot.pathfinder.setGoal(goal);

      await new Promise<void>((resolve, reject) => {
        // Remove both listeners on completion to avoid leaks
        const cleanup = () => {
          bot.removeListener("goal_reached", onReach);
          bot.removeListener("path_stop", onStop);
        };
        const onReach = () => { cleanup(); resolve(); };
        const onStop = () => { cleanup(); reject(new Error("Pathfinding failed — no path found")); };
        bot.once("goal_reached", onReach);
        bot.once("path_stop", onStop);
      });

      res.json({ status: "arrived", position: bot.entity.position });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /dig — Dig the block at {x, y, z}.
   *
   * Converts the plain coordinates to a Vec3 (required by mineflayer's
   * blockAt method). Rejects air blocks since digging air is a no-op.
   */
  app.post("/dig", async (_req: Request, res: Response) => {
    try {
      const bot = getBot();
      const { x, y, z } = _req.body;
      const target = bot.blockAt(new Vec3(x, y, z));

      if (!target) {
        res.status(400).json({ error: "Block not loaded or out of range" });
        return;
      }

      if (target.name === "air") {
        res.status(400).json({ error: "Cannot dig air" });
        return;
      }

      await bot.dig(target);
      res.json({ status: "dug", block: { x, y, z, name: target.name } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /chat — Send a chat message in-game.
   *
   * Fire-and-forget — bot.chat() doesn't return a promise,
   * so we respond immediately after calling it.
   */
  app.post("/chat", async (_req: Request, res: Response) => {
    try {
      const bot = getBot();
      const { message } = _req.body;
      bot.chat(message);
      res.json({ status: "sent", message });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /state — Returns the bot's current state as JSON.
   *
   * Includes position (Vec3), health, food level, and inventory.
   * Returns 503 if the bot hasn't spawned yet.
   */
  app.get("/state", (_req: Request, res: Response) => {
    const bot = getBot();
    if (!bot || !bot.entity) {
      res.status(503).json({ error: "Bot not ready" });
      return;
    }

    res.json({
      position: bot.entity.position,
      health: bot.health,
      food: bot.food,
      inventory: bot.inventory.items().map((item) => ({
        name: item.name,
        count: item.count,
        slot: item.slot,
      })),
    });
  });

  /**
   * GET /health — Simple connectivity check.
   *
   * Returns "connected" if the bot has an entity (is in-game),
   * "disconnected" otherwise.
   */
  app.get("/health", (_req: Request, res: Response) => {
    const bot = getBot();
    res.json({ status: bot && bot.entity ? "connected" : "disconnected" });
  });

  return app;
}
