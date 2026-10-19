# Plan para Haiku / Antigravity — Número de versión al pie de la web

Objetivo: al final de la página (el pie `components/footer.tsx`, que sale en todas las pantallas públicas) se ve `Versión 7504282 · 2026-10-19`, para comparar con `git log` y saber si la web publicada está al día. El número es el commit corto con que se construyó la web; la fecha es la del build.

Fuera de alcance (NO tocar): cualquier otro archivo, `package.json` (no se sube número a mano), `package-lock.json`.

## Paso 1/3 — `next.config.mjs`
Agrega `env` dentro de `nextConfig`, antes de `typescript`:
```js
  // Versión visible al pie: commit con el que Vercel construyó la web (en local, "local").
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
```

## Paso 2/3 — `components/footer.tsx`
Debajo del `<p>` de copyright (dentro del mismo `div` `mt-8 border-t pt-8`) agrega:
```tsx
<p className="mt-1 text-center text-[11px] text-muted-foreground/70 tabular-nums">
  Versión {process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_DATE}
</p>
```
No uses `new Date()` en el componente para esto (provoca diferencias entre servidor y navegador).

## Paso 3/3 — Verificación (la hago yo, no tú)
1. `npx tsc --noEmit` = 0. Commit: `feat(web): numero de version al pie (commit y fecha del build)`.
2. En local el pie dice `Versión local · AAAA-MM-DD`.
3. `npm run build` real y comprobar que el texto sale en `/` y en `/shop`; 375 px sin desplazamiento horizontal.
4. Ya publicado: el pie debe mostrar los 7 primeros caracteres del último commit de `main` (`git rev-parse --short=7 main`).
