# Regala — guía para continuar el proyecto (Claude Code local)

Plataforma de gift cards de Ecuador (Supermaxi, Megamaxi, Fybeca, Marathon Sports, Kywi, Juguetón, De Prati) con moneda virtual **Puntos**. Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, lucide-react, sonner.
Rama de trabajo: `claude/pet-store-gift-cards-refactor-n3h79x`. `main` es la demo desplegada en https://puntos-three.vercel.app (no se toca sin pedirlo).

## Cómo trabajar (reglas del dueño)
- Responde en español. Trato de asesor: cuestiona primero supuestos, califica la confianza ([cierto] / [probable] / [suposición]) y numera los pasos ("Paso X/N").
- `next.config.mjs` tiene `ignoreBuildErrors: true`: **siempre** corre `npx tsc --noEmit` además del build.
- **No ejecutes `npm run build` con `npm run dev` abierto**: corrompe `.next` (la página carga sin estilos). Arreglo: detener dev, borrar `.next`, `npm run dev`.
- Confirma antes de acciones difíciles de revertir. Nunca pegues claves secretas en el chat ni en el código.

## Estado: Fase D (prototipo con datos de ejemplo) terminada; falta el backend
Roles (un solo `profiles.role`): canjeador, cliente, proveedor, admin ("Nosotros"). Rutas: `/cuenta*` todos; `/cliente*` cliente+admin; `/proveedor*` proveedor+admin; `/admin/*` solo admin (el editor `/admin` con clave `NEXT_PUBLIC_ADMIN_HASH` no cambia). El prototipo simula el rol con la barra "Prototipo · Ver como"; el backend real usará `requireRole()` + RLS.

Documentos (léelos antes de tocar el dominio):
- `PLAN-ROLES.md`: especificación de negocio y datos (lotes de puntos, tarjetas virtuales, reparto por Excel, reglas de precios 1–8).
- `PLAN-BACKEND.md`: fases B0–B12 (Supabase, Vercel, pasarela, correo). Siguiente paso: **B0** (el dueño crea proyectos Supabase staging/prod) y luego **B1** (roles, perfil y seguridad).
- `PLAN-FASE-D.md`: reglas de las pantallas, matriz de acceso y resultado de D7.

Código clave:
- `lib/domain/{types,pricing,format,documento,csv}.ts`: contrato y cálculos (solo vista previa; el servidor decidirá los precios).
- `lib/domain/pricing.ts`: precios por tarjeta (General y de Cliente), puntos y margen.
- `lib/mock/{data,session,admin-settings,admin-kpis}`: datos de ejemplo; `admin-settings` es el estado compartido (ajustes, proveedores, productos, clientes, paquetes) para el panel y la tienda.
- `components/panel/*`: shells por rol, `packs-editor`, `editable-number`, KpiCard.
- `app/admin/(secciones)/*`: Resumen, Clientes, Proveedores, Precios, Usuarios, Liquidaciones, Ajustes.

## Decisiones de negocio vigentes
- **Confidencialidad (regla 13):** solo "Nosotros" ve precio por punto, márgenes y costos del proveedor. Canjeador, Cliente y Proveedor ven "USD → puntos".
- **Modelo de precios (oct 2026):** Sin reglas de validación de precios (eliminadas el 2026-10-16). Cada tarjeta tiene dos precios en USD que edita Nosotros en Precios: Canjeador General y Canjeador de Cliente. Los puntos de la tarjeta salen del precio General al punto de referencia (paquete más pequeño del Canjeador), redondeados hacia arriba al múltiplo de puntos; el precio de Cliente solo cambia ingreso y margen. Recargo global = valor por defecto del precio General.
- `PLAN-ROLES.md` §5.3 (reglas 1–8) quedó reemplazado por esta decisión.
- El precio por punto de un Cliente con tabla propia se deriva de su tramo más pequeño. El bono (%) lo edita el Cliente; el precio del punto lo fija Nosotros.
- **Límites de puntos por dólar de un Cliente (Admin → Clientes):** mínimo = puntos por dólar del Canjeador General; máximo = `P ÷ (C × (1 + m))` de la tarjeta más exigente, con `m` = 'Porcentaje mínimo de ganancia' (Ajustes, 2 % por defecto, sobre el costo). Solo acota barras y valores escritos; no bloquea.
- Reparto por Excel: todo o nada, irreversible, idempotente, sin enumeración de documentos al revisar. El Cliente SÍ ve usados/disponibles por documento en "Lo repartido" (decisión del dueño).
- **Planilla de reparto:** .xlsx con N filas (1 a 1.000): tipo de documento (lista desplegable), número de documento, correo electrónico, valor de comisión ($) y referencia. Los puntos se calculan en la web: `floor(comisión ÷ precio del punto del tramo más pequeño del Cliente)`. La revisión muestra puntos por persona, total, saldo y faltante, y permite comprar el faltante exacto en dólares enteros. El servidor siempre vuelve a validar cada fila. El Cliente nunca ve el precio por punto, solo USD → puntos.
- **Catálogo del Proveedor:** el Proveedor crea tarjetas (nombre, categoría, descripción, valores, diseño) en `/proveedor/catalogo` y las envía; Nosotros las aprobamos en `/admin/solicitudes`. Aprobar crea la tarjeta en el catálogo y sus productos con el descuento del Proveedor (ahora aprobar no se bloquea por reglas). El Proveedor nunca ve costos, márgenes ni reglas: si se rechaza, solo ve el motivo que escribimos.
- **Compra a tu medida:** solo la ven y usan Cliente y Nosotros en Recargar Puntos. El Canjeador compra paquetes fijos; si le faltan puntos, se le propone el paquete más pequeño que cubra lo que falta.
- Edad: siempre "declaración", nunca "verificamos".

## Pendientes
1. B0 (cuentas externas) y backend B1+.
2. Pasarela de pago: Payphone primero (Deuna como segunda opción); correo transaccional: servicio por definir, dominio propio antes de producción.
3. Pregunta abierta de negocio: con tramos de precios distintos, ¿qué precio convierte el bono en puntos?
4. Legal/contable (el dueño): saldos prepagados, caducidad, datos de terceros, facturación SRI.
