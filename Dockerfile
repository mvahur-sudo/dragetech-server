FROM node:26.12.1-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data

EXPOSE 3001

CMD ["npm", "start"]
