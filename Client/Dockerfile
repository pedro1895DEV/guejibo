# Utiliza a imagem oficial do Node.js
FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

ENV NODE_OPTIONS="--openssl-legacy-provider"

RUN npx ng build --prod

EXPOSE 4200

CMD ["npx", "http-server", "dist/"]
