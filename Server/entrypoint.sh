#!/bin/sh

# Muda para o diretório do Sequelize
cd /usr/src/Server/sequelize/

# Aguarda até que o banco de dados esteja pronto
until npx sequelize-cli db:migrate; do
  echo "Banco de dados não está pronto, esperando..."
  sleep 1
done

# Muda para o diretório de iniciação do Servidor Node
cd /usr/src/Server/

# Inicia o Servidor
node index.js
