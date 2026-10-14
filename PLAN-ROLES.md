# PLAN-ROLES — Roles, precios por cliente y perfil de identidad

Complementa a `PLAN-BACKEND.md`. Cuando se cierren las preguntas de la sección 8, se fusiona con él y se renumeran las fases.
Etiquetas: **[NÚCLEO]** lo hace Claude (permisos, saldo, precios, SQL). **[UI]** lo hace Haiku/Antigravity sobre contratos ya probados.

---

## 1. Roles y acceso

Un usuario tiene **un** rol (`profiles.role`). Los roles se heredan así: todos pueden canjear; Cliente y Nosotros ven más.

| Área | Canjeador | Cliente | Proveedor | Nosotros |
|---|---|---|---|---|
| Tienda, canje, mi cuenta, mis tarjetas (`/shop`, `/cuenta`) | ✔ | ✔ | ✔ | ✔ |
| Panel de Cliente (`/cliente`) | ✘ | ✔ | ✘ | ✔ |
| Panel de Proveedor (`/proveedor`) | ✘ | ✘ | ✔ solo su negocio | ✔ todos |
| Administración (`/admin`) | ✘ | ✘ | ✘ | ✔ |

Reglas no negociables:
1. El acceso lo decide el **servidor** (`requireRole()` + RLS en la base). Ocultar pestañas es solo cosmética.
2. El registro público crea siempre **Canjeador**. Cliente y Proveedor los crea o promueve Nosotros. Nadie cambia su propio rol (trigger en la base lo impide).
3. Un Proveedor solo ve filas con su `provider_id`. Un Cliente solo ve canjeadores con su `client_id`.
4. Todo cambio sensible (rol, tasa, margen, saldo, liquidación) queda en `audit_log`.

---

## 2. Diseño de cada pestaña

### Canjeador (`/shop`, `/cuenta`)
- Compra puntos con dinero real (`/recargar`) y canjea tarjetas.
- **Mis tarjetas:** código, tienda, valor, **saldo restante**, estado (activa / consumida / vencida), historial de movimientos.
- Historial de puntos (recargas, regalos recibidos de su Cliente, canjes).
- Perfil: datos y documento de identidad (sección 5).
- Los precios en puntos que ve dependen de **su Cliente** (sección 4). Sin Cliente, aplica el cliente "Público".

### Cliente (`/cliente`)
- **Comprar puntos en lote** con la pasarela; saldo de la "bolsa" del Cliente.
- **Repartir puntos** a sus canjeadores: uno a uno o por CSV (`documento,puntos`). Transferencia en el libro mayor, nunca edición de saldo.
- Lista de sus canjeadores: puntos recibidos, usados, disponibles.
- Reportes y exportación CSV de su consumo.
- Puede canjear para sí mismo (hereda Canjeador).

### Proveedor (`/proveedor`)
- **KPIs de su negocio:** tarjetas vendidas y por denominación, valor facial vendido, tarjetas vivas y saldo pendiente en ellas, canjes por periodo, liquidación pendiente y pagada.
- **Caja:** buscar por código → ver **saldo exacto** → registrar consumo (parcial o total). Cada consumo es un movimiento en `gift_code_movements` y el saldo se calcula desde ahí.
- **Inventario:** cargar códigos (CSV), ver stock por denominación.
- Exportar toda su información a CSV.
- **Privacidad:** ve código, valor, saldo, fecha y un identificador reducido del canjeador (nombre abreviado + últimos 4 dígitos del documento). Nunca el documento completo ni el correo.

### Nosotros (`/admin`)
- Todo lo del panel actual (catálogo, paquetes) pasa a la base de datos.
- **Clientes:** alta, valor del punto, margen, activar/desactivar.
- **Precios:** costo, transporte y margen por tarjeta (sección 4), vista previa de puntos por cliente.
- **Usuarios y roles:** asignar rol, vincular a Cliente o Proveedor, bloquear.
- **Proveedores:** alta, tiendas asociadas, costo por tarjeta, liquidaciones.
- **Pedidos y soporte, auditoría, "ver como".**

---

## 3. Qué cambia en el modelo de datos (sobre `PLAN-BACKEND.md`)

| Tabla | Cambio |
|---|---|
| `profiles` | + `role` (`canjeador`/`cliente`/`proveedor`/`admin`), `doc_type`, `doc_number`, `birth_date`, `terms_accepted_at`, `terms_version`, `client_id`, `provider_id` |
| `clients` (nueva) | `id`, `name`, `point_value_usd numeric(10,6)`, `margin_pct_override numeric null`, `active` |
| `providers` (nueva) | `id`, `name`, datos de contacto y facturación, `active` |
| `products` (nueva, reemplaza `stores.denoms`) | `store_id`, `provider_id`, `face_usd`, `cost_usd`, `shipping_usd`, `margin_pct`, `active` |
| `gift_codes` | + `provider_id`, `face_cents`, `balance_cents`, `status` |
| `gift_code_movements` (nueva) | `code_id`, `type` (`issue`/`consume`/`adjust`), `amount_cents`, `by_user`, `at` |
| `points_ledger` | + motivos `grant_from_client`, `rate_adjustment` |
| `provider_settlements` (nueva) | `provider_id`, periodo, nº de códigos, monto USD, estado, referencia de factura |
| `audit_log` (nueva) | quién, qué, antes, después, cuándo |

Funciones SQL nuevas: `price_points(product_id, client_id)`, `grant_points(client_id, to_user, points)`, `consume_code(code, amount_cents)` (solo proveedor dueño), `settle_period(provider_id, from, to)`.

---

## 4. Motor de precios (a partir de `ejemplo cálculo.xlsx`)

