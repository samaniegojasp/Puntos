# PLAN-BACKEND — Regala con usuarios, roles, puntos y pagos reales

Plan maestro. El detalle de negocio (roles, lotes de puntos, precios, tarjeta virtual, reparto por Excel, modelo de datos) está en **`PLAN-ROLES.md`**: es la especificación y este archivo fija el **orden de fases**, el reparto de trabajo y las reglas. Si se contradicen, manda `PLAN-ROLES.md` en negocio y este archivo en orden y proceso.

Objetivo: pasar de demo (todo en `localStorage`) a una plataforma que pueda **vender**: cuentas con documento de identidad, cuatro roles (Canjeador, Cliente, Proveedor, Nosotros), puntos por origen controlados por el servidor, tarjetas virtuales con saldo, compra de puntos con pasarela de Ecuador y liquidación a Proveedores por consumo.

Stack: **Supabase** (Auth + Postgres + RLS + `pg_cron`) + **Next.js 15 en Vercel** (Server Actions / Route Handlers) + pasarela por decidir (D3) + correo transaccional por decidir (D7).

---

## 0. Reparto del trabajo

| Quién | Qué | Por qué |
|---|---|---|
| **Dueño (tú)** | Fase B0, decisiones D1–D8, cuentas externas, contratos con Proveedores, tareas legales | Nadie más puede hacerlo |
| **Claude (asesor)** | Fases **[NÚCLEO]**: base de datos, permisos, lotes de puntos, precios, canje, pagos, webhook, consumo y liquidación | Manejan dinero, saldo y seguridad: un error regala puntos o tarjetas |
| **Haiku / Antigravity** | Fases **[UI]**: pantallas, formularios, tablas, textos, sobre contratos ya probados | Trabajo acotado |

Regla de oro: **una fase [UI] no empieza hasta que su [NÚCLEO] esté en la rama y verificado.** Claude revisa cada fase cuando digas "Revisa la fase N".

### Ramas y despliegue
- La demo publicada sale de `main`. Para no romperla, **todo el trabajo (Fase D y B1–B10) va en la rama de integración `claude/pet-store-gift-cards-refactor-n3h79x`**. `main` y producción solo se actualizan en la fase B11.
- Vercel crea un *Preview* por rama, con las variables de **staging**.

---

## 1. Decisiones y trámites del dueño

| # | Decisión | Recomendación |
|---|---|---|
| D1 | **Puntos de bienvenida.** Un lote regalado tiene costo real para ti. | **0** al registrarse. Si quieres incentivo: bono tras la primera compra de puntos. Configurable. |
| D2 | **Parámetros de precio** (`PLAN-ROLES.md` §5): descuento de cada Proveedor, `margin_pct`, `min_margin_pct`, paquetes por volumen, precio público del punto. | Los reúnes con los contratos. Todo se edita en `/admin`; el sistema bloquea combinaciones que rompan las reglas de §5.3. |
| D3 | **Pasarela de pago:** Payphone, Kushki o Datafast. | La que te apruebe primero con tu RUC. Debe ofrecer **checkout alojado** y **verificación del pago desde el servidor**. Nunca formulario de tarjeta propio. |
| D4 | **Contrato con cada Proveedor:** descuento, caducidad de sus tarjetas, cómo y cuándo se le liquida, qué pasa con tarjetas caducadas. | Por escrito antes de cargar su catálogo. |
| D5 | **Textos legales:** Términos (declaración de mayoría de edad, caducidad, cambio de caducadas con recargo), Privacidad (LOPDP). | Abogado local. Entra en B10. |
| D6 | **Inicio de sesión.** | Correo + contraseña con confirmación de correo obligatoria. |
| D7 | **Correo transaccional** (aviso al Proveedor al canjear, aviso al Canjeador por cada consumo y reparto recibido). | Resend (u otro) con **dominio propio verificado**. Sin dominio propio los correos caen en spam. |
| D8 | **Hosting.** Vercel *Hobby* es solo para uso **no comercial**. | Pasar a Vercel *Pro* antes de cobrar. Dominio propio. |

---

## 2. Arquitectura y principios

```
Navegador ──(cookie de sesión)──► Next.js en Vercel ──► Supabase (Postgres + Auth + pg_cron)
   │                                   │  Server Actions: canjear, comprar puntos, repartir, consumir
   │                                   │  Route Handlers: webhook de pasarela, API de Proveedor
   └──► Checkout alojado de la pasarela ┘  (la pasarela avisa al servidor; el servidor verifica)
```

