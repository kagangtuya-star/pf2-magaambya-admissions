FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts --omit=dev --no-audit --no-fund
COPY web ./web
COPY scripts/vendor.mjs scripts/build.mjs ./scripts/
RUN node scripts/build.mjs

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 SERVE_DIST=1
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node package.json ./
USER node
EXPOSE 3001
VOLUME ["/app/server/data"]
CMD ["node", "server/app.js"]
