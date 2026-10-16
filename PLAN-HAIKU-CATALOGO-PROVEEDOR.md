# Plan para Haiku / Antigravity — El Proveedor crea sus tarjetas y Nosotros las aprobamos

Tres partes **en este orden** (Q → R → S), un prompt y un commit por parte. Al final de cada una, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas (no negociables)
1. Solo toca los archivos que nombra cada paso. Si algo no cuadra, DETENTE y pregunta. No cambies `lib/domain/pricing.ts`.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español.
4. **Confidencialidad (regla 13):** el Proveedor **nunca** ve precio por punto, márgenes, recargo, puntos de una tarjeta, paquetes ni reglas de precios. Solo ve datos de su tarjeta, valores en USD y su descuento acordado (que ya ve en Condiciones). Los mensajes que le salgan **no pueden contener cálculos ni cifras de reglas**.
5. Commit solo con los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.
6. Para probar un rol, usa la barra "Prototipo · Ver como".

## Decisiones del dueño (oct 2026)
1. El Proveedor llena **solo datos de la tarjeta**: nombre, categoría, descripción, valores en USD, color y logo/imagen. El descuento sigue siendo el acordado (lo fija Nosotros).
2. Flujo: **Borrador → En revisión → Aprobada / Rechazada**. El Proveedor edita solo borradores y rechazadas; una vez enviada o aprobada queda en solo lectura. Una rechazada se corrige y se reenvía. Un cambio a una aprobada se hace con una solicitud nueva.
3. Si algo del envío no es compatible con las reglas del catálogo, el Proveedor ve un mensaje de **qué corregir sin revelar cálculos** (por ejemplo: "Estos valores no son compatibles con el catálogo actual: $5. Quítalos o cámbialos y vuelve a enviar."). Nosotros sí vemos las reglas reales al revisar y, si rechazamos, escribimos el motivo que el Proveedor verá.
4. **Nosotros aprobamos**: al aprobar se crea la tarjeta en el catálogo (visible en la tienda) y sus productos con el descuento del Proveedor. Aprobar queda **bloqueado** si se rompe alguna regla de precios; podemos quitar valores antes de aprobar, o rechazar con motivo.
5. Pestaña nueva en el panel del Proveedor: **"Catálogo"**. Pestaña nueva en Administración: **"Solicitudes"**, con un contador de las que están en revisión.
6. Es prototipo: todo vive en memoria (se pierde al recargar), como el resto. El backend real lo valida en el servidor.

---

# PARTE Q — Extraer componentes compartidos del editor de tarjetas (sin cambiar el comportamiento)

El editor de tarjetas de Administración → Catálogo (`app/admin/(secciones)/page.tsx`) ya tiene lo que necesita el Proveedor: valores con barra de 5 en 5, color (6 temas + personalizado), logo con "Quitar fondo" e imagen completa. Para no copiar cientos de líneas, se extrae a componentes que usarán los dos paneles. **Esta parte no debe cambiar nada de lo que ve ni hace el administrador.**

