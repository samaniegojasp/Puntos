# PLAN-HAIKU-PRECIO-GENERAL — Precio General = valor visual y margen de Cliente con el mejor descuento

Fecha: 2026-10-17. Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.
Ejecutor: Haiku / Antigravity. Revisión posterior: Claude.

## 0. Qué se decidió
1. **Canjeador General = valor visual de la tarjeta (por defecto).** Los datos de ejemplo parten con **recargo 0 %**, así una tarjeta de $10 muestra $10,00 = 1.000 pts. El recargo (Ajustes) y la edición de precios en Precios **siguen existiendo**: solo cambia el valor por defecto (de 3 % a 0 %).
2. **Margen de Cliente = con el Cliente que tiene más descuento.** El precio de Cliente automático de cada tarjeta se calcula con el **mejor precio por punto** (el más barato para Regala = más puntos por dólar) que tenga cualquier tabla vigente: la estándar y las tablas propias de los Clientes **activos**. Así el "Margen Cliente" es el caso más ajustado.

Fuera de alcance (NO tocar): `grants.ts`, la planilla, el reparto, el saldo de bienvenida (`WELCOME_POINTS`), los límites de Clientes (`clientPpdLimits`; solo se comprueba que sigan bien).

## 1. Antes de empezar
1. `git status` limpio salvo `package-lock.json` (no lo añadas; el proyecto usa pnpm).
2. Corre `npx tsc --noEmit` tras cada paso (0 errores). No ejecutes `npm run build` con `npm run dev` abierto. No uses `rm -rf`.
3. Un solo commit al final, sin `package-lock.json` y sin push: `feat(precios): precio General igual al valor visual por defecto y margen de Cliente con el mejor descuento`.

---

## Paso G1/4 — Recargo 0 % por defecto
- `lib/mock/data.ts` (`MOCK_SETTINGS`): `redeemSurchargePct: 0`.
- `lib/domain/pricing.ts` (~línea 37, `productPriceCents`): el respaldo `?? 0.03` pasa a `?? 0`. Actualiza los comentarios que digan "3 %" (líneas ~18 y ~33).
- `lib/domain/types.ts`: comentarios de `redeemSurchargePct` ("Por defecto 0 %") y de `Product.priceGeneralCents` (valor facial × (1 + recargo), con recargo 0 % por defecto).
- `app/admin/(secciones)/ajustes/page.tsx`: los tres respaldos `?? 0.03` / `: 0.03` (líneas ~84, ~150, ~185) pasan a `0`. Texto de ayuda de "Recargo al canjear" (~línea 440): "Se suma al valor facial: con 0 %, una tarjeta de $10 cuesta 1.000 pts del Canjeador (su valor visual); con 3 %, 1.030 pts." (quita "Sugerido: entre 2 y 5 %"). La validación (≥ 0) no cambia.
- `lib/catalog.ts` (~línea 5): el comentario de `WELCOME_POINTS` dice "hoy 1.030 pts con 3 % de recargo" → "hoy 1.000 pts con 0 % de recargo". **No cambies el valor** 1100.
- Busca otros textos o datos que asuman 1.030 pts o 3 %: `Grep` de `1\.030|1030|3 %` en `app`, `components`, `lib`. Solo corrige textos del recargo al canjear (ignora el 10 % de "recargo por cambio de tarjeta vencida", que es otra cosa). Si algún dato de ejemplo depende de 1.030, anótalo en el informe sin inventar.

## Paso G2/4 — Cliente con más descuento
- `lib/domain/pricing.ts`: sustituye `clientReferenceCentsPerPoint` por
```ts
export function bestClientCentsPerPoint(input: {
  standardPacks: PointsPack[]
  clients: ClientAdminRow[]
}): { centsPerPoint: number; label: string }
```
  - Candidatos: todos los paquetes de `standardPacks` (etiqueta "Tabla estándar") y todos los `customPacks` de cada cliente **activo** con `packMode === "custom"` (etiqueta = nombre del cliente).
  - Devuelve el de **menor** `centsPerPoint` (= más puntos por dólar). Si no hay candidatos, usa 1 ¢/punto con etiqueta "—".
  - Borra `clientReferenceCentsPerPoint` si queda sin uso. `productClientPriceCents` no cambia de firma (recibe el centavo por punto).
