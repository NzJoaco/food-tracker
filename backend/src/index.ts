import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, AuthRequest } from "./middleware/auth";

// Routers
import goalRoutes from "./routes/goals";
import mealsRouter from "./routes/meals";
import entriesRouter from "./routes/entries";
import usersRouter from "./routes/users";
import summariesRouter from "./routes/summaries";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta raíz
app.get("/", (_req, res) => {
  res.send("API Food Tracker funcionando 🎉");
});

// Autenticación
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Ya existe un usuario con ese email" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    res.status(201).json({ message: "Usuario creado", user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error al registrar" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    res.json({ token });
  } catch (error) {
    console.error("Error en /login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Routers
app.use("/users", usersRouter);         // GET, PUT, DELETE perfil usuario
app.use("/meals", mealsRouter);         // CRUD comidas
app.use("/entries", entriesRouter);     // CRUD entradas de comidas
app.use("/goals", goalRoutes);          // CRUD objetivos nutricionales
app.use("/summaries", summariesRouter); // Resumen de macros

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
