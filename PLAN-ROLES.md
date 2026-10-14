# PLAN-ROLES — Roles, puntos por origen, precios por volumen y perfil de identidad

Especificación de negocio y datos. El **orden de fases y el reparto de trabajo** están en `PLAN-BACKEND.md` (B0–B12); si hay contradicción, aquí manda el negocio y allá el proceso.
Etiquetas: **[NÚCLEO]** lo hace Claude (permisos, saldo, precios, SQL). **[UI]** lo hace Haiku/Antigravity sobre contratos ya probados.

**Decisiones ya tomadas por el dueño**
- Un Canjeador puede recibir puntos de **varios Clientes**; los puntos se acumulan y se ve el detalle de dónde viene cada uno.
- El Canjeador y el Cliente pueden comprar puntos con dinero real. **El punto le cuesta más al Canjeador que a cualquier Cliente.**
- Con un paquete de $10 de puntos alcanza para una tarjeta de $10. Más puntos comprados, más barato el punto.
- Valores de tarjetas en puntos: múltiplos de 100.
- Al comprar la tarjeta: se **reserva el saldo**, se **notifica** al Proveedor y se **le paga cuando se consume**.
- Cada Proveedor define la caducidad de sus tarjetas.
- El **descuento del Proveedor es editable** en el panel de Nosotros y se **muestra** en el panel del Proveedor como condición acordada.
- En el Excel, `Costo 25` es **lo que se le paga al Proveedor**. El **bono** (celda C3 del Excel) **es del Cliente y lo cambia cuando quiera**; es independiente del precio al que compra cada punto.
- Los lotes de puntos se gastan **del más antiguo al más nuevo**.
- Una tarjeta **caducada** puede **cambiarse otra vez por puntos** cobrando un **pequeño recargo** (por defecto 10 % y 30 días de plazo, configurables). **Antes de caducar no se puede cambiar.**
- El Cliente reparte puntos **en lote con un Excel**: descarga la plantilla, la llena, la sube, revisa y pulsa **Enviar**. Al enviar **no hay vuelta atrás**.
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
- **Repartir puntos en lote con Excel** (sección 3b), con descarga de plantilla, revisión previa y botón **Enviar** irreversible.
- **Mi bono:** el Cliente guarda su % de bono (`bonus_pct`) y lo cambia cuando quiera. No cambia el precio de sus puntos ni el de las tarjetas.
- **Calculadora de bono:** monto de la venta × `bonus_pct` → USD de bono → puntos a repartir (`USD ÷ precio del punto de ese Cliente`). Ejemplo del Excel: $20 000 × 0,85 % = $170 → 20 000 puntos a $0,0085. El costo para el Cliente es esos $170.
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
- **Ajustes:** recargo (%) y plazo máximo para cambiar tarjetas caducadas; días para que un reparto pendiente vuelva al Cliente; margen mínimo.
- Pedidos y soporte, auditoría, "ver como".

---

## 3. Puntos por origen (lotes)

Los puntos son acumulables, pero cada punto nació a un precio distinto (lo que pagó su Cliente o el propio Canjeador). Un saldo único perdería esa información y haría **perder dinero** si se gastan puntos baratos en tarjetas pensadas para puntos caros. Por eso el saldo es la suma de **lotes**:

`point_lots`: `owner_id`, `origin_type` (`purchase_self` / `grant_client` / `adjustment`), `origin_client_id`, `points_initial`, `points_remaining`, `usd_per_point`, `created_at`, `expires_at`.

- **Saldo** = suma de `points_remaining` de los lotes del usuario.
- **Repartir** (Cliente → Canjeador): se parte un lote de la bolsa del Cliente y el lote nuevo conserva su `usd_per_point`.
- **Canjear:** la función consume lotes **del más antiguo al más nuevo** y guarda `redemption_allocations` (orden, lote, puntos, USD). De ahí sale el ingreso real de cada canje y el detalle que ve el Canjeador.
- El libro `points_ledger` sigue siendo inmutable; los lotes se derivan de él y se verifican contra él.
- Devolver al Cliente puntos ya repartidos: solo lo hace **Nosotros**, por soporte, como excepción y con asiento en el libro (pregunta R4). El Cliente no puede deshacer un envío.
- **Cambio de tarjeta caducada** (sección 4): crea un lote nuevo que conserva el precio por punto de los lotes con que se compró la tarjeta, para no regalar ni quitar valor.

---

## 3b. Reparto masivo por Excel (`/cliente/repartir`)