## Paso 1/3 — Imágenes (`lib/image/prepare-card-image.ts`, archivo nuevo)
Mueve aquí, sin cambiar su lógica: `IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `CARD_W`, `CARD_H`, `prepareCardImage(file)` y `prepareLogoImage(file)` (hoy en `app/admin/(secciones)/page.tsx`). Expórtalas; la página las importa desde aquí.

## Paso 2/3 — Componentes (`components/panel/`)
- **`denoms-editor.tsx`** — `DenomsEditor({ value, onChange, min, max, error, hint })`: `value: number[]`, `onChange(next: number[])`, `min`/`max` en USD, `error?: string`, `hint?: React.ReactNode` (se muestra debajo; el administrador pasa aquí su línea "$x = y pts"; el Proveedor no pasa nada). Contiene la lista de valores con `Slider` de 5 en 5, botones − / +, papelera (desactivada si queda uno), error por fila ("Fuera de los límites de Ajustes ($min–$max)" o "Debe ser múltiplo de 5"), contador "n/6 valores" y el botón "Agregar valor" (máximo 6) con `getNextDenom` (muévela dentro del componente).
- **`card-design-editor.tsx`** — `CardDesignEditor({ value, onChange, resetKey })`: `value: { theme: ThemeKey; colors: { from: string; to: string } | null; logo: string | null; image: string | null }`, `onChange(patch: Partial<value>)`, `resetKey: string` (cuando cambia, reinicia el estado interno de logo original / quitar fondo / tolerancia / "un solo color"). Contiene: la imagen completa (con "Quitar imagen" y su ayuda), el logo con su ayuda, miniatura sobre cuadros, casilla "Quitar fondo (fondos lisos)" con tolerancia y el `useEffect` con `removeFlatBackground`, y el selector de color (6 círculos + "Personalizado" con sus dos `<input type="color">` y "Un solo color"). Los textos y comportamientos son **idénticos** a los de hoy. `THEME_LABELS` se mueve aquí.

## Paso 3/3 — Usar los componentes en Administración → Catálogo y probar
- En `app/admin/(secciones)/page.tsx`: reemplaza los bloques correspondientes por `<DenomsEditor …/>` (pasando `hint` con la línea de puntos de hoy) y `<CardDesignEditor …/>` (con `resetKey={draft.id ?? "nueva"}`). Mantén `Draft`, la validación al guardar, la vista previa y todo lo demás. Borra lo que quedó sin uso.
- Pruebas (rol Nosotros, clave de administrador; si no la tienes, pídele al dueño que la escriba): **el comportamiento debe ser idéntico al de antes.** Crea una tienda con 3 valores (barras, ±, "Agregar valor" hasta 6, límites de Ajustes), logo con "Quitar fondo", color personalizado claro (texto oscuro), imagen completa y guarda; edita una tienda existente y cambia de una a otra sin que se arrastre el logo ni el color de la anterior.
- `npx tsc --noEmit` (0 errores). Commit: `refactor(catalogo): editor de valores y de diseño de tarjeta como componentes compartidos`.

---

# PARTE R — Datos, validación y la pestaña "Catálogo" del Proveedor

## Paso 1/5 — Tipos y dominio (`lib/domain/card-requests.ts`, archivo nuevo)
```ts
import type { ThemeKey } from "@/lib/catalog"
export type CardRequestStatus = "draft" | "submitted" | "approved" | "rejected"
export type CardRequest = {
  id: string; providerId: string
  name: string; category: string; description: string
  theme: ThemeKey; colors?: { from: string; to: string }; logo?: string; image?: string
  denoms: number[]                       // USD enteros, múltiplos de 5
  status: CardRequestStatus
  createdAt: string; submittedAt?: string; reviewedAt?: string
  rejectReason?: string                  // lo escribe Nosotros y lo ve el Proveedor
  approvedStoreId?: string
}
```
Funciones puras (sin React):
- `validateCardRequestDraft(d, { min, max, existingNames }): Record<string, string>` con errores por campo y estos textos exactos: nombre de 2 a 40 caracteres ("Entre 2 y 40 caracteres."); categoría de 2 a 30 ("Entre 2 y 30 caracteres."); descripción hasta 120 ("Máximo 120 caracteres."); valores: de 1 a 6 ("Ingresa entre 1 y 6 valores."), sin repetidos ("Hay valores repetidos."), todos múltiplos de 5 entre `min` y `max` (`Todos los valores deben ser múltiplos de 5 entre $${min} y $${max}.`); nombre duplicado, comparando sin tildes ni mayúsculas con `existingNames` (tiendas del catálogo y solicitudes de cualquier Proveedor, menos la propia): "Ya existe una tarjeta con ese nombre."
- `requestToProducts(req, denoms, providerId): Product[]` — un `Product` por valor, con `id: \`pr-${slug}-${usd}\``, `storeId: slug`, `storeName: req.name`, `providerId`, `faceCents: usd * 100`, `shippingCents: 0`, `active: true`.
- `slugify(text)` (la misma de la página de Catálogo: sin tildes, minúsculas, `-`, máximo 40) y `uniqueStoreId(base, existingIds)` (agrega `-2`, `-3`… si hace falta).
- `pricingErrorsFor(ctx, products): PricingIssue[]` — `validatePricing({ settings, providers, products, standardPacks, publicPacks, clients })` y devuelve **solo los errores nuevos**, o sea los que no existían con los productos actuales (compara por `message` contra el resultado base). `ctx` es `{ settings, providers, products, standardPacks, publicPacks, clients }`.
- `incompatibleDenoms(ctx, req, providerId): { denoms: number[]; combined: boolean }`: para cada valor, prueba **solo ese valor** (`pricingErrorsFor(ctx, [...ctx.products, ...requestToProducts(req,[d],providerId)])`) y lo marca incompatible si da errores; luego prueba el conjunto de los valores restantes y, si da errores, `combined: true`.
- `providerSafeMessage(r: { denoms: number[]; combined: boolean }): string | null` — **sin cálculos ni cifras de reglas**: con valores incompatibles: `"Estos valores no son compatibles con el catálogo actual: $5, $8. Quítalos o cámbialos y vuelve a enviar."`; solo `combined`: `"La combinación de valores no es compatible con el catálogo actual. Prueba quitando alguno y vuelve a enviar."`; si no hay problema, `null`.

