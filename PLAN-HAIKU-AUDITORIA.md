# Plan para Haiku / Antigravity — Correcciones de la auditoría (oct 2026)

Tres partes **en este orden** (I → J → K), una por prompt y cada una con su propio commit. Al final, Opus revisa.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`.

## Reglas para todas las partes (no negociables)
1. Solo toca los archivos que nombra la parte. Si algo no cuadra, DETENTE y pregunta. No cambies `lib/domain/pricing.ts`.
2. No ejecutes `npm run build` con `npm run dev` abierto. Verifica con `npx tsc --noEmit` (0 errores).
3. Textos en español. Confidencialidad: precio por punto, márgenes y costos solo en `/admin`.
4. Un commit al final de cada parte, solo con los archivos tocados (nunca `package-lock.json` ni `.env*`), y `git push`.
5. Para probar un rol, usa la barra "Prototipo · Ver como".

---

## Parte I — Errores de pantalla

### Paso 1/5 — Aviso de acceso vacío (`components/panel/role-gate.tsx`)
`AdminShell` pasa `allow=[]`, así que el aviso dice "Esta sección es para: ." sin ningún rol. Además, "Nosotros" siempre tiene acceso, pero el aviso nunca lo menciona.
- Cambia el texto a `[...allow, "admin"].map((r) => ROLE_LABEL[r]).join(", ")`, sin repetir `admin` si ya está en `allow`.

### Paso 2/5 — "Agosto De 2026"
En `app/proveedor/liquidacion/page.tsx` y `app/admin/(secciones)/liquidaciones/page.tsx`:
- quita la clase `capitalize` de la celda del periodo;
- en la función que formatea el mes, pon en mayúscula solo la primera letra: `s.charAt(0).toUpperCase() + s.slice(1)`.

Resultado esperado: "Agosto de 2026". Revisa también `app/admin/(secciones)/resumen/page.tsx`, que usa el mismo formato; si muestra "De", aplica lo mismo.

### Paso 3/5 — Pantallas que no leen el estado compartido
Hoy leen los datos fijos de ejemplo y no ven lo que se edita en el panel. Cambia a `useAdminSettings()`:
- `app/admin/(secciones)/usuarios/page.tsx`: `MOCK_PROVIDERS` → `providers` del contexto (incluido el valor inicial de `setSelectedProviderId`).
- `app/admin/(secciones)/liquidaciones/page.tsx`: `MOCK_PROVIDERS` → `providers`.
- `app/cuenta/tarjetas/page.tsx`: `MOCK_SETTINGS` → `settings` en las tres llamadas a `exchangePreview`.
- `app/cliente/comprar/page.tsx`, `app/cliente/bono/page.tsx` y `app/cliente/repartir/page.tsx`: obtén el cliente con `const client = clients.find((c) => c.id === MOCK_CLIENT.id) ?? { ...MOCK_CLIENT, customPacks: MOCK_CLIENT_PACKS }`, y usa:
  - `client.packMode` y `client.customPacks` en vez de `MOCK_CLIENT.packMode` y `MOCK_CLIENT_PACKS`;
  - `client.usdPerPoint` y `client.bonusPct` en vez de los de `MOCK_CLIENT`.

### Paso 4/5 — De Prati se vende sin proveedor activo
En `lib/catalog.ts`, la tienda `deprati` de `DEFAULT_STORES` pasa a `active: false`, porque su Proveedor y su producto están desactivados en el panel. (Si el navegador tiene un catálogo personalizado guardado, se ve con "Restaurar original" en Catálogo.)

### Paso 5/5 — Pruebas y commit
1. Rol Canjeador → `/admin/resumen`: el aviso dice "Esta sección es para: Nosotros."; en `/cliente` dice "Cliente, Nosotros".
2. Rol Proveedor → Liquidación: los meses salen como "Agosto de 2026". Lo mismo en `/admin/liquidaciones`.
3. Rol Nosotros:
   - En Proveedores, cambia el nombre de Kywi. En Usuarios y en Liquidaciones, la lista de proveedores muestra el nombre nuevo.
   - En Ajustes, cambia el recargo por cambio de tarjeta a 20 % y guarda. En `/cuenta/tarjetas`, "Cambiar por puntos" de Marathon calcula con 20 %.
   - En Clientes, edita el tramo de $170 de Concesionaria Andina. En `/cliente/comprar` se ve el nuevo valor.
4. `/shop` ya no muestra De Prati.
5. `npx tsc --noEmit` y commit: `fix(auditoria): aviso de acceso, formato de meses, pantallas que leen el estado compartido y De Prati oculta`.

---

## Parte J — Datos de ejemplo coherentes con el modelo actual (`lib/mock/data.ts`)

Modelo: tarjeta = valor facial × 1,03, redondeado a 10 pts. Cambio de tarjeta caducada = 90 % de lo pagado. Proveedor Fybeca al 12 %. Los historiales tenían precios del modelo anterior (120 % del valor facial). Cifras ya calculadas [cierto]:

| Qué | Antes | Después |
|---|---|---|
| `MOCK_CARDS` `pointsPaid` | card-1 3500, card-2 3000, card-3 6000, card-4 2400, card-5 1800, card-6 3000 | **3090, 2580, 5150, 2060, 1550, 2580** |
| `MOCK_LEDGER` | l-2 −3500, l-3 +2600, l-5 +2160, l-6 −3000 | **l-2 −3090, l-3 +2500, l-5 +1854, l-6 −2580** |
| `MOCK_LOTS` lot-1 | remaining 14750, usdPerPoint 0.008 | **remaining 15580, usdPerPoint 0.00971984** |
| `MOCK_LOTS` lot-2 | 2600 / 2600, usdPerPoint 0.009615 | **2500 / 2500, usdPerPoint 0.01** |
| `MOCK_LOTS` lot-3 | usdPerPoint 0.0085 | **0.0098039** |
| `MOCK_LOTS` lot-4 | 2160 / 2160, usdPerPoint 0.008 | **1854 / 1854, usdPerPoint 0.00971984** |
| `MOCK_GRANTED` g-1 (cédula de Ana) | pointsUsed 3400 | **5670** (= 3.090 + 2.580, lo que Ana gastó de ese lote) |
| `MOCK_SETTLEMENTS` s-3 (Fybeca, oct) | amountCents c(1311) | **139040** (= $1.580 × 0,88; escríbelo literal, no con `c()`) |
| `MOCK_PROVIDER_KPIS.settlementPendingCents` | c(1311) | **139040** |

Comprobación: saldo de Ana = 15.580 + 2.500 + 1.000 + 1.854 = **20.934 pts**, y la suma del historial da lo mismo.

### Pruebas y commit
1. Rol Canjeador:
   - `/cuenta` muestra 20.934 pts.
   - `/cuenta/puntos`: la suma de los lotes es igual a la suma del historial.
   - `/cuenta/tarjetas`: "Cambiar por puntos" de Marathon da 4.635 pts.
2. Rol Cliente → `/cliente`: "Puntos usados" 15.370 y "Repartidos sin usar" 34.380.
3. Rol Proveedor → Resumen y Liquidación: pendiente $1.390,40.
4. `npx tsc --noEmit` y commit: `fix(datos): historiales y liquidaciones de ejemplo con el modelo de precios vigente`.

---

## Parte K — Textos, SEO y configuración

### Paso 1/4 — Textos desactualizados
- `app/admin/(secciones)/ajustes/page.tsx`, ayuda de "Beneficio mínimo del Cliente": reemplaza el paréntesis por "(con 1 %, cada dólar del Cliente rinde al menos 1 % más puntos que el del Canjeador)".
- Comentarios con "100 pts por $1" en `app/recargar/page.tsx` y `lib/points-store.tsx`: pasa a "a los puntos por dólar que fija el administrador".
- `app/page.tsx`, preguntas frecuentes: agrega, después de "¿Los Puntos caducan?", la pregunta "¿Las gift cards caducan?" con la respuesta: "Sí. Cada tarjeta tiene una fecha de vencimiento que ves en Mi cuenta → Mis tarjetas. Si vence con saldo, puedes cambiar ese saldo por Puntos dentro del plazo indicado, con un recargo."

### Paso 2/4 — Títulos de página y noindex
Las páginas son de cliente y no pueden exportar `metadata`. Crea un `layout.tsx` por ruta que solo exporte `metadata` y devuelva `children`, igual que `app/cuenta/layout.tsx`:
- `app/shop`: "Gift cards — Regala"; `app/recargar`: "Recargar Puntos — Regala"; `app/about`: "Nosotros — Regala"; `app/contact`: "Contacto — Regala".
- Con `robots: { index: false, follow: false }`: `app/cart` ("Carrito — Regala"), `app/checkout` ("Canje — Regala"), `app/login` ("Iniciar sesión — Regala"), `app/register` ("Crear cuenta — Regala") y `app/forgot-password` ("Recuperar contraseña — Regala").
- Si alguna de esas carpetas ya tiene `layout.tsx`, agrega solo `metadata`.

### Paso 3/4 — robots y sitemap
- `app/robots.ts`: permite `/`, bloquea `/admin`, `/cuenta`, `/cliente`, `/proveedor`, `/cart` y `/checkout`, y apunta al sitemap.
- `app/sitemap.ts`: `/`, `/shop`, `/recargar`, `/about`, `/contact`, `/terminos` y `/privacidad`.
- URL base: `process.env.NEXT_PUBLIC_SITE_URL ?? "https://puntos-three.vercel.app"`.
- En `app/layout.tsx`, agrega `metadataBase: new URL(<esa misma URL>)` y `openGraph: { title, description, locale: "es_EC", type: "website" }`, con el mismo título y descripción que ya tiene.

### Paso 4/4 — Configuración, pruebas y commit
- `package.json`: `"name": "regala"`. Reemplaza `"lint": "eslint ."` (eslint no está instalado y el script falla) por `"typecheck": "tsc --noEmit"`.
- No ejecutes `npm install`.
- Pruebas:
  1. La pestaña del navegador muestra el título nuevo en cada ruta.
  2. `/robots.txt` y `/sitemap.xml` responden.
  3. La pregunta nueva aparece en el inicio.
  4. `npm run typecheck` da 0 errores.
- **Revisión móvil (375 px)**, sin scroll horizontal: `/`, `/shop`, `/recargar`, `/cart`, `/checkout`, `/cuenta/*`, `/cliente/*`, `/proveedor/*` y cada pestaña de `/admin`. Las tablas pueden desplazarse dentro de su recuadro, pero la página no. Anota las que fallen y avisa (no las arregles sin preguntar).
- Commit: `chore(auditoria): textos al día, títulos y noindex por página, robots, sitemap y scripts`.

---

## Paso final — Revisión
Cuando termines cada parte, avisa al dueño. Opus revisa el diff contra este plan, corre `tsc` y prueba en el navegador.
