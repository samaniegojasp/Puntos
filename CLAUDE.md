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
- `lib/mock/{data,session,admin-settings,admin-kpis}`: datos de ejemplo; `admin-settings` es el estado compartido (ajustes, proveedores, productos, clientes, paquetes) para el panel y la tienda.
- `components/panel/*`: shells por rol, `packs-editor`, `editable-number`, KpiCard.
- `app/admin/(secciones)/*`: Resumen, Clientes, Proveedores, Precios, Usuarios, Liquidaciones, Ajustes.

## Decisiones de negocio vigentes
- **Confidencialidad (regla 13):** solo "Nosotros" ve precio por punto, márgenes y costos del proveedor. Canjeador, Cliente y Proveedor ven "USD → puntos".
- **Modelo de precios (oct 2026):** el punto de referencia es el del Canjeador (paquete de $10 = 1.000 pts); una tarjeta de $10 cuesta 1.000 pts. Los Clientes compran más barato (beneficio mínimo 1 %). Reglas: 1 piso (también en paquetes del Canjeador), 2 Canjeador paga más por punto que cualquier Cliente, 3 margen mínimo, 4 precio ≤ valor facial (error), 5 múltiplo de puntos (10/50/100), 6 límites opcionales de precio por punto, 7 beneficio mínimo del Cliente, 8 compra a tu medida no más barata que el paquete más pequeño.
- El precio por punto de un Cliente con tabla propia se deriva de su tramo más pequeño. El bono (%) lo edita el Cliente; el precio del punto lo fija Nosotros.
- Reparto por Excel: todo o nada, irreversible, idempotente, sin enumeración de documentos al revisar. El Cliente SÍ ve usados/disponibles por documento en "Lo repartido" (decisión del dueño).
- Edad: siempre "declaración", nunca "verificamos".

## Pendientes
1. B0 (cuentas externas) y backend B1+.
2. Pasarela de pago: Payphone primero (Deuna como segunda opción); correo transaccional: servicio por definir, dominio propio antes de producción.
3. Pregunta abierta de negocio: con tramos de precios distintos, ¿qué precio convierte el bono en puntos?
4. Legal/contable (el dueño): saldos prepagados, caducidad, datos de terceros, facturación SRI.
5. Tienda pública: el precio de las tarjetas en puntos aún usa 100 pts por dólar fijos (no el cálculo del panel); lo resuelve el backend.