## Paso 2/5 — Estado compartido y datos de ejemplo
- `lib/mock/data.ts`: `MOCK_CARD_REQUESTS: CardRequest[]` (fechas ISO de octubre de 2026):
  - `cr-1`: Fybeca · "Fybeca Mamá y Bebé" · categoría "Salud y belleza" · valores [20, 40, 60] · tema `salud` · `submitted`.
  - `cr-2`: Fybeca · "Fybeca Regalo" · "Salud y belleza" · [10, 25] · tema `juguete` · `draft`.
  - `cr-3`: Fybeca · "Fybeca Express" · "Salud y belleza" · [15] · tema `deporte` · `rejected` con `rejectReason: "El nombre se parece demasiado al de otra tarjeta del catálogo. Cámbialo y vuelve a enviar."`.
  - `cr-4`: Kywi (`p-kywi`) · "Kywi Pro" · "Hogar y ferretería" · [50, 100] · tema `hogar` · `submitted`.
  - Descripciones cortas coherentes. Sin logo ni imagen.
- `lib/mock/admin-settings.tsx`: agrega `cardRequests` / `setCardRequests` (inicial `MOCK_CARD_REQUESTS`) al contexto. Hook nuevo:
  ```ts
  /** Proveedor de la sesión de ejemplo: el del perfil; si entra Nosotros al panel, Fybeca. */
  export function useCurrentProvider() {
    const { profile } = useMockSession()
    const { providers } = useAdminSettings()
    const providerId = profile.providerId ?? "p-fybeca"
    return { providerId, provider: providers.find((p) => p.id === providerId) }
  }
  ```

## Paso 3/5 — Pestaña "Catálogo" (`components/panel/proveedor-shell.tsx` y `app/proveedor/catalogo/page.tsx`)
- `TABS`: agrega `{ href: "/proveedor/catalogo", label: "Catálogo" }` entre "Tarjetas" y "Liquidación". Subtítulo del panel: "Gestiona cobros en caja, tarjetas emitidas, tu catálogo y liquidaciones mensuales".
- La página (cliente, con `Skeleton` de carga como las demás) muestra:
  - Título "Catálogo de tus tarjetas" y descripción "Crea tus tarjetas y envíalas a Regala para su aprobación. Cuando se aprueban, aparecen en la tienda."
  - Botón "Nueva tarjeta".
  - 4 contadores pequeños (Borradores, En revisión, Aprobadas, Rechazadas) de **sus** solicitudes (`providerId` del hook).
  - Lista de tarjetas: `GiftCardFace` compacta (del `components/gift-card.tsx`; arma un `Store` con `id: "x"`, `name`, `category`, `theme`, `denoms`, `description`, `colors`, `logo`, `image`), nombre, categoría, valores ("$20 · $40 · $60"), fecha, y una `Badge` de estado: "Borrador" (gris), "En revisión" (ámbar), "Aprobada" (verde), "Rechazada" (rojo).
  - Para **Rechazada**: bloque rojo claro con "Motivo: …" (`rejectReason`). Para **Aprobada**: "Publicada en el catálogo". Para **En revisión**: "Esperando la revisión de Regala".
  - Acciones: Borrador y Rechazada → "Editar", y "Enviar a revisión"; Borrador → "Eliminar" (con `confirm`). En revisión y Aprobada → solo lectura (botón "Ver").
  - Estado vacío: "Aún no has creado tarjetas".
- **Nunca** muestres puntos, precios ni reglas en esta página.

