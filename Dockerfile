FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY backend ./backend

ENV NODE_ENV=production
ENV PORT=8788

EXPOSE 8788

CMD ["npm", "run", "start:api"]
