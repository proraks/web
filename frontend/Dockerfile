# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first so Docker can cache this layer across rebuilds.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source (see .dockerignore to keep node_modules/.env out).
COPY . .

# Baked into the bundle at build time.
# Default (empty) = same-origin: the browser calls /api/... and nginx proxies
# them to the backend. Override with:
#   docker build --build-arg VITE_API_URL=https://api.example.com ...
ARG VITE_API_URL="https://webgdxy-8080-nas5jpbin9.outplane.app/"
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- runtime stage ----
FROM nginx:alpine

# Static Vite bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback + /api reverse proxy. nginx envsubst's ${...} from the
# environment on boot; see nginx.conf.template.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]