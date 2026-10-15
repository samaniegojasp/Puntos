# Plan para Haiku / Antigravity — Recargo al canjear, regla del 30 %, factor en editores, colores y logo

Cuatro partes **en este orden** (E → F → G → H), una por prompt y cada una con su propio commit. No empieces una parte sin terminar la anterior. Al final, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas para todas las partes (no negociables)
1. Solo toca los archivos que nombra la parte. Si una regla de precios falla y no sabes por qué, DETENTE y pregunta. No inventes fórmulas.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Confidencialidad: precio por punto, márgenes y costos solo en `/admin`.
4. Un commit al final de cada parte, solo con los archivos tocados (nunca `package-lock.json` ni `.env*`), y `git push`.
5. Las pruebas que guardan el factor de conversión piden la clave de administrador. No la busques ni la adivines: pide al dueño que la escriba.

---

## Parte E — Los editores no se multiplican por el factor (error de la captura)

Causa [cierto]: `components/panel/packs-editor.tsx` solo prueba entre 60 y 140 puntos por dólar (`LOW`, `HIGH`) y en pasos de 10. Con factor 7, los paquetes válidos rondan los 700 puntos por dólar, así que ninguno cae en el rango y aparece "no existe un valor de puntos que cumpla las reglas". `app/admin/(secciones)/clientes/page.tsx` tiene el mismo problema con valores fijos.

### Paso 1/3 — `components/panel/packs-editor.tsx`
- Nueva prop `pointsPerUsdBase?: number` (por defecto 100): los puntos por dólar "normales" con el factor vigente.
- Quita la constante `STEP` de módulo. Dentro del componente: `const scale = Math.max(1, Math.round(pointsPerUsdBase / 100))` y `const STEP = 10 * scale`. Así la cantidad de valores que se prueban no crece con el factor.
- El rango a probar pasa a `usd * pointsPerUsdBase * LOW` … `usd * pointsPerUsdBase * HIGH`.
- En `addPack`, el `ppd` por defecto (hoy `100`) pasa a `pointsPerUsdBase`.
- `app/admin/(secciones)/precios/page.tsx`: pasa `pointsPerUsdBase={100 * (settings.pointsFactor ?? 1)}` a los dos `<PacksEditor>`.

### Paso 2/3 — `app/admin/(secciones)/clientes/page.tsx`
Con `const f = settings.pointsFactor ?? 1` (toma `settings` del contexto si aún no lo hace):
- Tramos iniciales de un cliente nuevo: `12500 * f` y `26000 * f`. Tramo nuevo (`handleAddPack`): `12000 * f`.
- `usdPerPoint` inicial (`"0.00800"` en dos lugares): `String(0.008 / f)`.
- `POINTS_STEP = 50 * f` y `POINTS_CAP = 5_000_000 * f`.
- En `priceBounds`: el tramo de referencia `points: 1020` pasa a `1020 * f`, y el `step` `1` pasa a `f`.
- `client.usdPerPoint.toFixed(5)` pasa a `String(Number(client.usdPerPoint.toPrecision(6)))`, para no perder precisión con factores grandes.

### Paso 3/3 — Pruebas y commit
1. Con factor 1: Precios → "Editar paquetes del Canjeador" y "Editar paquetes estándar" muestran barras (no el mensaje rojo). Clientes → editar Concesionaria Andina muestra el rango de cada tramo.
2. El dueño guarda el factor 7 en Ajustes. Repite la prueba 1: ningún paquete muestra "no existe un valor…", y el paquete más pequeño del Canjeador muestra alrededor de 700 pts por $1.
3. `npx tsc --noEmit` y commit: `fix: los editores de paquetes y de clientes se multiplican por el factor de conversión`.

---

## Parte F — Recargo al canjear y regla del 30 % (cambio de reglas de precios)

### Decisiones del dueño (15-oct-2026)
- **Precio en puntos de una tarjeta = valor facial × (1 + recargo), al punto del Canjeador.** El recargo es global y editable sin tope (por defecto 3 %; sugerido entre 2 y 5 %). Con 3 %, una tarjeta de $10 cuesta 1.030 pts. El margen ya **no** se configura por producto: sale solo, y la regla 3 vigila el margen mínimo.
- **Regla 1 nueva (reemplaza el "piso"):** el paquete más pequeño **del Canjeador** debe dar al menos un 30 % más de puntos (editable) que la tarjeta activa más barata. Ejemplo: tarjeta más barata 1.030 pts → paquete más pequeño ≥ 1.339 pts. No aplica a la compra a tu medida ni a las tablas de Clientes.
- **Regla 4 nueva (reemplaza "precio ≤ valor facial"):** el recargo no puede ser negativo.
- **Regla 3 ampliada:** el margen mínimo también se revisa con los paquetes del Canjeador, y el costo incluye el transporte.
- **Redondeo por defecto de 10 en 10.** Con 100 en 100, un 3 % se volvía 10 % en la tarjeta de $10.
- Datos: el paquete de $10 del Canjeador se reemplaza por **$15 = 1.500 pts**.