1. **Descargar plantilla** (`plantilla-reparto.xlsx`, generada por el servidor). Hoja "Reparto" con columnas `tipo_documento` (lista desplegable: Cédula / RUC / Pasaporte), `numero_documento`, `puntos`, `monto_venta` (opcional) y `referencia` (opcional, ej. "Factura 001-123"). Hoja "Instrucciones". Si `puntos` está vacío y hay `monto_venta`, se calcula `monto_venta × bonus_pct ÷ usd_per_point`, redondeado hacia abajo.
2. **Subir y revisar** (no cambia nada): el servidor lee el archivo y crea un `grant_batches` en `draft`. La pantalla muestra filas, total de puntos, saldo de la bolsa antes y después, y los errores por fila (número de fila y motivo).
   - Validaciones: `.xlsx` o `.csv` (nunca `.xlsm`), máximo 5 MB y 1 000 filas [propuesta, ajustable al límite de las funciones de Vercel]; tipo de documento válido; cédula con dígito verificador; `puntos` entero > 0; documento repetido en el archivo = error; saldo de la bolsa suficiente.
   - **Todo o nada:** con cualquier error o con saldo insuficiente, **Enviar** queda deshabilitado.
   - Si el mismo archivo (mismo `file_hash`) ya fue enviado, avisa y pide una confirmación extra: enviar dos veces la misma lista es el error irreversible más probable.
   - La revisión **no dice si un documento ya está registrado** (sin enumeración, sección 6).
3. **Enviar:** confirmación explícita ("Esta acción no se puede deshacer. Se descontarán N puntos de tu bolsa") y casilla "Declaro estar autorizado a entregar estos puntos a estas personas y a tratar sus datos". `submit_grant_batch(batch_id, idempotency_key)` hace todo en **una sola transacción**: bloquea la bolsa, vuelve a verificar el saldo, parte lotes del más antiguo al más nuevo (conserva el precio por punto), acredita a quienes ya tienen cuenta con ese documento y crea `pending_grants` para el resto. El lote queda `sent` e inmutable; un doble clic o reintento no duplica.
4. **Después de enviar:** el Cliente no puede editar ni cancelar. Recibe un resumen descargable con estado único "Enviado" (no distingue acreditado de pendiente). Cada Canjeador recibe un aviso por correo.
5. **Pendientes sin reclamar:** a los N días el sistema los devuelve a la bolsa del Cliente. **N es editable por Nosotros en `/admin`** (`settings.pending_grant_days`, por defecto 90). Es una regla del sistema, no una acción del Cliente.
6. **Seguridad:** leer el archivo en el servidor con `exceljs` (la versión de `xlsx` publicada en npm está desactualizada y con fallos conocidos [probable]); leer solo valores, nunca evaluar fórmulas; en cualquier archivo exportado (reparto, Proveedor, reportes) prefijar con `'` las celdas que empiecen por `=`, `+`, `-` o `@` para evitar inyección de fórmulas.

---

## 4. Tarjeta virtual, reserva y liquidación al consumo

La tarjeta virtual la **emite nuestro sistema**; el Proveedor la honra en su negocio. [suposición: confirmar en R4]

1. **Canje:** se descuentan puntos (lotes), se crea `gift_cards` con `balance_cents = face_cents`, se **reserva** ese saldo ante el Proveedor y se le **notifica** (correo y panel). El Canjeador recibe código y QR.
2. **Consumo:** el Proveedor, en `/proveedor` (más adelante en su app), busca la tarjeta y registra un consumo. Es un movimiento en `gift_card_movements` con `idempotency_key` (reintentos sin doble descuento). El saldo es `face − Σ consumos`.
3. **Liquidación:** cada consumo genera una cuenta por pagar al Proveedor = `monto consumido × (costo / valor facial)`. `settle_period()` las agrupa por periodo en `provider_settlements`.
4. **Caducidad:** definida por Proveedor (`providers.card_valid_days`). Al vencer, la tarjeta pasa a `expired` y el Proveedor ya no puede consumirla. Como solo se le paga lo consumido, **no se le debe nada por el saldo vencido**.
4b. **Cambio de tarjeta caducada por puntos** (`exchange_expired_card`), dentro del plazo `exchange_window_days`:
   - Recargo y plazo por defecto: 10 % y 30 días (`exchange_fee_pct`, `exchange_window_days`), editables en `/admin`.
   - `puntos = ⌊ (balance_cents / face_cents) × puntos_pagados × (1 − recargo_pct) ⌋`
   - `puntos_pagados` = suma de `redemption_allocations` de esa tarjeta. El lote nuevo usa el precio por punto promedio ponderado de esas asignaciones.
   - El recargo (`exchange_fee_pct`) queda como ingreso de Nosotros y se factura.
   - **Una sola vez por tarjeta:** pasa a `exchanged`, estado final. La operación bloquea la fila de la tarjeta, así no puede coincidir con un consumo del Proveedor.
   - El Proveedor ve el cambio en el historial de la tarjeta y el saldo reservado se libera.
   - Solo tarjetas caducadas: antes de caducar, la tarjeta se usa. Decidido por el dueño.
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

### 5.4 Negociar por Cliente
Cada Cliente usa la tabla estándar o una **tabla propia** (`client_packs`): sus tramos y precio por punto. El panel de Nosotros muestra, para cada tramo, el margen de cada producto, y lo bloquea si rompe las reglas 1–3. Cambiar el precio de un Cliente afecta solo **lotes futuros**: los lotes ya vendidos conservan su `usd_per_point`.

