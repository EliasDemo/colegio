import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { Actor } from '@/types/academic';

export function createUsuarioRepository(db: PrismaClient) {
  return {
    /** Usuario ACTIVO con su primer rol (por código). Devuelve null si no existe o no tiene rol. */
    async findActor(username: string): Promise<Actor | null> {
      const usuario = await db.usuario.findUnique({
        where: { username },
        include: { roles: { include: { rol: true }, orderBy: { rolId: 'asc' } } },
      });
      const rol = usuario?.roles[0]?.rol;
      if (!usuario || usuario.estado !== 'ACTIVO' || !rol) return null;
      return { usuarioId: usuario.id, username: usuario.username, role: rol.codigo };
    },
  };
}

export type UsuarioRepository = ReturnType<typeof createUsuarioRepository>;

export const usuarioRepository = createUsuarioRepository(prisma);
