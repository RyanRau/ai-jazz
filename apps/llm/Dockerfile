FROM node:20-alpine AS builder

# Build the bluestar component library first — apps consume it via a file: dep.
WORKDIR /app/packages/bluestar
COPY packages/bluestar/package*.json ./
RUN npm install --ignore-scripts
COPY packages/bluestar/ .
RUN npm run build

# Install and build the app
WORKDIR /app/apps/llm
COPY apps/llm/package*.json ./
RUN npm ci
COPY apps/llm/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/llm/dist /usr/share/nginx/html
COPY apps/llm/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
