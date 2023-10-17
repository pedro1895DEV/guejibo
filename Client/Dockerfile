# Utiliza a imagem oficial do Node.js
FROM node:18

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

ENV NODE_OPTIONS="--openssl-legacy-provider"

# RUN npm run build

EXPOSE 4200

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll=500"]