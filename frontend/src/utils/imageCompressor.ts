/**
 * Comprime uma imagem no browser usando Canvas API.
 * Mantém as dimensões originais mas reduz a qualidade JPEG progressivamente
 * até o arquivo caber dentro de `maxSizeBytes`.
 *
 * Funciona em web e mobile (Capacitor Android/iOS) sem dependências externas.
 */
export async function compressImage(
    file: File,
    maxSizeBytes = 4 * 1024 * 1024, // 4 MB padrão
    initialQuality = 0.92
): Promise<File> {
    // Já está dentro do limite → retorna sem modificar
    if (file.size <= maxSizeBytes) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas não disponível'));
            ctx.drawImage(img, 0, 0);

            // Tenta comprimir reduzindo qualidade em passos de 0.05
            let quality = initialQuality;
            const attempt = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error('Falha ao comprimir imagem'));

                        if (blob.size <= maxSizeBytes || quality <= 0.3) {
                            // Cabe no limite ou chegamos no mínimo razoável
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            quality -= 0.05;
                            attempt();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            attempt();
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Falha ao carregar imagem para compressão'));
        };

        img.src = objectUrl;
    });
}

/**
 * Wrapper conveniente: comprime e retorna o File pronto para FormData.
 * Lança erro se o tipo não for imagem.
 */
export async function prepareImageForUpload(
    file: File,
    maxSizeBytes = 4 * 1024 * 1024
): Promise<File> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas');
    }
    return compressImage(file, maxSizeBytes);
}