Parámetros por tarjeta: `costo`, `transporte`, `margen_pct`. Parámetro por Cliente: `valor_punto_usd`.

```
valor_tarjeta_usd = costo + transporte + costo × margen_pct
puntos            = CEIL( ROUND(valor_tarjeta_usd / valor_punto_usd) / 100 ) × 100
```

Ejemplo del Excel: costo 25, transporte 0, margen 15 % → 28,75. Con punto = $0,0085: 28,75 / 0,0085 = 3 382,35 → 3 382 → **3 400 puntos**.
El Excel redondeaba a múltiplos de 10 (daba 3 390); aquí es 100, como pediste. Se redondea siempre hacia arriba: el exceso (hasta 99 puntos ≈ $0,84) es margen adicional.

`Costo Producto 20 000 × 0,0085 = $170`: se interpreta como "20 000 puntos valen $170 con ese valor de punto".

Nombres en el sistema (el Excel usa "Comisión" para dos cosas distintas): `point_value_usd` (C3) y `margin_pct` (C11).

Consecuencia matemática: el precio en dólares de una tarjeta es `costo × (1 + margen)` sea cual sea el valor del punto; el valor del punto solo cambia **cuántos puntos** se ve. Para dar precios distintos por Cliente la palanca es el **margen por Cliente** (`margin_pct_override`).

Qué pasa al cambiar el valor del punto de un Cliente con saldo (decisión R3): el saldo está en puntos, así que cambiar la tasa cambia su poder de compra. Propuesta: la tasa de un Cliente queda **bloqueada mientras tenga saldo en circulación**; cambiarla es una acción explícita "re-denominar" que reescala los saldos con asientos `rate_adjustment` para conservar su valor en dólares.

---

## 5. Perfil: documento de identidad y mayoría de edad

- Tipos: **Cédula** (10 dígitos, validación módulo 10 con provincia 01–24 o 30), **RUC** (13 dígitos), **Pasaporte** (alfanumérico 5–20).
- `doc_type + doc_number` único (normalizado: mayúsculas, sin espacios). Validación en cliente **y** en servidor.
- **Fecha de nacimiento** obligatoria; el servidor rechaza menores de 18. Casilla de aceptación de Términos y Privacidad con versión y fecha guardadas.
- El Términos y Condiciones declara: *"Debes ser mayor de 18 años"*. Es una declaración: sin verificación de identidad (KYC) no se puede comprobar. El texto debe decirlo así, no prometer verificación.
- El documento es dato personal (LOPDP): solo lo ve el dueño y Nosotros; el Proveedor ve solo los últimos 4 dígitos.

---

## 6. Reparto de trabajo

| Fase | Quién | Contenido |
|---|---|---|
| R1 | Claude [NÚCLEO] | Roles, `clients`, `providers`, `products`, perfil con documento, `requireRole()`, RLS, pruebas de acceso cruzado |
| R2 | Claude [NÚCLEO] | `price_points`, tasa y margen por Cliente, pruebas contra el Excel |
| R3 | Haiku [UI] | Registro con documento, fecha de nacimiento y Términos; menú por rol; páginas protegidas vacías |
| R4 | Claude + Haiku | Admin: Clientes, Precios con vista previa, Usuarios y roles |
| R5 | Claude + Haiku | `/cliente`: comprar en lote, repartir puntos, reportes |
| R6 | Claude + Haiku | `/proveedor`: KPIs, caja con saldo exacto, inventario CSV |
| R7 | Claude + Haiku | Liquidación por código canjeado |
| R8 | Haiku [UI] | Términos y Privacidad, limpieza de avisos de demo |

Se entrelazan con B1–B5 de `PLAN-BACKEND.md`; el orden final se fija al fusionarlos.

---

## 7. Contradicciones a resolver

- Dijiste que el Canjeador "puede comprar puntos con dinero real" y también que el Cliente compra puntos para dárselos. Se asume: **ambos pueden comprar**. La diferencia es que el Cliente compra en lote y reparte.
- "Saldo exacto" en el Proveedor solo es verdad si el Proveedor **registra cada consumo en caja**. Si no lo registra, el sistema solo conoce el valor original.

---

## 8. Preguntas abiertas

| # | Pregunta | Recomendación |
|---|---|---|
| R1 | ¿Un Canjeador pertenece a un solo Cliente? Si recibe puntos de dos Clientes con distinto valor de punto, hacen falta bolsillos separados. | Un solo Cliente por Canjeador. |
| R2 | ¿Con qué tasa compra puntos un Canjeador que pertenece a un Cliente: la de su Cliente o la pública? | La de su Cliente. |
| R3 | ¿Para qué quieres valor de punto distinto por Cliente: marca ("1 punto = 1 centavo") o descuentos? Si son descuentos, hace falta margen por Cliente. | Ambos configurables. Tasa bloqueada con saldo. |
| R4 | "Liquidación por código canjeado": ¿cuando el Canjeador **compra** la tarjeta con puntos o cuando el Proveedor registra el **consumo en caja**? | Al consumo en caja. Pagar al emitir te deja debiendo tarjetas que nadie usa. |
| R5 | ¿Pueden volver al Cliente los puntos que repartió y el Canjeador no gastó? | Sí, con acción explícita de Cliente o Nosotros y asiento en el libro. |
| R6 | ¿Los códigos los carga el Proveedor o los cargamos Nosotros? | El Proveedor, con aprobación de Nosotros. |
| R7 | ¿Las tarjetas vencen? Un saldo pendiente en un negocio es una deuda. | Definir caducidad con tu contador y el contrato del Proveedor. |
