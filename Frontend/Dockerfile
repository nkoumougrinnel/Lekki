# syntax=docker/dockerfile:1

# ── Étape build : compile le client React/Vite avec pnpm ──────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# pnpm via corepack (version épinglée dans package.json -> "packageManager")
RUN corepack enable

# Manifestes + patches d'abord (meilleur cache des couches Docker)
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Reste du code source
COPY . .

# URL de l'API injectée au build (Vite n'expose que les variables VITE_*)
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build du client uniquement -> dist/public (voir build.outDir dans vite.config.ts)
RUN pnpm exec vite build

# ── Étape runtime : sert les fichiers statiques via nginx ─────────────────────
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
