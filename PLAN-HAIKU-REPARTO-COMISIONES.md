# Plan para Haiku / Antigravity — Reparto por comisión: planilla nueva, puntos calculados en la web y compra de lo que falta

Dos partes **en este orden** (O → P), un prompt y un commit por parte. Al final de cada una, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas (no negociables)
1. Solo toca los archivos que nombra cada paso. Si algo no cuadra, DETENTE y pregunta. No cambies `lib/domain/pricing.ts`.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. **Confidencialidad:** el Cliente nunca ve el precio por punto; solo "USD → puntos" (por ejemplo "$131 → 13.477 pts"). No muestres `usdPerPoint` en pantallas de Cliente.
4. Commit solo con los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.
5. Para probar un rol, usa la barra "Prototipo · Ver como" (rol Cliente).

## Decisiones del dueño (oct 2026)
1. **Planilla** (columnas en este orden): Tipo de documento · Número de documento · Correo electrónico · Valor de comisión ($) · Referencia. **Sin columna de puntos.**
2. **Puntos = valor de comisión ÷ precio del punto del Cliente**, redondeado hacia abajo. El precio del punto es el de su tramo más pequeño (para Concesionaria Andina: $170 → 17.490 pts). El % de bono ya no interviene en el reparto; "Mi bono" queda como calculadora para saber cuánta comisión poner.
3. **Al cargar el archivo**, la web calcula y muestra la lista con los puntos de cada canjeador, el **total de puntos necesarios**, el **saldo actual** de la bolsa, el **faltante** y un **botón para comprarlo**.
4. **Comprar lo que falta = monto exacto en dólares enteros**, al precio del punto del Cliente (los dólares se redondean hacia arriba, así no sobran puntos de más). **La pestaña "Comprar puntos" se mantiene** y ahora también suma a la bolsa.
5. Se **elimina el selector "Simular resultado del archivo"**: el prototipo lee de verdad el archivo subido, en el navegador (el servidor repetirá todo en la versión real).

## Ejemplos de referencia (cifras ya calculadas con los datos reales)
Base de Concesionaria Andina: **$170 = 17.490 pts**, bolsa **38.000 pts**.
- Comisión $20 → 2.057 pts · $5 → 514 · $12,50 → 1.286 · $30 → 3.086 · $1 → 102.
- Archivo de 5 filas ($20, $5, $12,50, $30, $1): total **7.045 pts**, bolsa después **30.955**.
- Archivo de 25 filas de $20: total **51.425 pts**; faltan **13.425**; comprar **$131** da **13.477 pts**; sobran 52; bolsa después del envío: **52 pts**.

---

# PARTE O — Dominio, lector de archivos, planilla y estado compartido

## Paso 1/5 — Tipos y datos
- `lib/domain/types.ts`:
  - `GrantRow` pasa a: `{ rowNo: number; docType: DocType | null; docNumber: string; email: string; commissionCents: number | null; points: number | null; reference?: string; error?: string }`. Borra `saleAmountCents`.
  - `GrantBatch`: agrega `fileHash: string`; `bagBefore` pasa a opcional (`bagBefore?: number`, "saldo de la bolsa al enviar").
  - `GrantedItem`: agrega `email?: string`.
- `lib/mock/data.ts`:
  - Borra `MOCK_BATCHES` y el helper `row(...)` que solo ellos usaban.
  - `MOCK_GRANTED`: agrega `email` a las 5 entregas: g-1 `ana.mora@ejemplo.ec`, g-2 `pedro.r@ejemplo.ec`, g-3 `carlos.t@ejemplo.ec`, g-4 `viajero@ejemplo.ec`, g-5 `sofia.l@ejemplo.ec`.