Este conjunto ya se simuló [cierto]: recargo de 0, 2, 3, 5 y 10 %, factores 1, 3, 7, 10, 100 y 1000, y redondeo de 10, 50 y 100. Resultado: 0 errores en todas las reglas.

### Paso 1/6 — Tipos (`lib/domain/types.ts`)
- En `AdminSettings`:
  - `/** Recargo sobre el valor facial al canjear (0.03 = 3 %). Por defecto 3 %. */ redeemSurchargePct?: number`
  - `/** El paquete más pequeño del Canjeador debe dar al menos este % más de puntos que la tarjeta activa más barata (0.3 = 30 %). */ minPackHeadroomPct?: number`
- En `Product`: **borra** `marginPct` (y su comentario). `tsc` te mostrará todos los usos.

### Paso 2/6 — Fórmulas y reglas (`lib/domain/pricing.ts`)
- `pointsPrice`: el valor por defecto de `multiple` pasa a `10`, y su comentario a "se sube al siguiente múltiplo".
- Reemplaza `productPriceCents` por:
  ```ts
  /** Precio en dólares que paga el Canjeador por la tarjeta: valor facial + recargo. */
  export const productPriceCents = (p: Pick<Product, "faceCents">, settings: Pick<AdminSettings, "redeemSurchargePct">) =>
    Math.round(p.faceCents * (1 + (settings.redeemSurchargePct ?? 0.03)))
  /** Costo total de la tarjeta para Regala: lo que se paga al Proveedor + transporte. */
  export const productTotalCostCents = (p: Product, provider: Pick<Provider, "discountPct">) =>
    productCostCents(p, provider) + p.shippingCents
  /** Puntos de la tarjeta al punto de referencia (paquete más pequeño del Canjeador). */
  export const productPoints = (p: Pick<Product, "faceCents">, settings: Pick<AdminSettings, "redeemSurchargePct" | "pointsMultiple">, refCentsPerPoint: number) =>
    pointsPrice(productPriceCents(p, settings), refCentsPerPoint, settings.pointsMultiple)
  ```
- Actualiza el comentario de `referenceCentsPerPoint`: "precio del punto del paquete más pequeño del Canjeador; las tarjetas cuestan valor facial + recargo a ese precio".
- En `validatePricing`:
  - **Regla 5:** usa `productPoints(prod, settings, ref)`.
  - **Regla 1 (reemplázala completa):**
    ```ts
    // Regla 1: el paquete más pequeño del Canjeador alcanza para la tarjeta activa más barata con holgura (30 % por defecto).
    const headroom = settings.minPackHeadroomPct ?? 0.3
    const smallestPack = [...publicPacks].sort((a, b) => a.usdCents - b.usdCents)[0]
    const cheapest = active
      .map((prod) => ({ prod, pts: productPoints(prod, settings, ref) }))
      .sort((a, b) => a.pts - b.pts)[0]
    if (smallestPack && cheapest) {
      const need = Math.ceil(cheapest.pts * (1 + headroom))
      if (smallestPack.points < need) {
        issues.push({ rule: 1, severity: "error", message: `El paquete más pequeño del Canjeador (${money(smallestPack.usdCents)}, ${smallestPack.points} pts) debe dar al menos ${(headroom * 100).toFixed(1)} % más que la tarjeta más barata (${cheapest.prod.storeName} ${money(cheapest.prod.faceCents)}, ${cheapest.pts} pts): mínimo ${need} pts.` })
      }
    }
    ```
  - **Regla 3:** recorre `[{ who: "Canjeador", packs: publicPacks }, ...tables]`. Usa `productTotalCostCents(prod, provider)` como costo y `productPoints(prod, settings, ref)` como puntos. No cambies `tables` (la regla 2 la sigue usando sin el Canjeador).
  - **Regla 4 (reemplázala completa):** `if ((settings.redeemSurchargePct ?? 0.03) < 0) issues.push({ rule: 4, severity: "error", message: "El recargo al canjear no puede ser negativo." })`.
  - Actualiza el comentario de cabecera de las reglas 1 y 4.

