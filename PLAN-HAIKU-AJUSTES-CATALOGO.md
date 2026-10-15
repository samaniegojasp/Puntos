# Plan para Haiku / Antigravity — Factor de conversión, descuentos 5–12 % y Catálogo

Tres partes **en este orden** (A → B → C). Cada parte es un prompt aparte, con su propio commit. No empieces una parte sin terminar la anterior.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas para todas las partes (no negociables)
1. Solo toca los archivos que nombra la parte. Si falta algo o una regla de precios falla y no sabes por qué, DETENTE y pregunta; no inventes fórmulas ni cambies `validatePricing`.
2. No ejecutes `npm run build` con `npm run dev` abierto (corrompe `.next`). Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Confidencialidad: precio por punto, márgenes y costos solo en pantallas de `/admin`.
4. Un commit al final de cada parte, solo con los archivos tocados (nunca `package-lock.json` ni `.env*`), y `git push`.

---

## Parte A — Descuentos de proveedores entre 5 y 12 % (datos de ejemplo)

**Por qué cambian más cosas que los descuentos:** con margen mínimo 5 % y beneficio mínimo del Cliente 1 %, un proveedor con 5 % de descuento rompe la regla 3. Además, con margen de producto 15 %, cualquier descuento menor a ~13 % hace que el precio supere el valor facial (regla 4). El dueño eligió: margen mínimo 2 %, margen de cada producto = descuento de su proveedor y paquetes comprimidos. Este juego de valores ya está verificado contra las 8 reglas con redondeo de 10, 50 y 100.

Archivo único: `lib/mock/data.ts`.

### Paso 1/3 — Valores
| Qué | Antes | Después |
|---|---|---|
| `MOCK_PROVIDERS` discountPct | supermaxi 0.15, fybeca 0.17, marathon 0.14, kywi 0.16, jugueton 0.15, deprati 0.14 | supermaxi **0.08**, fybeca **0.12**, marathon **0.10**, kywi **0.09**, jugueton **0.05**, deprati **0.07** |
| `MOCK_PROVIDER_TERMS.discountPct` (Fybeca) | 0.17 | **0.12** |
| `MOCK_PRODUCTS` (6.º argumento `margin` de `prod`) | 0.15 en todos | pr-1 y pr-2 **0.08**; pr-3 y pr-4 **0.12**; pr-5 **0.10**; pr-6 **0.09**; pr-7 **0.05**; pr-8 **0.07** (sigue inactivo: `prod("pr-8", ..., 25, 0.07, false)`) |
| `MOCK_SETTINGS.minMarginPct` | 0.05 | **0.02** |
| `MOCK_PUBLIC_PACKS` pub-50 | 5200 | **5100** |
| `MOCK_STANDARD_PACKS` | 1020 / 5400 / 10800 | **1020 / 5150 / 10300** |
| `MOCK_CLIENT_PACKS` | 18600 / 43800 | **17500 / 41200** |
| `MOCK_CLIENT.usdPerPoint` | 0.00913978 | **0.00971429** (= $170 / 17.500; se deriva del tramo más pequeño) |

No cambies nada más (lotes, historial, liquidaciones y KPIs son ilustrativos).

### Paso 2/3 — Pruebas manuales (rol "Nosotros", `npm run dev`)
1. `/admin/precios`: dice que todas las reglas se cumplen, sin errores.
2. `/admin/ajustes`: sin alertas rojas; prueba los tres redondeos (10, 50, 100), sin errores en ninguno.
3. `/admin/proveedores`: la tabla muestra 8 %, 12 %, 10 %, 9 %, 5 % y 7 %; al editar Juguetón, la barra de descuento acepta 5 %.
4. Rol Proveedor → `/proveedor/condiciones`: muestra 12 %.

### Paso 3/3 — Verificación y commit
`npx tsc --noEmit` (0 errores). Commit: `feat(datos): descuentos de proveedores entre 5 y 12 %, margen mínimo 2 % y paquetes ajustados`.

---

## Parte B — "Factor de conversión" en Ajustes (protegido con la clave de administrador)

