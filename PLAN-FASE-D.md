# PLAN-FASE-D — Prototipo de pantallas con datos de ejemplo

Objetivo: diseñar y aprobar **todas las pantallas** de los cuatro roles (Canjeador, Cliente, Proveedor, Nosotros) con datos de ejemplo, **antes** de escribir el backend. Cada pantalla que apruebes fija el contrato (los campos que muestra) que luego implementa el núcleo (`PLAN-BACKEND.md`, fases B1+).

Quién: **Haiku / Antigravity** ejecuta las fases D1–D7 de una en una. **Claude** revisa cada una cuando digas "Revisa la fase D#".

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`. `main` no se toca.

---

## 0. Qué ya está hecho (lo dejó Claude; Haiku NO lo modifica)

| Archivo | Para qué |
|---|---|
| `lib/domain/types.ts` | **Tipos del dominio** (contrato). Dinero en centavos, puntos enteros. |
| `lib/domain/format.ts` | `formatUsd(cents)`, `formatPts(n)`, `formatUsdPerPoint(n)`, `formatPct(fracción)`, `formatDate(iso)`, `formatDateTime(iso)` |
| `lib/domain/documento.ts` | `validateDocument(type, value)`, `maskDocument(value)`, `normalizeDocument`, `isAdult(birthDate)` |
| `lib/domain/pricing.ts` | **Solo vista previa**: `productCostCents`, `productPriceCents`, `pointsPrice`, `marginAtPack`, `bonusFromSale`, `validatePricing`, `exchangePreview` |
| `lib/domain/csv.ts` | `downloadCsv(nombre, encabezados, filas)` y `toCsv` (neutraliza fórmulas) |
| `lib/mock/data.ts` | **Todos los datos de ejemplo** y `MOCK_NOW` (el "hoy" fijo) |
| `lib/mock/session.tsx` | `useMockSession()` → `{ role, profile, setRole, ready }` |
| `components/panel/role-gate.tsx` | `<RoleGate allow={[...]}>`: muestra "No tienes acceso" si el rol no está permitido ("Nosotros" siempre pasa) |
| `components/panel/panel-shell.tsx` | `<PanelShell title subtitle tabs>`: título, pestañas por ruta y etiqueta "Prototipo" |
| `components/panel/kpi-card.tsx` | `<KpiCard label value hint?>` |
| `components/panel/status-badge.tsx` | `<StatusBadge status>` para estados de tarjeta |
| `components/panel/dev-role-bar.tsx` | Barra flotante abajo a la izquierda: "Prototipo · Ver como: [rol]" |

Probar la base: `git pull` → `npm install` → `npm run dev` → abre http://localhost:3000 → abajo a la izquierda aparece **"Prototipo · Ver como"**.

---

## 1. Reglas para Haiku / Antigravity (valen en TODAS las fases)

1. Una fase por sesión. `git pull` antes de empezar.
2. **No modifiques** los archivos de la tabla anterior, ni `app/layout.tsx`, `lib/points-store.tsx`, `lib/catalog-store.tsx`. Si falta un tipo, un campo o un dato, **detente y pregunta**; no los inventes ni los agregues.
3. **No cambies los datos de `lib/mock/data.ts`.** Si necesitas estado que cambie (consumir, enviar, editar), usa `useState` local en la pantalla. Al recargar vuelve al estado original: es lo esperado.
4. Todo el texto en español. Dinero con `formatUsd(centavos)`, puntos con `formatPts`, fechas con `formatDate`. Nunca muestres centavos crudos ni "undefined".
5. Usa los componentes de `components/ui` (shadcn), iconos de `lucide-react` y `toast` de `sonner`. Estilo coherente con el resto del sitio. **Responsive**: se debe usar bien a 375 px (las tablas con scroll horizontal o convertidas en tarjetas).
6. **Cada área tiene un `layout.tsx` de servidor** que copia el patrón de `app/admin/layout.tsx` (metadata `robots: noindex`) y renderiza un componente cliente `components/panel/<area>-shell.tsx` con `<RoleGate allow=[...]>` + `<PanelShell tabs=[...]>`. Las páginas solo pintan su contenido.
7. **Acciones irreversibles** (enviar reparto, cambiar tarjeta caducada, consumir, cambiar rol): siempre `AlertDialog` de confirmación con el texto exacto indicado, botón deshabilitado con `Spinner` mientras "procesa" (simula 800 ms con `setTimeout`), y ningún botón de "Deshacer".
8. **Estados obligatorios en cada lista o tabla:** vacío (mensaje + qué hacer), cargando (`Skeleton`, simula 400 ms) y los casos "incómodos" que indique la fase.
9. **Privacidad:** el Proveedor nunca ve documento completo ni correo del Canjeador. Al revisar un archivo de reparto, el Cliente nunca ve si un documento está registrado. Decisión del dueño (D3): en "Lo repartido" el Cliente SÍ ve puntos usados y disponibles por documento; eso deja inferir que quien usó puntos ya tiene cuenta, y se acepta porque le sirve para medir su programa.
10. Textos sobre mayoría de edad: siempre **"declaración"**, nunca "verificamos".
11. Los avisos de "Prototipo" ya los pone `PanelShell`; no agregues más.
12. Al terminar: `npx tsc --noEmit` **sin errores**, `npm run build` **sin errores**, pruebas manuales de la fase (cambiando de rol con la barra), `git add` **solo** los archivos de la fase (nunca `package-lock.json` ni `.env*`), commit y `git push`.
13. **Precio por punto: solo lo ve Nosotros.** Canjeador, Cliente y Proveedor nunca ven el valor "USD por punto", ni márgenes, costos del proveedor ni % de ahorro entre paquetes. Solo `/admin/*` puede usar `formatUsdPerPoint`. Los paquetes se muestran como "USD → puntos".

### Matriz de acceso (se prueba en D7)

| Ruta | Canjeador | Cliente | Proveedor | Nosotros |
|---|---|---|---|---|
| `/cuenta` y subrutas | ✔ | ✔ | ✔ | ✔ |
| `/cliente` y subrutas | "No tienes acceso" | ✔ | "No tienes acceso" | ✔ |
| `/proveedor` y subrutas | "No tienes acceso" | "No tienes acceso" | ✔ | ✔ |
| `/admin/clientes`, `/proveedores`, `/precios`, `/usuarios`, `/liquidaciones`, `/ajustes` | "No tienes acceso" | "No tienes acceso" | "No tienes acceso" | ✔ |

`/admin` (editor de catálogo actual con clave) **no cambia**.

---

## FASE D1 — Canjeador: `/cuenta` (resumen, puntos por origen, tarjetas)

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1 y cumple todas las reglas. Crea el área **/cuenta** para el rol Canjeador (accesible a todos los roles: `allow` con los 4 roles). Archivos: `app/cuenta/layout.tsx`, `components/panel/cuenta-shell.tsx` (pestañas: Resumen `/cuenta`, Mis puntos `/cuenta/puntos`, Mis tarjetas `/cuenta/tarjetas`, Perfil `/cuenta/perfil`), `app/cuenta/page.tsx`, `app/cuenta/puntos/page.tsx`, `app/cuenta/tarjetas/page.tsx`. Para `/cuenta/perfil` crea una página con el texto "Próximamente" (la hace la fase D2). Usa `MOCK_LOTS`, `MOCK_LEDGER`, `MOCK_CARDS`, `MOCK_SETTINGS`, `MOCK_NOW` de `lib/mock/data.ts` y `exchangePreview` de `lib/domain/pricing.ts`.
>
> **Resumen:** 4 `KpiCard`: puntos totales (suma de `pointsRemaining`), tarjetas activas (cantidad), saldo en tarjetas activas (USD, suma de `balanceCents`), próxima caducidad ("en N días", usando `MOCK_NOW`). Bloque "Por caducar pronto" con las tarjetas activas que caducan en ≤ 30 días. Botones "Comprar puntos" (→ `/recargar`) y "Ver gift cards" (→ `/shop`).
>
> **Mis puntos:** total grande. Tabla de lotes ordenados del más antiguo al más nuevo con: origen ("Concesionaria Andina" / "Comprados por mí" / "Cambio de tarjeta caducada"), fecha, puntos iniciales, puntos restantes con barra `Progress`, (**sin precio por punto**: regla 13). Una etiqueta "Se usa primero" en el primer lote con puntos restantes. Texto: "Tus puntos se gastan del lote más antiguo al más nuevo." Debajo, tabla "Historial" con `MOCK_LEDGER` (entradas en verde con +, salidas en rojo con −).
>
> **Mis tarjetas:** filtro por estado (Todas / Activas / Caducadas / Consumidas / Cambiadas). Cada tarjeta: tienda, `StatusBadge`, valor, **saldo restante** con barra, caducidad ("caduca en N días" / "caducó hace N días"), código oculto con botón "Mostrar" y "Copiar", botón "Ver movimientos" (muestra los `movements` en una lista con fecha, tipo en español y monto), y botón "Ver QR" que abre un `Dialog` con un recuadro de ejemplo y el texto "El QR real se activará más adelante".
> **Tarjeta caducada:** botón "Cambiar por puntos". Al pulsar, `AlertDialog` que usa `exchangePreview(card, MOCK_SETTINGS, MOCK_NOW)`: si `allowed`, texto "Recibirás **X puntos**. Recargo: Y puntos (Z %). Esta acción no se puede deshacer y la tarjeta no se podrá usar más." y botón "Cambiar por puntos"; al confirmar (regla 7) la tarjeta pasa a "Cambiada por puntos" (estado local) y aparece `toast`. Si no `allowed`: no hay botón y se muestra el motivo — `window_closed`: "El plazo para cambiarla venció."; `no_balance`: "No tiene saldo para cambiar."; `already_exchanged`: "Ya la cambiaste por puntos."; `not_expired`: sin botón ni mensaje.
>
> **Casos incómodos que deben verse (cambia nada en el mock, ya existen):** tarjeta caducada que SÍ se puede cambiar (`card-3`), caducada fuera de plazo (`card-6`), ya cambiada (`card-4`), consumida (`card-5`), activa por caducar (`card-2`). Lista vacía al filtrar un estado sin tarjetas.
>
> Pruebas manuales: con la barra "Ver como" prueba los 4 roles (todos entran a /cuenta); filtra tarjetas; cambia `card-3` y comprueba que queda "Cambiada" y que `card-6` no ofrece botón; mira la página a 375 px. Luego regla 12.

