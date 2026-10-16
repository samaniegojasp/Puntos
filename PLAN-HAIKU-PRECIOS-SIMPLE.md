# PLAN-HAIKU-PRECIOS-SIMPLE — Quitar las reglas y fijar dos precios por tarjeta

Fecha: 2026-10-16. Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.
Ejecutor: Haiku / Antigravity. Revisión posterior: Claude (Opus/Sonnet).

## 0. Por qué y qué se decidió (léelo completo)
El sistema de reglas de precios 1–8 se volvió demasiado complejo. El dueño decidió **empezar casi de nuevo con un modelo simple**:

1. **Se eliminan las reglas de precios.** Nada bloquea ni avisa por márgenes, holguras, beneficio mínimo ni límites de precio por punto. Ni al guardar en Ajustes, Precios, Clientes o Proveedores, ni al aprobar o enviar tarjetas de Proveedores.
2. **En Precios, cada tarjeta tiene dos precios en USD que Nosotros editamos:**
   - **Canjeador General**: lo que paga quien compra puntos por su cuenta.
   - **Canjeador de Cliente**: lo que ingresa Regala cuando se canjea con puntos que vienen de un Cliente (el Cliente los compró más baratos).
3. **Misma cantidad de puntos para los dos.** La tarjeta cuesta los mismos puntos para todos. Los puntos salen del precio **General**. El precio **de Cliente** solo cambia cuánto ingresa y cuánto margen deja.
4. **Todo lo demás se calcula** desde esos dos precios: puntos de la tarjeta, ingreso, margen de cada caso.

**Fuera de alcance de este plan (NO tocar):** paquetes de puntos y tablas de Clientes (se siguen editando como hoy, pero sin reglas), planilla de reparto, compra del faltante, catálogo del Proveedor (salvo quitarle el chequeo de reglas), `lib/domain/grants.ts`, `lib/domain/xlsx-template.ts`.

Confidencialidad que SE MANTIENE: solo "Nosotros" ve costos, márgenes y precios por punto. Canjeador, Cliente y Proveedor siguen viendo solo "USD → puntos".

## 1. Antes de empezar
1. `git status` debe estar limpio salvo `package-lock.json` (sin versionar a propósito, no lo añadas).
2. Crea una etiqueta de respaldo para poder volver: `git tag antes-de-quitar-reglas` (no la subas con push).
3. Trabaja en dos partes y haz **un commit por parte**, sin `package-lock.json`:
   - Parte V → `refactor(precios): eliminar reglas de precios y sus bloqueos`
   - Parte W → `feat(precios): precio por tarjeta para Canjeador General y Canjeador de Cliente`
4. Después de **cada paso** corre `npx tsc --noEmit` (debe dar 0 errores al terminar cada parte; dentro de la Parte V habrá errores transitorios entre V1 y V5). **No** ejecutes `npm run build` con `npm run dev` abierto. No uses `rm -rf`.

---

## PARTE V — Eliminar las reglas (no cambia ningún cálculo)

### Paso V1/6 — Dominio
- `lib/domain/pricing.ts`:
  - Borra `validatePricing`, el tipo `PricingInput`, la función auxiliar `centsPerPointAt` (solo la usaba la validación) y el import de `PricingIssue`.
  - **Conserva** todo lo demás: `centsPerPoint`, `referenceCentsPerPoint`, `productCostCents`, `productPriceCents`, `productTotalCostCents`, `productPoints`, `pointsPrice`, `marginAtPack`, `bonusFromSale`, `exchangePreview`.
- `lib/domain/types.ts`:
  - Borra el tipo `PricingIssue`.
  - En `AdminSettings` borra `minMarginPct`, `minPackHeadroomPct`, `pricePerPointMin`, `pricePerPointMax`, `clientBenefitPct`.
  - **Conserva** `exchangeFeePct`, `exchangeWindowDays`, `pendingGrantDays`, `pointsMultiple`, `pointsFactor`, `redeemSurchargePct`, `customMinUsd`, `customMaxUsd`, `customPointsPerUsd`, `cardDenomMinUsd`, `cardDenomMaxUsd`.
