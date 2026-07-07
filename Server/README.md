# Como instalar e configurar o servidor

## Opção 1: Via Docker (Recomendado)

1. Instalar o [Docker Desktop](https://www.docker.com/products/docker-desktop/), caso já não esteja instalado.

2. Na raiz do projeto, criar o arquivo `Server/.env` com base no template `Server/.env.example`:

    ```
    cp Server/.env.example Server/.env
    ```

    Editar o `.env` e preencher pelo menos o `JWT_SECRET` com uma string aleatória.

3. Na raiz do projeto, executar:

    ```
    docker compose up
    ```

4. O Docker irá:
   - Subir o banco de dados MariaDB e aguardar até que esteja saudável
   - Executar as migrações do Sequelize automaticamente
   - Popular a tabela `Game` com os jogos disponíveis (seeder automático)
   - Iniciar o servidor Node.js na porta `3000`

5. Se tudo estiver certo, o endereço `http://localhost:3000/api/games` deve retornar um JSON com os jogos cadastrados.

---

## Opção 2: Sem Docker (Manual)

1. Instalar o [Node.js](https://nodejs.org/) , caso já não esteja instalado

2. Instalar o [MariaDB](https://mariadb.org/), caso já não esteja instalado

3. Dentro da pasta `Server`, instalar todas as dependências do projeto:

    ```
    npm install
    ```

4. Criar um arquivo chamado `.env` na pasta `Server/` com base no template `.env.example`. Preencher as variáveis de conexão com o banco de dados e o `JWT_SECRET`.

5. Utilizar a migração automática do Sequelize para criar as tabelas do banco de dados:

    ```
    cd sequelize
    npx sequelize-cli db:migrate
    ```

    Se tudo der certo, o banco de dados agora deve conter as tabelas `Game`, `GameRoom`, `SequelizeMeta`, `User` e `UsersGameRooms`.

6. Popular a tabela `Game` com os jogos disponíveis:

    ```
    npx sequelize-cli db:seed:all
    ```

7. Para iniciar o servidor, executar (na pasta `Server/`):

    ```
    node index.js
    ```

8. Se tudo estiver certo, o endereço `http://localhost:3000/api/games` deve retornar um JSON com os jogos cadastrados.