**Qué hace:** un entero (1 a 1.000, por defecto 1) que multiplica la conversión de dólares a puntos en todo lo que se expresa en puntos: paquetes del Canjeador, tabla estándar, tablas de Clientes, compra a tu medida y precio de las tarjetas en la tienda. Ejemplo: con factor 10, $10 = 10.000 pts y una tarjeta de $10 cuesta 10.000 pts. Como todo se multiplica por igual, las reglas de precios siguen cumpliéndose. Guardar exige la **clave de administrador** (la misma de `/admin`).

**Límites conocidos del prototipo (no los resuelvas):** los saldos e historiales de ejemplo (`MOCK_LOTS`, `MOCK_LEDGER`, `MOCK_CARDS`, repartos, monedero de la tienda en `localStorage`) no se convierten. Los ajustes viven en memoria, así que al recargar el factor vuelve a 1.

### Paso 1/6 — Tipo y dato
- `lib/domain/types.ts`, en `AdminSettings`: `/** Multiplica la conversión USD → puntos (entero ≥ 1). Por defecto 1. */ pointsFactor?: number`.
- `lib/mock/data.ts`: `MOCK_SETTINGS.pointsFactor = 1`.

### Paso 2/6 — Función pura de reescalado
Archivo nuevo: `lib/domain/points-factor.ts`, que exporta `rescaleForFactor(input, oldFactor, newFactor)`. Con `ratio = newFactor / oldFactor` devuelve copias nuevas (sin mutar nada):
- `publicPacks`, `standardPacks` y `clients[].customPacks`: `points = Math.round(points * ratio)`.
- `settings.customPointsPerUsd`: `Math.round(v * ratio * 10) / 10`. `settings.pointsFactor = newFactor`.
- `settings.pricePerPointMin/Max` (USD por punto, si existen): `v / ratio`.
- `clients[].usdPerPoint`: `v / ratio`; `clients[].bagPoints`: `Math.round(v * ratio)`.

### Paso 3/6 — Contexto y tienda
- `lib/mock/admin-settings.tsx`: exporta `usePointsFactor()`, que devuelve `settings.pointsFactor ?? 1`.
- `lib/catalog.ts`: `pointsFor = (usd: number, factor = 1) => usd * POINTS_PER_USD * factor`.
- Pasa el factor (`usePointsFactor()`) en cada llamada a `pointsFor` de: `components/gift-card.tsx` (`GiftCardTile`), `lib/points-store.tsx` (`cartTotal`; `PointsProvider` ya está dentro de `AdminSettingsProvider`), `app/cart/page.tsx`, `app/checkout/page.tsx` y `app/admin/page.tsx`. En `app/shop/page.tsx` solo se usa para ordenar: déjalo igual.

### Paso 4/6 — Tarjeta "Factor de conversión" en `app/admin/(secciones)/ajustes/page.tsx`
Va en una `Card` propia, **arriba** de "Parámetros operativos y comerciales" y con su propio botón (no forma parte del formulario principal):
- Input entero (1–1.000) con valor inicial `current.pointsFactor ?? 1`. Error si no es entero o está fuera de rango.
- Vista previa: "Hoy: $10 = {pts del paquete más pequeño} pts → con factor N: {pts × N / factorActual} pts".
- Aviso: "En producción, cambiar el factor exige convertir todos los saldos; lo hará el servidor. En este prototipo los saldos de ejemplo no cambian."
- Botón "Guardar factor" (desactivado si el valor no cambió o es inválido). Abre un `Dialog` (`components/ui/dialog`) con un campo de contraseña "Clave de administrador":
  - Usa `verifyAdmin` de `lib/admin-auth.ts`. Si la clave es incorrecta, espera 1 s y muestra "Clave incorrecta." (igual que el `LoginForm` de `/admin`).
  - Si `adminConfigured` es false, el botón se desactiva con el texto "Configura la clave de administrador en /admin".
  - Si la clave es correcta: llama a `rescaleForFactor` con el estado del contexto y pasa el resultado por `validatePricing`. Si hay errores, no guardes y muéstralos. Si no hay errores: `setSettings`, `setPublicPacks`, `setStandardPacks`, `setClients`, `toast.success("Factor de conversión actualizado")` y cierra el diálogo.
  - Tras guardar, actualiza los estados locales del formulario principal que dependen de puntos: `setCustomPpd(nuevo customPointsPerUsd)` y los inputs de límites (`fmtPpd(...)`).

