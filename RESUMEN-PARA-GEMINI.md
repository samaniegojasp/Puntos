# Regala — resumen del estado actual de la página (para Gemini)

Fecha del resumen: 2026-10-16 (actualizado tras quitar las reglas de precios y añadir los dos precios por tarjeta). Rama: `claude/pet-store-gift-cards-refactor-n3h79x` (último commit `d65ed04`). `main` es la demo desplegada: https://puntos-three.vercel.app

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
- **Ya no existen reglas de validación de precios** (se eliminaron el 2026-10-16 porque se volvieron demasiado complejas). Nada bloquea ni avisa por márgenes al guardar precios, paquetes, Clientes, Proveedores ni al aprobar tarjetas. Las antiguas reglas 1–8 de `PLAN-ROLES.md` §5.3 quedaron reemplazadas por este modelo simple.
- **Punto de referencia:** el paquete público más pequeño del Canjeador ($15 = 1.500 pts, es decir 100 pts por dólar).
- **Dos precios por tarjeta**, que "Nosotros" edita en Admin → Precios (celdas editables, con botón "Restablecer" para volver al valor automático):
  - **Canjeador General** (USD): lo que paga quien compra puntos por su cuenta. Por defecto = valor facial × (1 + recargo); el recargo es global en Ajustes (0 % por defecto, es decir el valor visual de la tarjeta: una tarjeta de $10 = 1.000 pts; con 3 % serían 1.030 pts).
  - **Canjeador de Cliente** (USD): lo que ingresa Regala cuando se canjea con puntos que vienen de un Cliente (la empresa los compró más baratos). Por defecto = puntos de la tarjeta × precio del punto del Cliente activo con más descuento (la tarifa más baja entre los Clientes activos).
- **Los puntos de la tarjeta salen del precio General** (al punto de referencia, redondeados hacia arriba al múltiplo de puntos de Ajustes: 10 por defecto, o 50/100). La tarjeta cuesta los **mismos puntos para todos**; el precio de Cliente solo cambia el ingreso y el margen. La tienda, el carrito y el pago reflejan el precio General editado.
- Margen de cada caso = precio − (costo al proveedor + transporte), mostrado en USD y como % sobre el costo.
- **Factor de conversión** (Ajustes, entero, exige contraseña de admin): multiplica todos los valores en puntos (paquetes y compra a tu medida se reescalan).
- Los Proveedores tienen un descuento acordado de 5–12 % (datos de ejemplo).
- **Límites de "Puntos por cada dólar" de un Cliente** (Admin → Clientes → Editar, la barra de tarifa): mínimo = pts/$ del Canjeador General (100 hoy); máximo = `P ÷ (C × (1 + m))` calculado para la tarjeta más exigente (la de menor puntos por dólar de costo, en la práctica la del proveedor con menor descuento), donde `P` = puntos de la tarjeta, `C` = costo total en USD y `m` = "Porcentaje mínimo de ganancia" (Ajustes, 2 % por defecto, sobre el costo). Con los datos de ejemplo da ≈106,6 pts/$ (limita Juguetón $15). Solo acota barras y valores escritos; no bloquea el guardado y muestra un aviso si un Cliente queda fuera del rango.
- **Tramos del Cliente:** son los mismos puntos que los paquetes del Canjeador General (hoy 1.500 / 2.500 / 5.100), con la tarifa del Cliente (una sola `usdPerPoint` con límites min/max). No hay tramos propios ni tabla estándar. Si Nosotros cambia los paquetes del Canjeador, los tramos de todos los Clientes cambian solos.
- **Confidencialidad:** solo "Nosotros" ve precio por punto, márgenes y costos. Canjeador, Cliente y Proveedor ven solo "USD → puntos".
- **Compra a tu medida:** Nosotros la usa en Recargar Puntos y el Cliente en Comprar puntos, a su tarifa (monto en dólares enteros entre el mínimo y máximo de Ajustes). El Canjeador compra paquetes fijos; si le faltan puntos se le propone el paquete más pequeño que cubra el faltante.
- Saldo de bienvenida: 1.100 puntos (etiqueta de saldo ajustada).
- Edad: siempre "declaración", nunca "verificamos".

