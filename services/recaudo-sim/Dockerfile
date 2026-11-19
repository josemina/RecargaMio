# Imagen multietapa del simulador de recaudo. Contexto: raíz del monorepo.
#   docker build -f services/recaudo-sim/Dockerfile --target produccion .

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

FROM base AS dependencias
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
COPY services/recaudo-sim/package.json services/recaudo-sim/
RUN npm ci --workspace services/recaudo-sim --no-audit --no-fund

FROM dependencias AS desarrollo
WORKDIR /app/services/recaudo-sim
COPY services/recaudo-sim/ ./
RUN npx prisma generate
EXPOSE 4000
# Es un servicio de pruebas: aplica sus migraciones y su semilla al arrancar (ADR 0010)
CMD ["npm", "run", "iniciar:dev"]

FROM desarrollo AS compilacion
RUN npm run build

FROM base AS produccion
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
COPY services/recaudo-sim/package.json services/recaudo-sim/
RUN npm ci --workspace services/recaudo-sim --omit=dev --no-audit --no-fund && npm cache clean --force
WORKDIR /app/services/recaudo-sim
COPY --from=compilacion /app/services/recaudo-sim/dist ./dist
COPY --from=compilacion /app/services/recaudo-sim/generated ./generated
COPY services/recaudo-sim/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
