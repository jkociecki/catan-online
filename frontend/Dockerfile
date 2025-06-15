FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

FROM node:18-slim AS runtime

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000

CMD ["npm", "start"]
