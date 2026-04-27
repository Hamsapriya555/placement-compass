/**
 * Utility to normalize values that can be either an array of strings
 * or a delimited string (e.g., from a database JSON field).
 */
export function normalizeArray(values: string[] | string | null | undefined): string[] {
    if (!values) return [];
    
    if (Array.isArray(values)) {
        return values.map(v => v.trim()).filter(Boolean);
    }
    
    if (typeof values === 'string') {
        // Handle JSON strings if they start with [
        if (values.startsWith('[') && values.endsWith(']')) {
            try {
                const parsed = JSON.parse(values);
                if (Array.isArray(parsed)) {
                    return parsed.map(v => String(v).trim()).filter(Boolean);
                }
            } catch (e) {
                // Fall through to delimiter split
            }
        }
        
        // Handle delimited strings (Banking; Insurance or Banking, Insurance)
        return values
            .split(/[;,]/)
            .map(v => v.trim())
            .filter(Boolean);
    }
    
    return [];
}