## Paso 4/5 — Editor de solicitud (dentro de la página, en un `Dialog` grande con scroll, `max-w-3xl`)
- Campos: Nombre, Categoría (`Input` con `datalist` de las categorías del catálogo, `useCatalog().allStores`), Descripción (máx. 120), `DenomsEditor` (límites `settings.cardDenomMinUsd ?? 5` y `cardDenomMaxUsd ?? 500`; **sin** `hint`), `CardDesignEditor` (`resetKey` = id de la solicitud o "nueva"), y una vista previa `GiftCardFace` a tamaño normal con el primer valor.
- Solo lectura cuando el estado es En revisión o Aprobada (todos los campos deshabilitados y sin botones de guardar).
- Botones: "Guardar borrador" (valida con `validateCardRequestDraft`; guarda con `status: "draft"`) y "Guardar y enviar" (valida, luego `incompatibleDenoms` + `providerSafeMessage`; si hay mensaje, **no envía**, deja la solicitud como borrador y muestra el mensaje en un `Alert` rojo dentro del diálogo; si no, pide confirmación "Al enviarla, Regala la revisará. No podrás editarla mientras esté en revisión." y la pasa a `submitted` con `submittedAt`).
- Una rechazada que se reenvía pasa a `submitted`, conserva su historial y borra `rejectReason`.
- Enviar desde la lista ("Enviar a revisión") hace lo mismo que "Guardar y enviar" con los datos guardados.
- `existingNames` = nombres de `allStores` + nombres de todas las solicitudes (menos la editada).

## Paso 5/5 — Pruebas y commit
1. Rol Proveedor → `/proveedor/catalogo`: ve **3** solicitudes (cr-1, cr-2, cr-3; la de Kywi no). Los contadores dicen 1 / 1 / 0 / 1. La rechazada muestra su motivo.
2. Nueva tarjeta "Fybeca Hogar" con valores 10 y 30: "Guardar borrador" la crea; "Editar" funciona; "Guardar y enviar" pide confirmación y pasa a En revisión (solo lectura).
3. Errores de formulario: nombre de 1 carácter, sin valores, valor 7 (no es múltiplo de 5), nombre repetido ("Supermaxi") → mensajes exactos del Paso 1.
4. Prueba la función `incompatibleDenoms` con un **script temporal fuera del repo**: con un proveedor de descuento 0 % cualquier valor debe salir incompatible y `providerSafeMessage` devuelve el texto con los valores y **sin cifras de porcentajes, puntos ni márgenes**.
5. Ningún texto de la pestaña menciona puntos, margen, recargo, paquetes ni reglas. A 375 px, sin scroll horizontal.
6. `npx tsc --noEmit` (0 errores). Commit: `feat(proveedor): pestaña Catálogo para crear tarjetas y enviarlas a revisión`.

---

# PARTE S — Administración: "Solicitudes" y aprobación

## Paso 1/4 — Pestaña con contador (`components/panel/panel-shell.tsx`, `components/panel/admin-shell.tsx`)
- `PanelTab` agrega `badge?: number`; `PanelShell` pinta, junto al texto de la pestaña, una pequeña píldora (`rounded-full bg-primary text-primary-foreground text-[10px] px-1.5`) cuando `badge > 0`.
- `AdminShell`: `TABS` se arma dentro del componente con `useAdminSettings()`: `{ href: "/admin/solicitudes", label: "Solicitudes", badge: cardRequests.filter((r) => r.status === "submitted").length }`, colocada después de "Catálogo".

## Paso 2/4 — Página `app/admin/(secciones)/solicitudes/page.tsx`
- Título "Solicitudes de tarjetas", descripción "Tarjetas creadas por los Proveedores. Al aprobarlas se publican en el catálogo."
- Filtros (botones tipo pestañas): "En revisión" (por defecto), "Aprobadas", "Rechazadas", "Todas" (los borradores **no** se muestran: son privados del Proveedor).
- Tabla: Proveedor (nombre), Tarjeta (miniatura `GiftCardFace` compacta + nombre y categoría), Valores, Enviada (fecha), Estado (badge), botón "Revisar". Estado vacío por filtro.

