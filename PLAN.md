# PLAN — PetDo (tienda de mascotas) → "Regala": gift cards Ecuador con Puntos

Stack real: **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3 + shadcn/ui + pnpm**.
Este plan lo ejecuta un modelo económico (Haiku / Antigravity) en Windows (PowerShell).

## Reglas para el ejecutor
1. Ejecuta **una fase por sesión**, en orden. Al terminar cada fase: verifica su checklist y haz commit.
2. **No modifiques** los archivos de la sección "Núcleo ya hecho". Solo **impórtalos**.
3. Todo texto visible en **español (Ecuador)**. Cero referencias a perros/mascotas.
4. Si un paso no encaja con el código, **detente y repórtalo**; no improvises arquitectura.
5. `next.config.mjs` tiene `ignoreBuildErrors: true`: `next build` **no** detecta errores de TypeScript. Usa siempre `npx tsc --noEmit` (ver Fase 9).
6. Componentes UI disponibles en `components/ui/*` (button, card, badge, input, label, checkbox, select, sheet, accordion, separator, textarea, skeleton…). Iconos: `lucide-react`. Toasts: `import { toast } from "sonner"`.

## Preparación (una vez)
```powershell
git fetch origin
git checkout claude/pet-store-gift-cards-refactor-n3h79x
pnpm install
pnpm dev   # http://localhost:3000
```

---

## Núcleo ya hecho y verificado (NO tocar, solo usar)

| Archivo | Qué exporta / hace |
|---|---|
| `lib/catalog.ts` | Constantes: `DEFAULT_STORES` (catálogo inicial, solo semilla), `PACKS`, `THEMES`, `POINTS_PER_USD` (150), `pointsFor(usd)`, `formatPoints(n)`, tipos `Store`, `PointsPack`. **No** exporta `STORES`, `CATEGORIES` ni `findStore`. |
| `lib/catalog-store.tsx` | `<CatalogProvider>` y hook `useCatalog()` → `{ ready, stores (solo activas), allStores, categories, findStore(id), isAvailable(storeId, usd), saveStore, removeStore, resetCatalog }`. El catálogo es editable desde `/admin`. **Todo componente cliente que necesite tiendas o categorías debe usar este hook** (las páginas que lo usan llevan `"use client"`). |
| `lib/admin-auth.ts` + `app/admin/` | Panel `/admin` (solo el dueño): añadir, editar, ocultar y eliminar tiendas del catálogo. Clave por `NEXT_PUBLIC_ADMIN_HASH` en `.env.local`. Sin enlaces desde el header ni el footer. |
| `lib/points-store.tsx` | `<PointsProvider>` y hook `usePoints()` → `{ balance, cart, orders, topups, ready, cartTotal, cartCount, addToCart(storeId, usd), setQty(storeId, usd, qty), clearCart(), redeem(opts), topUp(packId, last4) }` |
| `lib/payment.ts` | Validación de tarjeta (solo la usa `/recargar`) |
| `components/points-balance.tsx` | Indicador 💎 de saldo en el header (enlaza a `/recargar`) |
| `components/gift-card.tsx` | `<GiftCardFace store usd />` (visual de tarjeta) y `<GiftCardTile store />` (selector de valor + botón **"Canjear por X puntos"**) |
| `app/recargar/page.tsx` | Compra de paquetes de Puntos con tarjeta (simulada). **Único lugar con pago en dinero.** |
| `app/checkout/page.tsx` | Canje con Puntos (sin datos bancarios); redirige a `/checkout/success?order=<id>` |
| `app/layout.tsx` | Envuelve la app en `CatalogProvider` > `PointsProvider` + `<Toaster />`, `lang="es"` |
| `components/header.tsx` | Ya tiene: logo "Regala", saldo de puntos, badge del carrito real. **Falta** traducir nav (Fase 2) |

