# Plan para Haiku / Antigravity — "A tu medida" solo para Clientes y Nosotros (Parte M)

Una sola parte, con un commit. Al final, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas (no negociables)
1. Solo toca los archivos que nombra el plan. Si algo no cuadra, DETENTE y pregunta. No cambies `lib/domain/pricing.ts`.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Commit solo con los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.
4. Para probar un rol, usa la barra "Prototipo · Ver como".

## Decisión del dueño (oct 2026)
En **Recargar Puntos**, la opción "A tu medida" (monto libre en dólares) solo la ven y usan los roles **Cliente** y **Nosotros** (admin). El **Canjeador** (y quien no ha iniciado sesión, que en el prototipo es Canjeador) compra únicamente los paquetes fijos.

Consecuencia: hoy el carrito y el checkout ofrecen "Comprar los N pts que faltan ($X)", que usa "a tu medida". Para el Canjeador, ese botón pasa a proponer **el paquete fijo más pequeño que cubra lo que falta** (o el más grande, si ninguno alcanza). La restricción por rol es solo de pantalla: en la versión real la validará el servidor.

## Paso 1/5 — Quién puede comprar a tu medida (`lib/mock/admin-settings.tsx`)
Agrega, junto a `usePublicOffer`:
```ts
/** "A tu medida" solo para Cliente y Nosotros (admin). El Canjeador compra paquetes fijos. */
export function useCanBuyCustom() {
  const { role } = useMockSession()
  return role === "cliente" || role === "admin"
}
```
Importa `useMockSession` de `@/lib/mock/session`. Si Next marca un ciclo de importación, mueve el hook a un archivo nuevo `lib/mock/offer-access.ts` y úsalo desde ahí.

## Paso 2/5 — Paquete que cubre lo que falta (`lib/catalog.ts`)
Agrega, junto a `usdForPoints`:
```ts
/** Paquete fijo más pequeño que cubre `missingPoints`; si ninguno alcanza, el más grande. */
export const packForPoints = (missingPoints: number, packs: PointsPack[]) => {
  const sorted = [...packs].sort((a, b) => a.points - b.points)
  return sorted.find((p) => p.points >= missingPoints) ?? sorted[sorted.length - 1]
}
```
No cambies `usdForPoints` (lo siguen usando Cliente y Nosotros).

## Paso 3/5 — `/recargar` (`app/recargar/page.tsx`)
- `const canCustom = useCanBuyCustom()`. Espera a que la sesión esté lista: usa `ready` de `useMockSession()` para no mostrar y esconder la tarjeta al cargar.
- Renderiza la tarjeta "A tu medida" **solo si `canCustom`**. La cuadrícula pasa a `lg:grid-cols-3` cuando no hay tarjeta a tu medida y se queda en `lg:grid-cols-4` cuando sí hay.
- Efecto del parámetro `?faltan=N`:
  - Si `canCustom`, igual que hoy (propone el monto exacto con `usdForPoints`).
  - Si no, selecciona `packForPoints(n, PACKS)` como `pack` y deja `missing = n`.
  - El efecto debe correr cuando la sesión esté lista, no solo al montar.
- El mensaje "Te faltan N pts. Con $X compras …" debe verse para ambos casos: con `pack?.id === "custom"` o con un paquete fijo seleccionado por `faltan`. Para el paquete fijo, di "Con el paquete de $X compras N pts" y "te sobran N" si aplica; si el paquete no alcanza, di "Este es el paquete más grande; puedes repetir la recarga".
- Si el Canjeador llega con `pack.id === "custom"` por alguna razón, `onSubmit` no debe llamar a `topUpCustom`: agrega `if (pack.id === "custom" && !canCustom) return`.

## Paso 4/5 — Carrito y checkout
- `app/cart/page.tsx` (líneas ~161-166) y `app/checkout/page.tsx` (líneas ~91-95): el botón "Comprar los N pts que faltan (…)" usa:
  - `canCustom`: `$${usdForPoints(faltan, custom)}`, igual que hoy.
  - si no: el paquete `packForPoints(faltan, packs)` (los `packs` salen de `usePublicOffer()`). Texto: `Recargar el paquete de $${p.usd} (${formatPoints(p.points)} pts)`; si ese paquete no cubre lo que falta, agrega "(no alcanza; puedes repetir)".
  - El enlace sigue siendo `/recargar?faltan=N`.

## Paso 5/5 — Ajustes, documentación, pruebas y commit
- `app/admin/(secciones)/ajustes/page.tsx` (bloque ~731): el título pasa a "Compra a tu medida (Clientes y Nosotros)" y el primer párrafo empieza con "Además de los paquetes, los Clientes y Nosotros pueden comprar…" (quita la mención al Canjeador y al ejemplo de "completar lo que le falta"). El resto del texto no cambia.
- `CLAUDE.md`, en "Decisiones de negocio vigentes", agrega una viñeta: "**Compra a tu medida:** solo la ven y usan Cliente y Nosotros en Recargar Puntos. El Canjeador compra paquetes fijos; si le faltan puntos, se le propone el paquete más pequeño que cubra lo que falta."
- Pruebas:
  1. Rol Canjeador → `/recargar`: solo 3 paquetes (1.500 / 2.500 / 5.100), sin la tarjeta "A tu medida", cuadrícula de 3 columnas en pantalla ancha.
  2. Rol Cliente y rol Nosotros → `/recargar`: 3 paquetes + "A tu medida" (4 columnas), y comprar un monto libre funciona.
  3. Rol Canjeador con 1.100 pts (borra `gc_state_v1` en la consola si hace falta; Chrome pide escribir `allow pasting` antes de pegar): añade al carrito Marathon $50 (5.150 pts) → el carrito dice "Te faltan 4.050 pts" y el botón propone "Recargar el paquete de $50 (5.100 pts)" (alcanza, sin nota); al pulsarlo, `/recargar` abre con ese paquete seleccionado y "te sobran 1.050". Con dos Marathon $50 (faltan 9.200 pts), propone el de $50 con la nota "(no alcanza; puedes repetir)". Con una faltante de 1.200 (por ejemplo, Supermaxi $25 con 1.380 pts de saldo), propone el de $15 (1.500).
  4. Rol Cliente con el mismo carrito: el botón sigue proponiendo "a tu medida" con el monto exacto.
  5. Cambiar de rol en la barra con la página abierta actualiza la tarjeta sin recargar.
  6. A 375 px de ancho, sin scroll horizontal en `/recargar`.
- `npx tsc --noEmit` y commit: `feat(recargar): "a tu medida" solo para Clientes y Nosotros; el Canjeador recibe el paquete fijo que cubre lo que falta`.

## Paso final — Revisión
Avisa al dueño al terminar. Opus revisa el diff, corre `tsc` y prueba cada rol en el navegador.
