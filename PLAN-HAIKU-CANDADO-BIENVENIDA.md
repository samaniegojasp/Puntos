# Plan para Haiku / Antigravity — Candado antifraude de los puntos de bienvenida

Decisión del dueño (2026-10-19): **bolsillo bloqueado**. Los 1.100 pts de bienvenida se ven desde el registro, pero **no se pueden canjear** hasta la primera recarga pagada (o, en el backend, el primer reparto recibido de un Cliente). Así el regalo solo cuesta algo cuando ya entró dinero real.

Fuera de alcance (NO tocar): `lib/domain/*`, `lib/mock/*`, `app/cuenta/puntos` (usa otro saldo de ejemplo), precios, Clientes, el valor de `WELCOME_POINTS` (1100).

## Paso 1/4 — Estado: `lib/points-store.tsx`
- `State` gana `locked: number` (puntos de `balance` que aún no se pueden gastar). `initialState = { balance: WELCOME_POINTS, locked: WELCOME_POINTS, ... }`.
- `load()`: `locked` = `s.locked` si es entero y `0 <= locked <= balance`; si falta (estado viejo) o es inválido → `0` (quien ya tenía saldo guardado no queda bloqueado).
- Contexto: agrega `available: number` = `balance - locked` (se calcula al armar `value`).
- `redeem`: compara contra `s.balance - s.locked` (no contra `s.balance`): `if (total > s.balance - s.locked) return { ok:false, reason:"insufficient", missing: total - (s.balance - s.locked) }`. Al canjear, `locked` no cambia.
- `topUp` y `topUpCustom`: al sumar los puntos comprados, fijan `locked: 0` (una recarga pagada libera todo).
- Comentario de una línea sobre `locked`: `/** Puntos de bienvenida: se ven pero no se gastan hasta la primera recarga pagada (candado antifraude). */`

## Paso 2/4 — Pantallas que comparan con el saldo (usar `available`, no `balance`)
- `app/cart/page.tsx`: `suggested`, "Te faltan…", el enlace `/recargar?faltan=…` y el botón de comprar lo que falta usan `cartTotal - available`. La fila "saldo" sigue mostrando `balance`; si `locked > 0`, agrega debajo en texto pequeño: `{formatPoints(locked)} pts bloqueados hasta tu primera recarga`.
- `app/checkout/page.tsx`: `missing = cartTotal - available`; "Tu saldo" muestra `available`; si `locked > 0`, una línea pequeña igual a la del carrito. "Saldo después" = `balance - cartTotal` (el total, incluye bloqueados) solo si `missing <= 0`.
- `app/checkout/success/page.tsx`: sin cambio (muestra `balance`).
- `components/points-balance.tsx`: el número sigue siendo `balance`; el `aria-label` y el `title` (si no hay, agrégalo) dicen: `Saldo demo: X puntos, de los cuales Y bloqueados hasta tu primera recarga` solo cuando `locked > 0`.
- `app/recargar/page.tsx` (línea ~99, donde dice el saldo): agrega, si `locked > 0`, `Tus {locked} pts de bienvenida se liberan con tu primera recarga.` Formato con `formatPoints`.

## Paso 3/4 — Documentos
- `CLAUDE.md`: Pendiente 4 → reemplázalo por una línea en **Decisiones de negocio**: `**Puntos de bienvenida (1.100):** bolsillo bloqueado; se ven desde el registro pero solo se gastan tras la primera recarga pagada o el primer reparto recibido de un Cliente. El prototipo lo simula en la billetera (`locked`); el backend lo llevará como lote `promo` con `locked_until`.` Renumera los Pendientes.
- `PLAN-BACKEND.md` fila D1: añade `Decisión 2026-10-19: lote promocional bloqueado hasta primera recarga pagada o primer reparto recibido; configurable (monto y liberación) en Ajustes.`
- `PLAN-ROLES.md`: si menciona los puntos de bienvenida, una línea con la misma regla (si no los menciona, no tocar).

## Paso 4/4 — Verificación (la hace el dueño/Claude, no tú)
1. `npx tsc --noEmit` = 0 errores y commit: `feat(bienvenida): candado antifraude de los puntos de bienvenida (bloqueados hasta la primera recarga)`.
2. Estado limpio: `localStorage.removeItem("gc_state_v1")` y recarga. Encabezado = 1.100.
3. Agregar al carrito una tarjeta de $10 → carrito y checkout dicen "Te faltan 1.000 pts" y el botón de canjear no deja pagar.
4. Recargar el paquete más pequeño → ya se puede canjear; el aviso de bloqueados desaparece y el saldo = 1.100 + paquete.
5. Un estado viejo (sin `locked`) no queda bloqueado.
6. 375 px: los avisos nuevos no producen desplazamiento horizontal.