- `lib/mock/data.ts` (línea de `MOCK_SETTINGS`, ~217): quita `minMarginPct`, `minPackHeadroomPct` y `clientBenefitPct`.
- `lib/domain/points-factor.ts`: quita el reescalado de `pricePerPointMin` y `pricePerPointMax` (~líneas 48–53). El resto del reescalado (paquetes públicos, estándar, de Clientes, `customPointsPerUsd`) queda igual.
- `lib/domain/card-requests.ts`: borra `PricingContext`, `pricingErrorsFor`, `incompatibleDenoms`, `providerSafeMessage` y los imports que queden sin uso (`validatePricing`, `PricingIssue`, `AdminSettings`, `ClientAdminRow`, `PointsPack`, `Provider`, etc.). **Conserva** `CardRequest`, `CardRequestStatus`, `slugify`, `uniqueStoreId`, `validateCardRequestDraft`, `requestToProducts`.
- Aquí `tsc` dará errores en las pantallas: es lo esperado, se arreglan en V2–V5.

### Paso V2/6 — Editor de paquetes
`components/panel/packs-editor.tsx`:
- Quita la prop `validate` y el tipo `PricingIssue`.
- Cada barra recorre **todos** los pasos de puntos entre el 60 % y el 140 % de la base (`LOW`/`HIGH` se quedan), sin filtrar por reglas.
- `canSave` = hay paquetes, no hay montos repetidos y todos tienen monto y puntos > 0. Quita el `Alert` de `issues`.
- Cambia la descripción por defecto: ya no menciona "reglas" (ej.: "Lo que el Canjeador compra por su cuenta (USD → puntos). Cambiar un paquete mueve el punto de referencia y el precio en puntos de todas las tarjetas.").
- Si queda una marca "valor no válido" ligada a `isValid`, quítala o déjala solo para "fuera del rango de la barra".

### Paso V3/6 — Pantalla Precios (solo quitar reglas; las columnas nuevas van en la Parte W)
`app/admin/(secciones)/precios/page.tsx`:
- Borra la tarjeta "Reglas del sistema de precios", el botón y la función "Probar un caso con error" (`handleToggleErrorCase`, `isErrorCaseActive`) y los imports que queden sin uso (`ShieldAlert`, `RotateCcw`, `CheckCircle2`, `AlertCircle`, `AlertTriangle`, `MOCK_PUBLIC_PACKS`, `rescaleForFactor` si ya no se usa, etc.).
- Borra `currentIssues`, `dialogIssues`, `dialogErrors`, `dialogWarnings`, `validatePublicPacks`, `validateStandardPacks`. El diálogo de editar producto siempre se puede guardar (`canSaveProduct` desaparece) y ya no muestra los bloques "No se puede guardar" ni "Avisos".
- En los `PacksEditor` quita la prop `validate` y, en el de estándar, el texto de `description` que habla de reglas ("Cada barra solo permite valores que cumplen las reglas…" → "Lo que paga un Cliente sin tabla propia (USD → puntos).").
- Quita los colores rojos ligados a `settings.minMarginPct` (los márgenes se muestran en gris, sin alarma).
- Cambia el subtítulo del encabezado a: "Costos, precios en dólares, puntos y márgenes".

### Paso V4/6 — Clientes, Proveedores, Resumen
- `app/admin/(secciones)/clientes/page.tsx`: quita `validatePricing`, el cálculo de errores/avisos, el bloque "Avisos de validatePricing" y la frase de ~línea 548 que menciona `validatePricing`. El botón de guardar solo se bloquea por errores **de formulario** (nombre vacío, montos repetidos, etc.), nunca por reglas de precios.
- `app/admin/(secciones)/proveedores/page.tsx`: igual (líneas ~95–152, bloque de avisos ~448, y el color `isMarginLow` de ~416 → sin alarma). Guardar solo se bloquea por errores de formulario (descuento fuera de 0–100 %, nombre vacío…).
- `app/admin/(secciones)/resumen/page.tsx`: quita `validatePricing` (~línea 242) y el aviso/KPI que mostraba "errores de reglas de precios". El resto del Resumen queda igual.