### Paso 5/6 — Que nada deshaga el factor
- En `ajustes/page.tsx`, `candidateSettings` debe empezar con `...current` para no perder `pointsFactor` (ni campos futuros).
- `handleReset` conserva el factor: `const f = current.pointsFactor ?? 1`, `setCustomPpd((MOCK_SETTINGS.customPointsPerUsd ?? 100) * f)` y `setSettings({ ...MOCK_SETTINGS, customPointsPerUsd: (MOCK_SETTINGS.customPointsPerUsd ?? 100) * f, pointsFactor: f })`.
- La barra "Puntos por cada dólar" usa `min={50 * f}`, y el texto pasa a "Mínimo {50 × f} pts/$".
- Busca en `app/` los usos de `MOCK_PUBLIC_PACKS`, `MOCK_STANDARD_PACKS`, `MOCK_CLIENT_PACKS` y `MOCK_SETTINGS` que **restauran** estado (por ejemplo, el botón de `precios/page.tsx` que muestra "Catálogo de paquetes restaurado al estado original"). Al restaurar, multiplica los puntos por el factor vigente (usa `rescaleForFactor(…, 1, f)`).

### Paso 6/6 — Pruebas y commit
1. Factor 10 con la clave correcta: `/admin/precios` sigue sin errores; los paquetes del Canjeador muestran 10.000 / 25.000 / 51.000; `/recargar` muestra esos paquetes; en `/shop`, Supermaxi $10 → 10.000 puntos; el carrito suma con el factor.
2. Clave incorrecta: no cambia nada y muestra "Clave incorrecta.".
3. Vuelve a factor 1: todo vuelve a los valores de la Parte A.
4. Con factor 10, pulsa "Guardar ajustes" del formulario principal y luego "Restablecer": el factor sigue en 10 y no aparecen errores de precios.
5. A 375 px de ancho, el diálogo no tiene scroll horizontal.
6. `npx tsc --noEmit` y commit: `feat(ajustes): factor de conversión USD → puntos protegido con la clave de administrador`.

---

## Parte C — Catálogo: pestañas, logo y valores con barra

### Paso 1/5 — Las pestañas desaparecen al entrar a Catálogo (bug)
Causa [cierto]: `app/admin/page.tsx` está fuera del grupo `app/admin/(secciones)/`, cuyo `layout.tsx` es el que pinta `AdminShell` con las pestañas.
- `git mv "app/admin/page.tsx" "app/admin/(secciones)/page.tsx"`. La URL sigue siendo `/admin`, porque los grupos entre paréntesis no cuentan en la ruta.
- Dentro del archivo movido:
  - El `<div className="container px-4 py-8 md:px-6 md:py-12">` de `Panel` pasa a ser `<div>`, porque `PanelShell` ya aporta el contenedor.
  - El `h1` "Catálogo de gift cards" pasa a `<h2 className="text-xl font-semibold tracking-tight">`.
  - Borra el enlace "Más secciones →" (y el import de `Link` si queda sin uso).
  - En `SetupNotice`, `LoginForm` y el estado "Cargando…", quita `container` y deja solo el ancho máximo y el padding vertical.
- La clave de `/admin` sigue igual. En el prototipo, además, hace falta el rol "Nosotros" (lo exige `RoleGate`); es lo esperado.

### Paso 2/5 — Límites de valores en Ajustes
- `types.ts`, en `AdminSettings`: `cardDenomMinUsd?: number` y `cardDenomMaxUsd?: number` (valores de las tarjetas del catálogo, en USD y múltiplos de 5).
- `data.ts`: `MOCK_SETTINGS.cardDenomMinUsd = 5` y `cardDenomMaxUsd = 500`.
- `ajustes/page.tsx`: nuevo bloque "Valores de las tarjetas del catálogo" con dos inputs ("Valor mínimo (USD)" y "Valor máximo (USD)"). Error en `errors[]` si no son enteros múltiplos de 5 con `5 ≤ mín < máx ≤ 500` (500 es el tope de `lib/catalog-store.tsx`). Inclúyelos en `candidateSettings` y en `handleReset`. Texto de ayuda: "La barra de cada valor en Catálogo va de 5 en 5 entre estos límites."

