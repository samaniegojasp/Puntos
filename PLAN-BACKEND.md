# PLAN-BACKEND — Regala con usuarios, saldo y pagos reales

Objetivo: pasar de demo (todo en `localStorage`) a una tienda que pueda **vender**: cuentas reales, saldo de Puntos controlado por el servidor, recargas con pasarela de pago de Ecuador, códigos reales por inventario y panel de administración protegido.

Stack elegido: **Supabase** (Auth + Postgres + Row Level Security) + **Next.js 15 en Vercel** (Server Actions / Route Handlers). Pasarela: **por decidir** (ver D3).

---

## 0. Reparto del trabajo

| Quién | Qué | Por qué |
|---|---|---|
| **Dueño (tú)** | Fase B0, decisiones D1–D6, cuentas externas, contratos, tareas legales | Nadie más puede hacerlo |
| **Claude (asesor)** | Fases marcadas **[NÚCLEO]**: base de datos, permisos, canje, recargas, webhook, autenticación de servidor | Manejan dinero y seguridad: un error aquí regala Puntos o códigos |
| **Haiku / Antigravity** | Fases marcadas **[UI]**: conectar pantallas al núcleo, formularios, panel admin, textos | Trabajo acotado sobre contratos ya probados |

Regla de oro: **las fases [UI] no empiezan hasta que su [NÚCLEO] esté fusionado y verificado.**

---

## 1. Decisiones del dueño (antes de B1)

| # | Decisión | Recomendación |
|---|---|---|
| D1 | **Puntos de bienvenida.** Con códigos reales, 500 Pts = $3,33 en gift cards **gratis por cada cuenta**; alguien con 20 correos se lleva $66. | **0 Puntos** al registrarse, o bono solo tras la **primera recarga** (p. ej. +10 %). Configurable sin tocar código. |
| D2 | **Tasa y paquetes.** Hoy 150 Pts por $1 de valor facial; paquetes $10/$20/$35. El margen real depende del descuento que te den las tiendas. | Fijarlos con el contrato de las tiendas. Quedan en la tabla `settings`/`packs`, editables desde admin. |
| D3 | **Pasarela de pago.** Opciones en Ecuador: Payphone, Kushki, Datafast. | La que te apruebe primero con tu RUC. Requisito técnico: **checkout alojado por la pasarela** + **verificación del pago desde el servidor** (API o webhook). Nunca formulario de tarjeta propio. |
| D4 | **Origen de los códigos.** (a) Inventario: compras códigos a las tiendas y los cargas en lote; (b) API de la tienda que emite al vuelo. | Empezar con **(a) inventario** (CSV desde el admin). Si no hay stock, la tarjeta se muestra "Agotada". |
| D5 | **Caducidad y reembolso de Puntos.** | Definir en Términos antes de vender. El sistema guarda historial (ledger) para poder aplicarla después. |
| D6 | **Inicio de sesión.** | Correo + contraseña con **confirmación de correo obligatoria**. Google opcional más adelante. |

---

## 2. Arquitectura

```
Navegador ──(cookie de sesión)──► Next.js en Vercel ──► Supabase (Postgres + Auth)
   │                                   │  Server Actions: canjear, iniciar recarga
   │                                   │  Route Handler: webhook de la pasarela
   └──► Checkout alojado de la pasarela ┘  (la pasarela avisa al servidor; el servidor verifica)
```

Principios (no negociables):
1. **El navegador nunca decide el saldo.** Solo el servidor suma o resta Puntos, dentro de funciones SQL transaccionales.
2. **Historial inmutable (ledger).** Cada movimiento es una fila; el saldo es la suma. Nada se edita, solo se agregan ajustes.
3. **Idempotencia.** Un pago o canje procesado dos veces no puede acreditar ni descontar dos veces (`unique` por referencia).
4. **Row Level Security en todas las tablas.** El usuario solo lee lo suyo; nadie escribe saldo directamente.
5. **La clave `service_role`/`secret` de Supabase solo existe en el servidor** (variable sin prefijo `NEXT_PUBLIC_`).
6. **Dinero en centavos enteros** (`usd_cents`), Puntos en enteros.
7. El **carrito puede seguir en `localStorage`**: el servidor revalida todo al canjear.

### Modelo de datos (resumen)

