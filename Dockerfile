# Stage 1: build the frontend
FROM node:26-slim AS frontend
WORKDIR /build
COPY frontend/package*.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts
COPY frontend/ ./
RUN pnpm build

# Stage 2: nginx (serves the frontend, proxies /api and /ws) + the backend
FROM python:3.12-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/

COPY --from=frontend /build/dist /var/www/html
RUN rm /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/sites-enabled/default

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# .env is mounted at runtime: -v $PWD/backend/.env:/app/backend/.env
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