**Criterio de aceptación (Claude revisa):** puntos totales = 20 510; el lote "Concesionaria Andina" marcado "Se usa primero"; `card-3` ofrece cambiar 5 400 puntos con recargo de 600 (10 %); `card-6` no ofrece cambio; ninguna lista queda sin estado vacío; tsc y build limpios.

---

## FASE D2 — Registro con documento, perfil y menú por rol

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Trabaja sobre `app/register/page.tsx` (ya existe, mantén su aviso de demostración), `components/header.tsx`, `components/footer.tsx` (solo los enlaces "Términos" y "Privacidad", que hoy apuntan a `#`: deben ir a `/terminos` y `/privacidad`), `app/cuenta/perfil/page.tsx` y dos páginas nuevas `app/terminos/page.tsx` y `app/privacidad/page.tsx`.
>
> **Registro:** agrega "Tipo de documento" (`Select`: Cédula / RUC / Pasaporte, etiquetas de `DOC_TYPE_LABEL`), "Número de documento" (se valida con `validateDocument` al salir del campo y al enviar; muestra el `error` en español), "Fecha de nacimiento" (`input type=date`; si `isAdult` es falso: "Debes ser mayor de 18 años para registrarte."). Casilla obligatoria: "Declaro ser mayor de 18 años y acepto los [Términos y Condiciones](/terminos) y la [Política de Privacidad](/privacidad)". El botón "Crear cuenta" queda deshabilitado hasta que todo sea válido. Al enviar, el comportamiento sigue siendo de demostración (no se crea ninguna cuenta), pero muestra una pantalla de éxito clara con el aviso "Prototipo: no se creó ninguna cuenta".
>
> **Términos y Privacidad:** páginas simples con título y el texto "Documento en revisión legal. Se publicará antes del lanzamiento." Con `robots: noindex`.
>
> **Perfil (`/cuenta/perfil`):** tarjeta de solo lectura con `useMockSession().profile`: nombre, correo, tipo de documento, número **enmascarado** (`maskDocument`) con botón "Mostrar" que lo revela, fecha de nacimiento, "Términos aceptados el <fecha> (versión X)". Texto: "Para corregir tu documento, escríbenos desde Contacto."
>
> **Menú del header:** el ícono de usuario pasa a un `DropdownMenu` que muestra el nombre, el rol (`ROLE_LABEL`) y estos enlaces según `useMockSession().role`: todos → "Mi cuenta" (`/cuenta`); cliente → "Panel de Cliente" (`/cliente`); proveedor → "Panel de Proveedor" (`/proveedor`); admin → "Panel de Cliente", "Panel de Proveedor" y "Administración" (`/admin/clientes`). Además un ítem "Iniciar sesión" (`/login`) y un ítem deshabilitado "Cerrar sesión (prototipo)". En el menú móvil, los mismos enlaces. No toques la lógica del saldo ni del carrito.
>
> Pruebas manuales: registro con cédula inválida, con fecha de menor de edad, sin casilla, y todo correcto; menú con cada rol; `/cuenta/perfil`; enlaces a /terminos y /privacidad. Luego regla 12.

