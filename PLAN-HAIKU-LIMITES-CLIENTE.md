# PLAN-HAIKU-LIMITES-CLIENTE — Límites de "Puntos por cada dólar" al editar un Cliente

Fecha: 2026-10-16. Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.
Ejecutor: Haiku / Antigravity. Revisión posterior: Claude.

## 0. Qué se pide y qué se decidió
En **Admin → Clientes → Editar cliente**, todo "Puntos por cada dólar" (la barra de arriba y la de cada tramo propio) debe moverse entre dos límites:

- **Mínimo** = puntos por dólar del **Canjeador General**: el del paquete público de menor monto (hoy $15 = 1.500 pts → **100 pts/$**; con factor `f`, `100 × f`).
- **Máximo** = lo más que se puede dar sin bajar del **"Porcentaje mínimo de ganancia"** (nuevo ajuste editable en Ajustes) en la tarjeta más exigente.

### Fórmula del máximo (corregida respecto a la propuesta del dueño)
Un Cliente paga `1 / ppd` USD por punto (ppd = puntos por dólar). Cuando se canjea una tarjeta de `P` puntos, Regala ingresa `P / ppd` dólares y le cuesta `C` (costo al proveedor + transporte). Para ganar al menos `m` (margen **sobre el costo**, igual que `cardMargin`):

```
P / ppd  ≥  C × (1 + m)      ⇒      ppd_máx(tarjeta) = P ÷ ( C × (1 + m) )
ppd_máx = el MENOR de ppd_máx(tarjeta) entre todas las tarjetas activas
```
- `P` = puntos de la tarjeta (`productPoints`, salen del precio General).
- `C` = `productTotalCostCents / 100` (ya incluye el descuento del proveedor, costo directo y transporte).
- La tarjeta "más exigente" **no es la más cara**: es la que tiene menos puntos por cada dólar de costo (en la práctica, la del proveedor con **menor descuento**). Por eso se toma el mínimo sobre todas, no una sola tarjeta.
- Con los datos de ejemplo y m = 2 %: máximo ≈ **106,6 pts/$** (tarjeta limitante: Juguetón $15). Con m = 0 %: 108,8. Con m = 5 %: 103,6. Andina hoy tiene 102,9, así que queda dentro del rango.

Fuera de alcance: no se tocan reglas de bloqueo (siguen sin existir). Estos límites solo acotan las barras y los valores escritos a mano en esta pantalla. No tocar `grants.ts`, la planilla ni el reparto.

## 1. Antes de empezar
1. `git status` limpio salvo `package-lock.json` (no lo añadas).
2. Corre `npx tsc --noEmit` después de cada paso (0 errores). No ejecutes `npm run build` con `npm run dev` abierto. No uses `rm -rf`.
3. Un solo commit al final, sin `package-lock.json` y sin push: `feat(clientes): limites de puntos por dolar segun Canjeador General y ganancia minima`.

---

## Paso L1/4 — Ajuste y cálculo (dominio)
- `lib/domain/types.ts`, `AdminSettings`: añade `minMarginPct?: number` con el comentario "Porcentaje mínimo de ganancia sobre el costo (0.02 = 2 %). Solo acota los puntos por dólar de un Cliente; no bloquea nada. Por defecto 2 %."
- `lib/mock/data.ts` (`MOCK_SETTINGS`): añade `minMarginPct: 0.02`.
- `lib/domain/pricing.ts`: nueva función exportada

```ts
export type ClientPpdLimits = {
  min: number            // pts por dólar del Canjeador General (paquete público de menor monto)
  max: number            // nunca menor que min
  limitingLabel?: string // ej. "Juguetón $15"
}
export function clientPpdLimits(input: {
  settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple" | "minMarginPct">
  providers: Provider[]
  products: Product[]
  publicPacks: PointsPack[]
}): ClientPpdLimits
```
  - `min = 100 / referenceCentsPerPoint(publicPacks)` (pts por dólar del paquete público de menor monto).
  - Para cada producto **activo**: `pts = productPoints(prod, settings, ref)`; `cost = productTotalCostCents(prod, proveedor)` (centavos; si el proveedor no existe usa `discountPct: 0`); `maxCard = (pts * 100) / (cost * (1 + m))` con `m = settings.minMarginPct ?? 0.02`. Salta productos con `cost <= 0`.
  - `max = Math.max(min, el menor maxCard)`. Si no hay productos activos: `max = min * 1.4`. `limitingLabel` = `"{storeName} ${facial en USD}"` de la tarjeta que da el menor.
- Prueba con Node (copia `pricing.ts` y `types.ts` a la carpeta temporal con imports `.ts` y `node --experimental-strip-types`) con paquetes públicos $15=1.500, $25=2.500, $50=5.100, recargo 3 %, múltiplo 10 y los proveedores/productos de `MOCK_PROVIDERS`/`MOCK_PRODUCTS`:
  - m = 0,02 → `min` = 100 y `max` ≈ 106,64 (±0,05), limitante Juguetón $15.
  - m = 0 → `max` ≈ 108,77. m = 0,05 → `max` ≈ 103,59.
  - m = 0,5 → `max` = `min` (nunca menor que el mínimo).
  - Con `pointsFactor` 7 (paquetes y puntos de tarjeta reescalados ×7) → `min` = 700 y `max` ≈ 746,5.
  - Un producto inactivo no cuenta.

