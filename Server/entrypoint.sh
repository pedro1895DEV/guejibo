#!/bin/sh

# Muda para o diretório do Sequelize
cd /usr/src/Server/sequelize/

# Executa as migrações do banco de dados
npx sequelize-cli db:migrate

# Muda para o diretório de iniciação do Servidor Node
cd /usr/src/Server/

# Inicia o Servidor
nodemon -L index.js