- `lib/domain/documento.ts`: agrega
  ```ts
  /** "ana.mora@ejemplo.ec" → "a******@ejemplo.ec" (deja el primer carácter del usuario y el dominio). */
  export const maskEmail = (value: string) => {
    const [local, domain] = value.split("@")
    if (!domain) return "—"
    return `${local.slice(0, 1)}${"*".repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`
  }
  ```

## Paso 2/5 — Cálculos y validación (`lib/domain/grants.ts`, archivo nuevo, funciones puras)
```ts
export type BasePack = { usdCents: number; points: number }
/** Tramo más pequeño del Cliente (propio si tiene tabla propia; si no, el estándar). */
export function clientBasePack(client: { packMode: "standard" | "custom"; customPacks: PointsPack[] }, standardPacks: PointsPack[]): BasePack
/** Puntos de una comisión: división entera hacia abajo, con enteros (sin decimales flotantes). */
export const pointsForCommission = (commissionCents: number, base: BasePack) => Math.floor((commissionCents * base.points) / base.usdCents)
/** Compra exacta de lo que falta, en dólares enteros hacia arriba. */
export function purchaseForMissing(missingPoints: number, base: BasePack): { usd: number; points: number }
```
- `clientBasePack`: ordena por `usdCents` y toma el primero; con `packMode === "custom"` y `customPacks.length > 0` usa `customPacks`, si no `standardPacks`.
- `purchaseForMissing`: `cents = Math.ceil(missing * base.usdCents / base.points)`, `usd = Math.max(1, Math.ceil(cents / 100))`, `points = Math.floor(usd * 100 * base.points / base.usdCents)`. Con los ejemplos: faltan 13.425 → `{ usd: 131, points: 13477 }`.
- `export type RawGrantRow = { rowNo: number; tipo: string; numero: string; correo: string; comision: string; referencia: string }` (todo texto, tal como viene del archivo; `rowNo` = número de fila en la hoja, la primera fila de datos es la 2).
- `export function buildGrantBatch(raw: RawGrantRow[], base: BasePack, fileName: string, fileHash: string): GrantBatch` con `id: "b-" + fileHash.slice(0, 8)`, `status: "draft"`. Para cada fila, **un solo error por fila**, revisando en este orden y con estos textos exactos:
  1. **Tipo** (minúsculas, sin tildes, sin espacios; acepta `cedula`, `ruc`, `pasaporte`): si no coincide → `"Elige Cédula, RUC o Pasaporte."`
  2. **Número de documento**: si el valor del archivo es solo dígitos y el tipo es cédula con 9 dígitos, o RUC con 12, antepón un `0` (Excel borra el cero inicial). Luego `validateDocument(tipo, numero)` de `lib/domain/documento.ts`; su mensaje es el error.
  3. **Correo**: minúsculas y sin espacios en los extremos; debe cumplir `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` y tener 120 caracteres o menos. Error: `"El correo electrónico no es válido."`
  4. **Comisión**: quita `$` y espacios; cambia la coma decimal por punto; debe cumplir `/^\d+(\.\d{1,2})?$/`; si no: `"Escribe la comisión en dólares (por ejemplo 20 o 20.50)."`. En centavos con `Math.round(Number(x) * 100)`. Si es 0: `"La comisión debe ser mayor que $0."`. Si supera 10.000.000 de centavos: `"La comisión máxima por fila es $100.000."`
  5. **Puntos**: `pointsForCommission(...)`. Si da 0: `"La comisión es muy baja: no alcanza para 1 punto."`
  6. **Referencia**: más de 60 caracteres → `"La referencia no puede superar 60 caracteres."`
  7. **Duplicado**: si `tipo + número normalizado` ya apareció en una fila anterior → `"Este documento ya aparece en la fila N."` (N = la primera fila donde apareció).
  - Una fila con error conserva lo que se pudo leer y `points: null` si falló antes del paso 5.
  - `totalPoints` = suma de los `points` no nulos de las filas **sin error**.
- Un valor que empiece por `=` es texto y nunca se evalúa; simplemente falla la validación del campo.

## Paso 3/5 — Lector del archivo (`lib/domain/grant-file.ts`, archivo nuevo, solo cliente)
`export async function readGrantFile(file: File): Promise<{ rows: RawGrantRow[]; fileHash: string }>`. Lanza `Error` con mensajes en español:
- Extensión: solo `.xlsx` o `.csv` (cualquier otra, incluida `.xlsm`/`.xls`): `"Usa un archivo .xlsx o .csv."`
- Peso mayor a 5 MB (5 * 1024 * 1024): `"El archivo pesa más de 5 MB."`
- `fileHash`: SHA-256 en hexadecimal de los bytes (`crypto.subtle.digest`).
- **.xlsx**: `const ExcelJS = await import("exceljs")` (igual que `xlsx-template.ts`, con el mismo manejo de `default`), `await workbook.xlsx.load(buffer)`. Hoja "Reparto" si existe; si no, la primera. Por cada celda, valor de texto así: `string` → tal cual; `number` → `String(n)`; `Date` → vacío; objeto con `richText` → unir los `text`; objeto con `text` (hipervínculo, típico en correos) → `text`; objeto con `formula` → `"=" + formula` (**nunca** uses `result`); vacío → `""`.
- **.csv**: función `parseCsv(text: string): string[][]` nueva en `lib/domain/csv.ts` (quita el BOM, respeta comillas dobles con `""` escapadas y saltos de línea dentro de comillas, y detecta el separador `;` o `,` mirando la primera línea: el que más se repita).
- **Encabezados** (fila 1): normaliza cada uno con `NFD`, sin diacríticos, en minúsculas, y reemplaza lo que no sea `a-z0-9` por `_` (quita `_` de los extremos). Equivalencias aceptadas: tipo → `tipo_de_documento` | `tipo_documento`; número → `numero_de_documento` | `numero_documento`; correo → `correo_electronico` | `correo`; comisión → `valor_de_comision` | `valor_comision` | `comision`; referencia → `referencia`. Si falta alguna: `El archivo no tiene el formato de la plantilla. Faltan las columnas: ${lista}.` (nombres legibles: "Tipo de documento", "Número de documento", "Correo electrónico", "Valor de comisión ($)", "Referencia"). No dependas del orden de las columnas: busca cada una por su encabezado.
- **Filas**: desde la 2. **Salta** las que tengan las 5 celdas vacías (la plantilla trae filas en blanco). Si quedan más de 1.000: `"El archivo supera las 1.000 filas."`. Si quedan 0: `"El archivo no tiene filas con datos."`.

## Paso 4/5 — Planilla (`lib/domain/xlsx-template.ts`)
Misma estructura que hoy (hoja "Reparto" + hoja "Instrucciones", `rowCount` de 1 a 1000, lista desplegable por fila), con estos cambios:
- Encabezados exactos, en este orden: `Tipo de documento`, `Número de documento`, `Correo electrónico`, `Valor de comisión ($)`, `Referencia`. Anchos 20 / 22 / 32 / 22 / 28.
- **Filas de datos en blanco, sin ejemplos** (para que nadie envíe por accidente los datos de ejemplo). Los ejemplos van en la hoja Instrucciones.
- Validaciones por rango, de la fila 2 a `rowCount + 1`:
  - A: lista `"Cédula,RUC,Pasaporte"` (igual que hoy).
  - B: formato texto (`@`), sin validación.
  - C: formato texto (`@`) y validación `custom` con fórmula `AND(ISNUMBER(FIND("@",C2)),ISNUMBER(FIND(".",C2,FIND("@",C2))))`, `allowBlank: true`, error "Escribe un correo electrónico válido (por ejemplo nombre@dominio.com)."
  - D: `decimal`, `between` 0.01 y 100000, `allowBlank: true`, formato `0.00`, error "Escribe la comisión en dólares (por ejemplo 20 o 20.50). Máximo $100.000."
  - E: formato texto y `textLength` ≤ 60 (igual que hoy).
- Hoja "Instrucciones" (reemplaza las 8 líneas):
  1. "Llena una persona por fila en la hoja Reparto. No cambies los encabezados ni el orden de las columnas."
  2. "Tipo de documento: elige de la lista (Cédula, RUC o Pasaporte)."
  3. "Número de documento: escríbelo tal cual, con ceros iniciales. Sin espacios ni guiones."
  4. "Correo electrónico: el de la persona a quien le entregas los puntos."
  5. "Valor de comisión ($): los dólares que quieres entregar a esa persona. La página los convierte a puntos; no necesitas calcularlos. Puedes usar la calculadora de Mi bono para saber cuánta comisión corresponde a una venta."
  6. "Referencia: opcional (ejemplo: Factura 001-0451)."
  7. "Ejemplo: Cédula | 1712345675 | ana@ejemplo.com | 20.00 | Factura 001-0451"
  8. `Esta plantilla tiene ${rowCount} filas. El máximo por reparto es de 1.000 filas y 5 MB.`
  9. "Si pegas valores desde otro archivo, la lista desplegable puede perderse: la revisión de Regala volverá a validar cada fila."
  10. "Revisar el archivo no cambia nada. Los puntos solo se descuentan al confirmar el envío."
- CSV alternativo (`handleDownloadTemplate` en `app/cliente/repartir/page.tsx`, se ajusta en la Parte P): solo encabezados, sin filas.

## Paso 5/5 — Estado compartido (`lib/mock/admin-settings.tsx`)
- Agrega al contexto, junto a los demás estados: `grantedItems: GrantedItem[]` / `setGrantedItems` (inicial `MOCK_GRANTED`) y `sentBatches: { hash: string; sentAt: string }[]` / `setSentBatches` (inicial `[]`). Pásalos en el `value`.
- Nuevo hook al final del archivo:
  ```ts
  /** Cliente de la sesión de ejemplo, con su tramo base y su bolsa viva (la misma que ven Clientes y Resumen). */
  export function useCurrentClient() {
    const { clients, setClients, standardPacks } = useAdminSettings()
    const client = clients.find((c) => c.id === MOCK_CLIENT.id) ?? { ...MOCK_CLIENT, customPacks: MOCK_CLIENT_PACKS, active: true }
    const base = clientBasePack(client, standardPacks)
    const addToBag = (delta: number) =>
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, bagPoints: c.bagPoints + delta } : c)))
    return { client, base, bag: client.bagPoints, addToBag }
  }
  ```
  Importa `MOCK_CLIENT` y `MOCK_CLIENT_PACKS` de `@/lib/mock/data` y `clientBasePack` de `@/lib/domain/grants`.
- `app/cliente/page.tsx` y `app/cliente/repartido/page.tsx` todavía leen `MOCK_GRANTED`/`MOCK_CLIENT.bagPoints`; se cambian en la Parte P.

## Pruebas y commit de la Parte O
`npx tsc --noEmit` debe dar 0 errores **aunque `app/cliente/repartir/page.tsx` aún use cosas viejas**: para que compile, en este commit deja en esa página solo los cambios mínimos de tipos (por ejemplo, borra el uso de `MOCK_BATCHES`, del selector de simulación y de `saleAmountCents`, y haz que "Revisar archivo" muestre `toast.info("En construcción: se conecta en la Parte P")`). La pantalla completa va en la Parte P.
Comprobación con una **función de prueba temporal fuera del repo** (por ejemplo, un script en la carpeta temporal del sistema que copie `grants.ts` y `documento.ts` cambiando los imports relativos a `.ts`): `pointsForCommission(2000, {usdCents:17000, points:17490})` = 2057; `purchaseForMissing(13425, …)` = `{ usd: 131, points: 13477 }`; `purchaseForMissing(1, …)` = `{ usd: 1, points: 102 }`. Descarga la plantilla y verifica su XML como en la Parte N: 5 columnas en el orden indicado, validación de lista en `A2:A101`, validación `custom` en la columna C y **fila 2 vacía**.
Commit: `feat(reparto): planilla con correo y comisión, cálculo de puntos, lector de archivos y bolsa compartida`.

---

# PARTE P — Pantallas: Repartir, Comprar y Lo repartido

## Paso 1/4 — Diálogo de pago simulado (`components/panel/purchase-dialog.tsx`, archivo nuevo)
Props: `{ open: boolean; onOpenChange: (open: boolean) => void; usd: number; points: number; onApproved: () => void }`.
- `Dialog` con título "Pago seguro", descripción "Pagarás en la página segura de la pasarela. Regala no ve los datos de tu tarjeta."
- Resumen grande: `$${usd} → ${formatPts(points)} pts`. Aviso: "Prototipo: no se realiza ningún cobro real."
- Botones: "Cancelar" y "Simular pago aprobado". Al pulsar el segundo: guarda anti doble clic con `useRef`, muestra `Spinner` 800 ms, llama `onApproved()` y cierra.
- No muestres el precio por punto.

## Paso 2/4 — "Comprar puntos" (`app/cliente/comprar/page.tsx`)
- Usa `useCurrentClient()` en lugar del `clients.find(...)` actual (conserva `packs = client.packMode === "custom" ? client.customPacks : standardPacks`).
- Línea nueva arriba: "Tu bolsa actual: **N pts**".
- El botón "Pagar con la pasarela" ya no hace `toast(...)`: guarda el paquete elegido en estado y abre `PurchaseDialog`. Al aprobarse: `addToBag(pack.points)` y `toast.success("+N puntos en tu bolsa")`.

## Paso 3/4 — "Repartir puntos" (`app/cliente/repartir/page.tsx`)
Quita el selector "Simular resultado del archivo", `ScenarioKey`, `SCENARIO_LABELS` y todo uso de `MOCK_BATCHES`. Usa `const { client, base, bag, addToBag } = useCurrentClient()` y `const { grantedItems, setGrantedItems, sentBatches, setSentBatches } = useAdminSettings()`.

**Paso 1 — Plantilla**: el texto de ayuda pasa a: "Tipo de documento: elige de la lista. **Valor de comisión ($):** los dólares que quieres entregar a cada persona; nosotros los convertimos a puntos. Referencia es opcional." (quita todo lo de `monto_venta`, `puntos` y el bono). El CSV alternativo descarga solo los encabezados nuevos (`downloadCsv("plantilla-reparto-puntos.csv", [los 5 encabezados], [])`).

**Paso 2 — Subir y revisar**: un solo campo de archivo (`.xlsx,.csv`, "Máximo 5 MB y 1.000 filas."). "Revisar archivo" es asíncrono y se desactiva mientras trabaja (`reviewing`, con `Spinner`): `readGrantFile(file)` → `buildGrantBatch(rows, base, file.name, fileHash)`. Si el hash está en `sentBatches`, pon `alreadySentAt` con su fecha. Si `readGrantFile` lanza error: `toast.error(err.message)`, deja el lote en `null` y no cambies nada más. Revisar no cambia nada (el texto actual se conserva).

**Paso 3 — Revisión** (la bolsa se lee **en vivo** de `useCurrentClient`, no del lote):
- Cálculos: `total = batch.totalPoints`, `missing = Math.max(0, total - bag)`, `after = bag - total`.
- 5 tarjetas (`lg:grid-cols-5`): "Filas" (cantidad), "Puntos necesarios" (`total`), "Tu saldo actual" (`bag`), "Faltante" (`missing`, hint "Sin faltante" si es 0) y "Saldo después" (`after`, o "—" si falta).
- Tabla (ancho mínimo ~860 px, con `overflow-x-auto`): Fila | Documento (`Cédula 1712345675`) | Correo | Comisión ($) (`formatUsd`) | **Puntos** | Referencia | Estado ("Correcta" o el error en rojo). Sin `usdPerPoint` en ninguna parte.
- Aviso rojo "Archivo con errores" y aviso ámbar de duplicado, como hoy.
- **Si `missing > 0`**: tarjeta destacada "Te faltan {missing} puntos": "Tu bolsa tiene {bag} y este reparto necesita {total}." y, calculando `const buy = purchaseForMissing(missing, base)`, el botón principal **"Comprar $${buy.usd} ({formatPts(buy.points)} pts)"**, que abre `PurchaseDialog` con `buy`. Al aprobarse: `addToBag(buy.points)` y `toast.success("+N puntos en tu bolsa")`; la revisión se actualiza sola y el faltante desaparece. Enlace secundario "Ver paquetes de puntos" → `/cliente/comprar`. Si hay filas con error, agrega la nota "Calculado con las filas correctas".
- Casillas y botón "Enviar reparto" como hoy; `canSend = !hasErrors && missing === 0 && authChecked && (!isDuplicate || duplicateChecked) && !isSending`.

**Paso 4 — Enviar**: el `AlertDialog` conserva el texto "Esta acción no se puede deshacer. Se descontarán N puntos de tu bolsa." Al confirmar (con el retardo y la guarda anti doble clic actuales), **primero vuelve a comprobar** `bag >= total` (si no, `toast.error` y no hagas nada); luego:
  - `addToBag(-total)`;
  - `setGrantedItems((prev) => [...nuevos, ...prev])`, un `GrantedItem` por fila: `id: \`g-${Date.now()}-${rowNo}\``, `batchId: batch.id`, `docType`, `docNumber` (normalizado), `email`, `reference`, `points`, `pointsUsed: 0`, `sentAt: new Date().toISOString()`;
  - `setSentBatches((prev) => [...prev, { hash: batch.fileHash, sentAt }])`;
  - guarda `bagAfter` (el valor calculado, `bag - total`) en un estado para la pantalla de éxito.
- Pantalla "Reparto enviado": "Puntos repartidos", "Filas procesadas", "Nueva bolsa" (`bagAfter`). "Descargar resumen (CSV)" con columnas: Fila, Tipo de documento, Número de documento, Correo electrónico, Valor de comisión ($), Puntos, Referencia, Estado ("Enviado"). "Hacer otro reparto" reinicia el flujo (limpia archivo, lote, casillas y `reviewing`).

## Paso 4/4 — Resumen, "Lo repartido", "Mi bono" y documentos
- `app/cliente/page.tsx`: usa `useCurrentClient()` para "Puntos en tu bolsa" y `grantedItems` del contexto en lugar de `MOCK_GRANTED` (totales, usados, sin usar y el conteo de entregas).
- `app/cliente/repartido/page.tsx`: lee `grantedItems` del contexto. Agrega la columna "Correo" con `maskEmail(item.email)` (o "—" si no hay) y la misma columna (enmascarada) en el CSV. El buscador sigue siendo por documento.
- `app/cliente/bono/page.tsx`: debajo del resultado de la calculadora, agrega un texto pequeño: "Usa el resultado como **Valor de comisión ($)** en tu planilla de reparto." con un enlace "Ir a Repartir" → `/cliente/repartir`. No cambies el cálculo.
- `PLAN-ROLES.md` §4 (líneas ~94-96): reemplaza las columnas de la plantilla por "Tipo de documento (lista desplegable), Número de documento, Correo electrónico, Valor de comisión ($), Referencia"; el servidor calcula `puntos = floor(valor_comision ÷ precio del punto del Cliente)` y quita la mención a `monto_venta × bonus_pct`.
- `PLAN-FASE-D.md`, bloque del Paso 1/2 de Repartir: una línea que diga que el prototipo lee el archivo, calcula puntos con el tramo base del Cliente y permite comprar lo que falta.
- `CLAUDE.md`, "Decisiones de negocio vigentes": reemplaza la viñeta "Planilla de reparto" por: "**Planilla de reparto:** .xlsx con N filas (1 a 1.000): tipo de documento (lista desplegable), número de documento, correo electrónico, valor de comisión ($) y referencia. Los puntos se calculan en la web: `floor(comisión ÷ precio del punto del tramo más pequeño del Cliente)`. La revisión muestra puntos por persona, total, saldo y faltante, y permite comprar el faltante exacto en dólares enteros. El servidor siempre vuelve a validar cada fila." Agrega: "El Cliente nunca ve el precio por punto, solo USD → puntos."

## Pruebas y commit de la Parte P
Con `npm run dev` abierto, rol **Cliente**. Genera los archivos de prueba con un **script temporal en la carpeta temporal del sistema** (nunca dentro del repo): usa `exceljs` desde `node_modules` del proyecto (por ruta absoluta con `file://`), con los encabezados nuevos de la plantilla.
1. **Archivo correcto** (5 filas, Cédulas válidas: 1712345675, 0908765431, 1704567898, 1711111110 y una más válida; correos `@ejemplo.ec`; comisiones 20, 5, 12.50, 30, 1): la lista muestra 2.057 / 514 / 1.286 / 3.086 / 102, total **7.045**, saldo **38.000**, sin faltante, saldo después **30.955**. Marca la casilla, envía: pantalla de éxito con "Nueva bolsa 30.955". En "Lo repartido" aparecen 5 filas nuevas arriba con correo enmascarado (`a*****@ejemplo.ec`); el Resumen muestra la bolsa 30.955.
2. **Con errores**: filas con cédula inválida (`1712345670`), correo `sin-arroba`, comisión 0, comisión `abc`, tipo `Licencia`, y un documento repetido: se ven los mensajes exactos del Paso 2/5 de la Parte O; Enviar queda desactivado.
3. **Faltante**: 25 filas con **Pasaporte** `PA100001`…`PA100025`, correos distintos y comisión 20 cada una: total **51.425**, faltan **13.425**, botón "Comprar $131 (13.477 pts)". Al aprobar el pago simulado, el faltante desaparece, la bolsa muestra **51.477** y se puede enviar; tras enviar, bolsa **52**.
4. **Duplicado**: sube otra vez el mismo archivo ya enviado: aparece "Reparto ya enviado anteriormente" y exige la casilla extra.
5. **Fórmula**: una celda de comisión con `=1+1` da el error de comisión (no se evalúa). Un `.xlsm` o `.txt` da "Usa un archivo .xlsx o .csv.". Un archivo sin los encabezados da "El archivo no tiene el formato de la plantilla. Faltan las columnas: …". Un archivo de plantilla sin ninguna fila llena da "El archivo no tiene filas con datos.".
6. **Comprar puntos**: en `/cliente/comprar`, comprar el paquete de $170 suma 17.490 a la bolsa y se refleja en Resumen y en `/admin/clientes` (rol Nosotros, sin recargar la página).
7. Nada en pantalla muestra el precio por punto. A 375 px, sin scroll horizontal en `/cliente/repartir`, `/cliente/comprar` y `/cliente/repartido`.
8. `npx tsc --noEmit` (0 errores). Commit: `feat(reparto): lista con puntos calculados, saldo y faltante, compra desde Repartir y entregas en Lo repartido`.

## Paso final — Revisión
Avisa al dueño al terminar cada parte. Opus revisa el diff, corre `tsc`, prueba las funciones con el código real y recorre el flujo en el navegador.