- `app/admin/(secciones)/precios/page.tsx`: donde hoy se usa `clientReferenceCentsPerPoint(standardPacks)` (línea ~83), usa `bestClientCentsPerPoint({ standardPacks, clients })` y pasa su `.centsPerPoint` a `productClientPriceCents` (en la tabla y en la vista previa del diálogo).
- Muestra un texto gris pequeño bajo el título de la tarjeta "Tarjetas virtuales y márgenes" (o en la descripción): "Precio de Cliente automático: con el mejor precio por punto de un Cliente activo ({label}, {pts por dólar} pts/$). Se ve solo en administración." con los pts/$ formateados `es-EC` a 1 decimal (`100 / centsPerPoint`).
- Prueba con Node (copia `pricing.ts` y `types.ts` a la temporal con imports `.ts`, `node --experimental-strip-types`) con los paquetes de `MOCK_STANDARD_PACKS` y `MOCK_CLIENTS_ADMIN`:
  - Mejor Cliente = **Concesionaria Andina** (tramo de $170: 102,9 pts/$, 0,97199 ¢/punto). Un cliente inactivo (Clínica Pacífico) o en modo estándar no la supera.
  - Si desactivas a Andina (`active: false`) el mejor pasa a la tabla estándar de $100 (102,8 pts/$).

## Paso G3/4 — Documentos
- `CLAUDE.md`, "Modelo de precios": cambia "Recargo global = valor por defecto del precio General" por "El precio General por defecto es el valor visual de la tarjeta (recargo 0 %; el recargo y los precios siguen siendo editables). El precio de Cliente automático usa el mejor precio por punto de un Cliente activo (el de más descuento), así el margen de Cliente es el caso más ajustado."
- `RESUMEN-PARA-GEMINI.md`: en "Modelo de precios", actualiza igual: recargo 0 % por defecto (ejemplo: $10 = 1.000 pts; con 3 % serían 1.030) y el precio de Cliente automático con el Cliente de mayor descuento.

## Paso G4/4 — Verificación
`npx tsc --noEmit` = 0 errores. Con `npm run dev`, rol Admin (barra "Nosotros"):
1. Precios: todas las tarjetas muestran Canjeador General = valor facial. Ej. Supermaxi $10 → `10,00 USD`, `1.000 pts`; Supermaxi $25 → `25,00`, `2.500 pts`; Juguetón $15 → `15,00`, `1.500 pts`.
2. Margen General de Supermaxi $10 = `$0,80 (8,70 %)` (costo $9,20). Margen Cliente = `$0,52 (5,65 %)` (precio de Cliente `9,72 USD` = 1.000 pts × 0,97199 ¢). Juguetón $15: precio de Cliente `14,58`, margen `$0,33 (2,32 %)`.
3. Texto gris de Precios menciona "Concesionaria Andina" y `102,9 pts/$`.
4. Ajustes: "Recargo al canjear" muestra 0 %; ponlo en 3 y guarda → Precios vuelve a mostrar 10,30 USD / 1.030 pts. Restablecer vuelve a 0 %.
5. Editar a mano el precio General de una tarjeta sigue funcionando y la tienda refleja los puntos nuevos; "Restablecer" vuelve al valor visual.
6. Clientes → Editar Andina: límites 100 a ≈103,2 pts/$ (limita Juguetón $15) y el valor 102,9 queda dentro, sin aviso.
7. 375 px: Precios sin desbordes de página.
8. Commit (sin `package-lock.json`, sin push). Informa archivos cambiados y decisiones propias.

## 2. Criterios de aceptación (los comprobará Claude)
- Con los datos de ejemplo, Canjeador General = valor visual en todas las tarjetas.
- El recargo sigue editable y su valor por defecto es 0 % en código y en Ajustes.
- `bestClientCentsPerPoint` elige al cliente de más descuento (activos y tabla estándar) y Precios lo usa y lo explica.
- `tsc` = 0 errores; un commit sin `package-lock.json`.

## 3. Riesgos conocidos
- Con recargo 0 %, el margen General de cada tarjeta es solo el descuento del proveedor; sin cargos de pasarela puede ser muy bajo.
- Los 1.100 pts de bienvenida siguen alcanzando para una tarjeta de $10 (1.000 pts): sigue pendiente el candado antifraude (backend).
- El precio de Cliente automático cambia si se activa/desactiva un Cliente o se edita su tabla.
