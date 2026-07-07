# Stage 1: Build the Angular client
FROM node:18-alpine AS client-build

WORKDIR /usr/src/app

COPY Client/package.json Client/package-lock.json ./
RUN npm ci

COPY Client/ .

ENV NODE_OPTIONS="--openssl-legacy-provider"
RUN npx ng build --prod --output-path=dist

# Stage 2: Serve with Apache
FROM httpd:2.4-alpine

# Copy the compiled Angular app
COPY --from=client-build /usr/src/app/dist/ /usr/local/apache2/htdocs/

# Copy game files
COPY Games/ /usr/local/apache2/htdocs/Games/
COPY GamesLib/dist/ /usr/local/apache2/htdocs/GamesLib/

# Copy Apache configuration
COPY httpd.conf /usr/local/apache2/conf/httpd.conf
