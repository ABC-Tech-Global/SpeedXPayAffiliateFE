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
    "/me/change-password": {
      post: {
        summary: "Change password (no old password required)",
        security: [{ bearerAuth: [] }],
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
          content: { "application/json": { schema: { type: "object", properties: { kind: { type: "string", enum: ["id_front","id_back","selfie"] }, blobPath: { type: "string" } }, required: ["kind","blobPath"] } } },
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