**Criterio de aceptación:** cédula `1712345670` rechazada, `1712345675` aceptada; fecha del 15-10-2010 rechazada; el menú cambia por rol; no hay enlaces rotos (incluidos los del pie de página).

---

## FASE D3 — Cliente: `/cliente` (resumen, comprar, mi bono, lo repartido)

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Crea el área **/cliente** (`allow: ["cliente"]`; "Nosotros" pasa solo). Archivos: `app/cliente/layout.tsx`, `components/panel/cliente-shell.tsx` (pestañas: Resumen `/cliente`, Comprar puntos `/cliente/comprar`, Mi bono `/cliente/bono`, Repartir `/cliente/repartir`, Lo repartido `/cliente/repartido`), y las páginas. Para `/cliente/repartir` crea una página con el texto "Próximamente" (la hace la fase D4). Datos: `MOCK_CLIENT`, `MOCK_CLIENT_PACKS`, `MOCK_STANDARD_PACKS`, `MOCK_GRANTED`, `bonusFromSale` de `lib/domain/pricing.ts`.
>
> **Resumen:** `KpiCard`: puntos en tu bolsa, puntos repartidos (suma de `points`), puntos usados por tus canjeadores (suma de `pointsUsed`), puntos repartidos sin usar; tu bono (`formatPct`) (sin precio de tu punto). Botones "Comprar puntos" y "Repartir puntos".
>
> **Comprar puntos:** si `MOCK_CLIENT.packMode === "custom"` usa `MOCK_CLIENT_PACKS`, si no `MOCK_STANDARD_PACKS`. Cada paquete en una tarjeta: USD, puntos, insignia ("Mejor valor" en el paquete más grande). Sin "USD por punto" ni % de ahorro. Botón "Pagar con la pasarela" → `toast` "Prototipo: aquí se abre el pago seguro de la pasarela". Texto: "Pagarás en la página segura de la pasarela. Regala no ve los datos de tu tarjeta."
>
> **Mi bono:** campo "Mi % de bono" (número 0–100, paso 0,01, se guarda con botón → `toast`; inválido → mensaje). Texto: "Este porcentaje es tuyo y lo puedes cambiar cuando quieras. No cambia el precio de tus puntos: ese lo fija Regala." **Calculadora:** campo "Monto de la venta (USD)" (precargado 20000) → muestra solo "Bono en dólares" y "Puntos a repartir" (`bonusFromSale(centavos, pct/100, MOCK_CLIENT.usdPerPoint)`; `usdPerPoint` se usa para calcular pero **nunca se muestra**, regla 13; no agregues "Costo para ti" ni ningún precio por punto). Debe cuadrar: venta $20.000 × 0,85 % con punto a $0,00914 (el tramo de $170 del cliente de ejemplo da 18.600 puntos) = $170,00 → 18.600 puntos.
>
> **Lo repartido:** tabla con `MOCK_GRANTED`: documento (tipo + número completo, lo escribió el Cliente), referencia, puntos, usados, disponibles, fecha, etiqueta "Enviado" (siempre la misma: no se muestra si la persona se registró). Buscador por documento. Fila de totales. Botón "Descargar CSV" con `downloadCsv`. Estado vacío cuando la búsqueda no encuentra nada.
>
> Pruebas manuales: con cada rol (Canjeador y Proveedor ven "No tienes acceso"; Cliente y Nosotros entran), descarga el CSV y ábrelo, cambia el bono y la calculadora, mira a 375 px. Luego regla 12.

