import { prisma } from "@/lib/prisma"
import { getFormulaDefault } from "@/lib/formulaDefaults"
import type { FormulaSettings, TargetDistance } from "@/types"

export async function loadFormula(targetDistance: TargetDistance | string): Promise<FormulaSettings> {
  try {
    const row = await prisma.formulaConfig.findUnique({
      where: { targetDistance: String(targetDistance) },
    })
    if (row?.config) {
      const cfg = row.config as FormulaSettings
      const defaults = getFormulaDefault(targetDistance)
      // Merge: DB values override defaults, but fill in any missing keys
      return {
        ...defaults,
        ...cfg,
        paceMultipliers: { ...defaults.paceMultipliers, ...(cfg.paceMultipliers ?? {}) },
      }
    }
  } catch {
    // DB unavailable — fall back to defaults silently
  }
  return getFormulaDefault(targetDistance)
}
