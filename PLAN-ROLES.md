# PLAN-ROLES — Roles, puntos por origen, precios por volumen y perfil de identidad

Complementa a `PLAN-BACKEND.md`. Cuando se cierren las preguntas de la sección 9, se fusiona con él y se renumeran las fases.
Etiquetas: **[NÚCLEO]** lo hace Claude (permisos, saldo, precios, SQL). **[UI]** lo hace Haiku/Antigravity sobre contratos ya probados.

**Decisiones ya tomadas por el dueño**
- Un Canjeador puede recibir puntos de **varios Clientes**; los puntos se acumulan y se ve el detalle de dónde viene cada uno.
- El Canjeador y el Cliente pueden comprar puntos con dinero real. **El punto le cuesta más al Canjeador que a cualquier Cliente.**
- Con un paquete de $10 de puntos alcanza para una tarjeta de $10. Más puntos comprados, más barato el punto.
- Valores de tarjetas en puntos: múltiplos de 100.
- Al comprar la tarjeta: se **reserva el saldo**, se **notifica** al Proveedor y se **le paga cuando se consume**.
- Cada Proveedor define la caducidad de sus tarjetas.
- El **descuento del Proveedor es editable** en el panel de Nosotros y se **muestra** en el panel del Proveedor como condición acordada.
- En el Excel, `Costo 25` es **lo que se le paga al Proveedor**. El **bono varía de Cliente a Cliente**.
- Los lotes de puntos se gastan **del más antiguo al más nuevo**.
- Una tarjeta **caducada** puede **cambiarse otra vez por puntos** cobrando un **pequeño recargo**.
- Los Términos hablan de una **declaración** de mayoría de edad, no de una verificación.
- A futuro: app para el Proveedor que escanea un QR de la tarjeta virtual para registrar saldo y uso.

---

## 1. Roles y acceso

Un usuario tiene **un** rol (`profiles.role`). Todos pueden canjear.

| Área | Canjeador | Cliente | Proveedor | Nosotros |
|---|---|---|---|---|
| Tienda, canje, mi cuenta, mis tarjetas (`/shop`, `/cuenta`) | ✔ | ✔ | ✔ | ✔ |
| Panel de Cliente (`/cliente`) | ✘ | ✔ | ✘ | ✔ |
| Panel de Proveedor (`/proveedor`) | ✘ | ✘ | ✔ solo su negocio | ✔ todos |
| Administración (`/admin`) | ✘ | ✘ | ✘ | ✔ |

Reglas no negociables:
1. El acceso lo decide el **servidor** (`requireRole()` + RLS). Ocultar pestañas es cosmética.
2. El registro público crea siempre **Canjeador**. Cliente y Proveedor los crea o promueve Nosotros. Nadie cambia su propio rol (trigger en la base).
3. Un Proveedor solo ve filas con su `provider_id`. Un Cliente solo ve lo que él repartió.
4. Todo cambio sensible (rol, precio del punto, margen, saldo, liquidación) queda en `audit_log`.

---

## 2. Pestañas

### Canjeador (`/shop`, `/cuenta`)
- Compra puntos con dinero real (`/recargar`, al precio público) y canjea tarjetas.
- **Mis puntos por origen:** total acumulado y desglose por lote ("1 200 de Concesionaria X, 3 400 comprados por mí, 500 de Tienda Y"), con fecha y vencimiento si aplica.
- **Mis tarjetas:** tienda, valor, **saldo restante**, estado, caducidad, QR, historial de movimientos.
- **Cambiar tarjeta caducada por puntos:** en una tarjeta caducada con saldo, botón "Cambiar por puntos". Antes de confirmar muestra cuántos puntos recibe y cuánto es el recargo.
- Perfil con documento de identidad (sección 6).

### Cliente (`/cliente`)
- **Comprar puntos** con la pasarela, con precios por volumen. Saldo de su "bolsa".
- **Repartir puntos** a canjeadores por documento: uno a uno o CSV (`documento,puntos`). Si la persona aún no se registró, el reparto queda **pendiente** y se acredita al registrarse con ese documento.
- **Calculadora de bono:** monto de la venta × el % de bono de ese Cliente (lo fija Nosotros según el acuerdo) → USD de bono → puntos a repartir (`USD ÷ precio del punto de ese Cliente`) y costo para el Cliente. Ejemplo del Excel: $20 000 × 0,85 % = $170 = 20 000 puntos a $0,0085.
- Lista de lo repartido: a quién, cuánto, cuánto usó, cuánto le queda.
- Reportes y exportación CSV.
- Puede canjear para sí mismo.

