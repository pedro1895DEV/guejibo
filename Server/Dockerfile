FROM node:lts-alpine

WORKDIR /usr/src/Server

COPY package.json .

RUN npm install

RUN npm install -g nodemon

COPY . .

VOLUME ["/usr/src/Server"]

EXPOSE 3000

COPY entrypoint.sh /usr/src/Server/

# Torna o script de entrada executável
RUN chmod +x /usr/src/Server/entrypoint.sh

CMD [ "/usr/src/Server/entrypoint.sh" ]