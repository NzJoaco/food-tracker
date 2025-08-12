import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import {z} from "zod";

const router = Router();

router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const entryId = parseInt(req.params.id);

    const entry = await prisma.mealEntry.findFirst({
      where: {
        id: entryId,
        meal: {
          userId: req.userId
        }
      }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    await prisma.mealEntry.delete({
      where: { id: entryId }
    });

    return res.json({ message: "Entrada eliminada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al eliminar la entrada" });
  }
});

const updateEntrySchema = z.object({
  foodName: z.string().min(1).optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().optional(),
});

router.put("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const entryId = parseInt(req.params.id);

    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    }

    const entry = await prisma.mealEntry.findFirst({
      where: {
        id: entryId,
        meal: { userId: req.userId },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    const updatedEntry = await prisma.mealEntry.update({
      where: { id: entryId },
      data: parsed.data,
    });

    return res.json(updatedEntry);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al actualizar la entrada" });
  }
});

export default router;
