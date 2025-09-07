import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { migrate } from "./db";
import { setupDocs } from "./docs";
import { registerHealthRoutes } from "./routes/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerMeRoutes } from "./routes/me";
import { registerAliasRoutes } from "./routes/aliases";
import { registerAdminRoutes } from "./routes/admin";

config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(express.json());

// Swagger/OpenAPI
setupDocs(app);

// Route groups
registerHealthRoutes(app);
registerAuthRoutes(app);
registerMeRoutes(app);
registerAliasRoutes(app);
registerAdminRoutes(app);

const port = Number(process.env.PORT || 4000);

async function main() {
  await migrate();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API:", err);
  process.exit(1);
});

