const mineflayer = require("mineflayer");

const HOST = process.env.MC_HOST || "play.oneforall.social";
const PORT = Number(process.env.MC_PORT || 25565);
const USERNAME = process.env.MC_USERNAME || "MUKHIYA9734";
const PASSWORD = process.env.MC_PASSWORD;

const LOGIN_COMMAND = process.env.MC_LOGIN_COMMAND || "/login";
const VERSION = process.env.MC_VERSION || false;

let bot = null;
let reconnectTimer = null;
let reconnectDelay = 10000;
let loggedIn = false;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function connect() {
  if (bot) {
    try {
      bot.quit();
    } catch (_) {}
    bot = null;
  }

  loggedIn = false;

  log(`Connecting to ${HOST}:${PORT} as ${USERNAME}`);

  bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,

    // Cracked/offline server
    auth: "offline",

    // Automatically detect the server version
    version: VERSION,

    keepAlive: true,
    checkTimeoutInterval: 30000
  });

  bot.once("spawn", () => {
    log("Bot joined the server.");
    reconnectDelay = 10000;

    setTimeout(() => {
      login();
    }, 3000);

    startAfk();
  });

  bot.on("message", (message) => {
    const text = message.toString();

    console.log(`[CHAT] ${text}`);

    // Detect common login prompts
    if (
      /\/login/i.test(text) ||
      /please login/i.test(text) ||
      /log in/i.test(text) ||
      /password/i.test(text)
    ) {
      login();
    }
  });

  bot.on("kicked", (reason) => {
    log(`Kicked: ${reason}`);
  });

  bot.on("error", (error) => {
    log(`Error: ${error.message}`);
  });

  bot.on("end", () => {
    log("Disconnected from server.");
    scheduleReconnect();
  });
}

function login() {
  if (loggedIn) return;

  if (!PASSWORD) {
    log("ERROR: MC_PASSWORD is not set in Render Environment Variables.");
    return;
  }

  loggedIn = true;

  const command = `${LOGIN_COMMAND} ${PASSWORD}`;

  log("Sending login command...");

  bot.chat(command);
}

function startAfk() {
  // Small camera movement every 30 seconds
  setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      const yaw = bot.entity.yaw + 0.5;

      bot.look(yaw, bot.entity.pitch, false);
    } catch (error) {
      log(`AFK movement error: ${error.message}`);
    }
  }, 30000);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  log(`Reconnecting in ${reconnectDelay / 1000} seconds...`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();

    reconnectDelay = Math.min(reconnectDelay * 2, 120000);
  }, reconnectDelay);
}

process.on("SIGTERM", () => {
  log("Stopping bot...");

  if (bot) {
    try {
      bot.quit();
    } catch (_) {}
  }

  process.exit(0);
});

process.on("SIGINT", () => {
  log("Stopping bot...");

  if (bot) {
    try {
      bot.quit();
    } catch (_) {}
  }

  process.exit(0);
});

connect();
