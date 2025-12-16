import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import { attachSocket } from "./sockets/index.js";

async function start() {
  await connectDB();
  const server = http.createServer(app);
  attachSocket(server);
  server.listen(ENV.PORT, () => console.log(`http://localhost:${ENV.PORT}`));
}

start();