| Tabla | Campos clave | Acceso |
|---|---|---|
| `profiles` | `id` (= auth.users), `full_name`, `role` (`user`/`admin`) | Usuario lee el suyo; solo admin cambia `role` |
| `wallets` | `user_id`, `balance` (`check >= 0`) | Lectura propia; escritura solo por funciones |
| `points_ledger` | `user_id`, `delta`, `kind` (`welcome`/`topup`/`redeem`/`refund`/`adjustment`), `ref_id`, `unique(kind, ref_id)` | Lectura propia |
| `settings` | `points_per_usd`, `welcome_points`, `first_topup_bonus_pct` | Lectura pública; escritura admin |
| `stores` | `id`, `name`, `category`, `theme`, `description`, `denoms int[]`, `featured`, `active` | Lectura pública (activas); escritura admin |
| `packs` | `id`, `points`, `usd_cents`, `badge`, `active` | Lectura pública; escritura admin |
| `gift_codes` | `store_id`, `usd`, `code`, `status` (`available`/`assigned`), `order_item_id` | **Sin lectura directa**; el usuario solo ve los códigos de sus órdenes vía función |
| `orders` / `order_items` | `user_id`, `points`, `recipient_email`, `message` / `store_id`, `usd`, `points`, `code_id` | Lectura propia |
| `topups` | `user_id`, `pack_id`, `points`, `usd_cents`, `provider`, `provider_tx_id unique`, `status` | Lectura propia |

### Funciones SQL (contratos que usa la UI)

| Función | Qué hace |
|---|---|
| `redeem(items jsonb, recipient_email text, message text) → order_id` | Bloquea la billetera, valida tiendas/valores activos, calcula Puntos con `settings`, verifica saldo, asigna códigos con `FOR UPDATE SKIP LOCKED`, crea orden, ledger y descuenta. Todo o nada. Errores: `insufficient_points`, `out_of_stock`, `invalid_item`. |
| `my_order(order_id) → orden + códigos` | Devuelve la orden solo si es del usuario. |
| `credit_topup(topup_id, provider_tx_id)` | Solo servidor (service role). Idempotente. Acredita Puntos + bono de primera recarga si aplica. |
| `handle_new_user()` (trigger) | Crea `profiles`, `wallets` y el bono de bienvenida según `settings`. |
| `is_admin()` | Para políticas RLS del panel. |

### Contratos en Next.js (los crea el NÚCLEO, la UI solo los importa)

| Archivo | Exporta |
|---|---|
| `lib/supabase/server.ts` / `client.ts` | Clientes de Supabase para servidor y navegador |
| `middleware.ts` | Refresca la sesión; protege `/cuenta`, `/checkout`, `/recargar`, `/admin` |
| `lib/auth.ts` | `getUser()`, `requireUser()`, `requireAdmin()` |
| `lib/data/catalog.ts` | `getCatalog()` (tiendas activas + stock), `getPacks()`, `getSettings()` |
| `app/actions/wallet.ts` | `getMyBalance()`, `getMyLedger()` |
| `app/actions/redeem.ts` | `redeemAction(items, recipientEmail?, message?)` → `{ ok, orderId } \| { ok:false, error }` |
| `app/actions/topup.ts` | `startTopup(packId)` → URL del checkout de la pasarela |
| `app/api/payments/webhook/route.ts` | Recibe aviso de la pasarela, verifica con su API y llama `credit_topup` |
| `app/actions/admin.ts` | CRUD de tiendas, paquetes, settings; carga CSV de códigos |

---

## FASE B0 — Preparación (dueño)

1. Crea cuenta en https://supabase.com con GitHub. Crea **dos proyectos**: `regala-staging` (pruebas) y `regala-prod`. Región: la más cercana disponible (p. ej. `us-east-1`).
2. En cada proyecto: *Authentication → Providers → Email*: activa **Confirm email**. *Authentication → URL Configuration*: `Site URL` = tu dominio de Vercel; añade `http://localhost:3000` en Redirect URLs (solo en staging).
3. Copia de *Project Settings → API*: `Project URL`, clave **publishable/anon** y clave **secret/service_role**. **Nunca** pegues la secreta en el chat, en el código ni en GitHub.
4. Crea `.env.local` en tu PC (apuntando a **staging**):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
   En Vercel: las mismas tres variables con los valores de **prod** (entorno *Production*) y de staging (entorno *Preview*).
5. Responde D1–D6 y solicita la cuenta de comercio en la pasarela elegida (sandbox primero).
6. Tareas legales en paralelo (fuera del código): RUC y facturación electrónica SRI por la venta de Puntos, Términos y Condiciones, Política de Privacidad conforme a la Ley Orgánica de Protección de Datos Personales, política de caducidad/reembolso, contrato con tiendas o proveedor de códigos. Consulta con un abogado/contador local si la venta de saldo prepagado tiene requisitos adicionales.

---

## FASE B1 — Base de datos [NÚCLEO]
Migraciones SQL en `supabase/migrations/` (tablas, RLS, funciones, trigger, semilla del catálogo actual), clientes de Supabase, `middleware.ts`, `lib/auth.ts`, `lib/data/catalog.ts`. Pruebas: canje concurrente (doble clic no descuenta dos veces), saldo insuficiente, sin stock, usuario A no ve órdenes de B, usuario normal no puede escribir saldo ni ver `gift_codes`.

