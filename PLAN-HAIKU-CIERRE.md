# PLAN-HAIKU-CIERRE — Limpieza, retoques y build real

Fecha: 2026-10-16. Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.
Ejecutor: Haiku / Antigravity. Revisión posterior: Claude.

## 0. Objetivo
Dejar el prototipo al día tras quitar las reglas de precios: limpiar imports sin uso, corregir un formato, dar productos a Megamaxi, actualizar documentos viejos y **comprobar que `npm run build` compila de verdad** (`next.config.mjs` ignora errores de tipos, por eso `tsc` solo no basta).

**No cambies lógica de negocio.** No toques `grants.ts`, la planilla, el reparto ni `pricing.ts`.

## 1. Antes de empezar
1. `git status` limpio salvo `package-lock.json` (no lo añadas).
2. Un solo commit al final, sin `package-lock.json` y sin push: `chore: limpiar imports, formato de precios, productos de Megamaxi, docs y build`.
3. No uses `rm -rf` (está bloqueado); para borrar `.next` usa PowerShell: `Remove-Item -Recurse -Force .next`.

---

## Paso C1/5 — Imports sin uso
Corre `npx tsc --noEmit --noUnusedLocals` y limpia **solo** estos avisos (quita el import o la variable; si algo sí se usa, déjalo y dilo):
- `app/admin/(secciones)/ajustes/page.tsx`: `useRef`, `Settings`, `formatPct`, `pointsPrice`, `productPriceCents`, `providers`.
- `app/admin/(secciones)/clientes/page.tsx`: `formatUsd`.
- `app/admin/(secciones)/liquidaciones/page.tsx`: `FileText`, `Filter`.
- `app/admin/(secciones)/precios/page.tsx`: `marginAtPack`, `pointsPrice`.
- `app/admin/(secciones)/proveedores/page.tsx`: `Input`, `formatDate`, `pointsPrice`.
- `app/admin/(secciones)/resumen/page.tsx`: `MOCK_PUBLIC_PACKS`.
- `app/admin/(secciones)/solicitudes/page.tsx`: la variable `products` (línea ~111; quítala del desestructurado de `useAdminSettings()` solo si realmente no se usa).
- `app/admin/(secciones)/usuarios/page.tsx`: `AlertCircle`, `Check`, `Shield`.
- `app/contact/page.tsx`: `Phone`.
- `app/proveedor/caja/page.tsx`: `CreditCard`.
- `app/proveedor/catalogo/page.tsx`: `AlertCircle` y la declaración de import de la línea ~7 (todos sus imports sin uso; verifica y quítala entera).
- `app/proveedor/liquidacion/page.tsx`: `FileCheck`, `Info`.
- `app/proveedor/page.tsx`: `AlertCircle`.
Resultado: `npx tsc --noEmit --noUnusedLocals` ya no lista esos archivos (si aparecen otros nuevos, no los toques: solo anótalos). `npx tsc --noEmit` = 0 errores.

## Paso C2/5 — Formato de los precios editables en Precios
`app/admin/(secciones)/precios/page.tsx` (~líneas 268–269 y 315–316): hoy `display` muestra "10.30 USD" con punto, y el resto de la página usa coma ("$10,30").
- `display` debe usar el formato de la página: `new Intl.NumberFormat("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor / 100)` (→ "10,30 USD").
- `initial` (lo que se escribe al editar) puede quedarse con `toFixed(2)`; `EditableNumber` acepta coma o punto al escribir.
- Comprueba que escribir "11" y "11,5" y "11.5" funciona.

## Paso C3/5 — Productos de Megamaxi
`lib/mock/data.ts`, `MOCK_PRODUCTS`: añade tres productos de Megamaxi con el proveedor `p-supermaxi` (misma marca que Supermaxi), con los valores del catálogo (`lib/catalog.ts`: 25, 50, 100):
```ts
prod("pr-9", "megamaxi", "Megamaxi", "p-supermaxi", 25),
prod("pr-10", "megamaxi", "Megamaxi", "p-supermaxi", 50),
prod("pr-11", "megamaxi", "Megamaxi", "p-supermaxi", 100),
```
(usa los ids que no estén tomados; respeta la firma real de `prod`). Efecto esperado: aparecen 3 filas más en Admin → Precios y se puede editar el precio de Megamaxi; los puntos que ve el Canjeador en la tienda **no cambian** mientras no edites un precio (Megamaxi $25 = 2.580 pts).
Comprueba también que los límites de Clientes siguen en ≈106,6 pts/$ (Megamaxi no es la tarjeta limitante).

