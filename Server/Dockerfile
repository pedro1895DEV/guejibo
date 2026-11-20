FROM node:22-alpine

WORKDIR /usr/src/Server

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

RUN chmod +x /usr/src/Server/entrypoint.sh \
    && chown -R node:node /usr/src/Server

USER node

EXPOSE 3000

CMD [ "/usr/src/Server/entrypoint.sh" ]