**Criterio de aceptación:** calculadora da 17.000 centavos ($170,00) y 18.600 puntos con los valores de ejemplo; el CSV abre con las tildes bien; "No tienes acceso" para Canjeador y Proveedor.

---

## FASE D4 — Cliente: repartir puntos con Excel (`/cliente/repartir`)

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Reemplaza la página de `/cliente/repartir` por el flujo de reparto en lote en cuatro pasos, con estado local. Datos: `MOCK_BATCHES` (cuatro escenarios), `MOCK_CLIENT`, `downloadCsv`. El prototipo **no lee el archivo**: tras elegirlo, un selector "Simular resultado del archivo" carga uno de los escenarios (Archivo correcto / Con errores / Saldo insuficiente / Ya enviado antes).
>
> **Paso 1 — Plantilla:** descarga un .xlsx con N filas (1 a 1.000), hoja Reparto con lista desplegable de tipo de documento en cada fila y hoja Instrucciones; el CSV queda como alternativa. Texto de ayuda: tipos de documento válidos, comisión y referencia.
> **Paso 2 — Subir y revisar:** `input type=file` (acepta `.xlsx,.csv`, texto "Máximo 5 MB y 1.000 filas") y botón "Revisar archivo". El prototipo lee el archivo, calcula puntos con el tramo base del Cliente y permite comprar lo que falta. Revisar **no cambia nada** (dilo en pantalla).
> **Paso 3 — Revisión:** tarjetas con filas, total de puntos, bolsa antes y bolsa después. Tabla con número de fila, documento, puntos, referencia y estado ("Correcta" o el `error` en rojo). Reglas:
> - Si alguna fila tiene `error`: aviso rojo "Corrige el archivo y vuelve a subirlo. No se envía nada hasta que todas las filas estén correctas." y **Enviar deshabilitado** (todo o nada).
> - Si `totalPoints > bagBefore`: aviso rojo "Tu bolsa tiene X puntos y este reparto necesita Y. Faltan Z." con botón "Comprar puntos" (→ `/cliente/comprar`) y **Enviar deshabilitado**.
> - Si hay `alreadySentAt`: aviso amarillo "Este archivo ya se envió el <fecha>." y casilla obligatoria "Entiendo que se enviará de nuevo".
> - Siempre: casilla obligatoria "Declaro estar autorizado a entregar estos puntos a estas personas y a tratar sus datos".
> - **No muestres** en ningún lugar si un documento ya está registrado.
> **Paso 4 — Enviar:** botón "Enviar reparto" (habilitado solo si todo lo anterior se cumple) → `AlertDialog` con el texto exacto "Esta acción no se puede deshacer. Se descontarán N puntos de tu bolsa." → regla 7 → pantalla "Reparto enviado" con total, filas y bolsa nueva, botón "Descargar resumen (CSV)" (estado único "Enviado"), enlace "Ver lo repartido" y botón "Hacer otro reparto" (reinicia el flujo). Una vez enviado, no hay forma de volver a editar ese reparto ni de cancelarlo.
>
> Pruebas manuales: los cuatro escenarios (en "Con errores" Enviar no se habilita; en "Saldo insuficiente" aparece "Faltan 7.000"; en "Ya enviado" pide la casilla extra; en "Correcto" envía y no hay vuelta atrás), el doble clic en Enviar no duplica, 375 px. Luego regla 12.

