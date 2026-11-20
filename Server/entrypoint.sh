#!/bin/sh

# Muda para o diretório do Sequelize
cd /usr/src/Server/sequelize/

# Aguarda até que o banco de dados esteja pronto
until npx sequelize-cli db:migrate --config config/config.js; do
  echo "Banco de dados não está pronto, esperando..."
  sleep 1
done

# Executa os seeders (popula tabela Game, etc.)
npx sequelize-cli db:seed:all --config config/config.js

# Muda para o diretório de iniciação do Servidor Node
cd /usr/src/Server/

# Inicia o Servidor encaminhando sinais do container (SIGTERM/SIGINT)
exec node index.js
