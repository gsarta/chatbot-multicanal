import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.AI_API_KEY });

const AI_TIMEOUT_MS = 30000;

export const aiService = {
    async getSimpleResponse(text: string) {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI timeout')), AI_TIMEOUT_MS)
        );
        const request = groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres el experto de 3S IA. Responde breve y profesional." },
                { role: "user", content: text }
            ],
            model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
        });
        const chat = await Promise.race([request, timeout]);
        return chat.choices[0].message.content;
    }
};