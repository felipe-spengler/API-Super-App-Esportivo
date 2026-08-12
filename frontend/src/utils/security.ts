/**
 * Sanitizes a URL to prevent DOM-based XSS (e.g. javascript: URLs).
 * Only allows safe protocols: http, https, mailto, tel, blob, data, or relative paths.
 */
export function sanitizeUrl(url: string | null | undefined): string {
    if (!url) return '#';
    const trimmed = url.trim();
    
    // Check for javascript: protocol
    if (trimmed.toLowerCase().replace(/\s/g, '').startsWith('javascript:')) {
        return '#';
    }
    
    // Accept standard protocols or relative paths
    if (
        trimmed.startsWith('/') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('data:')
    ) {
        return trimmed;
    }
    
    return '#';
}
