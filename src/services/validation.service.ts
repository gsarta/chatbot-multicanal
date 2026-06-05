import { promises as dns } from 'dns';

// Definimos la lista aquí directamente para eliminar el error de importación de CONFIG
const LISTA_PAISES = [
    "argentina", "bolivia", "brasil", "chile", "colombia", 
    "costa rica", "ecuador", "españa", "mexico", "panama", "peru", "usa"
];

export const validationService = {
    /**
     * VALIDACIÓN DE NOMBRE:
     * - Mínimo 7 caracteres.
     * - Solo letras (incluye acentos y ñ).
     * - Sin números.
     */
    isValidName: (name: string): boolean => {
        const nombreValidoRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$/;
        return nombreValidoRegex.test(name.trim()) && name.trim().length >= 7;
    },

    /**
     * VALIDACIÓN DE PAÍS:
     * - Normaliza el texto (quita acentos: México -> mexico).
     * - Compara contra la lista local.
     */
    isValidCountry: (country: string): boolean => {
        const inputNormalizado = country
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
            
        return LISTA_PAISES.some(p => 
            p.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === inputNormalizado
        );
    },

    /**
     * VALIDACIÓN DE EMAIL:
     * - Verifica formato sintáctico (regex).
     * - Valida existencia real del dominio mediante registros MX (DNS).
     */
    isValidEmail: async (email: string): Promise<boolean> => {
        const emailClean = email.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailRegex.test(emailClean)) return false;

        const dominio = emailClean.split('@')[1];
        try {
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('DNS timeout')), 5000)
            );
            const mx = await Promise.race([dns.resolveMx(dominio), timeout]);
            return mx && mx.length > 0;
        } catch {
            return false;
        }
    }
};