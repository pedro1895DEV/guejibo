# Stage 1: Build the GamesLib
FROM node:18-alpine AS gameslib-build
WORKDIR /usr/src/gameslib
COPY GamesLib/package.json GamesLib/package-lock.json ./
RUN npm ci
COPY GamesLib/ .
ENV NODE_OPTIONS="--openssl-legacy-provider"
RUN npm run build

# Stage 2: Build the Angular client
FROM node:18-alpine AS client-build
WORKDIR /usr/src/app
COPY Client/package.json Client/package-lock.json ./
RUN npm ci
COPY Client/ .
RUN npx ng build --configuration production

# Stage 3: Serve with Apache
FROM httpd:2.4-alpine

# Copy the compiled Angular app
COPY --from=client-build /usr/src/app/dist/client/browser/ /usr/local/apache2/htdocs/

# Copy game files
COPY Games/ /usr/local/apache2/htdocs/Games/

# Copy the compiled GamesLib
COPY --from=gameslib-build /usr/src/gameslib/dist/ /usr/local/apache2/htdocs/GamesLib/dist/

# Copy Apache configuration
COPY httpd.conf /usr/local/apache2/conf/httpd.conf
