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
- Perfil con documento de identidad (sección 6).

### Cliente (`/cliente`)
- **Comprar puntos** con la pasarela, con precios por volumen. Saldo de su "bolsa".
- **Repartir puntos** a canjeadores por documento: uno a uno o CSV (`documento,puntos`). Si la persona aún no se registró, el reparto queda **pendiente** y se acredita al registrarse con ese documento.
- Lista de lo repartido: a quién, cuánto, cuánto usó, cuánto le queda.
- Reportes y exportación CSV.
- Puede canjear para sí mismo.

### Proveedor (`/proveedor`)
- **KPIs de su negocio:** tarjetas emitidas y por denominación, valor facial, tarjetas vivas y saldo pendiente en ellas, consumos por periodo, **liquidación** pendiente y pagada, tarjetas por vencer.
- **Caja:** buscar por código o QR → **saldo exacto** → registrar consumo (parcial o total).
- Exportación CSV de toda su información.
- **Privacidad:** ve código, valor, saldo, fechas y un identificador reducido del canjeador (nombre abreviado + últimos 4 dígitos del documento). Nunca documento completo ni correo.

### Nosotros (`/admin`)
- Catálogo, productos (costo, margen) y paquetes de puntos.
- **Clientes:** alta, precio negociado del punto, vista de margen.
- **Usuarios y roles:** asignar rol, bloquear.
- **Proveedores:** alta, descuento sobre valor facial, caducidad, liquidaciones.
- Pedidos y soporte, auditoría, "ver como".

---

## 3. Puntos por origen (lotes)

Los puntos son acumulables, pero cada punto nació a un precio distinto (lo que pagó su Cliente o el propio Canjeador). Un saldo único perdería esa información y haría **perder dinero** si se gastan puntos baratos en tarjetas pensadas para puntos caros. Por eso el saldo es la suma de **lotes**:

`point_lots`: `owner_id`, `origin_type` (`purchase_self` / `grant_client` / `adjustment`), `origin_client_id`, `points_initial`, `points_remaining`, `usd_per_point`, `created_at`, `expires_at`.

- **Saldo** = suma de `points_remaining` de los lotes del usuario.
- **Repartir** (Cliente → Canjeador): se parte un lote de la bolsa del Cliente y el lote nuevo conserva su `usd_per_point`.
- **Canjear:** la función consume lotes en orden (propuesta: el más antiguo primero) y guarda `redemption_allocations` (orden, lote, puntos, USD). De ahí sale el ingreso real de cada canje y el detalle que ve el Canjeador.
- El libro `points_ledger` sigue siendo inmutable; los lotes se derivan de él y se verifican contra él.
- Devolver puntos no gastados al Cliente (pregunta R5): operación inversa explícita y con asiento.

---

## 4. Tarjeta virtual, reserva y liquidación al consumo

La tarjeta virtual la **emite nuestro sistema**; el Proveedor la honra en su negocio. [suposición: confirmar en R4]

1. **Canje:** se descuentan puntos (lotes), se crea `gift_cards` con `balance_cents = face_cents`, se **reserva** ese saldo ante el Proveedor y se le **notifica** (correo y panel). El Canjeador recibe código y QR.
2. **Consumo:** el Proveedor, en `/proveedor` (más adelante en su app), busca la tarjeta y registra un consumo. Es un movimiento en `gift_card_movements` con `idempotency_key` (reintentos sin doble descuento). El saldo es `face − Σ consumos`.
3. **Liquidación:** cada consumo genera una cuenta por pagar al Proveedor = `monto consumido × (costo / valor facial)`. `settle_period()` las agrupa por periodo en `provider_settlements`.
4. **Caducidad:** definida por Proveedor (`providers.card_valid_days`). Al vencer, el saldo sin consumir se marca `expired`.
5. **Aviso al Canjeador:** cada consumo le llega por correo, para que detecte uno falso. [probable] Es la defensa principal contra un Proveedor que se cobre consumos que no ocurrieron.

Preparado para la app: el QR codifica `https://<dominio>/c/<public_token>` (token aleatorio de 128 bits, distinto del código). Las acciones del Proveedor son `POST /api/provider/cards/lookup` y `POST /api/provider/cards/consume`, con autenticación por sesión hoy y por token de dispositivo cuando exista la app. A futuro, el QR del Canjeador puede ser dinámico (válido ~60 s) para que **él autorice** cada consumo.

