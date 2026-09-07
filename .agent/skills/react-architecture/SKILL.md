---
name: react-architecture
description: >
  Architecture and design guidance for maintaining and evolving React and
  Next.js applications without unnecessary complexity. Covers component design,
  state management, separation of concerns, and composition patterns.
---

# React Architecture

Architecture changes must be justified by requirements.

## Before changing architecture

Inspect:

- existing component hierarchy
- state management patterns
- data flow between components
- prop drilling patterns
- hook composition
- code organization
- testing strategy
- styling approach
- API integration patterns

## Principles

Prefer:

- small, focused components
- single responsibility per component
- composition over inheritance
- explicit prop interfaces
- clear data flow (props down, events up)
- reusable hooks for logic
- server components in Next.js where possible
- simple state management
- existing project conventions
- testable components
- readable code over clever code

Avoid:

- large components doing too much
- prop drilling more than 2-3 levels
- complex state management for simple needs
- deeply nested component hierarchies
- unclear data dependencies
- premature abstraction
- pattern-driven development
- speculative generalization
- unnecessary wrapper components

---

# Component Design

## Single Responsibility

Each component should have one reason to change:

**Poor:** Component handles rendering, data fetching, and formatting

```tsx
export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser({
        ...data,
        joined: new Date(data.createdAt).toLocaleDateString(),
        fullName: `${data.firstName} ${data.lastName}`
      }));
  }, [userId]);
  
  return (
    <div>
      <h1>{user?.fullName}</h1>
      <p>Joined {user?.joined}</p>
    </div>
  );
}
```

**Better:** Separate concerns into focused components

```tsx
// Handles data fetching
function useUser(userId: string) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser);
  }, [userId]);
  
  return user;
}

// Pure presentation component
interface UserProfileProps {
  user: User | null;
}

export function UserProfile({ user }: UserProfileProps) {
  if (!user) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{formatFullName(user)}</h1>
      <p>Joined {formatDate(user.createdAt)}</p>
    </div>
  );
}

// Composer component
export function UserProfileContainer({ userId }: { userId: string }) {
  const user = useUser(userId);
  return <UserProfile user={user} />;
}
```

---

## Props Interface Design

Props should be clear and well-defined:

```tsx
interface AccountSettingsProps {
  accountId: string;
  onSettingsChanged: (settings: AccountSettings) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AccountSettings({
  accountId,
  onSettingsChanged,
  isLoading = false,
  error = null,
}: AccountSettingsProps) {
  // ...
}
```

Guidelines:

- always use TypeScript interfaces for props
- required props first, optional props with `?`
- include JSDoc for complex props
- avoid boolean props explosion (use enums or variants)
- prefer callbacks over render props
- flatten prop objects when reasonable

---

## Composition Over Inheritance

Use composition and slots:

**Poor:** Inheritance hierarchy

```tsx
class Button extends React.Component { ... }
class PrimaryButton extends Button { ... }
class LargeButton extends Button { ... }
```

**Better:** Composition with props

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export function Button({ variant, size, children }: ButtonProps) {
  const className = cn(
    'button',
    variant && `button-${variant}`,
    size && `button-${size}`
  );
  
  return <button className={className}>{children}</button>;
}
```

---

## Avoiding Prop Drilling

If props need to pass through many levels, use context:

**Poor:** Prop drilling

```tsx
<Page theme={theme} locale={locale} onLogout={onLogout} />
  <Header theme={theme} locale={locale} onLogout={onLogout} />
    <Nav theme={theme} locale={locale} onLogout={onLogout} />
      <UserMenu theme={theme} locale={locale} onLogout={onLogout} />