### Paso 3/5 — "Valores en USD": un cuadro por valor, con barra de 5 en 5
En `app/admin/(secciones)/page.tsx`:
- `Draft.denoms` pasa de `string` a `number[]`. `EMPTY.denoms = [10, 25, 50]`, y `edit()` copia `s.denoms`. Borra `parseDenoms`.
- Lee los límites con `const { settings } = useAdminSettings()`; `min = settings.cardDenomMinUsd ?? 5`, `max = settings.cardDenomMaxUsd ?? 500`.
- Cada valor es una fila con borde, que contiene:
  - el `Slider` (`components/ui/slider`, `min`, `max`, `step={5}`);
  - el valor en grande ("$25");
  - botones − y + (±5, acotados a los límites);
  - un botón de papelera, desactivado si es el único valor.
- Debajo, el botón "Agregar valor" (máximo 6, desactivado al llegar a 6). El valor nuevo es el siguiente múltiplo de 5 libre, empezando por el mayor actual + 5; si no hay sitio por arriba, el primero libre desde `min`.
- Validación al guardar:
  - de 1 a 6 valores;
  - "Hay valores repetidos" si dos coinciden;
  - por fila, "Fuera de los límites de Ajustes ($min–$max)" o "Debe ser múltiplo de 5". Puede pasar al editar una tienda antigua; la barra muestra el valor acotado y bloquea el guardado hasta que se corrija.
- Se guarda ordenado de menor a mayor. Mantén debajo la línea "$x = y pts" (usa `pointsFor(d, factor)`).

### Paso 4/5 — Logo sobre la tarjeta predeterminada
- `lib/catalog.ts`, en `Store`: `/** Logo (data URL png/jpeg/webp) que se pinta sobre el degradado. Se ignora si hay imagen completa. */ logo?: string`.
- `lib/catalog-store.tsx` (`sanitize`): `...(isValidImage(s.logo) ? { logo: s.logo } : {})`.
- En el archivo de Catálogo, nueva `prepareLogoImage(file)`: mismos tipos y tope de 5 MB que `prepareCardImage`, pero **sin recortar**. Encaja la imagen dentro de 256×256 manteniendo la proporción y la exporta con `canvas.toDataURL("image/png")` para conservar la transparencia; luego la valida con `isValidImage`.
- Formulario: campo "Logo (opcional)" debajo de "Imagen completa", con el botón "Quitar logo". `Draft.logo: string | null`, que se incluye en `edit()`, en `saveStore` y en `previewStore`. Ayuda: "Se muestra arriba a la izquierda sobre el color de la tarjeta. Si subes una imagen completa, esa imagen manda."
- `components/gift-card.tsx`, en `GiftCardFace` (solo la rama del degradado): si existe `store.logo`, en lugar del nombre pinta `<img src={store.logo} alt={store.name} className={compact ? "h-4 max-w-[60%] object-contain" : "h-10 max-w-[55%] object-contain"} />` (con el mismo `eslint-disable-next-line` que ya usa la imagen).

### Paso 5/5 — Pruebas y commit
1. En `/admin`, haz clic en cada pestaña (Resumen, Catálogo, Clientes, …, Ajustes): las pestañas no desaparecen nunca, y "Catálogo" queda resaltada solo en `/admin`.
2. Nueva tienda: agrega valores hasta 6 (el botón se desactiva), quita uno, mueve barras (solo saltos de 5) y usa los botones ±. Al guardar, en `/shop` aparecen esos valores ordenados.
3. En Ajustes, pon mínimo 10 y máximo 100. En Catálogo, las barras quedan en 10–100. Al editar Megamaxi (25/50/100), funciona; con un valor de 150, la fila muestra el error y no deja guardar.
4. Sube un PNG con fondo transparente como logo: se ve sobre el degradado en la vista previa, en la lista y en `/shop`. Si además subes una imagen completa, se ve solo la imagen.
5. Ajustes: el mínimo 7 o un mínimo ≥ máximo muestran error.
6. A 375 px de ancho, el formulario no tiene scroll horizontal.
7. `npx tsc --noEmit` y commit: `feat(catalogo): pestañas visibles, logo sobre la tarjeta y valores con barra de 5 en 5`.

