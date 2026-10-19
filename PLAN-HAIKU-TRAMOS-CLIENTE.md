# PLAN-HAIKU-TRAMOS-CLIENTE — Tramos del Cliente = tramos del Canjeador General, con tarifa propia + compra "a medida"

Fecha: 2026-10-19. Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.
Ejecutor: Haiku / Antigravity. Revisión posterior: Claude.

## 0. Qué se decidió (dueño)
1. **Los tramos de un Cliente son los mismos puntos que los del Canjeador General** (hoy 1.500 / 2.500 / 5.100) pero **con el precio del Cliente**. Si Nosotros cambia los paquetes del Canjeador, los tramos de todos los Clientes cambian solos.
2. **Una sola tarifa por Cliente** (su `usdPerPoint`, que ya existe y ya tiene límites min/max). Todos sus tramos y su compra "a medida" usan esa tarifa. **Desaparecen** los "tramos propios" (`packMode`, `customPacks`) y la **tabla estándar** de paquetes (`standardPacks`).
3. **"A medida" del Cliente** se compra en **/cliente/comprar**: monto libre en dólares enteros (mínimo y máximo de Ajustes: `customMinUsd` / `customMaxUsd`) a la tarifa de ese Cliente. `/recargar` no cambia.
4. Confidencialidad (regla 13): el Cliente **nunca ve** precio por punto ni pts/$; solo "USD → puntos". Solo "Nosotros" ve la tarifa en Admin.

Fuera de alcance (NO tocar): los límites `clientPpdLimits`, los precios por tarjeta (General/Cliente) salvo lo indicado, el reparto/planilla (solo cambia de dónde sale su tramo base), el saldo de bienvenida, `/recargar`, el catálogo.

## 1. Antes de empezar
1. `git status` limpio salvo `package-lock.json` (no lo añadas; el proyecto usa pnpm).
2. Corre `npx tsc --noEmit` tras cada paso. Los errores de tipos te guían a todos los usos de lo que borras. No ejecutes `npm run build` con `npm run dev` abierto. No uses `rm -rf`.
3. Dos commits al final, sin `package-lock.json` y sin push: el de código `feat(clientes): tramos del Cliente iguales a los del Canjeador con tarifa propia y compra a medida`, y el de este plan aparte.

---

## Paso T1/6 — Dominio
- `lib/domain/types.ts`: de `ClientAccount` borra `packMode`; de `ClientAdminRow` borra `customPacks` (queda `active`). Ajusta el comentario de `usdPerPoint`: "Tarifa del Cliente: lo que paga por punto (lo fija Nosotros). Todos sus tramos y su compra a medida usan esta tarifa."
- `lib/domain/pricing.ts`:
  - Añade
  ```ts
  /** Tramos de un Cliente: los puntos del Canjeador General a la tarifa del Cliente (centavo hacia arriba). */
  export const clientPacks = (client: Pick<ClientAccount, "usdPerPoint">, publicPacks: PointsPack[]): PointsPack[] =>
    [...publicPacks]
      .sort((a, b) => a.usdCents - b.usdCents)
      .map((p) => ({ ...p, usdCents: Math.ceil(p.points * client.usdPerPoint * 100 - 1e-9) }))

  /** Puntos de una compra a medida: dólares ÷ tarifa, hacia abajo. */
  export const clientPointsForUsd = (usd: number, usdPerPoint: number) =>
    Math.floor(usd / usdPerPoint + 1e-9)
  ```
  - Reescribe `bestClientCentsPerPoint({ publicPacks, clients })`: devuelve `{ centsPerPoint, label }` con el **menor** `usdPerPoint × 100` entre los Clientes **activos** (label = nombre del Cliente). Si no hay ninguno activo: `{ centsPerPoint: referenceCentsPerPoint(publicPacks), label: "Canjeador General" }`. Ya no recibe `standardPacks`.
  - Importa `ClientAccount` si hace falta.
