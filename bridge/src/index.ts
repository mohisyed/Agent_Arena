/**
 * index.ts — Entry point for the Mineflayer bridge service.
 *
 * Creates a Mineflayer bot that connects to the Minecraft server,
 * loads the pathfinder plugin, and handles reconnection on disconnect.
 * The Express HTTP app (defined in app.ts) is mounted here and started.
 */

import mineflayer, { Bot } from "mineflayer";
import { pathfinder, Movements } from "mineflayer-pathfinder";
import { createApp } from "./app";

// Configuration — all overridable via environment variables
const BOT_HOST = process.env.MC_HOST || "localhost";
const BOT_PORT = parseInt(process.env.MC_PORT || "25565", 10);
const BOT_USERNAME = process.env.BOT_USERNAME || "BridgeBot";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "3001", 10);

// The active bot instance — reassigned on each reconnect
let bot: Bot;

/**
 * Creates (or recreates) the Mineflayer bot and wires up event handlers.
 * Called once at startup and again automatically if the bot disconnects.
 */
function createBot(): void {
  bot = mineflayer.createBot({
    host: BOT_HOST,
    port: BOT_PORT,
    username: BOT_USERNAME,
    hideErrors: false,
  });

  // Load pathfinder plugin so the bot can navigate to coordinates
  bot.loadPlugin(pathfinder);

  // Once the bot spawns into the world, configure default movement rules
  bot.once("spawn", () => {
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    console.log(`Bot spawned at ${bot.entity.position}`);
  });

  // Log death events — the bot auto-respawns, bridge stays alive
  bot.on("death", () => {
    console.log("Bot died — waiting for respawn");
  });

  bot.on("error", (err: Error) => {
    console.error("Bot error:", err.message);
  });

  // Auto-reconnect after 5 seconds if the bot gets disconnected
  bot.on("end", (reason: string) => {
    console.log(`Bot disconnected: ${reason}. Reconnecting in 5s...`);
    setTimeout(createBot, 5000);
  });
}

// Create the Express app, passing a getter so routes always use the current bot
const app = createApp(() => bot);

// Start the bot and HTTP server
createBot();
app.listen(HTTP_PORT, () => {
  console.log(`Bridge HTTP server listening on :${HTTP_PORT}`);
});