### Proveedor (`/proveedor`)
- **KPIs de su negocio:** tarjetas emitidas y por denominación, valor facial, tarjetas vivas y saldo pendiente en ellas, consumos por periodo, **liquidación** pendiente y pagada, tarjetas por vencer.
- **Caja:** buscar por código o QR → **saldo exacto** → registrar consumo (parcial o total).
- **Condiciones acordadas** (solo lectura): descuento sobre valor facial, monto que se le paga por cada tarjeta, caducidad de sus tarjetas, forma de liquidación. Solo Nosotros las cambia; cada cambio queda con fecha y solo aplica a tarjetas emitidas después.
- Exportación CSV de toda su información.
- **Privacidad:** ve código, valor, saldo, fechas y un identificador reducido del canjeador (nombre abreviado + últimos 4 dígitos del documento). Nunca documento completo ni correo.

### Nosotros (`/admin`)
- Catálogo, productos (costo, margen) y paquetes de puntos.
- **Clientes:** alta, precio negociado del punto, % de bono, vista de margen.
- **Usuarios y roles:** asignar rol, bloquear.
- **Proveedores:** alta, **descuento sobre valor facial (editable)**, caducidad, liquidaciones. Cambiar el descuento recalcula el costo de sus productos y muestra el margen resultante antes de guardar.
- **Ajustes de canje de caducadas:** recargo (%) y plazo máximo para cambiar.
- Pedidos y soporte, auditoría, "ver como".

---

## 3. Puntos por origen (lotes)

Los puntos son acumulables, pero cada punto nació a un precio distinto (lo que pagó su Cliente o el propio Canjeador). Un saldo único perdería esa información y haría **perder dinero** si se gastan puntos baratos en tarjetas pensadas para puntos caros. Por eso el saldo es la suma de **lotes**:

`point_lots`: `owner_id`, `origin_type` (`purchase_self` / `grant_client` / `adjustment`), `origin_client_id`, `points_initial`, `points_remaining`, `usd_per_point`, `created_at`, `expires_at`.

- **Saldo** = suma de `points_remaining` de los lotes del usuario.
- **Repartir** (Cliente → Canjeador): se parte un lote de la bolsa del Cliente y el lote nuevo conserva su `usd_per_point`.
- **Canjear:** la función consume lotes **del más antiguo al más nuevo** y guarda `redemption_allocations` (orden, lote, puntos, USD). De ahí sale el ingreso real de cada canje y el detalle que ve el Canjeador.
- El libro `points_ledger` sigue siendo inmutable; los lotes se derivan de él y se verifican contra él.
- Devolver puntos no gastados al Cliente (pregunta R5): operación inversa explícita y con asiento.
- **Cambio de tarjeta caducada** (sección 4): crea un lote nuevo que conserva el precio por punto de los lotes con que se compró la tarjeta, para no regalar ni quitar valor.

---

## 4. Tarjeta virtual, reserva y liquidación al consumo

La tarjeta virtual la **emite nuestro sistema**; el Proveedor la honra en su negocio. [suposición: confirmar en R4]

