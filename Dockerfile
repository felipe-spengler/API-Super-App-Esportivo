FROM php:8.4-cli

# 1. Instalar dependências do sistema
# ADICIONADO: libzip-dev para a extensão zip
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    libicu-dev \
    libsqlite3-dev \
    libzip-dev

# 2. Limpar cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Instalar extensões PHP
# ADICIONADO: zip na lista de extensões
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd intl pdo_sqlite zip

# 4. Obter Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 5. Diretório de trabalho
WORKDIR /var/www

# 6. Copiar arquivos
COPY . .

# 7. Instalar dependências do Composer
RUN composer install --no-interaction --optimize-autoloader

# 8. Ajustar permissões
RUN chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 9. Porta
EXPOSE 8000

# 10. Start
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