**Criterio de aceptación:** escenario "Con errores": filas 3 y 5 marcadas, Enviar bloqueado; "Saldo insuficiente": 45.000 vs 38.000, faltan 7.000; "Correcto": bolsa 38.000 → 30.650; confirmación con el texto exacto; nada permite deshacer.

---

## FASE D5 — Proveedor: `/proveedor` (resumen, caja, tarjetas, liquidación, condiciones)

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Crea el área **/proveedor** (`allow: ["proveedor"]`; "Nosotros" pasa solo). Archivos: `app/proveedor/layout.tsx`, `components/panel/proveedor-shell.tsx` (pestañas: Resumen `/proveedor`, Caja `/proveedor/caja`, Tarjetas `/proveedor/tarjetas`, Liquidación `/proveedor/liquidacion`, Condiciones `/proveedor/condiciones`) y las páginas. Datos: `MOCK_PROVIDER_KPIS`, `MOCK_PROVIDER_CARDS`, `MOCK_SETTLEMENTS` (filtra `providerId === "p-fybeca"`), `MOCK_PROVIDER_TERMS`.
>
> **Resumen:** 8 `KpiCard` con `MOCK_PROVIDER_KPIS` (tarjetas emitidas, valor facial emitido, tarjetas vivas, saldo pendiente en ellas, consumido en 30 días, liquidación pendiente, liquidación pagada, tarjetas por vencer). Debajo, un aviso "Cada consumo que registres en Caja se liquida a tu favor". Los cambios hechos en Caja (consumos) viven solo en esa página y se pierden al navegar o recargar: es lo esperado en el prototipo (regla 3).
>
> **Caja:** campo "Código de la tarjeta" (formato `FYB-XXXX-XXXX`, sin distinguir mayúsculas) y botón "Buscar"; botón deshabilitado "Escanear QR (próximamente en la app)". Si no existe: "No encontramos esa tarjeta. Revisa el código." Si existe (busca en `MOCK_PROVIDER_CARDS`): ficha con estado (`StatusBadge`), valor, **SALDO EXACTO en grande**, caducidad, titular enmascarado (`holderMasked`). Si está **activa con saldo**: campo "Monto a consumir (USD)" (usa `type="text"` con `inputMode="decimal"`, no `type="number"`; acepta coma o punto; convierte a centavos con `Math.round(valor * 100)` y compara SIEMPRE en centavos, nunca decimales; > 0, ≤ saldo, máximo 2 decimales; rechaza vacío, negativos y notación como "1e1"; errores en español: "Ingresa un monto mayor que 0.", "El monto supera el saldo de la tarjeta ($X).", "Usa como máximo 2 decimales.") y botón "Registrar consumo" → `AlertDialog` "Se descontarán $X de esta tarjeta. Se avisará al cliente por correo. Esta acción no se puede deshacer." → regla 7 (un doble clic no debe registrar dos consumos) → el saldo baja (estado local), pasa a "Consumida" si llega a 0, `toast`. Otros estados: **caducada** → "Tarjeta caducada: no se puede consumir."; **cambiada** → "Esta tarjeta fue cambiada por puntos: no se puede consumir."; **consumida** → "La tarjeta no tiene saldo."
>
> **Tarjetas:** tabla con código, valor, saldo, estado, emitida, vence, titular enmascarado; filtro por estado, buscador por código, estado vacío, botón "Descargar CSV" (`downloadCsv`). **Nunca** documento completo ni correo. Regla 13 en este área: el Proveedor no ve puntos, ni lo que paga el cliente final, ni márgenes de Regala; solo su propio valor de tarjeta, saldo y liquidación.
>
> **Liquidación:** `KpiCard` pendiente y pagada; tabla de periodos con consumos, monto, estado ("Pendiente" / "Facturada" / "Pagada", con color) y referencia de factura. Texto: "Se te paga por cada consumo registrado en Caja, liquidado cada mes."
>
> **Condiciones:** tarjeta de solo lectura con descuento sobre valor facial (`formatPct`), caducidad (días), vigente desde, y la nota. Texto: "Estas condiciones las acordamos contigo. Para cambiarlas, escríbenos." (enlace a `/contact`).
>
> Pruebas manuales: busca `FYB-7K2M-9QX4` (activa, $18,00), intenta consumir $20 (error) y $5 (baja a $13); busca `FYB-4B7Q-2ZVM` (caducada), `FYB-6M3S-5PJC` (cambiada), `FYB-9N6T-3KWE` (consumida); código inexistente; CSV; con Canjeador y Cliente ves "No tienes acceso"; 375 px. Luego regla 12.