1. **Canje:** se descuentan puntos (lotes), se crea `gift_cards` con `balance_cents = face_cents`, se **reserva** ese saldo ante el Proveedor y se le **notifica** (correo y panel). El Canjeador recibe código y QR.
2. **Consumo:** el Proveedor, en `/proveedor` (más adelante en su app), busca la tarjeta y registra un consumo. Es un movimiento en `gift_card_movements` con `idempotency_key` (reintentos sin doble descuento). El saldo es `face − Σ consumos`.
3. **Liquidación:** cada consumo genera una cuenta por pagar al Proveedor = `monto consumido × (costo / valor facial)`. `settle_period()` las agrupa por periodo en `provider_settlements`.
4. **Caducidad:** definida por Proveedor (`providers.card_valid_days`). Al vencer, la tarjeta pasa a `expired` y el Proveedor ya no puede consumirla. Como solo se le paga lo consumido, **no se le debe nada por el saldo vencido**.
4b. **Cambio de tarjeta caducada por puntos** (`exchange_expired_card`), dentro del plazo `exchange_window_days`:
   - `puntos = ⌊ (balance_cents / face_cents) × puntos_pagados × (1 − recargo_pct) ⌋`
   - `puntos_pagados` = suma de `redemption_allocations` de esa tarjeta. El lote nuevo usa el precio por punto promedio ponderado de esas asignaciones.
   - El recargo (`exchange_fee_pct`) queda como ingreso de Nosotros y se factura.
   - **Una sola vez por tarjeta:** pasa a `exchanged`, estado final. La operación bloquea la fila de la tarjeta, así no puede coincidir con un consumo del Proveedor.
   - El Proveedor ve el cambio en el historial de la tarjeta y el saldo reservado se libera.
   - Solo tarjetas caducadas: antes de caducar, la tarjeta se usa. [propuesta]
5. **Aviso al Canjeador:** cada consumo le llega por correo, para que detecte uno falso. [probable] Es la defensa principal contra un Proveedor que se cobre consumos que no ocurrieron.

Preparado para la app: el QR codifica `https://<dominio>/c/<public_token>` (token aleatorio de 128 bits, distinto del código). Las acciones del Proveedor son `POST /api/provider/cards/lookup` y `POST /api/provider/cards/consume`, con autenticación por sesión hoy y por token de dispositivo cuando exista la app. A futuro, el QR del Canjeador puede ser dinámico (válido ~60 s) para que **él autorice** cada consumo.

Esto cambia `PLAN-BACKEND.md`: ya no hay inventario de códigos comprados ni "Agotada" por stock. El CSV de códigos solo hará falta si un Proveedor emite sus propios códigos.

---

## 5. Precios

### 5.1 Precio de la tarjeta en puntos (múltiplos de 100)
Parámetros por producto: `face_usd` (valor facial), `cost_usd` (lo que pagamos al Proveedor), `shipping_usd` (0 en tarjetas virtuales), `margin_pct`.

**Descuento editable.** `cost_usd = face_usd × (1 − discount_pct)`, con `discount_pct` del Proveedor. En el panel de Nosotros se edita el descuento o, si un producto tiene trato propio, el costo directo del producto (el otro valor se recalcula). Al emitir una tarjeta se **congela su costo** (`gift_cards.cost_cents`), así cambiar el descuento después no altera lo que se le debe por tarjetas ya vendidas.

```
price_usd = cost_usd + shipping_usd + cost_usd × margin_pct
points    = CEIL( ROUND(price_usd / pv_ref) / 100 ) × 100
```
`pv_ref` es el precio de referencia del punto: el del **primer paquete** (el de $10). Es global: **la misma tarjeta cuesta los mismos puntos para todos**, porque los puntos son acumulables y de distintos orígenes.

### 5.2 Paquetes por volumen
Tabla `packs` global (USD → puntos, puntos en múltiplos de 100). Cada paquete grande da más puntos por dólar. Ejemplo **ilustrativo** (los números reales dependen del descuento de cada Proveedor), para una tarjeta de $10 que cuesta $8,50 y vale 1 200 puntos:

| Paquete | Puntos | USD por punto | Ingreso por esa tarjeta | Margen sobre costo |
|---|---|---|---|---|
| $10 | 1 200 | 0,00833 | $10,00 | 17,6 % |
| $50 | 6 500 | 0,00769 | $9,23 | 8,6 % |
| $100 | 14 000 | 0,00714 | $8,57 | 0,8 % |

Cada tramo de descuento al comprador se come margen. Por eso el panel muestra el margen por producto y por precio, y **bloquea** un precio que baje del `min_margin_pct` global salvo confirmación explícita con nota.