---

## Revisión (Opus, 2026-10-15) — commits 5bedd59, c80f8d3, f0dbe17

Lo verificado:
- `npx tsc --noEmit` da 0 errores. A, B y C siguen el plan.
- En el navegador:
  - Precios dice "Todas las reglas se cumplen" y muestra los descuentos nuevos.
  - Ajustes no muestra alertas y ya tiene las tarjetas nuevas (factor y límites de valores).
  - En `/admin`, las pestañas siguen visibles y "Catálogo" queda activa.
- No probado en el navegador, porque requiere la clave de administrador: el formulario de Catálogo (barras y logo) y el diálogo del factor. El código se revisó línea por línea.

**Hallazgo 1 (error del plan, no de la ejecución):** "multiplicar todo mantiene las reglas" era falso [cierto, probado con el código real]. El redondeo de puntos (10, 50 o 100) no se multiplica, y a factores altos desaparece el colchón que daba al margen. Con los paquetes de la Parte A, Juguetón $15 queda con 1,9 % de margen (mínimo 2 %) con factor 3 y redondeo 10, y con factor 100 o 1000 en cualquier redondeo. El diálogo bloquea el guardado (no se rompe nada), pero no deja usar esos factores. Arreglo: paquetes que cumplen sin depender del redondeo. Ya se probaron con factores 1, 2, 3, 7, 10, 100 y 1000 y los tres redondeos: 0 errores.

**Hallazgo 2 (experiencia de uso):** los errores del factor aparecen recién después de escribir la clave. Deben verse en la tarjeta antes de pedirla.

## Parte D — Correcciones de la revisión

### Paso 1/3 — Datos (`lib/mock/data.ts`)
| Qué | Antes | Después |
|---|---|---|
| `MOCK_STANDARD_PACKS` std-50 / std-100 | 5150 / 10300 | **5140 / 10280** |
| `MOCK_CLIENT_PACKS` cp-1 / cp-2 | 17500 / 41200 | **17490 / 41150** |
| `MOCK_CLIENT.usdPerPoint` | 0.00971429 | **0.00971984** (= $170 / 17.490) |

### Paso 2/3 — Validar el factor antes de pedir la clave (`app/admin/(secciones)/ajustes/page.tsx`)
- Calcula con `useMemo` (dependencias: `parsedFactor`, `isFactorValid`, `currentFactor`, `current`, `publicPacks`, `standardPacks`, `clients`, `providers`, `products`): `const factorIssues = isFactorValid && factorHasChanged ? validatePricing(rescaleForFactor({ settings: current, publicPacks, standardPacks, clients, providers, products }, currentFactor, parsedFactor)).filter((i) => i.severity === "error") : []`.
- Si `factorIssues.length > 0`, muestra en la tarjeta un `Alert variant="destructive"` titulado "Con este factor se rompen reglas de precios" con los mensajes, y desactiva "Guardar factor".
- `handleConfirmFactor` mantiene su validación como respaldo.

### Paso 3/3 — Pruebas y commit
1. `/admin/precios`: todas las reglas se cumplen.
2. Ajustes: prueba factores 3, 10, 100 y 1000 (con redondeo 10 y 100). No aparece la alerta y el botón queda habilitado. Para forzar la alerta: en Precios, pulsa "Probar un caso con error"; vuelve a Ajustes por la pestaña (sin recargar) y escribe el factor 2. La alerta aparece y el botón se desactiva. Después desactiva el caso de error en Precios.
3. `npx tsc --noEmit` (0 errores) y commit: `fix: paquetes que cumplen el margen con cualquier factor; el factor se valida antes de pedir la clave`, con `git push`.

### Paso final — Revisión
Avisa al dueño cuando termines; Opus revisará el diff, `tsc` y el navegador antes de cerrar.
