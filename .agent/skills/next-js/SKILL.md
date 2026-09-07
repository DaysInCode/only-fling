---
name: next-js
description: >
  Next.js 16+ specific patterns and conventions for building React applications.
  Covers App Router architecture, server/client components, data fetching,
  routing, and Next.js-specific features used in this project.
---

# Next.js 16+

This is NOT the Next.js you know. Next.js 16+ has breaking changes from earlier versions.

Before writing code, read the Next.js docs in `node_modules/next/dist/docs/` and any deprecation notices.

---

# Architecture

The project uses:

- **App Router**: File-based routing in `/app` directory
- **TypeScript**: Type-safe configuration and components
- **Static export**: `output: "export"` in next.config.ts
- **No image optimization**: `unoptimized: true` for static builds
- **Trailing slashes**: URLs end with `/`

---

# Server vs Client Components

**Server Components** (default):

- Can access backend resources directly
- Sensitive data stays on server
- Zero JavaScript to browser for the component
- Cannot use browser APIs
- Cannot use event listeners
- Cannot use hooks (useState, useContext, etc.)
- Can use async/await directly

```tsx
// Default is server component
export default async function Dashboard() {
  const data = await fetch('...');
  return <div>{data}</div>;
}
```

**Client Components**:

- Use browser APIs
- Handle interactivity
- Use hooks and state
- Have the "use client" directive at top of file

```tsx
"use client";

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

# Routing Conventions

Routes are defined by file structure in `/app`:

- `/app/page.tsx` → `/`
- `/app/auth/sign-in/page.tsx` → `/auth/sign-in/`
- `/app/account/page.tsx` → `/account/`
- `/app/account/settings/page.tsx` → `/account/settings/`

Dynamic routes use square brackets:

- `/app/[id]/page.tsx` → `/:id/`

Layout files (`layout.tsx`) wrap child routes.

---

# Data Fetching

In **Server Components**, fetch data directly:

```tsx
async function getData() {
  const res = await fetch('https://api.example.com/...');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return <div>{data}</div>;
}
```

In **Client Components**, use hooks or effects:

```tsx
"use client";

import { useEffect, useState } from 'react';

export function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData);
  }, []);
  
  return <div>{data?.value}</div>;
}
```

---

# Linking and Navigation

Use Next.js `Link` component for navigation:

```tsx
import Link from 'next/link';

export function Nav() {
  return (
    <nav>
      <Link href="/auth/sign-in">Sign in</Link>
      <Link href="/account">Account</Link>
    </nav>
  );
}
```

Use `useRouter` in client components for programmatic navigation:

```tsx
"use client";

import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  
  async function handleSubmit(e) {
    // ... auth logic
    router.push('/dashboard');
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

# Internationalization (i18n)

The project supports multiple locales via `locale-provider`.

Components using localization:

```tsx
"use client";

import { useLocale, formatMessage } from '@/components/providers/locale-provider';

export function LocalizedComponent() {
  const { messages, locale } = useLocale();
  
  return <div>{formatMessage(messages.hello)}</div>;
}
```

---

# API Integration

The project uses a centralized API client in `/lib/api.ts`.

Usage patterns:

```tsx
import { getAccountInfo, updateSettings } from '@/lib/api';

// In server component:
const account = await getAccountInfo(token);

// In client component:
const result = await getAccountInfo(token);
if (result.error) {
  // handle error
} else {
  // use result.data
}
```

---

# Build and Static Export

This project builds as a static site:

```bash
npm run build
```

Important implications:

- Cannot use dynamic routes that depend on runtime data
- Cannot use API routes that run server-side
- All data must be known at build time or loaded from APIs
- `trailingSlash: true` means all routes end with `/`

---

# Styling

The project uses **CSS Modules**:

```tsx
import styles from './component.module.css';

export function Component() {
  return <div className={styles.container}>...</div>;
}
```

Global styles are imported in the root layout.

---

# Performance Considerations

For a static export build:

- Minimize client-side JavaScript
- Use Server Components wherever possible
- Lazy load Client Components when beneficial
- Use Next.js Image component only with `unoptimized: true`
- Be mindful of bundle size

---

# Type Safety

Always use TypeScript:

- Define page props types
- Define component prop interfaces
- Use strict null checking
- Export types alongside components

```tsx
interface PageProps {
  params: {
    id: string;
  };
}

export default function Page({ params }: PageProps) {
  return <div>{params.id}</div>;
}
```

---

# Environment Variables

Frontend environment variables use the `NEXT_PUBLIC_` prefix:

```
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Access in components:

```tsx
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
```

---

# Common Pitfalls

Avoid:

- Rendering Client Components excessively (adds JavaScript)
- Fetching data in useEffect when a server component could be used
- Mixing server and client component responsibilities
- Forgetting "use client" directive when using hooks
- Hardcoding URLs without environment variables
- Not handling loading and error states
- Breaking static export assumptions