### 5.3 Reglas que el sistema valida al guardar
1. **Piso de $10:** para cada paquete y cada tarjeta con `face_usd ≤ USD del paquete`, los puntos del paquete deben alcanzar la tarjeta. Si no, no se guarda.
2. **Canjeador > Cliente:** el precio por punto del Canjeador (`pv_public`) debe ser **mayor** que el de cualquier Cliente, tramo por tramo. Consecuencia: con $10 el Canjeador compra menos puntos que 1 200 y **no alcanza** una tarjeta de $10. La regla de los $10 aplica al Cliente.
3. **Margen mínimo:** `puntos × usd_per_point ≥ cost_usd × (1 + min_margin_pct)` para el precio negociado de cada Cliente.
4. `price_usd ≤ face_usd` en las tarjetas que deban cumplir el piso de $10.
5. Múltiplos de 100 en tarjetas y paquetes.

### 5.4 Negociar por Cliente (R3)
Cada Cliente usa la tabla estándar o una **tabla propia** (`client_packs`): sus tramos y precio por punto. El panel de Nosotros muestra, para cada tramo, el margen de cada producto, y lo bloquea si rompe las reglas 1–3. Cambiar el precio de un Cliente afecta solo **lotes futuros**: los lotes ya vendidos conservan su `usd_per_point`.

### 5.5 Sobre el Excel de ejemplo
- `20 000` = una venta de $20 000 en el negocio del Cliente; `0,0085` = el % de bono de ese Cliente (0,85 %); `170` = el bono en dólares que recibe el Canjeador. En el Excel la misma celda sirve de % de bono y de precio del punto: eso solo coincide si el Cliente da "1 punto por cada $1 vendido". En el sistema son **dos campos** por Cliente: `bonus_pct` y `usd_per_point` (pregunta R1).
- `Costo 25` es lo que se le paga al Proveedor. `25 + 15 % = 28,75 → 3 400 puntos` se conserva como el cálculo de 5.1, con múltiplos de 100.
- Para cumplir el piso de $10 la tarjeta debe tener valor facial ≥ $28,75 (25 ÷ 0,8696). Equivale a un descuento del Proveedor ≥ 13,04 %. Ejemplo: tarjeta de $30 con descuento 16,7 % cuesta $25 y se vende en 28,75 → 3 400 puntos.
- La calculadora de bono de `/cliente` usa esos dos campos (sección 2).

---

## 6. Perfil: documento de identidad y mayoría de edad

- Tipos: **Cédula** (10 dígitos, módulo 10, provincia 01–24 o 30), **RUC** (13 dígitos), **Pasaporte** (alfanumérico 5–20).
- `doc_type + doc_number` único, normalizado. Validación en cliente **y** servidor. El documento también sirve para acreditar repartos pendientes de un Cliente.
- **Fecha de nacimiento** obligatoria; el servidor rechaza menores de 18. Casilla de Términos y Privacidad con versión y fecha guardadas.
- Texto de los Términos: *"Declaro ser mayor de 18 años"*. Sin KYC no se puede comprobar; el texto dice declaración, no verificación.
- El documento es dato personal (LOPDP): lo ven el dueño y Nosotros; el Proveedor ve solo los últimos 4 dígitos. El Cliente no puede saber si un documento ya está registrado (sin enumeración).

---

## 7. Modelo de datos (sobre `PLAN-BACKEND.md`)

| Tabla | Cambio |
|---|---|
| `profiles` | + `role` (`canjeador`/`cliente`/`proveedor`/`admin`), `doc_type`, `doc_number`, `birth_date`, `terms_accepted_at`, `terms_version`, `client_id` (solo rol Cliente), `provider_id` (solo rol Proveedor) |
| `clients` | `id`, `name`, `pack_mode` (`standard`/`custom`), `bonus_pct`, `active` |
| `client_packs` | `client_id`, `usd_cents`, `points`, `usd_per_point` |
| `providers` | `id`, `name`, `discount_pct`, `card_valid_days`, contacto y facturación, `active` |
| `provider_terms` | `provider_id`, `discount_pct`, `card_valid_days`, `effective_from`, `set_by`; historial de condiciones (el Proveedor ve la vigente) |
| `products` (reemplaza `stores.denoms`) | `store_id`, `provider_id`, `face_cents`, `cost_cents_override` (opcional), `shipping_cents`, `margin_pct`, `active` |
| `packs` | + `usd_per_point` derivado; paquetes estándar |
| `settings` | + `pv_ref`, `pv_public_tiers`, `min_margin_pct`, `points_multiple=100`, `exchange_fee_pct`, `exchange_window_days` |
| `point_lots` / `redemption_allocations` | sección 3 |
| `pending_grants` | `client_id`, `doc_type`, `doc_number`, `points`, `usd_per_point`; se acredita al registrarse |
| `gift_cards` | `product_id`, `provider_id`, `owner_id`, `face_cents`, `cost_cents` (congelado), `balance_cents`, `public_token`, `status` (`active`/`consumed`/`expired`/`exchanged`), `expires_at`, `order_id` |
| `gift_card_movements` | `card_id`, `type` (`issue`/`consume`/`adjust`/`expire`), `amount_cents`, `by_user`, `idempotency_key` (única) |
| `provider_settlements` | `provider_id`, periodo, nº de consumos, monto USD, estado, referencia de factura |
| `audit_log` | quién, qué, antes, después, cuándo |