## Paso L2/4 — Ajustes: "Porcentaje mínimo de ganancia"
`app/admin/(secciones)/ajustes/page.tsx`, en "Parámetros operativos y comerciales":
- Campo numérico **"Porcentaje mínimo de ganancia (%)"** con el mismo estilo de los demás (`Input` + `%`). Valor inicial `(current.minMarginPct ?? 0.02) * 100`. Rango 0–100 (paso 0.1). Texto de ayuda: "Sobre el costo de la tarjeta. Define cuántos puntos por dólar se pueden dar como máximo a un Cliente."
- Estado, validación (número entre 0 y 100; si no, error de formulario), `candidateSettings.minMarginPct` (fracción: `valor / 100`), y "Restablecer" que vuelve a `MOCK_SETTINGS.minMarginPct`.
- El factor de conversión **no** reescala este valor (es un porcentaje).
- No añadas ningún bloqueo de reglas.

## Paso L3/4 — Clientes: usar los límites
`app/admin/(secciones)/clientes/page.tsx`:
- Obtén también `products`, `providers`, `publicPacks` de `useAdminSettings()` y calcula `const limits = clientPpdLimits({ settings, providers, products, publicPacks })`.
- Reemplaza el rango actual (60 %–140 % de la base: `packBoundsForUsd`, `pointsBounds`, `priceBounds`) por este:
  - Para un monto de `usd` dólares, los puntos permitidos van de `Math.ceil(usd * limits.min / POINTS_STEP) * POINTS_STEP` a `Math.floor(usd * limits.max / POINTS_STEP) * POINTS_STEP`. Si tras redondear `max < min`, usa `min` para ambos.
  - La barra superior "Puntos por cada dólar" (con tramos propios mueve el tramo más pequeño; con modo estándar usa el valor de referencia de $10) usa esos mismos límites, expresados en pts/$: mínimo `limits.min`, máximo `limits.max`.
- Los textos bajo las barras pasan a: "Mínimo {min} pts/$ (Canjeador General)" y "Máximo {max} pts/$ (ganancia mínima {m} %)". Debajo, en gris pequeño: "Tarjeta más exigente: {limitingLabel}".
- Al escribir a mano puntos o monto (EditableNumber, campo "Monto (USD)"), el valor de puntos se **ajusta al rango** (clamp) como ya hacía el código con `Math.min(Math.max(...))`.
- Si el valor actual de un cliente queda fuera del rango (por ejemplo, porque se subió la ganancia mínima), conserva el aviso rojo "El valor actual está fuera del rango permitido. Mueve la barra para corregirlo." **No bloquees el guardado** (sin reglas de bloqueo).
- Todos los "pts/$" que se muestran por tramo usan los mismos límites en sus barras de puntos.

## Paso L4/4 — Documentación y verificación
- `CLAUDE.md`: en "Decisiones de negocio vigentes" añade: "**Límites de puntos por dólar de un Cliente (Admin → Clientes):** mínimo = puntos por dólar del Canjeador General; máximo = `P ÷ (C × (1 + m))` de la tarjeta más exigente, con `m` = 'Porcentaje mínimo de ganancia' (Ajustes, 2 % por defecto, sobre el costo). Solo acota barras y valores escritos; no bloquea."
- `Grep` de `packBoundsForUsd|priceBounds|60 \*|0\.6|1\.4` en `clientes/page.tsx`: no deben quedar usos del 60 %/140 % antiguo (salvo si algo más los usa; justifícalo).
- Prueba en el navegador (`npm run dev`), rol Admin:
  1. Clientes → Editar Concesionaria Andina: la barra superior muestra "Mínimo 100 pts/$ (Canjeador General)" y "Máximo ≈ 106,6 pts/$"; el valor 102,9 queda dentro. Muestra "Tarjeta más exigente: Juguetón $15".
  2. Cada tramo (170 y 400): su barra de puntos va de `usd × 100` a ≈ `usd × 106,6` (para 170: 17.000 a 18.120 aprox.). Escribe 30.000 pts en el tramo de 170 → se ajusta al máximo.
  3. Ajustes → cambia "Porcentaje mínimo de ganancia" a 5 y guarda; vuelve a Editar Andina: el máximo pasa a ≈ 103,6. Con 50 el máximo queda igual al mínimo (100) y el valor 102,9 muestra el aviso rojo pero deja guardar.
  4. Un cliente en modo "Estándar" muestra los mismos límites en su barra.
  5. 375 px: el diálogo no se desborda.
- `npx tsc --noEmit` → 0 errores. Commit (sin `package-lock.json`, sin push).

## 2. Criterios de aceptación (los comprobará Claude)
- El mínimo es el ppd del paquete público de menor monto y el máximo sale de `P ÷ (C × (1 + m))` de la tarjeta más exigente.
- La ganancia mínima se edita en Ajustes y cambia el máximo.
- Valores escritos a mano se ajustan al rango; ningún guardado se bloquea.
- `tsc` = 0 errores y un commit sin `package-lock.json`.

## 3. Riesgos conocidos
- Cambiar paquetes del Canjeador, precios General de tarjetas, descuentos de proveedores o la ganancia mínima mueve el máximo; un Cliente guardado antes puede quedar fuera del rango (solo se avisa).
- El margen se mide sobre el costo (igual que en la tabla de Precios), no sobre el ingreso.
- Los límites valen para el prototipo; el servidor deberá calcularlos y validarlos de nuevo.
