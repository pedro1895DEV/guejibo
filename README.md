![Guejibo](https://raw.githubusercontent.com/marxvdl/guejibo/master/Client/public/assets/guejibo.png)

**Guejibo** é uma plataforma que reúne jogos educacionais competitivos especialmente voltados para o uso em salas de aula físicas e virtuais.

Este repositório reúne todo o código-fonte da plataforma, incluindo frontend, backend, biblioteca de comunicação e jogos.

---

## Diretórios principais

- **Client**: Interface principal do sistema, desenvolvida em [Angular 19](https://angular.dev/) (Standalone Components)
- **Games**: Jogos educacionais da plataforma, cada um em uma subpasta (o jogo *stub* é usado apenas em ambiente de desenvolvimento/testes)
- **GamesLib**: Biblioteca TypeScript empacotada com [esbuild](https://esbuild.github.io/) usada pelos jogos para comunicação WebSocket com o backend
- **Server**: Backend do sistema em [Node.js 22](https://nodejs.org/), [Express](https://expressjs.com/), [Sequelize](https://sequelize.org/) e [MariaDB](https://mariadb.org/). Veja [Server/README.md](Server/README.md) para instruções detalhadas

---

## Executando com Docker Compose (Desenvolvimento)

1. Crie o arquivo `Server/.env` a partir do exemplo:
   ```bash
   cp Server/.env.example Server/.env
   ```
2. Suba o banco de dados MariaDB e o backend:
   ```bash
   docker compose up --build
   ```
3. Para iniciar o frontend Angular em modo de desenvolvimento:
   ```bash
   cd Client && npm ci && npm start
   ```

## Executando em Produção

Em produção, o build multi-stage ([Dockerfile](Dockerfile) e [Server/Dockerfile](Server/Dockerfile)) compila a `GamesLib` e o `Client` Angular, servindo os arquivos estáticos e o proxy reverso via Apache HTTP Server orquestrado por [docker-compose.prod.yml](docker-compose.prod.yml):

```bash
docker compose -f docker-compose.prod.yml up -d
```