## Paso 3/4 — Diálogo de revisión
Muestra la solicitud completa: vista previa grande, nombre, categoría, descripción, Proveedor y su descuento (el administrador sí lo ve). Después:
- **Valores**: una casilla por valor (todas marcadas); desmarcar excluye ese valor de la aprobación. Una tabla de vista previa por valor marcado con Facial, Costo total, Puntos (`productPoints`) y margen en el tramo más pequeño de cada tabla (usa `marginAtPack`, `productPoints`, `referenceCentsPerPoint` y `productTotalCostCents` como en Precios). Esta información es solo para Nosotros.
- **Reglas**: `pricingErrorsFor(ctx, [...products, ...requestToProducts(req, marcados, req.providerId)])`. Con errores nuevos: `Alert` rojo "Esta aprobación rompe reglas de precios" con **los mensajes reales** (el administrador los ve) y el botón **"Aprobar y publicar" deshabilitado**. Sin errores: `Alert` verde "Cumple todas las reglas de precios".
- Aprobar también se deshabilita si no hay valores marcados o si el nombre ya existe en el catálogo (comparación sin tildes).
- **"Aprobar y publicar"**: `id = uniqueStoreId(slugify(req.name), allStores.map(s => s.id))`; `saveStore({ id, name, category, theme, denoms: marcados ordenados, description, featured: false, active: true, ...(logo), ...(colors), ...(image) })` desde `useCatalog()`. Si devuelve `false` (almacenamiento lleno), `toast.error` y no apruebes nada. Si guarda: `setProducts((prev) => [...prev, ...requestToProducts(req, marcados, req.providerId)])` y la solicitud pasa a `approved` con `reviewedAt` y `approvedStoreId: id`. `toast.success("Tarjeta publicada en el catálogo")`.
- **"Rechazar"**: abre un campo de texto "Motivo para el Proveedor" (obligatorio, máx. 300 caracteres) con una advertencia: "El Proveedor verá este texto. No incluyas precios, márgenes ni reglas." Si había valores incompatibles, prellénalo con `providerSafeMessage(incompatibleDenoms(...))`. Al confirmar: `status: "rejected"`, `rejectReason`, `reviewedAt`.
- Solicitudes ya aprobadas o rechazadas se abren en solo lectura (con el motivo o el enlace a Catálogo para la aprobada).

## Paso 4/4 — Documentación, pruebas y commit
- `CLAUDE.md`, "Decisiones de negocio vigentes": agrega "**Catálogo del Proveedor:** el Proveedor crea tarjetas (nombre, categoría, descripción, valores, diseño) en `/proveedor/catalogo` y las envía; Nosotros las aprobamos en `/admin/solicitudes`. Aprobar crea la tarjeta en el catálogo y sus productos con el descuento del Proveedor, y se bloquea si rompe reglas de precios. El Proveedor nunca ve reglas ni cálculos: solo qué valores no son compatibles y el motivo que escribimos."
- `PLAN-ROLES.md`, sección "Proveedor (`/proveedor`)": agrega un punto con ese flujo. `PLAN-BACKEND.md`, fase B8: tabla `card_requests` (`id`, `provider_id`, `name`, `category`, `description`, `theme`, `colors`, `logo_path`, `image_path`, `denoms int[]`, `status`, `reject_reason`, `reviewed_by`, `reviewed_at`, `approved_store_id`), políticas RLS (el Proveedor ve y edita solo las suyas en `draft`/`rejected`; Nosotros vemos todas), y la función `approve_card_request(request_id, denoms)` que crea tienda y productos en una transacción y **vuelve a validar los precios en el servidor**.
- Pruebas, con `npm run dev` abierto:
  1. Rol Nosotros → `/admin/solicitudes`: la pestaña muestra un contador **2** (cr-1 y cr-4). "En revisión" lista las dos; los borradores no aparecen.
  2. Abre "Fybeca Mamá y Bebé": se ven Proveedor, descuento 12 %, tabla con puntos y márgenes, y "Cumple todas las reglas". Desmarca el valor $60 y aprueba: toast, la solicitud pasa a Aprobada, el contador baja a 1.
  3. En `/shop` aparece "Fybeca Mamá y Bebé" con valores $20 y $40 y su precio en puntos (valor × 1,03 redondeado: $20 → 2.060 pts); en Administración → Catálogo se puede editar; en Precios aparecen sus 2 productos y "Todas las reglas se cumplen".
  4. Rol Proveedor → Catálogo: esa solicitud ahora dice **Aprobada** y "Publicada en el catálogo".
  5. Rechaza "Kywi Pro" con un motivo: en rol Proveedor de Kywi no hay forma de entrar (el prototipo siempre entra como Fybeca), así que verifica el estado en la tabla de Solicitudes (Rechazada). Rechaza también una nueva solicitud de Fybeca ("Fybeca Hogar" enviada en la Parte R) con el motivo "Cambia el nombre." y confirma que el Proveedor lo ve y puede **Editar y reenviar**; al reenviar vuelve a "En revisión" sin el motivo.
  6. Rol Canjeador: `/admin/solicitudes` muestra el aviso de acceso. A 375 px, sin scroll horizontal en las dos páginas nuevas.
  7. `npx tsc --noEmit` (0 errores). Commit: `feat(admin): solicitudes de tarjetas de Proveedores con aprobación que publica en el catálogo`.

