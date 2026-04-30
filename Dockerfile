FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_ROOT=/app/build
WORKDIR /app
COPY --from=build /app/build ./build
COPY server/static-server.js ./server/static-server.js
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/static-server.js"]