Esto cambia `PLAN-BACKEND.md`: ya no hay inventario de códigos comprados ni "Agotada" por stock. El CSV de códigos solo hará falta si un Proveedor emite sus propios códigos.

---

## 5. Precios

### 5.1 Precio de la tarjeta en puntos (múltiplos de 100)
Parámetros por producto: `face_usd` (valor facial), `cost_usd` (lo que pagamos al Proveedor = valor facial menos su descuento), `shipping_usd` (0 en tarjetas virtuales), `margin_pct`.

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
- `20 000` = una venta de $20 000 en el negocio del Cliente; `0,0085` = lo que el Cliente paga por punto y, a la vez, el 0,85 % de la venta; `170` = el bono que recibe el Canjeador (20 000 puntos × $0,0085).
- `Costo 25 + 15 % = 28,75 → 3 400 puntos` se conserva como el cálculo de 5.1, con múltiplos de 100.
- Con esos números (costo 25 sobre una tarjeta de $25 sin descuento del Proveedor) el precio sale **mayor** que el valor facial y el piso de $10 no se cumple. Para cumplirlo hace falta que el Proveedor dé descuento sobre el valor facial (pregunta R1).
- Calculadora opcional en `/cliente`: monto de la venta × tasa del bono → puntos a repartir y costo para el Cliente (pregunta R2).

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
| `clients` | `id`, `name`, `pack_mode` (`standard`/`custom`), `active` |
| `client_packs` | `client_id`, `usd_cents`, `points`, `usd_per_point` |
| `providers` | `id`, `name`, `discount_pct`, `card_valid_days`, contacto y facturación, `active` |
| `products` (reemplaza `stores.denoms`) | `store_id`, `provider_id`, `face_cents`, `cost_cents`, `shipping_cents`, `margin_pct`, `active` |
| `packs` | + `usd_per_point` derivado; paquetes estándar |
| `settings` | + `pv_ref`, `pv_public_tiers`, `min_margin_pct`, `points_multiple=100` |
| `point_lots` / `redemption_allocations` | sección 3 |
| `pending_grants` | `client_id`, `doc_type`, `doc_number`, `points`, `usd_per_point`; se acredita al registrarse |
| `gift_cards` | `product_id`, `provider_id`, `owner_id`, `face_cents`, `balance_cents`, `public_token`, `status`, `expires_at`, `order_id` |
| `gift_card_movements` | `card_id`, `type` (`issue`/`consume`/`adjust`/`expire`), `amount_cents`, `by_user`, `idempotency_key` (única) |
| `provider_settlements` | `provider_id`, periodo, nº de consumos, monto USD, estado, referencia de factura |
| `audit_log` | quién, qué, antes, después, cuándo |

Funciones SQL nuevas: `price_points(product_id)`, `buy_points(pack, buyer)`, `grant_points(client_id, doc, points)`, `redeem` (reescrita con lotes y tarjeta), `consume_card(card, amount_cents, key)` (solo Proveedor dueño), `settle_period(provider_id, from, to)`, `validate_pricing()` (reglas de 5.3).

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
| R1 | **¿Qué descuento da cada Proveedor sobre el valor facial?** Sin él no hay margen: con descuento 0 %, una tarjeta de $10 no puede venderse por ≤ $10 con ganancia. Con margen del 15 % sobre costo hace falta un descuento ≥ 13 %. | Pedirlo por escrito a cada Proveedor antes de fijar precios. |
| R2 | En el Excel, ¿`Costo 25` es lo que pagas al Proveedor o el valor facial? ¿El bono es "1 punto por cada $1 vendido" y el Cliente paga $0,0085 por punto? | Confirmar con un ejemplo real de un Cliente. |
| R3 | ¿Qué lotes se gastan primero: los más antiguos o elige el Canjeador? | Más antiguos primero. |
| R4 | ¿La tarjeta la emitimos nosotros y el Proveedor solo la honra y la consume (sin que él cargue códigos)? ¿Quién se queda con el saldo caducado sin consumir? | Emisión propia. El saldo caducado se define en cada contrato con el Proveedor. |
| R5 | ¿Pueden volver al Cliente los puntos que repartió y no se gastaron? | Sí, con acción explícita de Cliente o Nosotros y asiento en el libro. |
| R6 | Riesgos legales: dinero cobrado por puntos que aún no se consumen y caducidad de saldos a consumidores. | Consultar a abogado y contador antes de lanzar. |
