# Imagen multietapa de la API. Se construye con contexto en la raíz del monorepo
# para usar el package-lock.json único de los workspaces de npm.
#   docker build -f services/api/Dockerfile --target produccion .

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

# Dependencias completas (incluye las de desarrollo y pruebas)
FROM base AS dependencias
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
COPY services/recaudo-sim/package.json services/recaudo-sim/
RUN npm ci --workspace services/api --no-audit --no-fund

# Desarrollo: recarga en caliente con tsx; es la etapa que usa docker compose
FROM dependencias AS desarrollo
WORKDIR /app/services/api
COPY services/api/ ./
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Compilación de TypeScript a JavaScript
FROM desarrollo AS compilacion
RUN npm run build

# Producción: solo dependencias de ejecución y usuario sin privilegios
FROM base AS produccion
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
COPY services/recaudo-sim/package.json services/recaudo-sim/
RUN npm ci --workspace services/api --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=compilacion /app/node_modules/.prisma /app/node_modules/.prisma
WORKDIR /app/services/api
COPY --from=compilacion /app/services/api/dist ./dist
COPY services/api/prisma ./prisma
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