### 5.5 Sobre el Excel de ejemplo
- `20 000` = una venta de $20 000 en el negocio del Cliente; `0,0085` = el % de bono de ese Cliente (0,85 %); `170` = el bono en dólares que recibe el Canjeador. En el Excel la misma celda (C3) sirve de % de bono y de divisor del precio de la tarjeta. En el sistema son **dos campos** por Cliente: `bonus_pct` (lo cambia el Cliente) y `usd_per_point` (lo fija Nosotros). Si el Cliente fijara también el precio de su punto, podría ponerlo por debajo del costo de la tarjeta (pregunta R1).
- Consecuencia: el Excel hacía que el precio de la tarjeta en puntos dependiera de C3, o sea, de cada Cliente. Aquí el precio en puntos es **igual para todos** porque los puntos de varios Clientes se acumulan en un mismo saldo.
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
| `clients` | `id`, `name`, `pack_mode` (`standard`/`custom`), `bonus_pct` (lo edita el Cliente), `active` |
| `client_packs` | `client_id`, `usd_cents`, `points`, `usd_per_point` |
| `providers` | `id`, `name`, `discount_pct`, `card_valid_days`, contacto y facturación, `active` |
| `provider_terms` | `provider_id`, `discount_pct`, `card_valid_days`, `effective_from`, `set_by`; historial de condiciones (el Proveedor ve la vigente) |
| `products` (reemplaza `stores.denoms`) | `store_id`, `provider_id`, `face_cents`, `cost_cents_override` (opcional), `shipping_cents`, `margin_pct`, `active` |
| `packs` | + `usd_per_point` derivado; paquetes estándar |
| `settings` | + `pv_ref`, `pv_public_tiers`, `min_margin_pct`, `points_multiple=100`, `exchange_fee_pct`, `exchange_window_days`, `pending_grant_days` |
| `point_lots` / `redemption_allocations` | sección 3 |
| `pending_grants` | `client_id`, `batch_id`, `doc_type`, `doc_number`, `points`, `usd_per_point`, `expires_at`; se acredita al registrarse, o vuelve a la bolsa al vencer |
| `grant_batches` | `client_id`, `file_hash`, `status` (`draft`/`sent`), `rows_count`, `total_points`, `idempotency_key` (única), `created_at`, `sent_at` |
| `grant_batch_rows` | `batch_id`, `row_no`, `doc_type`, `doc_number`, `points`, `sale_amount`, `reference`, `error` |
| `gift_cards` | `product_id`, `provider_id`, `owner_id`, `face_cents`, `cost_cents` (congelado), `balance_cents`, `public_token`, `status` (`active`/`consumed`/`expired`/`exchanged`), `expires_at`, `order_id` |
| `gift_card_movements` | `card_id`, `type` (`issue`/`consume`/`adjust`/`expire`), `amount_cents`, `by_user`, `idempotency_key` (única) |
| `provider_settlements` | `provider_id`, periodo, nº de consumos, monto USD, estado, referencia de factura |
| `audit_log` | quién, qué, antes, después, cuándo |

Funciones SQL nuevas: `price_points(product_id)`, `buy_points(pack, buyer)`, `validate_grant_batch(batch_id)`, `submit_grant_batch(batch_id, key)` (solo el Cliente dueño), `redeem` (reescrita con lotes y tarjeta), `consume_card(card, amount_cents, key)` (solo Proveedor dueño), `exchange_expired_card(card)` (solo el dueño de la tarjeta), `settle_period(provider_id, from, to)`, `validate_pricing()` (reglas de 5.3).

---

## 8. Reparto de trabajo

Ver `PLAN-BACKEND.md`: B1 roles y perfil, B2 cuentas, B3 lotes y precios, B4 admin, B5 canje con tarjeta virtual, B6 pagos, B7 panel del Cliente y Excel, B8 panel del Proveedor, B9 liquidación y caducidad, B10 legales, B11 producción, B12 app con QR.

---

## 9. Estado de las decisiones

Todas las preguntas de negocio están cerradas:
- Descuento del Proveedor editable y visible para él; `Costo 25` es lo que se le paga.
- El bono (C3) es del Cliente y lo cambia cuando quiera; el precio de su punto lo fija Nosotros.
- Lotes del más antiguo al más nuevo; la tarjeta es emitida por Nosotros.
- Tarjeta caducada: se cambia una vez por puntos con recargo (10 % y 30 días por defecto, editables); no se cambia antes de caducar.
- Reparto masivo por Excel: todo o nada, plantilla con columna opcional `monto_venta`, envío irreversible; solo Nosotros puede revertir un envío por soporte.
- Puntos pendientes sin reclamar vuelven a la bolsa del Cliente; los días son editables por Nosotros (90 por defecto).

Pendiente fuera del código (dueño): contratos con Proveedores, pasarela, correo transaccional con dominio propio, Vercel Pro, y consulta legal y contable sobre saldos prepagados, caducidad a consumidores, facturación del recargo y datos personales de terceros.
