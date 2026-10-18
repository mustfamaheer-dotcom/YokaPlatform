# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build SWM Admin Panel (client-swm)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build-swm
WORKDIR /build
ENV NODE_ENV=development

COPY client-swm/package*.json ./client-swm/
RUN npm --prefix client-swm install --include=dev

COPY client-swm/ ./client-swm/
RUN npm --prefix client-swm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build ECP E-Commerce Storefront (client-ecp)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build-ecp
WORKDIR /build
ENV NODE_ENV=development

COPY client-ecp/package*.json ./client-ecp/
RUN npm --prefix client-ecp install --include=dev

COPY client-ecp/ ./client-ecp/
RUN npm --prefix client-ecp run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production Runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Install production Node.js dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY server/ ./server/
COPY migrations/ ./migrations/
COPY seeders/ ./seeders/
COPY knexfile.js ./
COPY ecosystem.config.js ./


# Copy built frontend assets from build stages
COPY --from=build-swm /build/client-swm/dist ./client-swm/dist
COPY --from=build-ecp /build/client-ecp/dist ./client-ecp/dist

# Create uploads directory for persistent storage
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# Expose the application port
EXPOSE 3001

# Health check — waits for the app to fully start before marking healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Startup: run DB migrations first, then start PM2
CMD ["sh", "-c", "node_modules/.bin/knex migrate:latest --knexfile knexfile.js && pm2-runtime start ecosystem.config.js --env production"]
