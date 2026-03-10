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
    maxSizeBytes = 2 * 1024 * 1024, // 2MB é perfeito para fotos de perfil
    maxDimension = 2000,             // 2000px é o ideal (HD+)
    initialQuality = 0.85            // Qualidade em 85% para reduzir peso drastically
): Promise<File> {
    // Já está bem pequeno → retorna original
    if (file.size <= maxSizeBytes) {
        console.log(`[ImageCompressor] File ${file.name} already small (${(file.size / 1024).toFixed(1)} KB)`);
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let { naturalWidth: w, naturalHeight: h } = img;

            // Estágio 1: Só reduz resolução se for ABSURDAMENTE grande (ex: > 4K)
            // ou se o arquivo for muito pesado (> 8MB)
            if (w > maxDimension || h > maxDimension || file.size > 8 * 1024 * 1024) {
                const limit = file.size > 12 * 1024 * 1024 ? 2500 : maxDimension; // Se > 12MB, reduz mais a resolução
                const ratio = Math.min(limit / w, limit / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
                console.log(`[ImageCompressor] Resizing from ${img.naturalWidth}x${img.naturalHeight} to ${w}x${h}`);
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas não disponível'));
            ctx.drawImage(img, 0, 0, w, h);

            let quality = initialQuality;
            const isPng = file.type === 'image/png';
            // Converter PNG pesado para JPEG para economizar muito espaço, mantendo "transparência" via fundo branco se necessário
            // Mas aqui vamos manter o tipo se possível
            const outputType = isPng ? 'image/png' : 'image/jpeg';

            const attempt = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error('Falha ao comprimir imagem'));

                        // Se coube, ou se a qualidade já está muito baixa, para.
                        if (blob.size <= maxSizeBytes || quality <= 0.6 || isPng) {
                            console.log(`[ImageCompressor] Finished: ${(blob.size / 1024).toFixed(1)} KB | Quality: ${quality}`);
                            const compressedFile = new File([blob], file.name, {
                                type: outputType,
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            // Reduz qualidade em passos pequenos para achar o "ponto ideal"
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
