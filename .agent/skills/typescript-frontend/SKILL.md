---
name: typescript-frontend
description: >
  TypeScript best practices and patterns for frontend development in React
  applications. Covers type safety, generics, utility types, and common pitfalls.
---

# TypeScript for Frontend Development

TypeScript provides type safety and tooling for React applications.

This project uses **TypeScript 5** with strict mode enabled.

---

# Type Safety Principles

Always:

- Define types for props, state, and return values
- Use specific types over `any`
- Enable strict null checking
- Use unions and discriminated unions
- Leverage type inference where possible
- Document complex types

---

# Component Props

Always define props interfaces:

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export function Button(props: ButtonProps) {
  return <button {...props}>{props.children}</button>;
}
```

For forwarded refs:

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => (
    <div>
      {label && <label>{label}</label>}
      <input ref={ref} {...props} />
      {error && <span>{error}</span>}
    </div>
  )
);
```

---

# React Event Types

Use React-provided event types:

```tsx
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  // Safe access to button-specific properties
  e.currentTarget.disabled = true;
}

function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.currentTarget.value);
}

function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
}

function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.focus();
}
```

---

# Hook Types

## useState

Infer type from initial value:

```tsx
// Type is inferred as string
const [name, setName] = useState('');

// Type is inferred as number
const [count, setCount] = useState(0);

// For complex types, specify explicitly
interface User {
  id: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);
```

## useEffect

Type dependencies carefully:

```tsx
interface Props {
  userId: string;
  onUserLoaded: (user: User) => void;
}

export function UserCard({ userId, onUserLoaded }: Props) {
  useEffect(() => {
    // Type is inferred from userId
    fetchUser(userId).then(onUserLoaded);
  }, [userId, onUserLoaded]); // Dependency types are checked
}
```

## useCallback

Infer from function signature:

```tsx
const handleClick = useCallback<(id: string) => void>((id) => {
  // id is typed as string
  updateItem(id);
}, []);
```

## useContext

Type the context:

```tsx
interface AppContextType {
  user: User | null;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
```

## Custom Hooks

Define return type explicitly:

```tsx
interface UseFormResult {
  data: FormData;
  isSubmitting: boolean;
  error: string | null;
  submit: (data: FormData) => Promise<void>;
}

export function useForm(initialData: FormData): UseFormResult {
  const [data, setData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const submit = useCallback(async (newData: FormData) => {
    setIsSubmitting(true);
    try {
      await saveForm(newData);
      setData(newData);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, []);
  
  return { data, isSubmitting, error, submit };
}
```

---

# API Response Types

Define strict types for API responses:

```tsx
// Good: Specific interface for API response
interface GetAccountResponse {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'creator';
  createdAt: string; // ISO 8601 datetime
}

// Good: Discriminated union for success/error
type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// In component
const result: ApiResult<GetAccountResponse> = await getAccount();

if (result.success) {
  // TypeScript knows result.data exists and is typed
  console.log(result.data.email);
} else {
  // TypeScript knows result.error exists
  console.log(result.error);
}
```

---

# Generic Components

Use generics for reusable components:

```tsx
interface TableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id: string }>({ 
  data, 
  columns, 
  onRowClick 
}: TableProps<T>) {
  return (
    <table>
      <tbody>
        {data.map(row => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

<Table<User>
  data={users}
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]}
  onRowClick={console.log}
/>
```

---

# Utility Types

Use TypeScript utility types for common patterns:

```tsx
// Extract type from array
type ArrayElement<T extends any[]> = T extends (infer E)[] ? E : never;
type UserListElement = ArrayElement<User[]>; // User

// Pick specific props
interface FullUser {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

type PublicUser = Pick<FullUser, 'id' | 'email'>; // Excludes password

// Omit sensitive fields
type SafeUser = Omit<FullUser, 'password'>; // Excludes password

// Make all properties optional
type PartialUser = Partial<FullUser>;

// Make all properties required
type RequiredUser = Required<FullUser>;

// Extract keys
type UserKeys = keyof FullUser; // 'id' | 'email' | 'password' | 'createdAt'

// Readonly properties
type ReadonlyUser = Readonly<FullUser>;

// Record for mapping
type UserRolePermissions = Record<'user' | 'admin' | 'creator', string[]>;
```

---

# Discriminated Unions

Use discriminated unions for complex state:

```tsx
type LoadingState = {
  status: 'loading';
};

type SuccessState = {
  status: 'success';
  data: User;
};

type ErrorState = {
  status: 'error';
  error: string;
};

type UserState = LoadingState | SuccessState | ErrorState;

function UserComponent({ state }: { state: UserState }) {
  switch (state.status) {
    case 'loading':
      return <div>Loading...</div>;
    case 'success':
      // TypeScript knows state.data exists
      return <div>{state.data.email}</div>;
    case 'error':
      // TypeScript knows state.error exists
      return <div>Error: {state.error}</div>;
  }
}
```

---

# Type Guards and Assertions

Use type guards to narrow types safely:

```tsx
// Type guard function
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// Usage
function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript knows data is User here
    console.log(data.email);
  }
}

// Assertion only when you're certain
function getRequiredElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element ${id} not found`);
  return element;
}

// Avoid unnecessary assertions
const user = data as User; // Avoid - hide type errors
const user = data as unknown as User; // Never do this

// Use const assertions for literal types
const ROLES = ['user', 'admin', 'creator'] as const;
type Role = typeof ROLES[number]; // 'user' | 'admin' | 'creator'
```

---

# Common Pitfalls

## Missing prop types

❌ Don't:

```tsx
export function Button(props) {
  return <button>{props.children}</button>;
}
```

✅ Do:

```tsx
interface ButtonProps {
  children: React.ReactNode;
}

export function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
```

## Using any

❌ Don't:

```tsx
const handleSubmit = (data: any) => {
  updateAccount(data); // No type checking
};
```

✅ Do:

```tsx
interface FormData {
  email: string;
  displayName: string;
}

const handleSubmit = (data: FormData) => {
  updateAccount(data); // Type checked
};
```

## Loose null checks

❌ Don't:

```tsx
function displayUser(user?: User) {
  return <div>{user.email}</div>; // Might be undefined
}
```

✅ Do:

```tsx
function displayUser(user?: User) {
  if (!user) return <div>No user</div>;
  return <div>{user.email}</div>;
}
```

## Event type mismatches

❌ Don't:

```tsx
<input onChange={(e) => setEmail(e.target.value)} />
```

✅ Do:

```tsx
<input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value)} />
```

## Circular dependencies

Design to avoid circular type dependencies:

```tsx
// Instead of importing User in component and UserList in User
// Create a types.ts file

// types.ts
export interface User {
  id: string;
  email: string;
}

// user-list.tsx
import { User } from './types';

// user-card.tsx
import { User } from './types';
```

---

# ESLint Configuration

The project uses ESLint with Next.js TypeScript configuration.

This enforces:

- No `any` types (must be justified)
- Proper type definitions
- Hook dependency checking
- React best practices

Always address TypeScript errors before submitting code.
