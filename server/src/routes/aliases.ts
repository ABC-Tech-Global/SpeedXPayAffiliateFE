import express from "express";

export function registerAliasRoutes(app: express.Express) {
  // Users aliases
  app.get("/users/me", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me${q}` } as any, res, () => undefined);
  });

  app.get("/users/me/profile", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/profile${q}` } as any, res, () => undefined);
  });
  app.put("/users/me/profile", async (req, res) => {
    (req as any).url = "/me/profile";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  app.get("/users/me/payment", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/payment${q}` } as any, res, () => undefined);
  });
  app.put("/users/me/payment", async (req, res) => {
    (req as any).url = "/me/payment";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  app.get("/users/me/bank-accounts", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/bank-accounts${q}` } as any, res, () => undefined);
  });
  app.post("/users/me/bank-accounts", async (req, res) => {
    (req as any).url = "/me/bank-accounts";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/users/me/bank-accounts/:id/default", async (req, res) => {
    (req as any).url = `/me/bank-accounts/${req.params.id}/default`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.delete("/users/me/bank-accounts/:id", async (req, res) => {
    (req as any).url = `/me/bank-accounts/${req.params.id}`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  app.get("/users/me/notifications", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/notifications${q}` } as any, res, () => undefined);
  });
  app.put("/users/me/notifications", async (req, res) => {
    (req as any).url = "/me/notifications";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  app.post("/users/me/change-password", async (req, res) => {
    (req as any).url = "/me/change-password";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/users/me/tour/seen", async (req, res) => {
    (req as any).url = "/me/tour/seen";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  // 2FA
  app.get("/users/me/2fa", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/2fa${q}` } as any, res, () => undefined);
  });
  app.post("/users/me/2fa/init", async (req, res) => {
    (req as any).url = "/me/2fa/init";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/users/me/2fa/enable", async (req, res) => {
    (req as any).url = "/me/2fa/enable";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/users/me/2fa/disable", async (req, res) => {
    (req as any).url = "/me/2fa/disable";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  // KYC aliases
  app.get("/kyc/me", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/kyc${q}` } as any, res, () => undefined);
  });
  app.post("/kyc/me", async (req, res) => {
    (req as any).url = "/me/kyc";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/kyc/me/upload", async (req, res) => {
    (req as any).url = "/me/kyc/upload";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.post("/kyc/me/submit", async (req, res) => {
    (req as any).url = "/me/kyc/submit";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.delete("/kyc/me/upload/:kind", async (req, res) => {
    (req as any).url = `/me/kyc/upload/${req.params.kind}`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.get("/kyc/me/image/:kind", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    (req as any).url = `/me/kyc/image/${req.params.kind}${q}`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  // Referrals aliases
  app.get("/referrals", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/referrals${q}` } as any, res, () => undefined);
  });
  app.get("/referrals/:username", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    (req as any).url = `/me/referrals/${req.params.username}${q}`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.get("/referrals/:username/orders", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    (req as any).url = `/me/referrals/${req.params.username}/orders${q}`;
    return (app as any)._router.handle(req as any, res, () => undefined);
  });

  // Payouts and withdrawals aliases
  app.get("/payouts", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/payouts${q}` } as any, res, () => undefined);
  });
  app.post("/payouts/withdraw", async (req, res) => {
    (req as any).url = "/me/payouts/withdraw";
    return (app as any)._router.handle(req as any, res, () => undefined);
  });
  app.get("/withdrawals", async (req, res) => {
    const q = (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return (app as any)._router.handle({ ...req, url: `/me/withdrawals${q}` } as any, res, () => undefined);
  });
}