Reglas de uso de `usePoints()` y `useCatalog()`:
- Tiendas y categorías: `const { stores, categories, findStore } = useCatalog()`. Nunca importes `DEFAULT_STORES` en una página: ignoraría los cambios del administrador.
- `usePoints().cart` ya viene filtrado por disponibilidad (una tienda oculta o con otros valores no aparece ni se canjea).
- Antes de mostrar saldo/carrito comprueba `ready` (se carga de `localStorage` tras montar). Mientras `!ready` muestra `<Skeleton />` o "Cargando…".
- Para quitar un ítem: `setQty(storeId, usd, 0)`.
- Precio en puntos de un ítem: `pointsFor(item.usd) * item.qty`. Formatear siempre con `formatPoints()` + `" pts"`.
- **Dólares permitidos** solo como valor facial (`$25` en la tarjeta) y en `/recargar`. Nunca "precio", "envío", "impuesto", "subtotal $".

Cualquier página que use `useSearchParams()` debe envolver su contenido en `<Suspense>` (si no, `next build` falla). Patrón:
```tsx
import { Suspense } from "react"
export default function Page() { return <Suspense fallback={null}><Content /></Suspense> }
function Content() { const params = useSearchParams(); /* … */ }
```

---

## FASE 1 — Tema visual y metadatos
1. `app/globals.css`: en `:root` y `.dark` cambia **solo** estas variables:
   - `--primary: 262 83% 58%;` (violeta) · `--ring: 262 83% 58%;`
   - en `:root`: `--accent: 262 100% 97%;` `--accent-foreground: 262 60% 30%;`
   - en `.dark`: `--accent: 262 30% 18%;` `--accent-foreground: 0 0% 98%;`
2. `app/layout.tsx` → `metadata`: `title: "Regala — Gift cards de Ecuador con Puntos"`, `description: "Canjea tus Puntos por gift cards de Supermaxi, Fybeca, Marathon Sports y más. Entrega digital inmediata."`. Elimina `generator: 'v0.app'`.
3. `styles/globals.css` no se importa en ningún lado: **bórralo**.

✅ Checklist: botones y enlaces se ven violetas. Commit `style: tema violeta y metadatos`.

## FASE 2 — Header y footer (`components/header.tsx`, `components/footer.tsx`)
Header (escritorio y menú móvil):
- Enlaces: `Inicio` (/), `Gift cards` (/shop), dropdown `Categorías` generado con `categories.map(c => <Link href={`/shop?categoria=${encodeURIComponent(c)}`}>)` (reemplaza Food/Accessories/Toys/Grooming, que apuntaban a rutas inexistentes), `Recargar Puntos` (/recargar), `Nosotros` (/about), `Contacto` (/contact).
- Búsqueda: `placeholder="Buscar tiendas…"`; envuélvela en `<form>` que al enviar haga `router.push(`/shop?q=${encodeURIComponent(valor)}`)` (`useRouter` de `next/navigation`).
- `sr-only`: "Iniciar sesión", "Carrito", "Menú".
- En el menú móvil añade el enlace `Mi cuenta` (/login), porque el icono de usuario está oculto en móvil.
- **No** toques `PointsBalance` ni el badge del carrito.

Footer: marca "Regala", descripción "Gift cards digitales de las tiendas favoritas de Ecuador, canjeables con Puntos.", columnas: *Explorar* (Gift cards, Recargar Puntos, Cómo funciona → `/#como-funciona`), *Ayuda* (Contacto, Preguntas frecuentes → `/#faq`, Términos, Privacidad), *Contacto* (Quito, Ecuador · hola@regala.ec). Quita textos/imagenes de mascotas. Copyright `© {año} Regala. Las marcas mencionadas pertenecen a sus respectivos dueños.`

✅ Checklist: a 375 px de ancho no hay scroll horizontal; todos los enlaces llevan a rutas existentes. Commit `feat: navegación de gift cards`.

