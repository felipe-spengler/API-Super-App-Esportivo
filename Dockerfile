FROM php:8.4-cli

# 1. Instalar dependências do sistema
# ADICIONADO: libzip-dev para a extensão zip e deps do Python
# ADICIONADO: libjpeg-dev, libfreetype6-dev, libwebp-dev para GD (geração de artes)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    libicu-dev \
    libsqlite3-dev \
    libzip-dev \
    python3 \
    python3-pip \
    python3-venv

# Criar ambiente virtual para Python (Best Practice)
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Instalar dependências Python (rembg)
RUN pip install --no-cache-dir rembg[cli] pillow onnxruntime

# 2. Limpar cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Configurar GD com suporte a JPEG, FreeType e WebP
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp

# 4. Instalar extensões PHP
# ADICIONADO: zip na lista de extensões
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd intl pdo_sqlite zip

# 5. Obter Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 6. Diretório de trabalho
WORKDIR /var/www

# 7. Copiar arquivos
COPY . .

# 8. Instalar dependências do Composer
RUN composer install --no-interaction --optimize-autoloader

# 9. Ajustar permissões
RUN chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 10. Porta
EXPOSE 8000

# 11. Start
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
