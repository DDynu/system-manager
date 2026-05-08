# Build stage — Debian-based for sharp native modules
FROM node:26-slim AS builder
WORKDIR /app
COPY package*.json ./.npmrc ./
RUN npm install -g pnpm && pnpm install --ignore-scripts
COPY . .
RUN pnpm build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
