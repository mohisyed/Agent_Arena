Mineflayer Bridge

What it does:
  A thin Node.js service that connects a Mineflayer bot to the Minecraft server
  and exposes its actions over HTTP. No intelligence, no game logic — just translation.

Prerequisites:
  - Minecraft server running (docker compose up)
  - Node.js installed
  - npm dependencies installed (cd bridge && npm install)

How to start the bridge:
  cd bridge
  npm start

  The bridge connects to the MC server and starts an HTTP server on port 3001.
  If the bot gets disconnected it auto-reconnects after 5 seconds.
  If the bot dies in-game it respawns without crashing.

Environment variables (all optional):
  MC_HOST       - Minecraft server host (default: localhost)
  MC_PORT       - Minecraft server port (default: 25565)
  BOT_USERNAME  - Bot's in-game name (default: BridgeBot)
  HTTP_PORT     - HTTP server port (default: 3001)

Endpoints:

  GET /health
    Returns whether the bot is connected.
    Example: curl http://localhost:3001/health
    Response: {"status":"connected"}

  GET /state
    Returns the bot's position, health, food, and inventory.
    Example: curl http://localhost:3001/state
    Response: {"position":{"x":10,"y":64,"z":10},"health":20,"food":20,"inventory":[]}

  POST /move
    Pathfinds the bot to the given coordinates.
    Example: curl -X POST http://localhost:3001/move -H "Content-Type: application/json" -d '{"x":10,"y":64,"z":10}'
    Response: {"status":"arrived","position":{"x":10,"y":64,"z":10}}
    Note: Use coordinates near the bot's current Y level. Long distances may timeout.

  POST /dig
    Digs the block at the given coordinates. Rejects air blocks.
    Example: curl -X POST http://localhost:3001/dig -H "Content-Type: application/json" -d '{"x":10,"y":63,"z":10}'
    Response: {"status":"dug","block":{"x":10,"y":63,"z":10,"name":"stone"}}

  POST /chat
    Sends a chat message in-game.
    Example: curl -X POST http://localhost:3001/chat -H "Content-Type: application/json" -d '{"message":"hello!"}'
    Response: {"status":"sent","message":"hello!"}

Testing:

  Unit tests (mocked, no server needed):
    npm test

  Integration tests (requires MC server + bridge running):
    npm run test:live

  To run integration tests:
    1. docker compose up        (start MC server)
    2. cd bridge && npm start   (start bridge in another terminal)
    3. npm run test:live        (run live tests in a third terminal)

Project structure:
  bridge/
    src/
      app.ts          - Express app with all HTTP routes (separated for testability)
      index.ts        - Bot creation, reconnection logic, starts the server
      __tests__/
        app.test.ts          - Unit tests (mocked bot)
        integration.test.ts  - Live tests (hits real bridge)
    jest.config.ts    - Jest configuration
    tsconfig.json     - TypeScript configuration
    package.json      - Dependencies and scripts