## FASE 3 — Catálogo `app/shop/page.tsx` (reescritura completa)
Borra el array `products`, filtros de marca/rating/precio y la paginación. Implementa:
- Datos: `stores` y `categories` de `useCatalog()` (`@/lib/catalog-store`); tarjeta: `<GiftCardTile store={s} />`.
- Estado inicial desde la URL (`useSearchParams`, con `<Suspense>`): `categoria` → categoría preseleccionada; `q` → texto de búsqueda.
- Barra superior: `<Input>` de búsqueda (filtra por `name` y `category`, sin distinguir mayúsculas ni tildes: `s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()`), chips de categoría ("Todas" + `categories`, uno activo), `<Select>` de orden: `Destacadas` (featured primero), `Menos puntos`, `Más puntos` (por `pointsFor(s.denoms[0])`).
- Grid: `grid gap-6 sm:grid-cols-2 lg:grid-cols-3`.
- Vacío: "No encontramos tiendas con ese criterio" + botón "Limpiar filtros".
- Encabezado: `h1` "Gift cards" + breadcrumb `Inicio / Gift cards` + contador `{n} tiendas`.
- `app/shop/loading.tsx`: déjalo como está.

✅ Checklist: `/shop?categoria=Deportes` muestra solo Marathon Sports; buscar "jugueton" encuentra Juguetón; cada botón dice "Canjear por X puntos" y cambia al elegir otro valor. Commit `feat: catálogo de gift cards`.

## FASE 4 — Carrito `app/cart/page.tsx` (reescritura)
- Fuente: `const { cart, cartTotal, balance, ready, setQty, clearCart } = usePoints()`. Borra el array mock.
- `!ready` → "Cargando…". Vacío → "Tu carrito está vacío" + botón "Ver gift cards" (/shop).
- Fila por ítem: `<GiftCardFace store={findStore(i.storeId)!} usd={i.usd} compact className="w-28 shrink-0" />`, nombre `"{tienda} · ${usd}"`, puntos unitarios, controles −/+ (`setQty(i.storeId, i.usd, i.qty ± 1)`; con 1 el "−" queda deshabilitado), botón eliminar (`setQty(..., 0)`), subtotal en pts.
- Resumen (Card): `Total` en pts, `Tu saldo`, y si `cartTotal > balance`: texto rojo "Te faltan X pts" + botón **"Recargar Puntos"** (/recargar). Si alcanza: botón **"Canjear X puntos"** → `/checkout`.
- **Elimina**: envío, impuestos, cupón, cualquier `$` excepto el valor facial.
- Botones inferiores: "Seguir explorando" (/shop) y "Vaciar carrito" (`clearCart`).

✅ Checklist: el badge del header coincide con la suma de cantidades; recargar la página conserva el carrito. Commit `feat: carrito en puntos`.

## FASE 5 — Confirmación `app/checkout/success/page.tsx` (reescritura) y limpieza
- `"use client"`; lee `order` con `useSearchParams` (con `<Suspense>`); busca en `usePoints().orders`.
- No encontrada (o `!ready`) → mensaje + enlace a /shop.
- Encontrada: icono check, "¡Canje exitoso!", fecha (`toLocaleString("es-EC")`), puntos usados, saldo restante. Si `recipientEmail` → "Enviaremos las gift cards a {email}" y el `message` entre comillas.
- Lista de códigos: por cada `codes[]` → `<GiftCardFace>` pequeño + `<code>` monoespaciado + botón "Copiar" (`navigator.clipboard.writeText(code)` + `toast.success("Código copiado")`).
- Nota: "Códigos de demostración, no válidos en tienda."
- Botones: "Canjear más" (/shop), "Recargar Puntos" (/recargar).
- **Borra la carpeta `app/checkout/review/`** (el flujo ya no tiene ese paso). Busca y elimina enlaces a `/checkout/review` y `/account/orders`.

✅ Checklist: canjear desde /checkout muestra los códigos; refrescar la página los sigue mostrando. Commit `feat: confirmación de canje con códigos`.