### Paso 3/6 — Datos (`lib/mock/data.ts`)
- `MOCK_PUBLIC_PACKS`: el primero pasa a `{ id: "pub-15", usdCents: c(15), points: 1500 }` (sin insignia). Los demás quedan igual.
- `MOCK_SETTINGS`: `pointsMultiple: 10`, más `redeemSurchargePct: 0.03` y `minPackHeadroomPct: 0.3`.
- `prod(...)`: quita el parámetro `margin` y `marginPct`. Las llamadas quedan como `prod("pr-1", "supermaxi", "Supermaxi", "p-supermaxi", 10)`, y la de De Prati como `prod("pr-8", "deprati", "De Prati", "p-deprati", 25, false)`.

### Paso 4/6 — Pantallas del panel
- **`ajustes/page.tsx`:**
  - Dos campos nuevos en el formulario principal, dentro del grid y junto a "Beneficio mínimo":
    - "Recargo al canjear (%)": `step 0.1`, `min 0`, sin máximo. Ayuda: "Se suma al valor facial: con 3 %, una tarjeta de $10 cuesta 1.030 pts del Canjeador. Sugerido: entre 2 y 5 %."
    - "Holgura del paquete más pequeño (%)": `step 1`, `min 0`. Ayuda: "El paquete más pequeño del Canjeador debe dar al menos este % más de puntos que la tarjeta más barata. Por defecto 30 %."
  - Error si alguno no es número o es negativo. Inclúyelos en `candidateSettings` (como fracción, redondeada como los demás %) y en `handleReset`.
  - "Así quedarían": usa `productPoints(p, { ...candidateSettings, pointsMultiple: multiple }, referenceCentsPerPoint(publicPacks))`.
  - Vista previa del factor: el texto "Hoy: $10 = …" debe usar el monto real del paquete más pequeño (`$${smallestPublic.usdCents / 100}`).
- **`precios/page.tsx`:**
  - Borra el editor de margen del diálogo de producto: `marginPctInput`, `MARGIN_UNIT`, `MARGIN_CAP_UNITS`, `validMargins`, `marginIndex`, `marginIsValid`, `marginHasGaps`, su barra y sus textos (incluidos los párrafos "Suele pasar cuando el costo…" y "Los límites salen de las reglas…").
  - El diálogo conserva el costo manual y la caducidad. `canSaveProduct = dialogErrors.length === 0`.
  - Tabla de tarjetas: quita la columna "Margen %". "Precio USD" pasa a "Precio al Canjeador" = `productPriceCents(prod, settings)`. Los puntos salen de `productPoints(prod, settings, refCents)` y los márgenes por tramo usan `productTotalCostCents`. Lo mismo en `preview`.
  - Subtítulo "…consistencia de tramos y piso de tarjetas" → "…consistencia de tramos y holgura del paquete más pequeño".
  - "Probar un caso con error": `points: Math.round((prev[0].usdCents / 100) * 130 * f)`. Toast: "Caso de error activado: el paquete más pequeño del Canjeador da más puntos por dólar que los Clientes".
- **`proveedores/page.tsx`:**
  - La vista previa usa `productPriceCents(prod, settings)`, `productPoints(...)` y `productTotalCostCents(prod, candidateProvider)`.
  - Texto de ayuda del descuento: "Los límites salen de las reglas: el margen mínimo en cada tabla de paquetes."

### Paso 5/6 — Tienda pública (resuelve el pendiente 5 de CLAUDE.md)
La tienda debe cobrar lo mismo que calcula el panel.
- `lib/mock/admin-settings.tsx`: nuevo hook
  ```ts
  /** Puntos que cuesta una tarjeta en la tienda: valor facial + recargo, al punto del paquete más pequeño del Canjeador. */
  export function useCardPoints() {
    const { publicPacks, settings } = useAdminSettings()
    const ref = referenceCentsPerPoint(publicPacks)
    return (usd: number) => productPoints({ faceCents: Math.round(usd * 100) }, settings, ref)
  }
  ```
