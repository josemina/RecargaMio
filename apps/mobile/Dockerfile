# Imagen para correr el lint, los tipos y las pruebas de la app móvil en Docker (decisión D5 del plan, T9).
# La app no se ejecuta en Docker: los emuladores no funcionan bien en contenedores. Contexto: raíz del monorepo.
#   docker compose --profile app run --rm app-pruebas
FROM node:22-bookworm-slim
WORKDIR /app
ENV CI=1
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
COPY services/recaudo-sim/package.json services/recaudo-sim/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --workspace apps/mobile --no-audit --no-fund
COPY apps/mobile/ apps/mobile/
WORKDIR /app/apps/mobile
CMD ["sh", "-c", "npm run lint && npm run typecheck && npm test -- --ci"]
