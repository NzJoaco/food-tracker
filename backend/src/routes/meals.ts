import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Esquema para crear una comida
const mealSchema = z.object({
  date: z.string().datetime(),
});

// Esquema para validar una entrada de comida
const mealEntrySchema = z.object({
  foodName: z.string().min(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

// Ruta para crear una comida (POST /meals)
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const newMeal = await prisma.meal.create({
      data: {
        date: new Date(parsed.data.date),
        userId: req.userId,
      },
    });

    return res.status(201).json(newMeal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear la comida" });
  }
});

// Ruta para agregar una entrada a una comida (POST /meals/:mealId/entries)
router.post("/:mealId/entries", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const parsed = mealEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const mealId = Number(req.params.mealId);
    if (isNaN(mealId)) {
      return res.status(400).json({ error: "mealId inválido" });
    }

    // Verificar que la comida existe y pertenece al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== req.userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Crear la entrada
    const entry = await prisma.mealEntry.create({
      data: {
        mealId,
        foodName: parsed.data.foodName,
        calories: parsed.data.calories,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        quantity: parsed.data.quantity,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al crear la entrada" });
  }
});

// GET /meals - Listar todas las comidas del usuario autenticado
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const meals = await prisma.meal.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.status(200).json(meals);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener las comidas" });
  }
});

// GET /meals/:mealId/entries - Obtener todas las entradas de una comida
router.get("/:mealId/entries", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    if (isNaN(mealId)) {
      return res.status(400).json({ error: "mealId inválido" });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Verificar que la comida exista y pertenezca al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== req.userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    const entries = await prisma.mealEntry.findMany({
      where: { mealId },
      orderBy: { id: "asc" },
    });

    return res.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener las entradas de la comida" });
  }
});

// PUT /meals/:mealId/entries/:entryId - Editar una entrada específica
router.put("/:mealId/entries/:entryId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    const entryId = Number(req.params.entryId);

    if (isNaN(mealId) || isNaN(entryId)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const parsed = mealEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    // Verificar que la comida existe y pertenece al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== req.userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Verificar que la entrada existe
    const entry = await prisma.mealEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.mealId !== mealId) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    const updatedEntry = await prisma.mealEntry.update({
      where: { id: entryId },
      data: {
        foodName: parsed.data.foodName,
        calories: parsed.data.calories,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        quantity: parsed.data.quantity,
      },
    });

    return res.status(200).json(updatedEntry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al actualizar la entrada" });
  }
});

// DELETE /meals/:mealId/entries/:entryId - Eliminar una entrada específica
router.delete("/:mealId/entries/:entryId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    const entryId = Number(req.params.entryId);

    if (isNaN(mealId) || isNaN(entryId)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    if (typeof req.userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Verificar que la comida existe y pertenece al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== req.userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Verificar que la entrada existe
    const entry = await prisma.mealEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.mealId !== mealId) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    await prisma.mealEntry.delete({
      where: { id: entryId },
    });

    return res.status(204).send(); // Sin contenido
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al eliminar la entrada" });
  }
});

// Ruta: GET /meals/:mealId
router.get("/:mealId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    if (isNaN(mealId)) {
      return res.status(400).json({ error: "ID de comida inválido" });
    }

    const userId = req.userId;
    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Buscar la comida y sus entradas
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        entries: true,
      },
    });

    if (!meal || meal.userId !== userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    return res.json(meal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener la comida" });
  }
});

// GET /meals/:mealId/summary - Resumen nutricional de una comida
router.get("/:mealId/summary", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const mealId = Number(req.params.mealId);

    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (isNaN(mealId)) {
      return res.status(400).json({ error: "mealId inválido" });
    }

    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { entries: true },
    });

    if (!meal || meal.userId !== userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    const summary = meal.entries.reduce(
      (acc, entry) => {
        acc.calories += entry.calories * entry.quantity;
        acc.protein += entry.protein * entry.quantity;
        acc.carbs += entry.carbs * entry.quantity;
        acc.fat += entry.fat * entry.quantity;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return res.json({ mealId: meal.id, date: meal.date, summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al obtener el resumen" });
  }
});

// PUT /meals/:mealId/entries/:entryId - Editar una entrada
router.put("/:mealId/entries/:entryId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    const entryId = Number(req.params.entryId);
    const userId = req.userId;

    if (isNaN(mealId) || isNaN(entryId)) {
      return res.status(400).json({ error: "mealId o entryId inválido" });
    }

    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const parsed = mealEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos en la entrada", details: parsed.error.issues });
    }

    // Verificar que la comida exista y pertenezca al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Verificar que la entrada exista y pertenezca a la comida
    const entry = await prisma.mealEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.mealId !== mealId) {
      return res.status(404).json({ error: "Entrada no encontrada o no autorizada" });
    }

    const updatedEntry = await prisma.mealEntry.update({
      where: { id: entryId },
      data: {
        foodName: parsed.data.foodName,
        calories: parsed.data.calories,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        quantity: parsed.data.quantity,
      },
    });

    return res.json(updatedEntry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al actualizar la entrada" });
  }
});

// DELETE /meals/:mealId/entries/:entryId - Eliminar una entrada
router.delete("/:mealId/entries/:entryId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const mealId = Number(req.params.mealId);
    const entryId = Number(req.params.entryId);
    const userId = req.userId;

    if (isNaN(mealId) || isNaN(entryId)) {
      return res.status(400).json({ error: "mealId o entryId inválido" });
    }

    if (typeof userId !== "number") {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Verificar que la comida existe y pertenece al usuario
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal || meal.userId !== userId) {
      return res.status(404).json({ error: "Comida no encontrada o no autorizada" });
    }

    // Verificar que la entrada existe y pertenece a la comida
    const entry = await prisma.mealEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.mealId !== mealId) {
      return res.status(404).json({ error: "Entrada no encontrada o no autorizada" });
    }

    await prisma.mealEntry.delete({
      where: { id: entryId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al eliminar la entrada" });
  }
});



export default router;