Funciones SQL nuevas: `price_points(product_id)`, `buy_points(pack, buyer)`, `grant_points(client_id, doc, points)`, `redeem` (reescrita con lotes y tarjeta), `consume_card(card, amount_cents, key)` (solo Proveedor dueño), `exchange_expired_card(card)` (solo el dueño de la tarjeta), `settle_period(provider_id, from, to)`, `validate_pricing()` (reglas de 5.3).

---

## 8. Reparto de trabajo

| Fase | Quién | Contenido |
|---|---|---|
| R1 | Claude [NÚCLEO] | Roles, perfil con documento, `requireRole()`, RLS, pruebas de acceso cruzado |
| R2 | Claude [NÚCLEO] | Lotes de puntos, `price_points`, paquetes por volumen, `validate_pricing`, pruebas contra los ejemplos |
| R3 | Haiku [UI] | Registro con documento, fecha de nacimiento y Términos; menú por rol; páginas protegidas vacías |
| R4 | Claude + Haiku | Admin: Clientes y precios con vista de margen, Usuarios y roles, Proveedores |
| R5 | Claude + Haiku | Canje con tarjeta virtual y reserva; "Mis puntos por origen"; "Mis tarjetas" |
| R6 | Claude + Haiku | `/cliente`: comprar, repartir, pendientes, reportes |
| R7 | Claude + Haiku | `/proveedor`: KPIs, caja con saldo exacto, notificaciones |
| R8 | Claude + Haiku | Liquidación por consumo |
| R9 | Haiku [UI] | Términos y Privacidad, limpieza de avisos de demo |
| R10 | Después | App del Proveedor con escaneo de QR |

Se entrelazan con B1–B5 de `PLAN-BACKEND.md`; el orden final se fija al fusionarlos.

---

## 9. Preguntas abiertas

| # | Pregunta | Recomendación |
|---|---|---|
| R1 | El bono del Cliente, ¿lo fija Nosotros por contrato (`bonus_pct`) o lo decide el Cliente en cada venta? ¿Y el Cliente da siempre "1 punto por cada $1 vendido", o el número de puntos depende de `bonus_pct` y del precio de su punto? | Lo fija Nosotros por Cliente; la calculadora usa `bonus_pct` y `usd_per_point` como campos separados. |
| R2 | Recargo por cambiar una tarjeta caducada: ¿qué porcentaje y hasta cuántos días después de caducar? | Configurables. Punto de partida: 10 % y 30 días. [suposición] |
| R3 | ¿Se puede cambiar una tarjeta **antes** de caducar (con recargo)? | No: antes de caducar se usa. Evita ir y venir entre puntos y tarjetas. |
| R4 | ¿Pueden volver al Cliente los puntos que repartió y no se gastaron? | Sí, con acción explícita de Cliente o Nosotros y asiento en el libro. |
| R5 | Riesgos legales: dinero cobrado por puntos que aún no se consumen, caducidad de saldos a consumidores y facturación del recargo. | Consultar a abogado y contador antes de lanzar. |

Cerradas: descuento del Proveedor editable y visible para él, `Costo 25` es lo que se le paga, lotes del más antiguo al más nuevo, tarjeta emitida por Nosotros, caducada se cambia por puntos con recargo.
