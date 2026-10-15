# Plan para Haiku / Antigravity — Saldo demo y puntos de bienvenida (Parte L)

Una sola parte, con un commit. Al final, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas (no negociables)
1. Solo toca los archivos que nombra el plan. Si algo no cuadra, DETENTE y pregunta.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Commit solo con los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.

## Decisiones del dueño (oct 2026)
- El saldo del encabezado (monedero demo de la tienda) se rotula como "Saldo demo de la tienda", para que no se confunda con el saldo de "Mi cuenta" (datos de ejemplo).
- Los puntos de bienvenida suben de 500 a **1.100**: alcanzan para la tarjeta más barata del catálogo (1.030 pts con el recargo de 3 %).

## Paso 1/3 — Puntos de bienvenida
- `lib/catalog.ts`: `WELCOME_POINTS = 1100`. Agrega el comentario `/** Debe alcanzar para la tarjeta más barata del catálogo (hoy 1.030 pts con 3 % de recargo). */`.
- `app/register/page.tsx` (línea ~199): el texto pasa a usar la constante, `En esta demo, todos parten con {formatPoints(WELCOME_POINTS)} Puntos de bienvenida` (importa `WELCOME_POINTS` y `formatPoints` de `@/lib/catalog`).

## Paso 2/3 — Rótulo del saldo (`components/points-balance.tsx`)
- Agrega `title="Saldo demo de la tienda: se guarda solo en este navegador"` al `Link`.
- `aria-label`: `Saldo demo de la tienda: ${formatPoints(balance)} puntos. Recargar` (y deja "Recargar puntos" mientras carga).
- No cambies el aspecto visual (el encabezado es angosto en móvil).
- `app/cuenta/page.tsx` y `app/cuenta/puntos/page.tsx`: debajo de la descripción de la cabecera, agrega una línea pequeña y discreta (`text-xs text-muted-foreground`): "Saldo de ejemplo de tu cuenta. El monedero de la tienda (arriba) es otro saldo demo guardado en este navegador; en la versión real serán uno solo."

## Paso 3/3 — Pruebas y commit
1. El navegador conserva el saldo guardado de antes (500). Para ver el nuevo, ejecuta en la consola `localStorage.removeItem("gc_state_v1")` y recarga: el encabezado debe mostrar 1.100.
2. Con 1.100 puntos, en `/shop` canjea Supermaxi $10 (1.030 pts): debe funcionar y dejar 70 pts.
3. `/register` muestra "1.100 Puntos de bienvenida".
4. Al pasar el mouse sobre el saldo del encabezado aparece "Saldo demo de la tienda…". `/cuenta` y `/cuenta/puntos` muestran la nota.
5. A 375 px de ancho no hay scroll horizontal en `/cuenta`.
6. `npx tsc --noEmit` y commit: `feat(demo): 1.100 puntos de bienvenida y saldo del encabezado rotulado como demo`.

## Paso final — Revisión
Avisa al dueño al terminar. Opus revisa el diff, corre `tsc` y prueba en el navegador.
