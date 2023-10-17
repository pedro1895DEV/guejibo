# Utiliza a imagem oficial do Apache na versão mais recente
FROM httpd:latest

# Faz a cópia dos arquivos localizados no diretório Games e GamesLib
COPY ./Games/ /usr/local/apache2/htdocs/Games/
COPY ./GamesLib/ /usr/local/apache2/htdocs/GamesLib/

# Faz a cópia do arquivo de configuração do servidor Apache
COPY ./httpd.conf /usr/local/apache2/conf/httpd.conf
