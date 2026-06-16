# Desafío Web — Sistema de Gestión Comercial

Sistema de gestión comercial desarrollado como desafío técnico de 48 horas. Cubre el ciclo completo desde la orden de compra hasta el despacho al cliente, con control de stock en tiempo real e IGV automático (18 %).

---

## Módulos

| # | Módulo | Descripción |
|---|---|---|
| 1 | **Login** | Autenticación con Supabase Auth (email + contraseña). |
| 2 | **Maestro de Productos** | Gestión de productos con soft-delete y control de stock. |
| 3 | **Orden de Compra** | Creación de órdenes a proveedores con líneas de detalle. |
| 4 | **Ingreso de Mercadería** | Recepción de órdenes con incremento automático de stock. |
| 5 | **Facturación** | Emisión de facturas con validación de stock, IGV 18 % y decremento de inventario. |
| 6 | **Despacho** | Seguimiento de entrega con ciclo `pending → in_transit → delivered`. |

Maestros de soporte: **Proveedores** y **Clientes**.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS v4** + **shadcn/ui**
- **react-hook-form** + **Zod**
- **TanStack Query v5**

---

## Requisitos

- Node.js 22 o superior
- Una cuenta gratuita en [Supabase](https://supabase.com)

---

## Setup

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd desafio-web-sebas
npm install
```

### 2. Crear un proyecto en Supabase

Ingresa a [supabase.com](https://supabase.com), crea una cuenta (si no tienes una) y crea un nuevo proyecto. Anota la **Project URL** y la **anon public key** que aparecen en *Settings → API*.

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

### 4. Crear el esquema de la base de datos

En el panel de Supabase, abre **SQL Editor** y ejecuta el contenido completo del archivo `supabase/schema.sql`. Este archivo consolida las 5 migraciones en orden y crea todas las tablas, políticas RLS, triggers, funciones RPC y datos semilla.

> Las migraciones individuales están disponibles en `supabase/migrations/` si prefieres aplicarlas de forma incremental con el CLI de Supabase (`supabase db push`).

### 5. Crear un usuario administrador

En el panel de Supabase, ve a **Authentication → Users → Add user**. Ingresa email y contraseña, y marca **Auto Confirm User** para que el usuario quede activo de inmediato.

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con las credenciales creadas en el paso anterior.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción |
| `npm start` | Inicia el servidor de producción (requiere build previo) |
| `npm run lint` | Linting con ESLint |

---

## Deploy en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. En *Settings → Environment Variables*, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Despliega. Vercel detecta Next.js automáticamente y no requiere configuración adicional.

---

## Documentación de arquitectura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el modelo de datos completo (diagrama ER), las decisiones técnicas clave y la justificación del stack.