- `lib/domain/grants.ts`: `clientBasePack(client: { usdPerPoint: number }, publicPacks: PointsPack[]): BasePack` = el tramo más pequeño de `clientPacks(client, publicPacks)` (`{ usdCents, points }`). El resto del archivo no cambia. Importa `clientPacks` de `./pricing`.
- `lib/domain/points-factor.ts`: quita `standardPacks` de `RescaleFactorInput` y del cuerpo; de los clientes quita `customPacks` (se conserva `usdPerPoint: c.usdPerPoint / ratio` y `bagPoints`).
- `lib/mock/data.ts`: borra `MOCK_STANDARD_PACKS` y `MOCK_CLIENT_PACKS`; quita `packMode` de `MOCK_CLIENT` y de `MOCK_CLIENTS_ADMIN` (y `customPacks`). Las tarifas quedan: Andina `0.00971984`, Ferretería La Unión `0.0098039`, Clínica Pacífico `0.0098039` (inactiva).
- `lib/mock/admin-settings.tsx`: quita `standardPacks`/`setStandardPacks` del contexto y los imports que sobren. `useCurrentClient()`: `client` con respaldo `{ ...MOCK_CLIENT, active: true }`; `base = clientBasePack(client, publicPacks)`; devuelve además `packs: clientPacks(client, publicPacks)`.
- Prueba con Node (copia `pricing.ts`, `grants.ts` y `types.ts` a la carpeta temporal con imports `.ts` y `node --experimental-strip-types`; si `grants.ts` arrastra imports que no corren solos, copia solo `clientBasePack`/`pointsForCommission`/`purchaseForMissing`), con paquetes públicos $15=1.500, $25=2.500, $50=5.100 pts:
  - `clientPacks(Andina)` = 1.458 ¢ ($14,58) / 2.430 ¢ ($24,30) / 4.958 ¢ ($49,58) para 1.500 / 2.500 / 5.100 pts.
  - `clientBasePack(Andina)` = `{ usdCents: 1458, points: 1500 }`. Comisión $20 → 2.057 pts; 25 filas × $20 → 51.425 pts; faltan 13.425 → `purchaseForMissing` = `{ usd: 131, points: 13477 }`.
  - `clientPointsForUsd(131, 0.00971984)` = 13.477.
  - `bestClientCentsPerPoint`: con los datos de ejemplo → Andina (0,971984 ¢). Con Andina inactiva → Ferretería La Unión (0,98039 ¢). Sin Clientes activos → "Canjeador General" (1 ¢).
  - Con factor 7 (`rescaleForFactor`): los puntos de los paquetes ×7 y `usdPerPoint` ÷7 → los precios en USD de `clientPacks` no cambian.

## Paso T2/6 — Admin → Clientes (`app/admin/(secciones)/clientes/page.tsx`)
- Quita el selector "Modo de paquetes de compra", el editor de "Tramos propios", la columna "Modo de paquetes" de la tabla y todo el estado y las funciones de tramos (`packMode`, `customPacks`, `handleAddPack`, `handleUsdChange`, `handlePackChange`, `handleRemovePack`, `baseIdx`, `basePack`, `pointsBounds`, `duplicatedPacks`, `invalidPacks`). Deja **solo** la rama de la barra "Puntos por cada dólar" que hoy se usa en modo estándar (referencia $10, paso de 1 punto), con sus textos de mínimo/máximo y su aviso rojo.
- `parsedUsdPerPoint = parseFloat(usdPerPoint) || 1 / limits.min`. `candidateClient` sin `packMode`/`customPacks`. `hasErrors = !name.trim() || parsedUsdPerPoint <= 0`.
- Cliente nuevo: `usdPerPoint` por defecto = `String(Number((1 / limits.min).toPrecision(6)))` (la misma tarifa del Canjeador General; Nosotros la baja con la barra). Quita `pointsRangeForUsd`/`POINTS_STEP` si quedan sin uso.
- Nueva sección de solo lectura en el diálogo, "Tramos del Cliente (mismos puntos que el Canjeador General)": una fila por cada paquete público con **Puntos** · **Canjeador General (USD)** · **Este Cliente (USD)** · **Ahorro** (`(general − cliente) / general` con `formatPct`; "—" si es ≤ 0). El precio del Cliente sale de `clientPacks(candidateClient, publicPacks)` para que cambie en vivo al mover la barra. Texto gris: "Los tramos son los del Canjeador General; cambian solos si cambian esos paquetes. 'A medida' usa esta misma tarifa."
- Descripción del diálogo: "Tarifa de punto del Cliente y estado comercial." Limpia imports sin uso (`Plus`, `Trash2`, `Select*`, etc.) y revisa `npx tsc --noEmit --noUnusedLocals` solo para este archivo.