- Reemplaza `pointsFor(usd, factor)` por `cardPoints(usd)` (con `const cardPoints = useCardPoints()`) en `components/gift-card.tsx`, `lib/points-store.tsx` (`cartTotal` recibe la función en vez del factor; guárdala en un `ref` como hoy se hace con `factorRef`), `app/cart/page.tsx`, `app/checkout/page.tsx` y `app/admin/(secciones)/page.tsx`.
- `app/shop/page.tsx` solo ordena: déjalo.
- Si `usePointsFactor` o el segundo parámetro de `pointsFor` quedan sin uso, bórralos. Actualiza el comentario de `POINTS_PER_USD` en `lib/catalog.ts`: "Solo referencia histórica; los puntos de una tarjeta salen de useCardPoints()".

### Paso 6/6 — Documentación, pruebas y commit
- `CLAUDE.md`, sección "Modelo de precios": reemplaza la línea por:
  "**Modelo de precios (oct 2026):** el punto de referencia es el del paquete más pequeño del Canjeador ($15 = 1.500 pts). Precio en puntos de una tarjeta = valor facial × (1 + recargo) (recargo global en Ajustes, 3 % por defecto; $10 → 1.030 pts). Los Clientes compran más barato (beneficio mínimo 1 %). Reglas: 1 el paquete más pequeño del Canjeador da ≥ 30 % (editable) más puntos que la tarjeta más barata, 2 el Canjeador paga más por punto que cualquier Cliente, 3 margen mínimo (también con paquetes del Canjeador; costo + transporte), 4 recargo ≥ 0, 5 múltiplo de puntos (10/50/100, por defecto 10), 6 límites opcionales de precio por punto, 7 beneficio mínimo del Cliente, 8 compra a tu medida no más barata que el paquete más pequeño."
- En "Pendientes", borra el punto 5 (la tienda ya usa el cálculo del panel).
- Pruebas (rol "Nosotros"):
  1. Precios: "Todas las reglas se cumplen". Supermaxi $10 = 1.030 pts, Juguetón $15 = 1.550 pts, Marathon $50 = 5.150 pts.
  2. Ajustes: con recargo 10 %, Supermaxi $10 = 1.100 pts y sin errores. Con recargo 20 % aparece el error de la regla 1 (1.500 < 1.560). Con holgura 50 % aparece la regla 1. Con recargo -1 % aparece el error de validación. Restablece al final.
  3. `/shop`: Supermaxi $10 → "Canjear por 1.030 puntos". El carrito y el checkout suman lo mismo.
  4. `/recargar`: el primer paquete es $15 = 1.500 pts.
  5. "Probar un caso con error" en Precios muestra errores, y al desactivarlo vuelve a "Todas las reglas se cumplen".
- `npx tsc --noEmit` y commit: `feat(precios): recargo al canjear sobre el valor facial, regla del 30 % y tienda con el mismo cálculo del panel`.

---

## Parte G — Colores de la tarjeta: los 6 actuales + color propio

### Paso 1/3 — Modelo (`lib/catalog.ts`, `lib/catalog-store.tsx`)
- `Store`: `/** Colores propios (hex #rrggbb). Si existen, reemplazan al tema. */ colors?: { from: string; to: string }`.
- `lib/catalog.ts`:
  - `export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)`.
  - `export function isLightColor(hex: string)`: luminancia relativa (sRGB) > 0.6.
- `sanitize`: `...(s.colors && typeof s.colors === "object" && isHexColor((s.colors as any).from) && isHexColor((s.colors as any).to) ? { colors: { from: (s.colors as any).from, to: (s.colors as any).to } } : {})`.

### Paso 2/3 — Tarjeta (`components/gift-card.tsx`, rama del degradado de `GiftCardFace`)
- Si `store.colors` existe: no apliques `bg-gradient-to-br` ni `THEMES[store.theme]`; usa `style={{ backgroundImage: \`linear-gradient(135deg, ${from}, ${to})\` }}`.
- Texto: si `isLightColor(from) && isLightColor(to)`, cambia `text-white` por `text-slate-900`, para que el nombre y el valor se lean.

### Paso 3/3 — Formulario de Catálogo (`app/admin/(secciones)/page.tsx`) y commit
- `Draft.colors: { from: string; to: string } | null`; inclúyelo en `EMPTY` (null), `edit()`, `saveStore` y `previewStore`.
- En "Color": deja los 6 círculos. Al elegir uno, `colors = null`. Agrega un 7.º círculo "Personalizado":
  - fondo `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)` e icono `Palette` de lucide;
  - `aria-checked` cuando `draft.colors` existe;
  - al pulsarlo, `colors = { from: "#7c3aed", to: "#ec4899" }`.
