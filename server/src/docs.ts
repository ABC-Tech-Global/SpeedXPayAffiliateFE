import express from "express";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./openapi";

function filterSpecByTags(spec: any, includeTags: string[]) {
  const s = JSON.parse(JSON.stringify(spec));
  const include = new Set(includeTags);
  const paths = s.paths || {};
  const filtered: any = {};
  const keepTags = new Set<string>();
  for (const [p, ops] of Object.entries(paths as Record<string, any>)) {
    const newOps: any = {};
    for (const [method, op] of Object.entries(ops as Record<string, any>)) {
      const t: string[] = Array.isArray((op as any).tags) ? (op as any).tags : [];
      if (t.some((tag) => include.has(String(tag)))) {
        newOps[method] = op;
        t.forEach((tg) => keepTags.add(String(tg)));
      }
    }
    if (Object.keys(newOps).length > 0) filtered[p] = newOps;
  }
  s.paths = filtered;
  if (Array.isArray(s.tags)) s.tags = s.tags.filter((t: any) => keepTags.has(String(t.name)));
  return s;
}

const userTags = [
  "Health","Auth","Users","Account","Profile","Payment","Bank Accounts","Notifications","Payouts","Withdrawals","2FA","KYC","Referrals",
];
const adminTags = ["Admin"];

export function setupDocs(app: express.Express) {
  // Raw OpenAPI endpoints
  app.get("/openapi.json", (_req, res) => {
    res.json(openapiSpec);
  });
  app.get("/openapi-user.json", (_req, res) => {
    res.json(filterSpecByTags(openapiSpec as any, userTags));
  });
  app.get("/openapi-admin.json", (_req, res) => {
    res.json(filterSpecByTags(openapiSpec as any, adminTags));
  });

  // Consolidated Swagger UI under a single router
  const docsRouter = express.Router();
  docsRouter.use(swaggerUi.serve);
  docsRouter.get(
    "/",
    swaggerUi.setup(null, {
      explorer: true,
      swaggerOptions: {
        urls: [
          { url: "/openapi-user.json", name: "User API" },
          { url: "/openapi-admin.json", name: "Admin API" },
          { url: "/openapi.json", name: "Full API" },
        ],
        url: "/openapi-user.json",
      },
    })
  );
  docsRouter.get(
    "/user",
    swaggerUi.setup(null, { swaggerOptions: { url: "/openapi-user.json" } })
  );
  docsRouter.get(
    "/admin",
    swaggerUi.setup(null, { swaggerOptions: { url: "/openapi-admin.json" } })
  );
  app.use("/docs", docsRouter);
}
