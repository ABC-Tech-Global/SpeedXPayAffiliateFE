import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { migrate } from "./db";
import { setupDocs } from "./docs";
import { registerHealthRoutes } from "./routes/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/user";
import { registerProfileRoutes } from "./routes/profile";
import { registerPaymentRoutes } from "./routes/payment";
import { registerBankAccountRoutes } from "./routes/bank-accounts";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerPayoutRoutes } from "./routes/payouts";
import { registerWithdrawalRoutes } from "./routes/withdrawals";
import { registerTwofaRoutes } from "./routes/twofa";
import { registerKycRoutes } from "./routes/kyc";
import { registerReferralRoutes } from "./routes/referrals";
import { registerAdminRoutes } from "./routes/admin";
import { registerAccountRoutes } from "./routes/account";
import { registerTourRoutes } from "./routes/tour";

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

// New split route groups
registerUserRoutes(app);
registerProfileRoutes(app);
registerPaymentRoutes(app);
registerBankAccountRoutes(app);
registerNotificationRoutes(app);
registerWithdrawalRoutes(app);
registerPayoutRoutes(app);
registerTwofaRoutes(app);
registerKycRoutes(app);
registerReferralRoutes(app);
registerAccountRoutes(app);
registerTourRoutes(app);

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