- Con `draft.colors`, muestra debajo:
  - dos `<input type="color">` ("Color 1" y "Color 2"), cada uno con su código hex al lado;
  - una casilla "Un solo color" que copia Color 1 en Color 2.
- Pruebas:
  1. Crea una tienda con color personalizado: la vista previa, la lista y `/shop` muestran ese degradado.
  2. Con un color claro (#fef3c7 en ambos), el texto se ve oscuro.
  3. Elige otra vez un color predefinido: se quita el personalizado.
  4. Las tiendas antiguas se ven igual.
- `npx tsc --noEmit` y commit: `feat(catalogo): color propio de la tarjeta con selector de paleta`.

---

## Parte H — Logo centrado y quitar fondo (opcional)

### Paso 1/3 — Logo al centro (`components/gift-card.tsx`)
- El nombre vuelve a mostrarse siempre arriba a la izquierda (deshaz el reemplazo por el logo).
- Si `store.logo` existe (solo en la rama del degradado), agrega antes del valor:
  `<div className="pointer-events-none absolute inset-0 flex items-center justify-center"><img src={store.logo} alt="" className={compact ? "max-h-[40%] max-w-[50%] object-contain" : "max-h-[45%] max-w-[55%] object-contain drop-shadow"} /></div>`
  (con el `eslint-disable-next-line` de siempre).
- Ayuda del campo Logo: "Se muestra al centro de la tarjeta, sobre el color. Si subes una imagen completa, esa imagen manda."

### Paso 2/3 — Quitar fondo liso (archivo nuevo `lib/image/remove-background.ts`)
`export function removeFlatBackground(dataUrl: string, tolerance: number): Promise<string>` hace todo en el navegador, sin librerías ni servicios externos:
1. Carga la imagen en un canvas del mismo tamaño.
2. Color de fondo = el color más frecuente entre los píxeles del borde, agrupando cada canal en saltos de 8.
3. Relleno por inundación (cola de índices + `Uint8Array` de visitados) desde **todos** los píxeles del borde. Avanza a vecinos 4-conexos cuya distancia RGB euclidiana al fondo sea ≤ `umbral = tolerance * 2.2` (tolerancia de 0 a 100).
4. Los píxeles alcanzados quedan con alfa 0. Los vecinos de esos píxeles con distancia ≤ `umbral * 1.5` quedan con alfa proporcional (borde suave).
5. Devuelve `canvas.toDataURL("image/png")`. Si no pasa `isValidImage`, rechaza con "El logo es demasiado grande; prueba con una imagen más simple."

Formulario de Catálogo:
- Al subir el logo, guarda también `logoOriginal` (estado del componente, **no** se guarda en la tienda).
- Debajo del campo: casilla "Quitar fondo (fondos lisos)" y, si está marcada, un `Slider` "Tolerancia" (0–100, por defecto 30).
- Al marcar o mover la barra, recalcula con `removeFlatBackground(logoOriginal, tolerancia)` con espera de 250 ms y pon el resultado en `draft.logo`. Al desmarcar, `draft.logo = logoOriginal`.
- Miniatura del logo (64 px) sobre un fondo de cuadros (`bg-[length:12px_12px]` con `conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0)`), para ver la transparencia.
- Al editar una tienda existente no hay `logoOriginal`: la casilla queda desactivada, con el texto "Vuelve a subir el logo para quitar el fondo".
- Texto: "Funciona con fondos de un solo color (blanco, negro u otro). Para fotos con fondos complejos, sube un PNG ya transparente."

### Paso 3/3 — Pruebas y commit
1. Sube un logo con fondo blanco: sin la casilla se ve el recuadro blanco; con la casilla desaparece. La tolerancia alta quita más; la baja deja un halo.
2. La tarjeta muestra el nombre arriba, el logo al centro y el valor abajo a la derecha, sin superponerse, también en la miniatura de la lista.
3. Un PNG ya transparente sigue igual con la casilla desmarcada.
4. A 375 px de ancho, sin scroll horizontal.
5. `npx tsc --noEmit` y commit: `feat(catalogo): logo al centro de la tarjeta y herramienta opcional para quitar fondos lisos`.

---

## Paso final — Revisión
Cuando termines cada parte, avisa al dueño. Opus revisa el diff contra este plan, corre `tsc`, simula las reglas con el código real y prueba en el navegador antes de dar la parte por cerrada.
