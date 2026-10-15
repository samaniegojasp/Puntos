# Plan para Haiku / Antigravity — Planilla de reparto en Excel con listas desplegables (Parte N)

Una sola parte, con un commit. Al final, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas (no negociables)
1. Solo toca los archivos que nombra el plan. Si algo no cuadra, DETENTE y pregunta. No cambies `lib/domain/pricing.ts`.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Commit solo con los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.
4. Esta planilla es **solo la descarga**. La subida sigue simulada: no leas ni parses archivos.

## Qué se pide (dueño, oct 2026)
En **Cliente → Repartir → Paso 1 — Plantilla**: en vez del CSV de dos filas, descargar un **Excel (.xlsx)** con la cantidad de filas que el Cliente elija, y en **cada fila** una **lista desplegable** para "Tipo de documento". `PLAN-ROLES.md` §4 (Reparto por Excel) ya define el formato; el prototipo lo genera en el navegador con `exceljs` (la versión real la generará el servidor, ver `PLAN-BACKEND.md`).

## Paso 1/5 — Dependencia
- `npm install exceljs` (licencia MIT; no uses el paquete `xlsx`, tiene fallos conocidos). Commitea solo `package.json`; el `package-lock.json` no se versiona en este repo.
- Se carga con `await import("exceljs")` **solo al pulsar el botón**, para que no pese en el resto de la página. Si el bundler se queja de módulos de Node (`fs`, `stream`), usa `await import("exceljs/dist/exceljs.min.js")` y tipa el resultado con `as typeof import("exceljs")`. No toques `next.config.mjs`.

## Paso 2/5 — Generador (`lib/domain/xlsx-template.ts`, archivo nuevo)
Exporta `downloadGrantTemplate(rowCount: number): Promise<void>` (solo cliente, dentro de un manejador de evento).

**Hoja 1 "Reparto"** (la primera, la que abre Excel):
- Encabezados en la fila 1, exactamente: `tipo_documento`, `numero_documento`, `puntos`, `monto_venta`, `referencia`. Negrita, fondo gris claro, fila inmovilizada (`views: [{ state: "frozen", ySplit: 1 }]`), anchos de columna 18 / 22 / 12 / 14 / 28.
- Filas de datos: de la 2 a `rowCount + 1`. Las filas 2 y 3 llevan los ejemplos de hoy: (`Cédula`, `1712345675`, `2000`, vacío, `Factura 001-0451`) y (`Cédula`, `0908765431`, vacío, `250`, `Factura 001-0452`). Es importante que el segundo documento conserve su cero inicial.
- **Columna A, lista desplegable en cada fila de datos:** `dataValidation = { type: "list", allowBlank: true, formulae: ['"Cédula,RUC,Pasaporte"'], showErrorMessage: true, errorStyle: "stop", errorTitle: "Tipo de documento", error: "Elige Cédula, RUC o Pasaporte de la lista.", showInputMessage: true, promptTitle: "Tipo de documento", prompt: "Elige de la lista." }`. Construye la cadena con `Object.values(DOC_TYPE_LABEL)` (de `lib/domain/types.ts`) para que haya una sola fuente de verdad.
- **Columna B (`numero_documento`):** formato de texto (`numFmt: "@"`) en todas las filas de datos, para que Excel no borre ceros iniciales ni convierta pasaportes en números. Escribe los ejemplos como texto.
- **Columna C (`puntos`):** validación `whole`, operador `between`, 1 a 10000000, `allowBlank: true`, con error "Escribe un número entero de puntos mayor que 0 (o deja la celda vacía y completa monto_venta).".
- **Columna D (`monto_venta`):** validación `decimal`, operador `greaterThanOrEqual`, 0, `allowBlank: true`, con error "Escribe el monto en dólares (por ejemplo 250 o 250.50).". Formato `0.00`.
- **Columna E (`referencia`):** formato de texto (`@`) y validación `textLength` `lessThanOrEqual` 60, `allowBlank: true`.
- No protejas la hoja: el Cliente debe poder pegar y editar libremente.

**Hoja 2 "Instrucciones"** (texto simple, una columna ancha 100, ajuste de línea):
1. "Llena una persona por fila en la hoja Reparto. No cambies los encabezados ni el orden de las columnas."
2. "tipo_documento: elige de la lista (Cédula, RUC o Pasaporte)."
3. "numero_documento: escríbelo tal cual, con ceros iniciales. Sin espacios ni guiones."
4. "puntos: número entero mayor que 0. Si lo dejas vacío y completas monto_venta, calculamos los puntos con tu bono."
5. "monto_venta y referencia son opcionales (ejemplo de referencia: Factura 001-0451)."
6. `Esta plantilla tiene ${rowCount} filas. El máximo por reparto es de 1.000 filas y 5 MB.`
7. "Si pegas valores desde otro archivo, la lista desplegable puede perderse: la revisión de Regala volverá a validar cada fila."
8. "Revisar el archivo no cambia nada. Los puntos solo se descuentan al confirmar el envío."