**Criterio de aceptación:** consumir $5 de $18,00 deja $13,00 y no deja pasar $20; las tarjetas caducada/cambiada/consumida no permiten consumir; en ninguna pantalla aparece un documento completo.

---

## FASE D6a — Admin: Clientes, Proveedores y Precios

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Crea las secciones de administración con un **grupo de rutas** `app/admin/(secciones)/` para no tocar `/admin` (el editor de catálogo con clave sigue igual). Archivos: `app/admin/(secciones)/layout.tsx` (servidor, `noindex`), `components/panel/admin-shell.tsx` (`allow: []`: solo "Nosotros"; pestañas: Catálogo `/admin`, Clientes `/admin/clientes`, Proveedores `/admin/proveedores`, Precios `/admin/precios`, Usuarios `/admin/usuarios`, Liquidaciones `/admin/liquidaciones`, Ajustes `/admin/ajustes`), y las páginas `clientes`, `proveedores`, `precios`. Para `usuarios`, `liquidaciones` y `ajustes` crea páginas con "Próximamente" (las hace D6b). En `app/admin/page.tsx` agrega **únicamente** un enlace "Más secciones →" a `/admin/clientes` junto al título; no toques nada más de ese archivo. Datos: `MOCK_CLIENTS_ADMIN`, `MOCK_PROVIDERS`, `MOCK_PRODUCTS`, `MOCK_STANDARD_PACKS`, `MOCK_PUBLIC_PACKS`, `MOCK_SETTINGS` y las funciones de `lib/domain/pricing.ts` (`validatePricing`, `productCostCents`, `productPriceCents`, `pointsPrice`, `referenceCentsPerPoint`, `marginAtPack`). **Recuerda: estos cálculos son solo vista previa; no inventes fórmulas.**
>
> **Clientes:** tabla (nombre, precio por punto, bono, puntos en bolsa, modo de paquetes, estado). "Nuevo cliente" y "Editar" en `Dialog`: nombre, precio por punto (USD, 5 decimales), modo (estándar / propio) y, si es propio, editor de tramos (USD y puntos; muestra el "USD por punto" de cada tramo). **Antes de guardar** llama a `validatePricing` con el cambio aplicado y muestra los problemas: los de `severity: "error"` **bloquean** "Guardar" (con su mensaje), los `warning` solo avisan. Texto: "Un cambio de precio afecta solo a los puntos que este cliente compre después; los ya vendidos no cambian." El bono lo cambia el Cliente, no se edita aquí (solo se muestra).
> **Proveedores:** tabla (nombre, descuento, caducidad en días, estado). `Dialog` de edición: descuento (%), caducidad (días), activo. Al cambiar el descuento, muestra una **vista previa** con los productos de ese proveedor: costo nuevo, precio en USD, puntos de la tarjeta y margen en el tramo estándar de $10; bloquea "Guardar" si `validatePricing` da errores. Texto: "Las condiciones nuevas aplican solo a tarjetas emitidas después."
> **Precios:** (1) tabla de productos con tienda, proveedor, valor facial, costo, transporte, margen %, **precio USD**, **puntos** y el margen % en cada tramo estándar (10/50/100), en rojo si baja del `minMarginPct`; botón "Editar" (margen % y costo directo opcional) con la misma validación; (2) tablas de paquetes (estándar, público y el de cada cliente con tabla propia, con selector) mostrando USD, puntos, USD por punto y ahorro vs el primer tramo; (3) panel "Reglas del sistema": lista de problemas de `validatePricing`, o "Todas las reglas se cumplen" en verde; (4) un botón "Probar un caso con error" que, solo en estado local, sube los puntos del primer paquete público para romper la regla "el Canjeador paga más por punto", para ver cómo se muestra y bloquea; con "Volver al estado original".
>
> Pruebas manuales: con Canjeador/Cliente/Proveedor ves "No tienes acceso"; con Nosotros entras. Edita un proveedor con descuento 0 % (debe bloquear por la regla 1: el precio supera el valor facial y el paquete de $10 ya no alcanza), un cliente en modo propio al que le subes mucho los puntos de un tramo (debe saltar la regla 2 o la 3), y el botón de caso con error. Nota: `validatePricing` solo revisa los **paquetes** (estándar, público y los propios); el campo "precio por punto" de un cliente en modo estándar es informativo y no dispara reglas. 375 px. Luego regla 12.
>
> IMPORTANTE: **NO ejecutes `npm run build`** con `npm run dev` abierto; ejecuta solo `npx tsc --noEmit`. Commit "feat: administración clientes, proveedores y precios (Fase D6a)" y `git push`. Si falta un tipo o dato, DETENTE y pregunta.