### Paso V5/6 — Ajustes, Solicitudes, Catálogo del Proveedor
- `app/admin/(secciones)/ajustes/page.tsx`:
  - Quita los campos, estados y textos de: **margen mínimo**, **beneficio mínimo del Cliente**, **holgura del paquete más pequeño (30 %)** y **límites de precio por punto**. Quita su parte de "Restablecer valores" y de los `candidateSettings`.
  - Quita `validatePricing`, `pricingIssues`, `pricingErrors`, `pricingWarnings`; `canSave` depende solo de los errores de formulario de los campos que quedan.
  - **Factor de conversión:** conserva la contraseña de admin y el reescalado (`rescaleForFactor`), pero **quita la pre-validación** (~líneas 345–365) que impedía aplicar un factor si rompía reglas. Aplicar el factor reescala paquetes y `customPointsPerUsd` como hoy.
  - **Conserva:** recargo (`redeemSurchargePct`), múltiplo de puntos, comisión de canje (`exchangeFeePct`), ventana de canje, días de reparto pendiente, límites de la compra a tu medida y límites de valores de tarjeta.
  - En la vista previa por múltiplo (~línea 842) no cambies el cálculo de puntos.
- `app/admin/(secciones)/solicitudes/page.tsx`:
  - Quita `pricingCtx`, `PricingContext`, `pricingErrorsFor`, `incompatibleDenoms`, `providerSafeMessage` y el aviso/bloqueo de aprobación por reglas. **Aprobar** siempre es posible (crea la tienda y sus productos con el descuento del Proveedor, como hoy).
  - Al abrir "Rechazar", el motivo empieza **vacío** (ya no se rellena solo). Se conserva: obligatorio, máx. 300 caracteres y el aviso "no incluyas precios, márgenes ni reglas".
  - En la tabla de márgenes por valor (~líneas 626–645) quita el color rojo `isBelow` (usaba `minMarginPct`).
- `app/proveedor/catalogo/page.tsx`: quita `pricingCtx`, `incompatibleDenoms`, `providerSafeMessage` (~líneas 139 y 236). Guardar borrador y enviar solo dependen de `validateCardRequestDraft`. El Proveedor ya no recibe mensajes de "valores no compatibles".

### Paso V6/6 — Documentación y verificación de la Parte V
- `CLAUDE.md`: en "Decisiones de negocio vigentes" reemplaza el punto **"Modelo de precios (oct 2026)"** por: "Sin reglas de validación de precios (eliminadas el 2026-10-16). Cada tarjeta tiene dos precios en USD que edita Nosotros en Precios: Canjeador General y Canjeador de Cliente. Los puntos de la tarjeta salen del precio General al punto de referencia (paquete más pequeño del Canjeador), redondeados hacia arriba al múltiplo de puntos; el precio de Cliente solo cambia ingreso y margen. Recargo global = valor por defecto del precio General." Mantén el resto (confidencialidad, reparto, catálogo del Proveedor sin la parte de bloqueo por reglas: ahora aprobar no se bloquea). Añade una línea: "`PLAN-ROLES.md` §5.3 (reglas 1–8) quedó reemplazado por esta decisión."
- Busca restos: `Grep` de `validatePricing|PricingIssue|minMarginPct|minPackHeadroomPct|clientBenefitPct|pricePerPointMin|pricePerPointMax|pricingErrorsFor|incompatibleDenoms|providerSafeMessage` en todo `*.ts`/`*.tsx` → **0 resultados** (los `.md` pueden mencionarlos).
- `npx tsc --noEmit` → 0 errores. **Commit de la Parte V** (sin `package-lock.json`).

---

## PARTE W — Dos precios por tarjeta en Precios

### Paso W0 — Correcciones de la revisión de la Parte V (hazlas primero, mismo commit de la Parte W)
Decisión del dueño: **la compra a tu medida ya no tiene tope ligado al paquete más pequeño del Canjeador.** Y quedan 3 textos sueltos que aún mencionan reglas.
1. `app/admin/(secciones)/ajustes/page.tsx`, sección "Compra a tu medida":
   - Texto (~línea 445): cambia a "Además de los paquetes, los Clientes y Nosotros pueden comprar el monto en dólares enteros que elijan, al precio que fijes aquí."
   - Slider "Puntos por cada dólar" (~líneas 470–482): el máximo pasa a ser fijo, `200 * f` (con `f = pointsFactor ?? 1`); el mínimo sigue en `50 * f`. Ajusta `max`, el `value` acotado y el texto "Máximo … (el del paquete más pequeño)" → "Máximo {200 * f} pts/$".
   - Elimina `smallestPublicPpd` (~líneas 163–166) si queda sin uso. `EditableNumber` sigue aceptando cualquier valor > 0.
   - No toques `customPointsPerUsd`, `customMinUsd`, `customMaxUsd` ni su reescalado por factor.
