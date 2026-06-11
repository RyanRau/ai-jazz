FROM node:20-alpine AS builder

# Build bluestar dependency first
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build

# Build api-client dependency
WORKDIR /app/packages/api-client
COPY packages/api-client/package*.json ./
RUN npm install --ignore-scripts
COPY packages/api-client/ .
RUN npm run build

# Install and build wally web
WORKDIR /app/apps/wally/web
COPY apps/wally/web/package*.json ./
RUN npm ci
COPY apps/wally/web/ .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/wally/web/dist /usr/share/nginx/html
COPY apps/wally/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
