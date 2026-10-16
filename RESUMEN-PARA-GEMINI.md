# Regala — resumen del estado actual de la página (para Gemini)

Fecha del resumen: 2026-10-16. Rama: `claude/pet-store-gift-cards-refactor-n3h79x` (último commit `8cd3657`). `main` es la demo desplegada: https://puntos-three.vercel.app

## 1. Qué es
Plataforma de gift cards de Ecuador (Supermaxi, Megamaxi, Fybeca, Marathon Sports, Kywi, Juguetón, De Prati) con una moneda virtual llamada **Puntos**. Las empresas (Clientes) compran puntos y los reparten a personas (Canjeadores) como comisión/incentivo; los Canjeadores los canjean por tarjetas de regalo de los comercios (Proveedores).

## 2. Estado técnico
- Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui (Radix), lucide-react, sonner, exceljs (carga dinámica).
- **Es un prototipo con datos de ejemplo. No hay backend** (Supabase/pasarela de pago/correo pendientes). El estado vive en memoria (`lib/mock/admin-settings.tsx`) y en localStorage (catálogo `gc_catalog_v1`, billetera `gc_state_v1`); al recargar, el estado de ejemplo se reinicia.
- El rol se simula con la barra "Prototipo · Ver como" (`gc_proto_role` en sessionStorage).
- `next.config.mjs` tiene `ignoreBuildErrors: true`, por eso se valida con `npx tsc --noEmit` (actualmente 0 errores).

## 3. Roles y rutas
Un único rol por perfil: **canjeador, cliente, proveedor, admin ("Nosotros")**.

| Zona | Rutas | Quién entra |
|---|---|---|
| Pública / tienda | `/`, `/shop`, `/cart`, `/checkout`, `/checkout/success`, `/recargar`, `/about`, `/contact`, `/terminos`, `/privacidad`, `/login`, `/register`, `/forgot-password` | todos |
| Cuenta | `/cuenta`, `/cuenta/puntos`, `/cuenta/tarjetas`, `/cuenta/perfil` | todos los roles |
| Cliente | `/cliente`, `/cliente/comprar`, `/cliente/repartir`, `/cliente/repartido`, `/cliente/bono` | cliente + admin |
| Proveedor | `/proveedor`, `/proveedor/catalogo`, `/proveedor/tarjetas`, `/proveedor/caja`, `/proveedor/liquidacion`, `/proveedor/condiciones` | proveedor + admin |
| Admin | `/admin/(resumen, clientes, proveedores, precios, usuarios, liquidaciones, solicitudes, ajustes)` | solo admin |
| Editor de catálogo | `/admin` (protegido por clave `NEXT_PUBLIC_ADMIN_HASH`) | quien tenga la clave |

## 4. Modelo de precios (núcleo del negocio)
- Punto de referencia: el paquete más pequeño del Canjeador ($15 = 1.500 pts).
- **Precio en puntos de una tarjeta = valor facial × (1 + recargo)**. Recargo global editable en Ajustes (3 % por defecto; una tarjeta de $10 = 1.030 pts). Se redondea hacia arriba al múltiplo de puntos configurado (10 por defecto; 10/50/100).
- **Factor de conversión** (Ajustes, entero, exige contraseña de admin): multiplica todos los valores en puntos.
- Reglas de validación 1–8 (`lib/domain/pricing.ts`):
  1. El paquete más pequeño del Canjeador da ≥ 30 % (editable) más puntos que la tarjeta más barata.
  2. El Canjeador paga más por punto que cualquier Cliente.
  3. Margen mínimo (incluye paquetes del Canjeador; costo + transporte).
  4. Recargo ≥ 0.
  5. Puntos múltiplos de 10/50/100.
  6. Límites opcionales de precio por punto.
  7. Beneficio mínimo del Cliente (1 %).
  8. La compra "a tu medida" no puede ser más barata que el paquete más pequeño.
