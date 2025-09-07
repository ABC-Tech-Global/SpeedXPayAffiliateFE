export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SPXA Codex API",
    version: "0.1.0",
    description: "OpenAPI spec for local and production usage.",
  },
  servers: [
    { url: "http://localhost:4000", description: "Local" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Health: {
        type: "object",
        properties: { ok: { type: "boolean" }, error: { type: "string" } },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
        required: ["id", "username"],
      },
      LoginRequest: {
        type: "object",
        properties: { username: { type: "string" }, password: { type: "string" } },
        required: ["username", "password"],
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
          passwordResetRequired: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "API health",
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
        },
      },
    },
    "/db/health": {
      get: {
        summary: "Database health",
        responses: {
          200: { description: "DB OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
          500: { description: "DB error", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
        },
      },
    },
    "/users": {
      get: {
        summary: "List users",
        responses: {
          200: {
            description: "Array of users",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register user",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          400: { description: "Validation error" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/me": {
      get: {
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/users/me": {
      get: {
        summary: "Current user (alias)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/profile": {
      get: {
        summary: "Get profile",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update profile",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" }, description: "TOTP code if 2FA is enabled" },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { username: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" } }, required: ["username","email"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" }, 409: { description: "Conflict" } },
      },
    },
    "/users/me/profile": {
      get: {
        summary: "Get profile (alias)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update profile (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { username: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" } }, required: ["username","email"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" }, 409: { description: "Conflict" } },
      },
    },
    "/me/payment": {
      get: {
        summary: "Get payment info",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update payment info",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" }, description: "TOTP code if 2FA is enabled" },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { bankName: { type: "string" }, bankAccountNumber: { type: "string" } }, required: ["bankName","bankAccountNumber"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/payment": {
      get: {
        summary: "Get payment info (alias)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update payment info (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [ { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" } } ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { bankName: { type: "string" }, bankAccountNumber: { type: "string" } }, required: ["bankName","bankAccountNumber"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/notifications": {
      get: {
        summary: "Get notification prefs",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update notification prefs",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" }, description: "TOTP code if 2FA is enabled" },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { productUpdates: { type: "boolean" }, payouts: { type: "boolean" } }, required: ["productUpdates","payouts"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/notifications": {
      get: {
        summary: "Get notification prefs (alias)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
      put: {
        summary: "Update notification prefs (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [ { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" } } ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { productUpdates: { type: "boolean" }, payouts: { type: "boolean" } }, required: ["productUpdates","payouts"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/tour/seen": {
      post: { summary: "Mark welcome tour seen (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/me/withdrawals": {
      get: {
        summary: "List withdrawals",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending","approved","rejected"] } },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/withdrawals": {
      get: {
        summary: "List withdrawals (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending","approved","rejected"] } },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/payouts": {
      get: {
        summary: "Payouts summary + history",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
          { name: "type", in: "query", required: false, schema: { type: "string", enum: ["referral_order","bonus","withdrawal"] } },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/payouts": {
      get: {
        summary: "Payouts summary + history (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
          { name: "type", in: "query", required: false, schema: { type: "string", enum: ["referral_order","bonus","withdrawal"] } },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/payouts/withdraw": {
      post: {
        summary: "Create withdrawal request",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { amount: { type: "number" } }, required: ["amount"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/payouts/withdraw": {
      post: {
        summary: "Create withdrawal request (alias)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { amount: { type: "number" } }, required: ["amount"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/2fa/init": {
      post: {
        summary: "Init 2FA and return otpauth URI",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/2fa/init": {
      post: { summary: "Init 2FA (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/me/2fa/enable": {
      post: {
        summary: "Enable 2FA with verification code",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { code: { type: "string", pattern: "^\\d{6}$" } }, required: ["code"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/2fa/enable": {
      post: {
        summary: "Enable 2FA (alias)", security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { code: { type: "string", pattern: "^\\d{6}$" } }, required: ["code"] } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/2fa/disable": {
      post: {
        summary: "Disable 2FA",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" }, description: "TOTP code (required if 2FA is enabled)" },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/2fa/disable": {
      post: {
        summary: "Disable 2FA (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [ { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" } } ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/2fa": {
      get: {
        summary: "Get 2FA details",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/users/me/2fa": {
      get: { summary: "Get 2FA details (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    
    "/kyc/me": {
      get: { summary: "Get KYC (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
      post: { summary: "Save KYC (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } } },
    },
    "/kyc/me/upload": {
      post: { summary: "KYC upload (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } } },
    },
    "/kyc/me/submit": {
      post: { summary: "Submit KYC (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/kyc/me/upload/{kind}": {
      delete: { summary: "KYC delete upload (alias)", security: [{ bearerAuth: [] }], parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/kyc/me/image/{kind}": {
      get: { summary: "KYC image URL (alias)", security: [{ bearerAuth: [] }], parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
    },
    
    "/referrals": {
      get: { summary: "List referrals (alias)", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/referrals/{username}": {
      get: {
        summary: "Referral detail (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" }, 404: { description: "Not found" } },
      },
    },
    "/referrals/{username}/orders": {
      get: {
        summary: "Referral orders (alias)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "username", in: "path", required: true, schema: { type: "string" } },
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
        ],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" }, 404: { description: "Not found" } },
      },
    },
    "/me/change-password": {
      post: {
        summary: "Change password (no old password required)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "x-2fa-code", in: "header", required: false, schema: { type: "string", pattern: "^\\d{6}$" }, description: "TOTP code if 2FA is enabled" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { newPassword: { type: "string", minLength: 6 } },
                required: ["newPassword"],
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/me/kyc/upload": {
      post: {
        summary: "Save KYC upload blob path",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { kind: { type: "string", enum: ["id_front","id_back","selfie"] }, blobPath: { type: "string" }, url: { type: "string", format: "uri" } }, required: ["kind"] } } },
        },
        responses: { 200: { description: "OK" }, 400: { description: "Invalid" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/kyc/upload/{kind}": {
      delete: {
        summary: "Clear and delete uploaded blob",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string", enum: ["id_front","id_back","selfie"] } }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/me/kyc/image/{kind}": {
      get: {
        summary: "Get public URL for uploaded image",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string", enum: ["id_front","id_back","selfie"] } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
  },
} as const;