## Paso T3/6 — Admin → Precios, Solicitudes, Proveedores, Ajustes
- `precios/page.tsx`: quita `standardPacks`/`setStandardPacks`, `standardDialogOpen`, el segundo `PacksEditor` ("Paquetes estándar") y el botón "Editar paquetes estándar". El selector de tablas: `public` ("Público (Canjeadores)", valor por defecto) y un ítem por **cada Cliente** `client-{id}` con etiqueta "Cliente: {nombre}" (solo lectura, usa `clientPacks(client, publicPacks)`). Llama `bestClientCentsPerPoint({ publicPacks, clients })`.
- `solicitudes/page.tsx`: quita `standardPacks`; `tablesWithSmallest` = "Canjeador" (tramo más pequeño público) + un elemento por Cliente **activo** con su tramo más pequeño de `clientPacks`. Sin "Estándar".
- `proveedores/page.tsx`: quita `standardPacks` y `std10Pack`. La columna "Margen tramo $10" pasa a **"Margen Cliente"**: `cardMargin(productClientPriceCents(prod, pts, bestClient.centsPerPoint), totalCost).marginPct` (calcula `bestClient` con `bestClientCentsPerPoint({ publicPacks, clients })`). Quita `marginAtPack` si queda sin uso.
- `ajustes/page.tsx`: quita `standardPacks` del llamado a `rescaleForFactor` y el `setStandardPacks`. El flujo del factor sigue igual.
- Cualquier otro uso que marque `tsc` de `packMode`, `customPacks`, `standardPacks`, `MOCK_STANDARD_PACKS`, `MOCK_CLIENT_PACKS` (por ejemplo `app/cliente/bono/page.tsx` línea ~20: el respaldo pasa a `{ ...MOCK_CLIENT, active: true }`).

## Paso T4/6 — Cliente → Comprar puntos (`app/cliente/comprar/page.tsx`)
- `packs` = `useCurrentClient().packs` (los 3 tramos del Cliente: puntos y USD, **sin** mostrar pts/$ ni $/punto).
- Añade una tarjeta "**A medida**" junto a los tramos: `Input` numérico de dólares enteros (`min = settings.customMinUsd ?? 1`, `max = settings.customMaxUsd ?? 500`, paso 1, valor inicial 100 acotado a ese rango) y debajo "Recibes **{formatPts(pts)}** puntos" con `pts = clientPointsForUsd(usd, client.usdPerPoint)`. Botón "Pagar con la pasarela" que abre el mismo `PurchaseDialog` con un `PointsPack` `{ id: "custom", usdCents: usd * 100, points: pts }`. Fuera de rango o vacío: botón deshabilitado y texto "Entre ${min} y ${max}.". Sin badge "Mejor valor" en esta tarjeta; el cálculo de `maxPoints` solo toma los 3 tramos.
- Texto de la página igual salvo una línea nueva en gris: "Los tramos son los mismos del Canjeador, a tu tarifa. También puedes comprar el monto que necesites."
- `useCurrentClient` ya da `addToBag`; el toast sigue igual.

## Paso T5/6 — Documentos
- `CLAUDE.md`: reemplaza la línea "El precio por punto de un Cliente con tabla propia se deriva de su tramo más pequeño…" por: "**Tramos del Cliente:** son los mismos puntos que los paquetes del Canjeador General, con la tarifa del Cliente (un solo `usdPerPoint` con límites min/max). No hay tramos propios ni tabla estándar. 'A medida' del Cliente (Cliente → Comprar puntos) usa esa misma tarifa. El bono (%) se convierte en puntos con esa tarifa." En "Pendientes" quita el 3 (resuelto) y el 5 (resuelto) y renumera. En "Compra a tu medida": añade que el Cliente la usa en Comprar puntos con su tarifa, y que el Canjeador y `/recargar` siguen con la global.
- `PLAN-ROLES.md`: donde describa tramos propios o tabla estándar de Clientes, añade una nota "REEMPLAZADO (2026-10-19): ver `CLAUDE.md` (Tramos del Cliente)". No reescribas el historial.
- `RESUMEN-PARA-GEMINI.md`: actualiza la sección de precios, el flujo de reparto (tramo base = tramo más pequeño derivado: Andina $14,58 = 1.500 pts) y los pendientes.