## Paso C4/5 — Documentos
- `PLAN-ROLES.md`:
  - §5.3 (~línea 165): añade justo debajo del título una cita: "> **REEMPLAZADO (2026-10-16):** estas reglas se eliminaron. Ver `CLAUDE.md` ("Modelo de precios"): cada tarjeta tiene dos precios editables (Canjeador General y Canjeador de Cliente) y los puntos salen del precio General. Se conserva el texto como historial."
  - Línea ~63: cambia "y se bloquea si rompe reglas de precios. El Proveedor nunca ve reglas ni cálculos: solo qué valores no son compatibles y el motivo que escribimos." por "y ya no se bloquea por reglas de precios. El Proveedor nunca ve costos, márgenes ni cálculos: si se rechaza, solo ve el motivo que escribimos."
  - Línea ~174 (§5.4, "Regla 6"): añade al final: "(Reemplazado: ahora los puntos por dólar de un Cliente se acotan entre el Canjeador General y un máximo calculado con el Porcentaje mínimo de ganancia; ver `CLAUDE.md`.)"
  - Línea ~220: tras `validate_pricing()` (reglas de 5.3) añade "(ya no se implementa; ver nota en 5.3)".
- `CLAUDE.md`, sección "Pendientes": sustituye por esta lista (conserva las cuatro que existen y añade):
  1. B0 (cuentas externas) y backend B1+.
  2. Pasarela de pago: Payphone primero (Deuna como segunda opción); correo transaccional: servicio por definir, dominio propio antes de producción.
  3. Pregunta abierta de negocio: con tramos de precios distintos, ¿qué precio convierte el bono en puntos?
  4. Legal/contable (el dueño): saldos prepagados, caducidad, datos de terceros, facturación SRI.
  5. Diseño pendiente: el precio de Cliente por tarjeta aún no alimenta las tablas de paquetes de los Clientes ni el reparto por planilla.
  6. Saldo de bienvenida (1.100 pts) alcanza para una tarjeta de $10 (1.030 pts): decidir candado antifraude (bolsillo promocional que se libere tras un reparto o una recarga pagada) en el backend.
  7. Sin reglas de precios, la comisión de la pasarela y el cobro mínimo por transacción no están modelados.
  8. Probar a mano: Admin → Catálogo (editor `/admin` con clave) y la planilla .xlsx en Excel/Google Sheets.
- No toques `PLAN-FASE-D.md` (sus "reglas" son reglas de trabajo, no de precios).

## Paso C5/5 — Build real y cierre
1. Detén el servidor de desarrollo si está abierto (no ejecutes `npm run build` con `npm run dev` abierto).
2. `Remove-Item -Recurse -Force .next` (PowerShell).
3. `npm run build` → debe terminar bien. Copia al informe el resumen final (rutas, tamaños, advertencias). **Si falla**: no arregles nada ajeno a este plan; copia el error completo y detente (Claude decide).
4. `npx tsc --noEmit` → 0 errores.
5. Arranca `npm run dev` y comprueba en el navegador (Admin): Precios (formato "10,30 USD", filas de Megamaxi y editar un precio de Megamaxi), Clientes → Editar Andina (límites 100–106,6), la tienda y 375 px en Precios.
6. Commit (sin `package-lock.json`, sin push). Informa qué archivos cambiaste y qué decidiste por tu cuenta.

## 2. Criterios de aceptación (los comprobará Claude)
- `npm run build` termina sin errores.
- `tsc` = 0 errores y ningún archivo de la lista C1 aparece en `--noEmit --noUnusedLocals`.
- Los precios editables se ven con coma.
- Megamaxi tiene precio editable y la tienda no cambia sus puntos por defecto.
- Documentos actualizados y un solo commit sin `package-lock.json`.