```

**Better:** Context for shared state

```tsx
interface AppContextType {
  theme: Theme;
  locale: string;
  onLogout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function Page() {
  return (
    <AppContext.Provider value={{ theme, locale, onLogout }}>
      <Header />
    </AppContext.Provider>
  );
}

function UserMenu() {
  const { theme, locale, onLogout } = useContext(AppContext)!;
  return <button onClick={onLogout}>Logout</button>;
}
```

---

# State Management

## Local vs Global State

**Local State** (useState):

- component-specific state
- doesn't need to be shared
- simplest solution

**Context + Hooks** (for shared state):

- application-wide state
- multiple components need access
- medium complexity

Prefer local state, elevate to context only when necessary.

---

## Data Flow

Keep data flow explicit:

```tsx
// Parent owns state
export function AccountContainer() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div>
      <AccountSettings
        account={account}
        isLoading={isLoading}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

// Child receives props and calls callbacks
interface AccountSettingsProps {
  account: Account | null;
  isLoading: boolean;
  onUpdate: (account: Account) => void;
}

function AccountSettings({ account, isLoading, onUpdate }: AccountSettingsProps) {
  return <form onSubmit={() => onUpdate(newAccount)}>...</form>;
}
```

---

# Code Organization

Organize by feature, not by file type:

**Poor structure:**

```
components/
  buttons/
  cards/
  forms/
  tables/
pages/
  account/
    page.tsx
  dashboard/
    page.tsx
```

**Better structure:**

```
app/
  account/
    page.tsx
    layout.tsx
  dashboard/
    page.tsx
components/
  account/
    account-settings.tsx
    account-summary.tsx
  common/
    button.tsx
    card.tsx
lib/
  account.ts
  api.ts
```

Group related components together:

```
components/
  auth/
    login-form.tsx
    login-form.test.tsx
    session-provider.tsx
  media/
    media-card.tsx
    media-card.test.tsx
    upload-queue.tsx
    upload-queue.test.tsx
```

---

# Refactoring

Separate:

1. behavior change
2. structural refactoring

When possible, preserve behavior while refactoring.

Example: Extract component from prop drilling

```tsx
// Step 1: Create new component with extracted props
export function UserMenuPopover({ user, onLogout }) {
  return (
    <Popover>
      <div>{user.name}</div>
      <button onClick={onLogout}>Logout</button>
    </Popover>
  );
}

// Step 2: Update parent to use new component
export function Header({ user, onLogout }) {
  return (
    <header>
      <Nav />
      <UserMenuPopover user={user} onLogout={onLogout} />
    </header>
  );
}

// Step 3: Test both old and new behavior still works
```

Use tests as the safety net.

---

# Performance Optimization

Optimize based on data, not assumptions:

- Use React DevTools Profiler to measure
- Identify actual bottlenecks
- Apply targeted optimizations

Common optimizations:

**Code splitting:**

```tsx
const HeavyComponent = lazy(() => import('./heavy'));

export function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**Memoization (sparingly):**

```tsx
// Memoize when parent re-renders frequently
// and props are stable
const UserCard = memo(function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
});
```

**Callback memoization (when necessary):**

```tsx
export function Form() {
  // Only recreate callback when items changes
  const handleItemSelect = useCallback(
    (item: Item) => {
      setSelected(item);
      onItemSelected(item);
    },
    [onItemSelected]
  );
  
  return <ItemList onSelect={handleItemSelect} />;
}
```

---

# Testing Architecture

Design for testability:

- Small, focused components are easier to test
- Pure components (no side effects) are easier to test
- Custom hooks can be tested in isolation
- Separate concerns (logic vs rendering)

Example testable architecture:

```tsx
// testable logic hook
export function useFormSubmit(onSuccess: (data: FormData) => Promise<void>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const submit = useCallback(async (data: FormData) => {
    setIsLoading(true);
    try {
      await onSuccess(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);
  
  return { submit, isLoading, error };
}

// testable presentation component
export function LoginForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const { submit, isLoading, error } = useFormSubmit(onSubmit);
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(getData()); }}>
      {error && <div role="alert">{error}</div>}
      <input type="email" required />
      <input type="password" required />
      <button disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}
```

---

# Server vs Client Components (Next.js)

**Server Components** for:

- static content
- data fetching
- secrets/tokens
- direct database access

**Client Components** for:

- user interactivity
- browser APIs
- state management
- event listeners

Example:

```tsx
// Server component: fetch data, render layout
export default async function AccountLayout() {
  const settings = await getAccountSettings();
  
  return (
    <div>
      <h1>Account</h1>
      <AccountNav currentPath={settings.section} />
      <SettingsShell settings={settings}>
        {/* children */}
      </SettingsShell>
    </div>
  );
}

// Client component: handle interactivity
"use client";

export function SettingsForm({ settings }: { settings: AccountSettings }) {
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };
  
  return (
    <form onSubmit={handleSave}>
      {/* form fields */}
    </form>
  );
}
```