No negociables:
1. **El navegador nunca decide saldo, precio, rol ni descuento.** Solo funciones SQL transaccionales en el servidor.
2. **Historial inmutable.** `points_ledger` y `gift_card_movements` solo se agregan; lotes y saldos se derivan y se verifican contra ellos.
3. **Idempotencia** en pagos, canjes, consumos y envíos de reparto (`unique` por referencia o clave).
4. **RLS en todas las tablas**; el acceso por rol se decide en el servidor (`requireRole()`), no ocultando pestañas.
5. `service_role`/`secret` de Supabase solo en el servidor, sin prefijo `NEXT_PUBLIC_`.
6b. **El precio por punto (`usd_per_point`), los costos del proveedor y los márgenes son datos solo de Nosotros.** Ninguna consulta o función que sirva a Canjeador, Cliente o Proveedor los devuelve: se exponen vistas/RPC sin esas columnas y las tablas base solo las lee `admin` (RLS). Los paquetes se muestran como "USD → puntos". Se prueba en B1/B3 con un usuario no admin.
6. **Dinero en centavos enteros**, puntos enteros, precios por punto en `numeric(10,6)`.
7. **Operaciones sobre una misma fila** (consumo vs. cambio de tarjeta, canje vs. canje) con bloqueo `FOR UPDATE`.
8. Todo cambio sensible a `audit_log`.
9. El carrito puede seguir en `localStorage`; el servidor revalida todo al canjear.

### Contratos en Next.js (los crea el NÚCLEO; la UI solo los importa)

| Archivo | Exporta |
|---|---|
| `lib/supabase/server.ts`, `client.ts`, `admin.ts` | Clientes (el `admin` solo para código de servidor) |
| `middleware.ts` | Refresca sesión; protege `/cuenta`, `/checkout`, `/recargar`, `/cliente`, `/proveedor`, `/admin` |
| `lib/auth.ts` | `getUser()`, `requireUser()`, `requireRole(...roles)` |
| `lib/data/catalog.ts` | `getCatalog()`, `getPacksFor(user)`, `getSettings()` |
| `app/actions/wallet.ts` | `getMyBalance()`, `getMyLots()`, `getMyLedger()`, `getMyCards()` |
| `app/actions/redeem.ts` | `redeemAction(items, ...)` → `{ ok, orderId } \| { ok:false, error }` |
| `app/actions/exchange.ts` | `previewExchange(cardId)`, `exchangeExpiredCard(cardId)` |
| `app/actions/topup.ts` | `startTopup(packId)` → URL del checkout alojado |
| `app/actions/client.ts` | `saveBonus(pct)`, `calcBonus(amount)`, `uploadGrantBatch(file)`, `submitGrantBatch(batchId, key)`, reportes |
| `app/api/cliente/plantilla/route.ts` | Descarga de `plantilla-reparto.xlsx` |
| `app/actions/provider.ts` | KPIs, `lookupCard`, `consumeCard`, condiciones, exportes |
| `app/api/provider/cards/lookup`, `.../consume` | API reutilizable por la futura app con QR |
| `app/actions/admin.ts` | Catálogo, productos, Proveedores y condiciones, Clientes y precios, usuarios y roles, ajustes |
| `app/api/payments/webhook/route.ts` | Aviso de la pasarela, verificación y `credit_topup` |

Funciones SQL y tablas: `PLAN-ROLES.md` §3, §3b, §4, §7.

---

## FASE B0 — Preparación (dueño)

1. Cuenta en https://supabase.com con GitHub. **Dos proyectos:** `regala-staging` y `regala-prod`, región cercana (p. ej. `us-east-1`).
2. En cada proyecto: *Authentication → Providers → Email*: activa **Confirm email**. *URL Configuration*: `Site URL` = tu dominio de Vercel; en staging añade `http://localhost:3000` a Redirect URLs.
3. De *Project Settings → API* copia `Project URL`, la clave **publishable/anon** y la **secret/service_role**. **Nunca** pegues la secreta en el chat, en el código ni en GitHub.
4. `.env.local` en tu PC (apuntando a **staging**):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
   En Vercel: las tres variables con valores de **prod** (entorno *Production*) y de **staging** (entorno *Preview*).
5. La rama de integración ya existe (`claude/pet-store-gift-cards-refactor-n3h79x`); no hace falta crear otra.
6. Responde D1–D8. Solicita la cuenta de comercio en la pasarela (sandbox primero) y la cuenta de correo transaccional.
7. En paralelo y fuera del código: RUC y facturación electrónica SRI (venta de puntos y recargo por cambio de caducadas), contratos con Proveedores (D4), abogado y contador (saldos prepagados, caducidad a consumidores, datos de terceros que sube el Cliente).