**Criterio de aceptación:** con datos originales "Todas las reglas se cumplen"; descuento 0 % en Fybeca genera el error de la regla 1 (más errores de la regla 4) y bloquea Guardar; el caso con error muestra la regla 2 en rojo; `/admin` sigue funcionando.

---

## FASE D6b — Admin: Usuarios, Liquidaciones y Ajustes

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. Reemplaza las páginas "Próximamente" de `usuarios`, `liquidaciones` y `ajustes` dentro de `app/admin/(secciones)/`. Datos: `MOCK_USERS`, `MOCK_PROVIDERS`, `MOCK_CLIENTS_ADMIN`, `MOCK_SETTLEMENTS`, `MOCK_SETTINGS`, `MOCK_PROFILES.admin`.
>
> **Usuarios:** tabla (nombre, correo, rol con insignia, documento enmascarado, alta, estado), buscador y filtro por rol. Acciones por fila: "Cambiar rol" (`Dialog`: selector de rol; si el rol es Cliente pide elegir el **cliente** vinculado (`MOCK_CLIENTS_ADMIN`); si es Proveedor, el **proveedor** (`MOCK_PROVIDERS`); confirmación con `AlertDialog` "Vas a cambiar el rol de X a Y.") y "Bloquear/Desbloquear" (con confirmación). **La fila del usuario administrador actual (`MOCK_PROFILES.admin`, id `u-admin`) no permite cambiar su propio rol ni bloquearse** (botones deshabilitados con `Tooltip` "No puedes cambiar tu propio rol" / "No puedes bloquearte a ti mismo"). Tampoco se puede dejar al sistema sin ningún administrador activo. Estado local.
> **Liquidaciones:** `KpiCard` total pendiente, total facturado, total pagado. Tabla de `MOCK_SETTLEMENTS` con proveedor, periodo, consumos, monto, estado y referencia; filtros por proveedor y estado. Acciones: "Marcar como facturada" (pide referencia de factura, obligatoria) y "Marcar como pagada" (`AlertDialog`); los estados solo avanzan (Pendiente → Facturada → Pagada), nunca retroceden; "Marcar como pagada" solo aparece en las Facturadas, y una Pagada no ofrece acciones. La referencia de factura se recorta (`trim`) y no puede quedar vacía. "Descargar CSV".
> **Ajustes:** formulario con `minMarginPct` (% , 0–100), `exchangeFeePct` (% , 0–100), `exchangeWindowDays` (entero ≥ 0), `pendingGrantDays` (entero ≥ 1) y `pointsMultiple` (solo lectura, 100). Cada campo con texto de ayuda: margen mínimo "Ningún precio puede dejar menos margen que este"; recargo "Se cobra al cambiar una tarjeta caducada por puntos"; plazo "Días después de caducar en que aún se puede cambiar"; pendientes "Días para que un reparto no reclamado vuelva a la bolsa del cliente (por defecto 90)". Validación en español. **Antes de guardar** llama a `validatePricing` con los ajustes nuevos (y los datos de `MOCK_PROVIDERS`, `MOCK_PRODUCTS`, `MOCK_STANDARD_PACKS`, `MOCK_PUBLIC_PACKS`, `MOCK_CLIENTS_ADMIN`): si subir `minMarginPct` hace aparecer errores, bloquea "Guardar" y los muestra. Los porcentajes se guardan como fracción (0,05 = 5 %) redondeando para evitar decimales largos. Botón "Guardar" con `toast` y "Restablecer" a los valores originales.
>
> Pruebas manuales: cambia el rol de Pedro a Cliente (te pide el cliente), intenta cambiar tu propio rol y bloquearte (bloqueado), bloquea y desbloquea a otro usuario; factura (sin referencia no deja) y paga una liquidación pendiente (no se puede retroceder); ajustes con valores inválidos y con un margen mínimo tan alto (ej. 60 %) que `validatePricing` dé errores. 375 px. Luego regla 12.
>
> IMPORTANTE: **NO ejecutes `npm run build`** con `npm run dev` abierto; solo `npx tsc --noEmit`. Commit "feat: administración usuarios, liquidaciones y ajustes (Fase D6b)" y `git push`. Si falta un tipo o dato, DETENTE y pregunta.

