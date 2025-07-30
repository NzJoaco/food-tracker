import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extendemos la interfaz Request para incluir userId
export interface AuthRequest extends Request {
  userId?: number;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }

    // ✅ Aquí asumimos que el token contiene un campo userId
    const decoded = payload as { userId: number };
    req.userId = decoded.userId;

    next();
  });
};
