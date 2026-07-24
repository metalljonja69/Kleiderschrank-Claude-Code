FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

ENV DATEN_DIR=/daten
EXPOSE 3000

CMD ["node", "server.js"]
