import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// MANTENEMOS TUS RUTAS ORIGINALES (Aquí está la lógica de lotes y login)
import authRoutes from "./routes/auth.js";
import lotesRoutes from "./routes/lotes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* =================================================================
  LOGICA DE WHATSAPP (Mantenemos la variable para que no haya SyntaxError)
  =================================================================
*/
const client = null; // La dejamos como null para que el export de abajo no falle

/* =================================================================
  TUS RUTAS (NO SE TOCAN, siguen sirviendo para Lotes y Auth)
  =================================================================
*/
app.use("/api/auth", authRoutes);
app.use("/api/lotes", lotesRoutes);

app.get("/ping", (req, res) => {
    res.json({ ok: true });
});

/* =================================================================
  SERVER START
  =================================================================
*/
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // No llamamos a client.initialize() porque client es null y daría error
});

// ESTO ES LO QUE HACÍA QUE EL SERVER SE CAYERA:
// Al definir 'client' como null arriba, este export ya no da error.
export { client };