- Los Proveedores tienen un descuento acordado de 5–12 % (datos de ejemplo).
- El Cliente con tabla propia: su precio por punto se deriva de su tramo más pequeño.
- **Confidencialidad:** solo "Nosotros" ve precio por punto, márgenes y costos. Canjeador, Cliente y Proveedor ven solo "USD → puntos".
- **Compra a tu medida:** solo Cliente y admin en Recargar Puntos. El Canjeador compra paquetes fijos; si le faltan puntos se le propone el paquete más pequeño que cubra el faltante.
- Saldo de bienvenida: 1.100 puntos (etiqueta de saldo ajustada).
- Edad: siempre "declaración", nunca "verificamos".

## 5. Flujo de reparto del Cliente (comisiones)
1. El Cliente descarga una **planilla .xlsx** (1 a 1.000 filas): tipo de documento (lista desplegable por fila), número de documento, correo electrónico, valor de comisión ($) y referencia.
2. Sube la planilla; la web calcula los puntos: `floor(comisión × puntos_base / USD_base)` con la base = tramo más pequeño del Cliente (ej. Andina $170 = 17.490 pts).
3. Revisión: lista con puntos por persona, total necesario, saldo actual y faltante. Ejemplo: 25 filas × $20 → 51.425 pts; faltan 13.425 → hay que comprar $131 (= 13.477 pts).
4. Botón para comprar el faltante exacto en dólares enteros (diálogo de compra).
5. Reglas: todo o nada, irreversible, idempotente (hash), sin enumeración de documentos al revisar; el servidor revalidará cada fila; las fórmulas del Excel nunca se evalúan; límite 1.000 filas / 5 MB.
6. "Lo repartido": el Cliente ve usados/disponibles por documento (decisión del dueño).

## 6. Catálogo del Proveedor y aprobación
- El Proveedor crea tarjetas en `/proveedor/catalogo`: nombre, categoría, descripción (≤120), valores en USD (1–6, múltiplos de 5, límites en Ajustes, con slider y botones +/−), diseño (tema o colores personalizados con paleta, logo centrado, herramienta opcional "Quitar fondo" por color plano, imagen).
- Estados: borrador → enviada → aprobada / rechazada. Solo se edita borrador y rechazada.
- Nosotros revisamos en `/admin/solicitudes`: aprobar crea la tienda en el catálogo y sus productos con el descuento del Proveedor; se bloquea si introduce errores nuevos de reglas de precios. Rechazar exige motivo (≤300 caracteres).
- **El Proveedor nunca ve reglas ni cálculos**: solo qué valores no son compatibles y el motivo escrito por Nosotros.
- En el prototipo el panel de Proveedor siempre entra como Fybeca (`p-fybeca`).

## 7. Panel de administración ("Nosotros")
Resumen (KPIs), Clientes, Proveedores, Precios (paquetes y reglas), Usuarios, Liquidaciones, Solicitudes (con insignia de pendientes), Ajustes (recargo, factor con contraseña, regla de 30 %, múltiplo de puntos, límites de valores de tarjeta, etc.).

## 8. Código clave
- Dominio: `lib/domain/{types,pricing,format,documento,csv,grants,grant-file,xlsx-template,card-requests,points-factor}.ts`.
- Estado de ejemplo: `lib/mock/{data,session,admin-settings,admin-kpis}`.
- Componentes de panel: `components/panel/*` (shells por rol, `packs-editor`, `denoms-editor`, `card-design-editor`, `purchase-dialog`, `editable-number`, KpiCard).
- Documentos de especificación: `PLAN-ROLES.md`, `PLAN-BACKEND.md` (fases B0–B12), `PLAN-FASE-D.md`, `CLAUDE.md`, y los `PLAN-HAIKU-*.md` (historial de cambios por parte).

## 9. Limitaciones y pendientes conocidos
- Sin backend: B0 (cuentas Supabase staging/prod) y B1+ (roles, RLS, `requireRole()`) pendientes. Pasarela: Payphone primero, Deuna segunda; correo transaccional por definir.
- Estado del prototipo se pierde al recargar.
- Sin verificar: Administración → Catálogo (editor `/admin`) tras el refactor de componentes compartidos; la planilla xlsx en Excel real; un CSV con codificación antigua puede dañar tildes.
- Pregunta de negocio abierta: con tramos de precios distintos, ¿qué precio convierte el bono (%) en puntos?
- Temas legales/contables a cargo del dueño: saldos prepagados, caducidad, datos de terceros, facturación SRI.
- `package-lock.json` queda sin versionar a propósito.
