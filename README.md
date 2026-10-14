# Regala — Gift Cards de Ecuador con Puntos

**Regala** es una aplicación e-commerce de demostración construida con Next.js 15 (App Router) que permite a los usuarios canjear tarjetas de regalo (gift cards) digitales de marcas reconocidas de Ecuador (Supermaxi, Fybeca, Marathon Sports, Sukasa, Juguetón, De Prati, entre otras) utilizando una moneda virtual acumulable denominada **Puntos**.

---

## Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components y Client Components)
- **Biblioteca UI**: [React 19](https://react.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS 3](https://tailwindcss.com/)
- **Componentes**: [shadcn/ui](https://ui.shadcn.com/)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Notificaciones**: [Sonner](https://sonner.emilkowal.ski/)

---

## Inicio Rápido

### Requisitos previos

- Node.js 18.18+ (o Node.js 20+)
- npm o pnpm

### Instalación

Clona el repositorio e instala las dependencias:

```bash
# Con npm
npm install

# O con pnpm
pnpm install
```

### Ejecución en desarrollo

Inicia el servidor local:

```bash
# Con npm
npm run dev

# O con pnpm
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

### Compilación para producción

```bash
# Con npm
npm run build
npm start

# O con pnpm
pnpm build
pnpm start
```

---

## Flujo de Usuario

1. **Recargar Puntos (`/recargar`)**:
   - Cada usuario inicia con un saldo de bienvenida de 500 Puntos.
   - En la página de recarga se pueden simular compras de paquetes de Puntos (1.000 pts por $6, 2.500 pts por $15, 5.000 pts por $28) utilizando una tarjeta de crédito o débito de prueba (`4242 4242 4242 4242`, fecha futura, CVV de 3 dígitos).

2. **Elegir Gift Cards (`/shop` o Home `/`)**:
   - Catálogo interactivo de tiendas organizado por categorías (Supermercados, Farmacias, Deportes, Hogar, Juguetes, Moda).
   - Filtros dinámicos por nombre/tienda y ordenamiento por puntos requeridos.
   - Cada tienda ofrece denominaciones fijas en dólares (ej. $10, $20, $50). La tasa de conversión base es de **150 Puntos por cada $1 USD**.

3. **Canjear (`/cart` → `/checkout` → `/checkout/success`)**:
   - El carrito valida el saldo disponible frente al total de puntos requeridos.
   - En el checkout se puede indicar opcionalmente un destinatario y una dedicatoria personalizada.
   - Al confirmar el canje, los puntos se debitan del saldo y se redirige a la pantalla de confirmación, donde se generan al instante los códigos alfanuméricos de las tarjetas listos para copiar y compartir.

---

## Configuración del Panel de Administración (`/admin`)

La plataforma incluye un panel en `/admin` para gestionar el catálogo (crear tiendas, editar valores faciales, cambiar temas visuales, ocultar/activar y restablecer datos).

Por defecto, el panel requiere definir una clave de acceso mediante un hash SHA-256 en la variable de entorno `NEXT_PUBLIC_ADMIN_HASH`.

### Pasos para configurar la clave:

1. Ejecuta en **PowerShell** dentro de la carpeta del proyecto el siguiente bloque de comandos (cambia la frase de ejemplo por tu propia clave secreta):

```powershell
$clave = "mi-clave-secreta-personalizada"
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($clave)) | ForEach-Object { $_.ToString("x2") })
"NEXT_PUBLIC_ADMIN_HASH=$hash" | Out-File -Encoding ascii .env.local
```

2. Reinicia el servidor de desarrollo (`npm run dev` o `pnpm dev`).
3. Ingresa a `/admin` e introduce la clave en texto plano (`mi-clave-secreta-personalizada`) para acceder.

> **Nota**: El archivo `.env.local` está ignorado en `.gitignore` y **no** debe subirse al repositorio.

---

## Limitaciones de la Demo

Este proyecto fue desarrollado como una prueba de concepto interactiva y demostrativa:

- **Almacenamiento en `localStorage`**: El saldo de Puntos, los pedidos canjeados, el carrito y las modificaciones del catálogo en `/admin` se guardan exclusivamente en el `localStorage` del navegador. Son visibles y manipulables solo en el dispositivo y navegador donde se realizan.
- **Autenticación en el cliente**: La verificación de la clave de `/admin` se ejecuta del lado del cliente calculando el hash SHA-256 en el navegador. Es suficiente para evitar accesos accidentales, pero no constituye una barrera de seguridad de grado de producción.
- **Pasarela de pago simulada**: El módulo de recarga valida la estructura básica de la tarjeta mediante algoritmo de Luhn, pero no realiza ningún cargo bancario ni se conecta a pasarelas reales (como Payphone, Kushki o Datafast).
- **Sin backend ni envío de correos**: No hay servidor ni servicio SMTP configurado. Los formularios de contacto, registro, inicio de sesión y recuperación de contraseña son simulados y no transmiten información exterior.
- **Códigos ficticios y marcas referenciales**: Los códigos alfanuméricos generados tras el canje son aleatorios y no tienen validez legal ni comercial en tiendas físicas ni digitales. Los nombres comerciales, marcas y logotipos pertenecen a sus respectivos dueños y se utilizan únicamente con propósitos ilustrativos.