2. `app/admin/(secciones)/solicitudes/page.tsx` (~línea 439): la descripción del diálogo dice "Detalles de la tarjeta y verificación de reglas de precios." → "Detalles de la tarjeta, valores a aprobar y vista previa de precios y márgenes."
3. `app/admin/(secciones)/clientes/page.tsx` (~líneas 409–413): el mensaje "No existe un precio por punto que cumpla las reglas con los datos actuales." → "Indica un monto mayor a 0 para calcular la barra de puntos."
4. `app/admin/(secciones)/ajustes/page.tsx`, encabezado (~línea 257): "Parámetros globales de margen comercial, recargos y vigencias de la plataforma" → "Parámetros globales de recargos, vigencias y compra a tu medida". Y en el texto de la tarjeta de parámetros (~línea 371) cambia "rigen el motor de fijación de precios, liquidaciones y caducidades" por "rigen recargos, liquidaciones y caducidades".
5. `Grep` en `*.tsx` de `reglas de precios|cumpla las reglas|cumplen las reglas|rompen reglas|manteniendo las reglas` → 0 resultados.
6. Prueba en el navegador (Admin → Ajustes): el slider de "Puntos por cada dólar" llega hasta `200 * f`, se puede guardar un valor mayor a 100 (por ejemplo 120) y se guarda sin avisos.

### Paso W1/4 — Datos y cálculos
- `lib/domain/types.ts`, tipo `Product`: añade
  - `priceGeneralCents?: number` — precio fijado a mano para el Canjeador General (centavos de USD). Si no existe, vale `valor facial × (1 + recargo)`.
  - `priceClientCents?: number` — precio fijado a mano para el Canjeador de Cliente. Si no existe, se calcula (ver abajo).
- `lib/domain/pricing.ts`:
  - `productPriceCents(p: Pick<Product, "faceCents" | "priceGeneralCents">, settings)` → `p.priceGeneralCents ?? Math.round(p.faceCents * (1 + (settings.redeemSurchargePct ?? 0.03)))`. `productPoints` sigue igual (usa este precio), así que **los puntos salen del precio General**.
  - Nueva `clientReferenceCentsPerPoint(standardPacks: PointsPack[])` → `centsPerPoint` del paquete **estándar** de menor monto.
  - Nueva `productClientPriceCents(p: Pick<Product, "priceClientCents">, pts: number, clientRefCentsPerPoint: number)` → `p.priceClientCents ?? Math.round(pts * clientRefCentsPerPoint)`.
  - Nueva `cardMargin(priceCents: number, totalCostCents: number)` → `{ marginCents: priceCents - totalCostCents, marginPct: totalCostCents > 0 ? (priceCents - totalCostCents) / totalCostCents : 0 }` (margen sobre el costo, igual que `marginAtPack`).
- Haz una prueba con Node (copia los `.ts` a la carpeta temporal con imports `.ts` y `node --experimental-strip-types`) con estos casos:
  - Sin override: tarjeta de $10 y recargo 3 % → precio General $10.30 y 1.030 pts (con paquete de referencia $15 = 1.500 pts y múltiplo 10).
  - Con `priceGeneralCents: 1100` → precio $11.00 y puntos = `pointsPrice(1100, ref, 10)`.
  - Con `priceClientCents` definido → `productClientPriceCents` lo devuelve tal cual; sin él devuelve `round(pts × centavos por punto del paquete estándar menor)`.
  - `cardMargin(1030, 950)` → margen 80 ¢ y 8,4 %.

### Paso W2/4 — La tienda respeta el precio General
- `lib/mock/admin-settings.tsx`: `useCardPoints()` devuelve `(usd: number, storeId?: string) => number`. Si se pasa `storeId` y existe un producto activo con ese `storeId` y `faceCents === usd * 100`, usa `productPoints(producto, settings, ref)` (respeta `priceGeneralCents`); si no, el cálculo actual.
- Actualiza los llamadores para pasar el `storeId` donde lo conozcan: `lib/points-store.tsx`, `components/gift-card.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/admin/(secciones)/page.tsx`. Si algún sitio no conoce la tienda, déjalo como está (sin `storeId`).
- Comprueba que los ids de tienda de `lib/catalog.ts` coinciden con `Product.storeId` de los productos de ejemplo. Si no coinciden, dilo en el informe y no inventes una solución.

