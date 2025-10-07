# syntax=docker/dockerfile:1

# Base stage provides the runtime image and shared environment defaults
FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install all dependencies (including dev) for building the application
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js app with Turbopack using the dependencies from the previous stage
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Create the production image with only runtime dependencies and build artifacts
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8019

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

USER nextjs
EXPOSE 8019

CMD ["npm", "run", "start"]