## Paso final — Revisión
Avisa al dueño al terminar cada parte. Opus revisa el diff, corre `tsc`, prueba las funciones con el código real y recorre el flujo en el navegador con cada rol.

---

# PARTE T — Correcciones de la revisión (Opus, 2026-10-15; commits cd086da, 635cc00, fd45938)

Lo verificado: `tsc` 0 errores; el dominio con datos reales; el flujo completo con los tres roles (crear, enviar, aprobar sin $60, publicar en la tienda con $20 → 2.060 pts, Precios sin errores, rechazar con motivo, reenviar); el Proveedor no ve puntos, márgenes ni reglas; sin scroll horizontal a 375 px.

## Paso 1/3 — Bucle al marcar "Quitar fondo" (**importante**; viene de la Parte Q)
Medido en vivo: con "Quitar fondo" marcado, `removeFlatBackground` se vuelve a ejecutar sin parar (7 veces en 4 s con un logo de 200×100). Causa [cierto]: en `components/panel/card-design-editor.tsx` el efecto de quitar fondo tiene `onChange` en sus dependencias, y las dos pantallas (`app/admin/(secciones)/page.tsx` y `app/proveedor/catalogo/page.tsx`) pasan una función nueva en cada render; cada recálculo llama a `onChange`, vuelve a renderizar y reinicia el efecto.
- Arreglo: guarda `onChange` en un ref (`const onChangeRef = useRef(onChange); onChangeRef.current = onChange`), usa `onChangeRef.current(...)` dentro del efecto y **quita `onChange` del arreglo de dependencias** (quedan `removeBg`, `tolerance`, `logoOriginal`). No cambies las pantallas.

## Paso 2/3 — Id de tienda y productos desalineados (menor)
`handleApprove` calcula el id de la tienda con `uniqueStoreId(slugify(name), …)`, pero `requestToProducts` usa `slugify(name)` sin la numeración; si el id de la tienda termina en `-2` (dos nombres con el mismo slug, por ejemplo "Kywi Pro" y "Kywi-Pro"), los productos quedan con otro `storeId`.
- `lib/domain/card-requests.ts`: `requestToProducts(req, denoms, providerId, storeId?: string)` usa `storeId ?? slugify(req.name)` para `storeId` y para el `id` de cada producto (`pr-${storeId}-${usd}`).
- `app/admin/(secciones)/solicitudes/page.tsx`: en `handleApprove`, pasa `id` como cuarto argumento. En las pruebas de reglas (antes de aprobar) puede quedar sin él.

## Paso 3/3 — Pruebas y commit
1. Con la casilla "Quitar fondo" marcada en el editor de tarjeta del Proveedor (sube un logo con fondo liso), la imagen se recalcula **una vez** al marcar y una vez por cada cambio de tolerancia, no de forma continua (cuenta las llamadas a `canvas.toDataURL` durante 4 s: máximo 1 o 2).
2. Comprobación del Paso 2 con un script temporal fuera del repo: `requestToProducts({ name: "Kywi Pro" }, [50], "p-kywi", "kywi-pro-2")` devuelve `storeId: "kywi-pro-2"` e `id: "pr-kywi-pro-2-50"`; sin cuarto argumento sigue dando `kywi-pro`.
3. Repite el flujo aprobar → tienda → Precios sin errores.
4. `npx tsc --noEmit` (0 errores). Commit: `fix(catalogo): quitar fondo sin bucle de recálculo e id de tienda coherente con sus productos`.
