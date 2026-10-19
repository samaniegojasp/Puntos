# Plan para Haiku / Antigravity — Límite inferior del descuento del Proveedor

Pedido del dueño (2026-10-19): en Admin → Proveedores → Editar, "Descuento sobre valor facial" hoy va de 0 % a 50 %. El mínimo debe calcularse con el Cliente de mayor descuento y ser el **valor más pequeño que todavía deja el porcentaje mínimo de ganancia** (`settings.minMarginPct`, 2 % por defecto).

## La cuenta (misma que ya usa `clientPpdLimits`, vista desde el otro lado)
Para cada tarjeta activa del Proveedor (valor facial `F`, transporte `S`):
- `Pc` = precio de Cliente = `productClientPriceCents(prod, pts, best.centsPerPoint)` (el mismo de la columna "Margen Cliente"; `best` = `bestClientCentsPerPoint`, el Cliente activo con la tarifa más baja).
- Costo total = `F·(1 − d) + S`. Se exige margen ≥ `m`: `Pc ÷ costo − 1 ≥ m`.
- Despejando: `d ≥ 1 − (Pc ÷ (1 + m) − S) ÷ F`.
- Descuento mínimo del Proveedor = **el mayor** `d` entre sus tarjetas activas (la tarjeta más exigente), sin bajar de 0, **subido al siguiente 0,5 %** (paso del slider; con `1e-9` de tolerancia, como `clientPacks`).
- Se ignoran las tarjetas con `costCentsOverride` (su costo no depende del descuento).
- Si el mínimo supera 50 % (el máximo del slider): `min = 50` y `feasible = false`.

Ejemplo real (captura del dueño): Marathon Sports $50, Cliente Andina 102,9 pts/$: `Pc` = 5.000 pts × 0,971984 ¢ = $48,60; `Pc ÷ 1,02` = $47,65; `d ≥ 1 − 47,65 ÷ 50 = 4,70 %` → **mínimo 5 %** (suponiendo transporte $0). Con el 4 % actual el margen sale 1,25 % (< 2 %), por eso hoy se ve por debajo del mínimo.

Es un tope de barra y de valores escritos, **no bloquea el guardado** (regla vigente: los límites solo acotan; ver CLAUDE.md "Límites de puntos por dólar"). Fuera de alcance (NO tocar): `clientPpdLimits`, precios, Clientes, solicitudes (aprobar tarjetas).

## Paso 1/3 — `lib/domain/pricing.ts`
Nueva función exportada junto a `clientPpdLimits`:
```ts
export type ProviderDiscountLimits = { min: number; limitingLabel?: string; feasible: boolean } // min en fracción (0.05 = 5 %)

export function providerMinDiscountPct(input: {
  settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple" | "minMarginPct">
  providerId: string
  products: Product[]
  publicPacks: PointsPack[]
  bestClientCentsPerPoint: number
}): ProviderDiscountLimits
```
Implementa la cuenta de arriba con `referenceCentsPerPoint`, `productPoints`, `productClientPriceCents`. `m = settings.minMarginPct ?? 0.02`. Sin tarjetas activas: `{ min: 0, feasible: true }`. `limitingLabel` = `"{storeName} ${face/100}"` de la tarjeta que fija el mínimo (como en `clientPpdLimits`).

## Paso 2/3 — `app/admin/(secciones)/proveedores/page.tsx`
- Calcula `const limits = providerMinDiscountPct({ settings, providerId: editingProvider?.id ?? "", products, publicPacks, bestClientCentsPerPoint: bestClient.centsPerPoint })` (después de `bestClient`, línea ~101). `minPct = limits.min * 100`.
- Slider (línea ~229): `min={minPct}`; `value` acotado entre `minPct` y 50; el texto "Mínimo 0 %" (línea ~239) pasa a `Mínimo {formato} %`.
- Bajo el slider, si `minPct > 0`, una línea: `Mínimo para conservar el {formatPct(settings.minMarginPct ?? 0.02)} de ganancia (tarjeta más exigente: {limits.limitingLabel}).` Si `!limits.feasible`: `Ni con el 50 % se alcanza el mínimo de ganancia en {limitingLabel}; revisa el precio de la tarjeta.` (tono de advertencia, `text-destructive`).
- Lo que se escriba en el `EditableNumber` (`onCommit`, línea ~226) y lo que mueva el slider se sube a `minPct` si es menor (`Math.max`).
- **No cambies el valor guardado al abrir el diálogo** (`handleOpenEdit`). Si el descuento actual es menor que `minPct`, queda tal cual y se muestra una advertencia ámbar: `El descuento actual está por debajo del mínimo recomendado ({min} %): el margen de Cliente no llega al mínimo.` El formulario sigue pudiendo guardar (no bloquea).
- La tabla "Vista previa de impacto" no cambia.

## Paso 3/3 — Verificación (la hago yo, no tú)
1. `npx tsc --noEmit` = 0; commit: `feat(proveedores): descuento minimo del Proveedor segun el mejor Cliente y el margen minimo`.
2. Prueba Node con el código real: Marathon $50 a 102,9 pts/$ y recargo 0 % → mínimo 5 %; con `minMarginPct` 0 → 4 %; con un Cliente de 100 pts/$ el mínimo baja; sin Clientes activos usa el Canjeador General.
3. Navegador (Nosotros): Proveedores → editar cada Proveedor; el slider no baja del mínimo y el texto lo explica; 375 px sin desplazamiento horizontal.
4. `npm run build` real.