✅ Entrega: instrucciones para aplicar las migraciones en staging (pegar en *SQL Editor* o `supabase db push`).

## FASE B2 — Cuentas [UI]
- `app/register`, `app/login`, `app/forgot-password`: conectar a Supabase Auth (registro con confirmación de correo, login, enlace de recuperación). Nueva página `app/reset-password` para fijar la nueva contraseña.
- Header: si hay sesión, menú con nombre, "Mi cuenta" y "Cerrar sesión"; si no, "Iniciar sesión". El indicador 💎 muestra `getMyBalance()`; sin sesión muestra "Entrar".
- Nueva `app/cuenta/page.tsx`: saldo, historial (`getMyLedger()`), órdenes con enlace a sus códigos.
- Quitar los avisos "Demostración" de estas páginas.

## FASE B3 — Catálogo y admin en la base de datos [NÚCLEO + UI]
- [NÚCLEO] `getCatalog()` y acciones admin; `requireAdmin()` en `/admin` (servidor). Se elimina la clave `NEXT_PUBLIC_ADMIN_HASH` y `lib/admin-auth.ts`.
- [UI] `/shop`, home y header leen el catálogo del servidor en lugar de `useCatalog()`; tarjetas sin stock muestran "Agotada" y botón deshabilitado. Admin: CRUD de tiendas y paquetes contra la base, edición de `settings`, y carga **CSV de códigos** (`store_id,usd,code`) con resumen de stock por tienda y valor.
- El dueño se asigna `role = 'admin'` en Supabase (*Table Editor → profiles*).

## FASE B4 — Canje real [NÚCLEO + UI]
- [NÚCLEO] `redeemAction` y `my_order`.
- [UI] `/checkout` exige sesión y llama `redeemAction`; muestra errores `insufficient_points` (botón a recargar), `out_of_stock` (quita el ítem) e `invalid_item`. `/checkout/success?order=` lee la orden con `my_order`. El carrito se vacía solo si el canje fue exitoso.
- Se eliminan del cliente `WELCOME_POINTS`, saldo y órdenes en `localStorage` (`lib/points-store.tsx` queda solo para el carrito).

## FASE B5 — Recargas con pasarela (sandbox) [NÚCLEO + UI]
- [NÚCLEO] `startTopup`, webhook con verificación de firma/consulta a la API de la pasarela, `credit_topup` idempotente, página de retorno que **consulta el estado en el servidor** (no confía en parámetros de la URL).
- [UI] `/recargar`: elegir paquete → botón "Pagar con <pasarela>" → redirige al checkout alojado. Página de retorno: "Pago confirmado" / "Pendiente" / "Rechazado". Se elimina el formulario de tarjeta propio y `lib/payment.ts`.

## FASE B6 — Textos legales y limpieza [UI]
- Páginas `/terminos` y `/privacidad` con el texto que entregue el dueño; enlaces del footer y checkbox obligatorio en registro.
- Quitar todos los avisos de demostración que ya no apliquen; actualizar README y FAQ (caducidad, reembolsos, cómo se entregan los códigos).
- Correo al destinatario del regalo: **fuera de esta fase** (requiere proveedor de correo, p. ej. Resend); el código se muestra y se copia.

## FASE B7 — Salida a producción [dueño + NÚCLEO]
1. Aplicar migraciones en `regala-prod`; cargar catálogo, paquetes, settings y stock real.
2. Pasarela en modo producción; probar una recarga real mínima y reembolsarla.
3. Revisión de seguridad final (RLS, variables, logs) y prueba de canje concurrente en prod.
4. Activar dominio propio y quitar `noindex` si se añadió.

---

## Reglas para Haiku / Antigravity en fases [UI]
1. Una fase por sesión. `git pull` antes de empezar. No avances si el [NÚCLEO] de esa fase no está en la rama.
2. **Nunca** importes `lib/supabase/admin` ni uses `SUPABASE_SERVICE_ROLE_KEY` en componentes. **Nunca** calcules ni guardes saldo en el cliente.
3. No escribas SQL ni cambies archivos de `supabase/`, `lib/supabase/`, `lib/auth.ts`, `middleware.ts`, `app/actions/` ni `app/api/`. Si necesitas algo de ellos que no existe, **detente y pregunta**.
4. Todo en español. Errores visibles en español, sin códigos técnicos.
5. Al terminar: `npx tsc --noEmit` sin errores, `npm run build` sin errores, prueba manual descrita en la fase, commit solo de los archivos de la fase (nunca `package-lock.json` ni `.env*`) y `git push`.
