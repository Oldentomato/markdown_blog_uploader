# Step 1: React build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build   # Vite → dist/

# Step 2: Nginx serving
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config 교체 (API는 Express 서버로 프록시)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
