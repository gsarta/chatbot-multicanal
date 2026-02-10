// src/services/aiService.js

export const procesarMensaje = async (usuario, mensajeTexto) => {
    // 1. [IDENTIFICACIÓN] - Usamos el contexto del PDF (Nombre/Empresa)
    const nombre = usuario.nombre || "Prospecto";
    const empresa = usuario.empresa || "Empresa no registrada";

    console.log(`🧠 Procesando intención para: ${nombre} de ${empresa}`);

    // 2. [PROCESAMIENTO DE INTENCIÓN] - Página 9 de tu PDF
    const esSoporte = mensajeTexto.toLowerCase().includes("ayuda") || mensajeTexto.toLowerCase().includes("soporte");
    const esVentas = mensajeTexto.toLowerCase().includes("precio") || mensajeTexto.toLowerCase().includes("comprar");

    // 3. [PROTOCOLO COGNITIVO] - Aplicando la personalidad del Agente
    let respuesta = "";

    if (esSoporte) {
        // Flujo Soporte -> Buscar en KB (Simulado por ahora)
        respuesta = `*Hola ${nombre}*,\n\nEntiendo que necesitas soporte técnico.\n• Consultando base de conocimientos...\n• ¿Te refieres a SIE o NotarIA?`;
    } else if (esVentas) {
        // Flujo Ventas -> Captura Lead
        respuesta = `*Excelente interés, ${nombre}*.\n\nPara brindarte una propuesta de 3S IA:\n• ¿Cuál es el nombre de tu empresa?\n• ¿En qué país te encuentras?`;
    } else {
        // Respuesta General con Estilo del PDF (Máximo 3 líneas)
        respuesta = `Hola *${nombre}*, soy tu asistente de 3S IA.\n• Soy experto en SIE, NotarIA y Mindly.\n• ¿En qué puedo apoyarte hoy?`;
    }

    return respuesta;
};