---

## FASE B1 — Roles, perfil y seguridad [NÚCLEO]
Migraciones en `supabase/migrations/`: `profiles` (rol, documento, fecha de nacimiento, términos), `audit_log`, trigger de registro (siempre Canjeador), trigger que impide cambiar el propio rol, RLS base, `requireRole()`, middleware, validación de cédula/RUC/pasaporte en SQL.
Pruebas: un Canjeador no entra a `/cliente`, `/proveedor` ni `/admin`; un Cliente no entra a `/proveedor`; Nosotros entra a todo; nadie se sube el rol; documento duplicado rechazado; menor de 18 rechazado.
✅ Entrega: instrucciones para aplicar las migraciones en staging. Asignarte `role = 'admin'` en *Table Editor → profiles*.

## FASE B2 — Cuentas y navegación por rol [UI]
- `register` con tipo y número de documento, fecha de nacimiento, casilla de Términos y Privacidad (versión y fecha las guarda el servidor; el texto de "Declaro ser mayor de 18 años" es el que entregue el dueño). `login`, `forgot-password`, nueva `reset-password`.
- Header: con sesión, menú con nombre, "Mi cuenta", el panel del rol (`/cliente`, `/proveedor`, `/admin`) y "Cerrar sesión"; saldo desde `getMyBalance()`.
- Páginas `/cliente`, `/proveedor` y `/admin` vacías y protegidas; `/cuenta` con perfil.
- Quitar avisos "Demostración" de estas pantallas.

## FASE B3 — Lotes de puntos y precios [NÚCLEO]
`point_lots`, `redemption_allocations`, `packs` y `client_packs`, `settings`, `price_points`, `validate_pricing`, `buy_points` (acreditación a lote), saldo derivado y verificado contra el libro. Reglas de §5.3.
Pruebas contra los ejemplos: tarjeta con costo 25 y margen 15 % → 28,75 → 3 400 puntos; rechazo de un paquete de $10 que no alcance una tarjeta de $10; rechazo de un precio de Canjeador menor o igual al de un Cliente; consumo de lotes del más antiguo al más nuevo; dos canjes simultáneos no gastan el mismo lote.

## FASE B4 — Admin: catálogo, Proveedores, Clientes y precios [NÚCLEO + UI]
- [NÚCLEO] Acciones de admin con `requireRole('admin')`; `products`, `providers`, `provider_terms`, `clients`. Se elimina `NEXT_PUBLIC_ADMIN_HASH` y `lib/admin-auth.ts`.
- [UI] `/shop`, home y header leen el catálogo del servidor. Admin: tiendas y productos; **Proveedores** (descuento editable con margen resultante antes de guardar, caducidad); **Clientes** (precio del punto, tabla propia de paquetes con vista de margen por tramo); usuarios y roles; ajustes (`min_margin_pct`, recargo, plazo de cambio, días de puntos pendientes).

## FASE B5 — Canje con tarjeta virtual [NÚCLEO + UI]
- [NÚCLEO] `redeem` con lotes y `gift_cards` (costo congelado, QR/token, caducidad del Proveedor), reserva y notificación al Proveedor, correo transaccional, `my_order`, `exchange_expired_card`.
- [UI] `/checkout` exige sesión; errores en español (`insufficient_points`, `invalid_item`); `/cuenta`: **Mis puntos por origen** y **Mis tarjetas** (saldo, QR, movimientos) con "Cambiar por puntos" en las caducadas, mostrando puntos y recargo antes de confirmar. Se eliminan del cliente saldo y órdenes en `localStorage`.
Pruebas: doble clic no duplica; el canje no deja saldo negativo; una tarjeta caducada se cambia una sola vez; el cambio y un consumo simultáneos no coexisten.

## FASE B6 — Compra de puntos con pasarela (sandbox) [NÚCLEO + UI]
- [NÚCLEO] `startTopup`, webhook verificado, `credit_topup` idempotente que crea un lote con el precio del paquete del comprador (público para Canjeador, estándar o propio para Cliente), retorno que consulta el estado en el servidor.
- [UI] `/recargar` (Canjeador) y compra desde `/cliente`: paquete → "Pagar con <pasarela>" → checkout alojado → "Pago confirmado / Pendiente / Rechazado". Se elimina el formulario de tarjeta propio y `lib/payment.ts`.

