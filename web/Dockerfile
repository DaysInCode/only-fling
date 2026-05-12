FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:7071/api
ARG NEXT_PUBLIC_ENVIRONMENT=container
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/out ./out
COPY docker/server.mjs ./server.mjs
COPY docker/entrypoint.mjs ./entrypoint.mjs
ENV PORT=3000
EXPOSE 3000
CMD ["node", "entrypoint.mjs"]

FROM cypress/included:15.7.0 AS cypress-runner
WORKDIR /e2e
COPY package*.json ./
RUN npm ci
COPY cypress.config.ts ./
COPY cypress ./cypress
COPY tsconfig.json ./
ENV CYPRESS_baseUrl=http://web:3000
CMD ["cypress", "run"]
