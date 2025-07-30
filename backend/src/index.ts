import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client'
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, AuthRequest } from "./middleware/auth";
import goalRoutes from "./routes/goals";



const prisma = new PrismaClient()



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("API funcionando 🎉");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    console.error("Error real:", error);
    res.status(500).json({ error: error.message || "Algo salió mal" });
  }
});

// REGISTRO
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Ya existe un usuario con ese email" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    res.status(201).json({ message: "Usuario creado", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Error en /register:", error);
    res.status(500).json({ error: "Error al registrar" });
  }
});


// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error en /login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});


app.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true }
    });
    res.json({ user });
  } catch {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

app.use("/goals", goalRoutes);