### Paso W3/4 — Tabla de Precios con las dos columnas
`app/admin/(secciones)/precios/page.tsx`, tabla "Tarjetas virtuales y márgenes":
- Columnas, en este orden: **Tienda · Proveedor · Facial · Costo · Transp. · Canjeador General (USD, editable) · Puntos · Margen General · Canjeador de Cliente (USD, editable) · Margen Cliente · Acción**. Se reemplazan las tres columnas "Margen tramos estándar".
- Las dos columnas de precio usan `EditableNumber` (`decimals`, sufijo "USD"). Al confirmar, guarda en el producto `priceGeneralCents` o `priceClientCents` (`Math.round(valor * 100)`) con `setProducts`; muestra `toast.success`.
- Si el precio está fijado a mano, muestra un punto "·" junto al valor y un botón pequeño "Restablecer" que borra el override (vuelve al cálculo automático). Si no está fijado, se ve el valor con la etiqueta gris pequeña "automático".
- "Puntos" = `productPoints` (sale del precio General). Ten presente que subir el precio un centavo puede no cambiar los puntos (se redondean hacia arriba al múltiplo configurado); no hace falta avisarlo en la tabla.
- "Margen General" = `cardMargin(precio General, costo total)`; "Margen Cliente" = `cardMargin(precio de Cliente, costo total)`. Se muestran como `$ margen` y `%` (sin colores de alarma; un margen negativo se escribe con signo menos).
- El precio de Cliente automático usa `clientReferenceCentsPerPoint(standardPacks)`.
- El diálogo de editar producto (costo directo, caducidad) se conserva; su vista previa pasa a mostrar: precio General, puntos, margen General, precio de Cliente, margen Cliente (en lugar de los tres márgenes por tramo).
- Mantén `overflow-x-auto` y `min-w` en la tabla (que se desplace en 375 px).
- Un precio ≤ 0 no se acepta (ya lo hace `EditableNumber`).

### Paso W4/4 — Documentación y verificación de la Parte W
- `CLAUDE.md`: ya describe el modelo (paso V6). Añade en "Código clave" una línea: "`lib/domain/pricing.ts`: precios por tarjeta (General y de Cliente), puntos y margen".
- Prueba en el navegador (`npm run dev`), rol Admin:
  1. En Precios se ven las dos columnas con valores automáticos.
  2. Cambia el precio General de una tarjeta de $10 a $11 → los puntos cambian y el margen General sube; abre la tienda `/shop` y comprueba que esa tarjeta muestra los puntos nuevos.
  3. Cambia el precio de Cliente → solo cambian el precio y el margen de Cliente; los puntos no cambian.
  4. "Restablecer" devuelve el valor automático.
  5. Canjeador, Cliente y Proveedor siguen sin ver costos ni márgenes.
  6. Aprobar una solicitud de tarjeta de un Proveedor funciona sin ningún bloqueo de reglas.
  7. 375 px: la tabla se desplaza sin romper la página.
- `npx tsc --noEmit` → 0 errores. **Commit de la Parte W** (sin `package-lock.json`).

---

## 2. Criterios de aceptación (los comprobará Claude al revisar)
- Cero referencias a las reglas en el código (`Grep` del paso V6).
- Ningún bloqueo ni aviso de precios en ninguna pantalla.
- Los puntos de cada tarjeta salen del precio General; el precio de Cliente no los cambia.
- La tienda refleja un precio General editado.
- `tsc` = 0 errores y los dos commits creados, sin `package-lock.json`.

## 3. Riesgos conocidos (para la revisión)
- Al quitar las reglas, nada impide dejar márgenes negativos. Es lo que se decidió; los márgenes se ven en la tabla.
- El precio de Cliente por tarjeta todavía **no** alimenta las tablas de paquetes de los Clientes ni el reparto (siguen usando sus tramos). Se unificará en una siguiente parte.
- El estado del prototipo vive en memoria: al recargar, los precios editados vuelven a los de ejemplo.