## FASE 6 — Home `app/page.tsx` (reescritura completa)
Borra arrays de productos/categorías/testimonios de mascotas y todas las imágenes de Unsplash. Secciones en orden:
1. **Hero** (degradado `bg-gradient-to-br from-primary/15 via-background to-pink-500/10`): h1 "Regala lo que realmente quieren", subtítulo "Canjea tus Puntos por gift cards de las tiendas favoritas de Ecuador. Entrega digital inmediata.", botones "Ver gift cards" (/shop) y "Recargar Puntos" (/recargar, `variant="outline"`). A la derecha: 3 `<GiftCardFace>` superpuestas y rotadas (`rotate-[-8deg]`, `rotate-[4deg]`…) usando 3 tiendas `featured`; ocultas en móvil (`hidden md:block`).
2. **Categorías**: chips/tarjetas desde `categories` (de `useCatalog()`) → `/shop?categoria=…`, con icono lucide (ShoppingBasket, HeartPulse, Dumbbell, Hammer, ToyBrick, Shirt).
3. **Destacadas**: `stores.filter(s => s.featured)` (de `useCatalog()`) → `<GiftCardTile>` en grid; botón "Ver todas" (/shop).
4. **Cómo funciona** (`id="como-funciona"`): 3 pasos con iconos Gem, Gift, Zap: "Recarga Puntos" / "Elige tu gift card" / "Recibe tu código al instante".
5. **Paquetes**: `PACKS` en 3 tarjetas (puntos, `$usd`, badge) → todas enlazan a `/recargar`.
6. **FAQ** (`id="faq"`, `Accordion`): ¿Qué son los Puntos? · ¿Los Puntos caducan? (respuesta: "En esta demo, no.") · ¿Cómo recibo mi gift card? · ¿Puedo regalarla a otra persona?
7. **Newsletter**: traducir ("Recibe promociones de Puntos").

✅ Checklist: sin imágenes externas; a 375 px sin scroll horizontal. Commit `feat: home de gift cards`.

## FASE 7 — Páginas de texto y ajustes de seguimiento
**Parte A.** Traduce al español y quita toda referencia a mascotas en: `app/about/page.tsx` (misión: "hacer fácil regalar en Ecuador"; sin fotos de perros: usa iconos o `<GiftCardFace>`), `app/contact/page.tsx` (dirección Quito, correo hola@regala.ec, horario; formulario igual pero en español; **arregla el error de tipos de la línea 17**: tipa el parámetro `e` con `React.FormEvent<HTMLFormElement>` o `React.ChangeEvent<...>`), `app/login`, `app/register`, `app/forgot-password` (solo textos; en register añade nota "Recibe 500 Puntos de bienvenida"; sin autenticación real). `app/loading.tsx`: texto "Cargando…".

**Parte B.**
- B1 Newsletter del home (`app/page.tsx`): el formulario recarga la página sin respuesta. Extráelo a `components/newsletter-form.tsx` (`"use client"`): `preventDefault`, valida que el correo no esté vacío, `toast.success("¡Gracias! Te avisaremos de las novedades")` y vacía el campo. No guardes el correo (es demo). No prometas bonificaciones en ningún texto.
- B2 `components/header.tsx`: entre 768 y 1023 px no hay buscador. El menú de escritorio debe aparecer desde `lg`: cambia `hidden md:flex` por `hidden lg:flex` en el `<nav>` de escritorio, y `md:hidden` por `lg:hidden` en el botón de menú y en el contenedor del menú móvil. No toques `<PointsBalance />` ni el badge del carrito.

✅ Checklist: `npx tsc --noEmit` con **cero** errores; a 800 px se ve el botón de menú y su buscador; newsletter muestra el aviso. Commit `chore: textos en español y ajustes de seguimiento`.

