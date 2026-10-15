# Plan para Haiku / Antigravity — Tabla estándar de Clientes editable

Objetivo: en **Administración → Precios**, al elegir "Estándar (Clientes)" en el selector de tablas, aparece el botón **"Editar paquetes estándar"**, que abre el mismo editor que ya existe para los paquetes del Canjeador (barra por paquete con valores válidos, valor escribible, añadir/quitar, bloqueo si rompe reglas). Los cambios se ven en todas las pantallas del panel y en `/cliente/comprar`.

Rama: `claude/pet-store-gift-cards-refactor-n3h79x`. Haz `git pull` antes de empezar.

## Reglas (no negociables)
1. **No modifiques** `lib/domain/pricing.ts`, `lib/domain/types.ts`, `lib/domain/format.ts` ni `lib/mock/data.ts`. Si falta algo, DETENTE y pregunta.
2. No ejecutes `npm run build` con `npm run dev` abierto. Solo `npx tsc --noEmit` (0 errores).
3. Texto en español. No inventes fórmulas de precios: siempre se valida con `validatePricing`.
4. Un commit al final con solo los archivos tocados (nunca `package-lock.json` ni `.env*`) y `git push`.

## Pasos

### Paso 1/5 — Estado compartido
Archivo: `lib/mock/admin-settings.tsx`. Imita lo que ya hace con `publicPacks`:
- Importa `MOCK_STANDARD_PACKS`.
- Agrega al contexto `standardPacks: PointsPack[]` y `setStandardPacks` (estado inicial `MOCK_STANDARD_PACKS`), y pásalos en el `value` del Provider.

### Paso 2/5 — Usar el estado compartido en vez de la constante
Reemplaza `MOCK_STANDARD_PACKS` por `standardPacks` del contexto (`const { ..., standardPacks } = useAdminSettings()`) en:
- `app/admin/(secciones)/clientes/page.tsx` (el `validatePricing` y el tramo virtual de cliente estándar `MOCK_STANDARD_PACKS.filter(...)`).
- `app/admin/(secciones)/proveedores/page.tsx` (incluye el `std10Pack` y la lista de dependencias del `useMemo`).
- `app/admin/(secciones)/ajustes/page.tsx`.
- `app/admin/(secciones)/resumen/page.tsx`.
- `app/admin/(secciones)/precios/page.tsx`: hoy tiene `const [standardPacks] = useState(MOCK_STANDARD_PACKS)`; bórralo y toma `standardPacks, setStandardPacks` del contexto.
- `app/cliente/comprar/page.tsx`: usa `standardPacks` del contexto cuando `MOCK_CLIENT.packMode !== "custom"`.
Quita los imports de `MOCK_STANDARD_PACKS` que queden sin usar. Mira que los `useMemo`/`useCallback` que usaban la constante incluyan `standardPacks` en sus dependencias.

### Paso 3/5 — Generalizar el editor
Archivo: `components/panel/public-packs-editor.tsx`. Renómbralo a `components/panel/packs-editor.tsx` (componente `PacksEditor`; actualiza el import en `precios/page.tsx`) y agrega props con valores por defecto iguales a los textos actuales:
- `title` (def. "Paquetes del Canjeador"), `description` (el texto actual), `saveLabel` (def. "Guardar paquetes").
Todo lo demás se queda igual (la barra de cada paquete recorre solo los puntos que `validate` acepta).

### Paso 4/5 — Botón y diálogo en Precios
Archivo: `app/admin/(secciones)/precios/page.tsx`:
- Estado `standardDialogOpen`.
- `validateStandardPacks = useCallback((packs) => validatePricing({ settings, providers, products, standardPacks: packs, publicPacks, clients }).filter(i => i.severity === "error"), [...])`.
- Cuando `selectedPackTable === "standard"`, muestra debajo del selector un botón "Editar paquetes estándar" (mismo estilo que el de "Editar paquetes del Canjeador").
- Un segundo `<PacksEditor>` con `title="Paquetes estándar (Clientes)"`, `description="Lo que paga un Cliente sin tabla propia (USD → puntos). Cada barra solo permite valores que cumplen las reglas: el Canjeador debe pagar más por punto, el margen mínimo y el beneficio mínimo del Cliente."`, `packs={standardPacks}`, `validate={validateStandardPacks}`, `onSave` → `setStandardPacks(next)` + `toast.success("Paquetes estándar actualizados")`.

### Paso 5/5 — Pruebas manuales y commit
Con `npm run dev` abierto, rol "Nosotros":
1. Precios → "Estándar (Clientes)" → "Editar paquetes estándar": el tramo de $10 permite de unos 1.010 a 1.105 puntos; guardar con los valores originales funciona y el panel sigue diciendo "Todas las reglas se cumplen".
2. Añade un paquete de **$25** y guárdalo. Luego en "Público (Canjeadores)" → "Editar paquetes del Canjeador", el máximo del paquete de $25 debe haber subido por encima de 2.540.
3. Quita ese paquete de $25 y comprueba que el máximo vuelve a 2.540.
4. Rol "Cliente" → `/cliente` → "Comprar puntos" (el cliente de ejemplo tiene tramos propios; solo comprueba que no hay errores en consola).
5. A 375 px el diálogo no tiene scroll horizontal.
Luego: `npx tsc --noEmit` (0 errores), commit "feat: editar tabla estándar de Clientes en Precios" y `git push`.