Descarga: `const buffer = await workbook.xlsx.writeBuffer()`, `Blob` con `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, enlace temporal y `URL.revokeObjectURL`, igual que `downloadCsv`. Nombre: `plantilla-reparto-puntos.xlsx`. Valida `rowCount` (entero de 1 a 1000) y lanza un `Error` en español si no lo cumple.

## Paso 3/5 — Pantalla (`app/cliente/repartir/page.tsx`, bloque "Paso 1 — Plantilla")
- Estado `rowCountInput` (texto, por defecto `"100"`) y `generating` (booleano).
- Campo "Cantidad de filas de la plantilla" (`Input` numérico, `min 1`, `max 1000`, ancho ~28) con la ayuda "Entre 1 y 1.000. Cada fila tiene su lista desplegable de tipo de documento." y mensaje de error si el valor no es un entero de 1 a 1000.
- Botón principal "Descargar plantilla Excel (.xlsx)" (ícono `Download`), desactivado si el valor es inválido o `generating`; texto "Generando…" mientras tanto. En error, `toast.error("No se pudo generar la plantilla. Prueba de nuevo.")`.
- Botón secundario `variant="ghost" size="sm"`: "Descargar versión CSV (sin lista desplegable)", que conserva el comportamiento de hoy (`handleDownloadTemplate` con `downloadCsv`).
- Textos de ayuda: "Tipos de documento válidos" pasa a mostrar los nombres que ve el Cliente: **Cédula**, **RUC** o **Pasaporte** (elige de la lista). Elimina el párrafo "Nota: En la versión real será un archivo Excel (.xlsx) con lista desplegable.". El párrafo de `monto_venta` queda igual.

## Paso 4/5 — Documentación
- `lib/domain/csv.ts`: actualiza el comentario de cabecera: "El reparto usa .xlsx (lib/domain/xlsx-template.ts); el CSV queda como alternativa y para los resúmenes."
- `PLAN-FASE-D.md`, línea del "Paso 1 — Plantilla": reemplaza "genera un CSV con encabezados … y dos filas de ejemplo. Nota: …" por "descarga un .xlsx con N filas (1 a 1.000), hoja Reparto con lista desplegable de tipo de documento en cada fila y hoja Instrucciones; el CSV queda como alternativa".
- `CLAUDE.md`, en "Decisiones de negocio vigentes", agrega: "**Planilla de reparto:** .xlsx con N filas (1 a 1.000), lista desplegable de tipo de documento (Cédula/RUC/Pasaporte) por fila y hoja de instrucciones; el servidor siempre vuelve a validar cada fila."

## Paso 5/5 — Pruebas y commit
1. Rol Cliente → `/cliente/repartir`: con 100 filas, el archivo se descarga como `plantilla-reparto-puntos.xlsx`. Con 0, 1.001 o texto, el botón se desactiva y aparece el error.
2. **Verificación del archivo sin Excel:** copia el `.xlsx` a una carpeta temporal fuera del repo, cambia la extensión a `.zip` y descomprímelo (en PowerShell: `Expand-Archive`). En `xl/worksheets/sheet1.xml` comprueba:
   - existe un bloque `<dataValidations` con `type="list"` y la fórmula `"Cédula,RUC,Pasaporte"` (revisa que las tildes se vean bien);
   - la validación de la columna A cubre desde `A2` hasta `A101` (o un `sqref` equivalente a 100 filas);
   - la hoja `sheet2.xml` contiene las 8 instrucciones.
   Si no hay `<dataValidation`, DETENTE y avísame.
3. El dueño abrirá el archivo en Excel o Google Sheets y confirmará: lista desplegable en cada fila de la columna A, `0908765431` con su cero inicial y mensaje de error al escribir "otra cosa".
4. La versión CSV sigue funcionando y la página no tiene errores en consola. A 375 px de ancho, sin scroll horizontal en `/cliente/repartir`.
5. `npx tsc --noEmit` (0 errores) y commit: `feat(reparto): planilla Excel con N filas y lista desplegable de tipo de documento`.

## Paso final — Revisión
Avisa al dueño al terminar. Opus revisa el diff, corre `tsc`, abre el XML del archivo generado y prueba la pantalla.