## FASE 8 — Honestidad de la demo y README
**Parte A — textos que prometen cosas que la demo no hace** (no hay servidor: no se envían correos, mensajes ni cuentas):
- `app/contact/page.tsx`: tras enviar, el mensaje dice "enviado con éxito". Cámbialo por: título "Esto es una demostración", texto "Tu mensaje no se envió porque este sitio todavía no tiene servidor. Cuando esté en producción te responderemos por correo."
- `app/checkout/success/page.tsx`: "Enviaremos las gift cards a {email}" → "Destinatario: {email} (en esta demo no se envía ningún correo; copia el código y compártelo)". `app/checkout/page.tsx`: cambia la nota bajo el formulario por "Demo: no se envía correo; los códigos aparecen al instante en pantalla."
- `app/page.tsx` (FAQ): en "¿Puedo regalarla a otra persona?" y "¿Cómo recibo mi gift card?" aclara que en la demo el código se muestra en pantalla y se comparte copiándolo.
- `app/about/page.tsx`: quita "o por correo" de "Códigos inmediatos entregados en tu pantalla o por correo", y reemplaza el texto de "Confianza" ("Seguridad en cada transacción y garantía de validez en cada código canjeado") por "Transparencia en cada canje: ves cuántos Puntos usas y cuál es tu saldo."
- `app/login/page.tsx` y `app/register/page.tsx`: añade arriba del formulario un aviso "Demostración: el inicio de sesión aún no está activo." (en register: "el registro aún no crea cuentas") y elimina el bloque "O continuar con" (botones de Google y Facebook): no funcionan.

**Parte B — README.**
Crear `README.md`: qué es, `npm install` / `npm run dev` (o pnpm), flujo (recargar → elegir → canjear), **cómo configurar `/admin`** (generar el hash con el comando de PowerShell que muestra la propia página, guardarlo en `.env.local` como `NEXT_PUBLIC_ADMIN_HASH`, reiniciar el servidor) y sección **Limitaciones de la demo**: saldo y catálogo en `localStorage` (manipulables y visibles solo en el navegador donde se guardan), la clave de `/admin` se comprueba en el navegador (frena el acceso casual, no es seguridad real), pago simulado (tarjeta de prueba 4242 4242 4242 4242), códigos ficticios, marcas solo como referencia. Commit `docs: README`.

## FASE 9 — Verificación final (PowerShell)
```powershell
# 1) Sin restos de mascotas (debe salir vacío)
Get-ChildItem -Recurse -Include *.tsx,*.ts app,components,lib | Select-String -Pattern '\b(dogs?|pets?|petdo|puppy|perros?|mascotas?|paws)\b'
# 2) Lógica de tarjeta solo en recarga (solo deben aparecer lib/payment.ts y app/recargar/page.tsx)
Get-ChildItem -Recurse -Include *.tsx,*.ts app,components,lib | Select-String -Pattern 'cc-number|cvv|validateCard' | Select-Object -Unique Path
# 3) Sin precios en dólares fuera del valor facial y recarga: revisa a mano cada resultado
Get-ChildItem -Recurse -Include *.tsx app | Select-String -Pattern 'shipping|tax|subtotal|toFixed\(2\)'
# 4) Tipos: ningún error en archivos que tocaste (antes del plan había 9 errores preexistentes en otras páginas)
npx tsc --noEmit
# 5) Build
pnpm build
```
Prueba manual (en ventana de incógnito):
- [ ] Header: 💎 500 pts.
- [ ] Añadir Kywi $20 (3.000 pts) → carrito: "Te faltan 2.500 pts" → Recargar Puntos.
- [ ] Recargar 5.000 con `4242 4242 4242 4242`, `12/30`, `123` → saldo 5.500. Con `1234 5678 9012 3456` → error.
- [ ] Canjear → saldo 2.500, códigos visibles, botón Copiar funciona, carrito vacío.
- [ ] Navegar todas las páginas del menú: ninguna 404.

Commit final y push:
```powershell
git push -u origin claude/pet-store-gift-cards-refactor-n3h79x
```

---

## Fuera de alcance (antes de producción)
1. Backend con saldo y registro de transacciones: el navegador nunca debe decidir el saldo.
2. Pasarela con formulario alojado (Payphone, Kushki, Datafast): no capturar números de tarjeta propios (PCI-DSS).
3. Acuerdos con las tiendas para emitir códigos reales; facturación electrónica SRI por la venta de Puntos; política de caducidad y reembolso.
4. Validar `POINTS_PER_USD` contra el margen real que den las tiendas.
5. Administración real: catálogo en base de datos (Supabase, Firebase, Vercel KV…) y acceso con autenticación de servidor. Hoy `/admin` solo cambia el catálogo en el navegador de quien lo usa; el resto de visitantes no ve esos cambios.