## 5. Flujo de reparto del Cliente (comisiones)
1. El Cliente descarga una **planilla .xlsx** (1 a 1.000 filas): tipo de documento (lista desplegable por fila), número de documento, correo electrónico, valor de comisión ($) y referencia.
2. Sube la planilla; la web calcula los puntos: `floor(comisión × puntos_base / USD_base)` con la base = tramo más pequeño del Cliente (ej. Andina $14,58 = 1.500 pts).
3. Revisión: lista con puntos por persona, total necesario, saldo actual y faltante. Ejemplo: 25 filas × $20 → 51.425 pts; faltan 13.425 → hay que comprar $131 (= 13.477 pts).
4. Botón para comprar el faltante exacto en dólares enteros (diálogo de compra).
5. Reglas: todo o nada, irreversible, idempotente (hash), sin enumeración de documentos al revisar; el servidor revalidará cada fila; las fórmulas del Excel nunca se evalúan; límite 1.000 filas / 5 MB.
6. "Lo repartido": el Cliente ve usados/disponibles por documento (decisión del dueño).

## 6. Catálogo del Proveedor y aprobación
- El Proveedor crea tarjetas en `/proveedor/catalogo`: nombre, categoría, descripción (≤120), valores en USD (1–6, múltiplos de 5, límites en Ajustes, con slider y botones +/−), diseño (tema o colores personalizados con paleta, logo centrado, herramienta opcional "Quitar fondo" por color plano, imagen).
- Estados: borrador → enviada → aprobada / rechazada. Solo se edita borrador y rechazada.
- Nosotros revisamos en `/admin/solicitudes`: aprobar crea la tienda en el catálogo y sus productos con el descuento del Proveedor (ya no se bloquea por reglas de precios; la pantalla muestra una vista previa de precios y márgenes solo para Nosotros). Rechazar exige un motivo escrito a mano (≤300 caracteres, que empieza vacío).
- **El Proveedor nunca ve costos, márgenes ni cálculos**: si se rechaza, solo ve el motivo escrito por Nosotros.
- En el prototipo el panel de Proveedor siempre entra como Fybeca (`p-fybeca`).

## 7. Panel de administración ("Nosotros")
Resumen (KPIs), Clientes (con los límites de puntos por dólar), Proveedores, Precios (tabla de tarjetas con los dos precios editables, puntos y márgenes; y tablas de paquetes), Usuarios, Liquidaciones, Solicitudes (con insignia de pendientes), Ajustes (recargo, factor con contraseña, porcentaje mínimo de ganancia, múltiplo de puntos, comisión y plazo de canje de tarjetas vencidas, compra a tu medida, límites de valores de tarjeta, etc.).

## 8. Código clave
- Dominio: `lib/domain/{types,pricing,format,documento,csv,grants,grant-file,xlsx-template,card-requests,points-factor}.ts`. En `pricing.ts`: precio General y de Cliente por tarjeta, puntos, margen (`cardMargin`) y los límites de puntos por dólar de un Cliente (`clientPpdLimits`).
- Estado de ejemplo: `lib/mock/{data,session,admin-settings,admin-kpis}`.
- Componentes de panel: `components/panel/*` (shells por rol, `packs-editor`, `denoms-editor`, `card-design-editor`, `purchase-dialog`, `editable-number`, KpiCard).
- Documentos de especificación: `PLAN-ROLES.md`, `PLAN-BACKEND.md` (fases B0–B12), `PLAN-FASE-D.md`, `CLAUDE.md`, y los `PLAN-HAIKU-*.md` (historial de cambios por parte).

## 9. Limitaciones y pendientes conocidos
- Sin backend: B0 (cuentas Supabase staging/prod) y B1+ (roles, RLS, `requireRole()`) pendientes. Pasarela: Payphone primero, Deuna segunda; correo transaccional por definir.
- Estado del prototipo se pierde al recargar.
- Al no haber reglas, es posible dejar márgenes negativos; los márgenes se ven en la tabla de Precios (sin alarmas).
- Megamaxi no tiene producto propio en los datos de ejemplo (comparte proveedor con Supermaxi), por lo que no tiene precio editable en Precios.
- Sin verificar: Administración → Catálogo (editor `/admin`) tras el refactor de componentes compartidos; la planilla xlsx en Excel real; un CSV con codificación antigua puede dañar tildes.
- Pregunta de negocio abierta: con tramos de precios distintos, ¿qué precio convierte el bono (%) en puntos?
- Temas legales/contables a cargo del dueño: saldos prepagados, caducidad, datos de terceros, facturación SRI.
- `package-lock.json` queda sin versionar a propósito.