**Criterio de aceptación:** el administrador no puede cambiar su propio rol; facturar exige referencia; una liquidación pagada no ofrece acciones; `pendingGrantDays` 0 se rechaza; un margen mínimo que rompe las reglas bloquea Guardar.

---

## FASE D7 — Revisión transversal

**Prompt para Haiku:**

> Lee `PLAN-FASE-D.md` secciones 0 y 1. No agregues funciones nuevas. Revisa y corrige **todas** las pantallas de D1–D6b: (1) la matriz de acceso de la sección 1, probando cada ruta con cada rol y anotando el resultado en una tabla en `PLAN-FASE-D.md` bajo "Resultado de D7"; (2) responsive a 375, 768 y 1280 px (sin scroll horizontal de página, tablas usables); (3) accesibilidad básica: todo campo con `label`, botones con texto o `aria-label`, foco visible, `aria-current` en la pestaña activa; (4) estados vacío y cargando en toda lista; (5) textos: todo en español, sin "undefined", sin centavos crudos, "declaración" en lugar de "verificación"; (6) consola del navegador sin errores ni avisos de React; (7) enlaces rotos (recorre todos los menús). Corrige lo que encuentres sin cambiar los archivos de la tabla 0. Luego regla 12.

**Criterio de aceptación:** tabla de resultados completa, 20 rutas × 4 roles sin discrepancias con la matriz, build limpio.

---

### Resultado de D7 (barrido automático hecho por Claude, no por Haiku)

| Verificación | Resultado |
|---|---|
| Matriz de acceso: 20 rutas × 4 roles (80 combinaciones, a 1280 px) | 0 discrepancias con la matriz de la sección 1 |
| Scroll horizontal a 375, 768 y 1280 px (240 cargas) | 0 casos |
| Textos: "undefined", "NaN", "[object", "verificamos/verificado" | 0 casos |
| Consola (errores y avisos) | 1 aviso 404 de un recurso en la primera carga de `/cuenta`; no se reprodujo en una segunda corrida (probable prefetch de enlaces) |
| Enlaces internos de los menús (29 únicos) | 0 rotos |
| Accesibilidad: campos sin etiqueta y botones sin nombre | 2 corregidos: botón "Editar" de Precios y buscador del encabezado. El resto de lo marcado eran falsos positivos de componentes Radix |

---

## Después de la Fase D

Cuando apruebes las pantallas, Claude **congela el contrato**: ajusta `lib/domain/types.ts` a lo que realmente muestran y empieza **B1** (`PLAN-BACKEND.md`). Las pantallas se conectan al backend en las fases B2–B9 reemplazando `lib/mock/*` por las funciones del servidor.