## FASE B7 — Panel del Cliente y reparto por Excel [NÚCLEO + UI]
- [NÚCLEO] `grant_batches`, `grant_batch_rows`, `pending_grants`, `validate_grant_batch`, `submit_grant_batch` (una transacción, todo o nada, idempotente), plantilla con `exceljs`, calculadora de bono, correo de aviso a cada Canjeador, devolución automática de pendientes con `pg_cron`.
- [UI] `/cliente`: bolsa, comprar, **Mi bono**, **Repartir**: descargar plantilla → subir → revisión con errores por fila → confirmación + declaración → **Enviar**; resumen descargable; lista de lo repartido.
Pruebas: archivo con un error no se envía; saldo insuficiente bloquea; el mismo archivo pide confirmación; doble clic no duplica; la revisión no revela si un documento está registrado; un documento pendiente se acredita al registrarse.

## FASE B8 — Panel del Proveedor [NÚCLEO + UI]
- [NÚCLEO] `app/api/provider/cards/lookup` y `consume` con `idempotency_key`, KPIs, exportes CSV protegidos contra inyección de fórmulas, RLS por `provider_id`, correo al Canjeador por cada consumo.
- [NÚCLEO] Tabla `card_requests` (`id`, `provider_id`, `name`, `category`, `description`, `theme`, `colors`, `logo_path`, `image_path`, `denoms int[]`, `status`, `reject_reason`, `reviewed_by`, `reviewed_at`, `approved_store_id`); políticas RLS (el Proveedor ve y edita solo las suyas en `draft`/`rejected`; Nosotros vemos todas); función `approve_card_request(request_id, denoms)` que crea tienda y productos en una transacción y **vuelve a validar los precios en el servidor**.
- [UI] `/proveedor`: KPIs, **Caja** (buscar por código o QR → saldo exacto → consumir parcial o total), **Catálogo** (crear tarjetas, borradores y envío a revisión), condiciones acordadas en solo lectura, tarjetas por vencer, exportes. Admin: `/admin/solicitudes` para revisar, aprobar (publicando en catálogo y productos) o rechazar con motivo.
Pruebas: un Proveedor no ve datos de otro; ve solo últimos 4 del documento; un consumo repetido con la misma clave no descuenta dos veces; no puede consumir más que el saldo ni una tarjeta caducada o cambiada; la aprobación bloquea si rompe reglas de precios.

## FASE B9 — Liquidación y caducidad [NÚCLEO + UI]
- [NÚCLEO] `settle_period`, `provider_settlements`, `pg_cron` para marcar `expired`.
- [UI] Admin: liquidación por Proveedor y periodo, estado y referencia de factura; Proveedor: su liquidación pendiente y pagada.
Pruebas: lo liquidado = Σ consumos × (costo congelado ÷ valor facial); cambiar el descuento no altera tarjetas ya emitidas.

## FASE B10 — Textos legales y limpieza [UI]
`/terminos` y `/privacidad` con el texto del dueño; enlaces en footer y registro; quitar avisos de demostración; actualizar README y FAQ (caducidad, cambio de caducadas, cómo se usan las tarjetas).

## FASE B11 — Salida a producción [dueño + NÚCLEO]
1. Fusionar `backend` en `main`; aplicar migraciones en `regala-prod`; cargar catálogo, Proveedores, Clientes, paquetes y precios reales.
2. Vercel Pro y dominio propio; pasarela en producción; probar una compra real mínima y reembolsarla.
3. Revisión de seguridad final (RLS, variables, logs) y prueba de canje y consumo concurrentes en producción.

## FASE B12 — Después del lanzamiento
App del Proveedor con escaneo de QR sobre la API de B8; QR dinámico que autorice cada consumo.

---

## Reglas para Haiku / Antigravity en fases [UI]
1. Una fase por sesión. `git pull` antes de empezar. No avances si el [NÚCLEO] de esa fase no está en la rama.
2. **Nunca** importes `lib/supabase/admin` ni uses `SUPABASE_SERVICE_ROLE_KEY` en componentes. **Nunca** calcules ni guardes saldo, precio, descuento ni rol en el cliente: todo número sale de las funciones del servidor.
3. No escribas SQL ni cambies archivos de `supabase/`, `lib/supabase/`, `lib/auth.ts`, `middleware.ts`, `app/actions/` ni `app/api/`. Si necesitas algo de ellos que no existe, **detente y pregunta**.
4. Todo en español. Errores visibles en español, sin códigos técnicos.
5. Los textos sobre mayoría de edad hablan de **declaración**, nunca de verificación.
6. Al terminar: `npx tsc --noEmit` sin errores, `npm run build` sin errores, la prueba manual descrita en la fase, commit solo de los archivos de la fase (nunca `package-lock.json` ni `.env*`) y `git push` a la rama de la fase.
