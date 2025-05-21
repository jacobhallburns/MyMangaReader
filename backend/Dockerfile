FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./src ./src
COPY ./routes ./routes
COPY ./models ./models


EXPOSE 5000
CMD ["node", "src/index.js"]