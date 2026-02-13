import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables del archivo .env

const groq = new Groq({ 
    // USAMOS LA VARIABLE, NO EL TEXTO DE LA LLAVE
    apiKey: process.env.AI_API_KEY 
});

export const aiService = {
    async getSimpleResponse(text: string) {
        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres el experto de 3S IA. Responde breve y profesional." },
                { role: "user", content: text }
            ],
            model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
        });
        return chat.choices[0].message.content;
    }
};