## Paso T6/6 — Verificación (navegador con `npm run dev`; 375 px en Clientes y Comprar)
1. Admin → Clientes → Editar Concesionaria Andina: ya no hay "Modo de paquetes" ni tramos propios; la barra "Puntos por cada dólar" muestra ≈102,9 (rango 100–106,6, sin aviso). La tabla "Tramos del Cliente" muestra: 1.500 pts → General $15,00 / Cliente $14,58; 2.500 pts → $25,00 / $24,30; 5.100 pts → $50,00 / $49,58 (los paquetes públicos de ejemplo son $15, $25 y $50). Mover la barra al mínimo (100) iguala los precios; al máximo, los baja.
2. Cliente nuevo: arranca en 100 pts/$ (sin descuento), se guarda y aparece en Precios → selector "Cliente: …".
3. Admin → Precios: ya no existe "Estándar"; "Público" sigue editable; los precios de Cliente por tarjeta siguen igual (Supermaxi $10 → 9,72 USD con Andina activa). Desactivar a Andina (Admin → Clientes) mueve el texto gris a Ferretería La Unión.
4. Cambiar un paquete público (p. ej. 1.500 → 1.600 pts) cambia los tramos de los Clientes sin tocar nada más.
5. Rol Cliente → Comprar puntos: 3 tramos (puntos y USD) + tarjeta "A medida": $131 → 13.477 pts; fuera de $1–$500 deshabilita el botón; en ningún sitio se ve pts/$ ni $/punto. Pagar suma los puntos a la bolsa.
6. Rol Cliente → Repartir: una planilla de 25 filas × $20 sigue dando 51.425 pts, faltan 13.425 y propone comprar $131 (= 13.477 pts).
7. Ajustes → cambiar el factor a 7 (con la clave de admin; si no la tienes, omite este punto y dilo): los precios en USD de los tramos del Cliente no cambian.
8. Canjeador y Proveedor: sin cambios; el Proveedor sigue sin ver costos ni márgenes.
9. `npx tsc --noEmit` = 0 errores; `npx tsc --noEmit --noUnusedLocals` sin avisos nuevos en los archivos tocados. Detén `npm run dev`, borra `.next` con PowerShell (`Remove-Item -Recurse -Force .next`) y corre `npm run build`: debe terminar bien (copia el resumen).
10. Dos commits (código y plan), sin `package-lock.json`, sin push. Informa archivos cambiados y decisiones propias.

## 2. Criterios de aceptación (los comprobará Claude)
- No quedan `packMode`, `customPacks`, `standardPacks`, `MOCK_STANDARD_PACKS` ni `MOCK_CLIENT_PACKS` en el código.
- Los tramos de cada Cliente salen de los paquetes públicos a su tarifa (números de T1) y cambian al editar los públicos.
- "A medida" del Cliente funciona en Comprar puntos y el Cliente nunca ve la tarifa.
- El reparto da los mismos números que antes (51.425 / 13.425 / $131 = 13.477).
- `tsc` = 0 errores, `npm run build` OK, dos commits sin `package-lock.json`.

## 3. Riesgos conocidos
- Se pierde la posibilidad de descuentos por volumen distintos para un mismo Cliente (una tarifa por Cliente, decisión del dueño). Si hace falta más adelante, se añade un precio por tramo.
- "A medida" del Cliente usa el rango de Ajustes ($1–$500 por defecto): para comprar más de $500 de una vez, el Cliente solo puede usar "Comprar el faltante" en Repartir (sin tope). Si hace falta, se sube `customMaxUsd` en Ajustes.
- Los tramos son pequeños ($15–$50) frente a lo que reparte una empresa: el valor real para el Cliente está en "A medida".
- El servidor deberá recalcular los precios de tramos y de "a medida"; aquí es solo vista previa.
