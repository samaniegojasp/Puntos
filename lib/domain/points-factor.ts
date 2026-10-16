import type { AdminSettings, ClientAdminRow, PointsPack } from "./types"

export type RescaleFactorInput = {
  settings: AdminSettings
  publicPacks: PointsPack[]
  standardPacks: PointsPack[]
  clients: ClientAdminRow[]
}

/**
 * Reescala los valores expresados en puntos según el cambio de factor de conversión.
 * Función pura que devuelve copias nuevas sin mutar la entrada.
 */
export function rescaleForFactor<T extends RescaleFactorInput>(
  input: T,
  oldFactor: number,
  newFactor: number,
): T {
  const safeOld = oldFactor > 0 ? oldFactor : 1
  const ratio = newFactor / safeOld

  const publicPacks = input.publicPacks.map((p) => ({
    ...p,
    points: Math.round(p.points * ratio),
  }))

  const standardPacks = input.standardPacks.map((p) => ({
    ...p,
    points: Math.round(p.points * ratio),
  }))

  const clients = input.clients.map((c) => ({
    ...c,
    usdPerPoint: c.usdPerPoint / ratio,
    bagPoints: Math.round(c.bagPoints * ratio),
    customPacks: c.customPacks.map((p) => ({
      ...p,
      points: Math.round(p.points * ratio),
    })),
  }))

  const settings: AdminSettings = {
    ...input.settings,
    pointsFactor: newFactor,
    ...(input.settings.customPointsPerUsd !== undefined
      ? { customPointsPerUsd: Math.round(input.settings.customPointsPerUsd * ratio * 10) / 10 }
      : {}),
  }

  return {
    ...input,
    settings,
    publicPacks,
    standardPacks,
    clients,
  }
}
