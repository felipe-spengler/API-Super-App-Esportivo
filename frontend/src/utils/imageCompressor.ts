/**
 * Comprime uma imagem no browser usando Canvas API.
 *
 * Estratégia em 2 estágios para mínima perda de qualidade:
 * 1. Reduz resolução para max 2000px (mantém aspect ratio) — já elimina 60-80% do tamanho
 * 2. Se ainda maior que o limite, reduz qualidade JPEG progressivamente
 *
 * Funciona em web e mobile (Capacitor Android/iOS) sem dependências externas.
 */
export async function compressImage(
    file: File,
    maxSizeBytes = 4 * 1024 * 1024, // 4 MB padrão
    maxDimension = 2000,             // Máximo de pixels em qualquer lado
    initialQuality = 0.92            // Qualidade JPEG inicial (0-1)
): Promise<File> {
    // Já está dentro do limite → retorna sem modificar
    if (file.size <= maxSizeBytes) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // --- Estágio 1: Redução de resolução ---
            // Só reduz se a imagem for maior que maxDimension em algum lado
            let { naturalWidth: w, naturalHeight: h } = img;
            if (w > maxDimension || h > maxDimension) {
                const ratio = Math.min(maxDimension / w, maxDimension / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas não disponível'));
            ctx.drawImage(img, 0, 0, w, h);

            // --- Estágio 2: Compressão progressiva (só se ainda grande) ---
            let quality = initialQuality;
            const isPng = file.type === 'image/png';
            const outputType = isPng ? 'image/png' : 'image/jpeg';

            const attempt = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error('Falha ao comprimir imagem'));

                        if (blob.size <= maxSizeBytes || quality <= 0.5 || isPng) {
                            // Cabe no limite, chegamos no mínimo aceitável, ou é PNG (PNG não tem compressão lossy no toBlob)
                            const compressedFile = new File([blob], file.name, {
                                type: outputType,
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            // Reduz em passos pequenos (só afeta JPEG/WebP)
                            quality -= 0.05;
                            attempt();
                        }
                    },
                    outputType,
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
