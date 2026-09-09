# Local Packages

All packages live in `packages/` and are consumed by apps via `file:` references
in `package.json`.

> **Keep this file up to date** whenever a package's exports, API, or purpose
> changes. It is the reference both people and AI agents build new apps against —
> if it drifts, they write code against components that don't exist.

## The backend is not a package

The backend at `api.ryanzrau.dev` is **PocketBase** (`apps/pocketbase`). Frontend
apps talk to it with the official
[`pocketbase` JS SDK](https://github.com/pocketbase/js-sdk) (`npm i pocketbase`),
not a local package. Scaffolded apps get a ready-made client at `src/pb.ts`; see
`apps/pocketbase/README.md` for collections, auth, and custom routes.

---

## `bluestar` — React Component Library

**Location:** `packages/bluestar/`
**Reference in app:** `"bluestar": "file:../../packages/bluestar"`
**Styling engine:** [goober](https://github.com/cristianbote/goober) (CSS-in-JS,
peer dependency — must be installed by the consuming app)

Every app in the monorepo builds its UI from bluestar. When something is missing,
**add it to bluestar** rather than writing a one-off component in the app — that
is the whole point of the library. `packages/bluestar/AUDIT.md` records what is
deliberately not built yet.

### Setup

```tsx
import { ThemeProvider, ToastProvider } from "bluestar";

<ThemeProvider colorScheme="auto">
  <ToastProvider>
    <App />
  </ToastProvider>
</ThemeProvider>;
```

`ThemeProvider` emits the theme as CSS variables, applies a small baseline reset,
and follows the OS light/dark preference. `ToastProvider` is only needed if the
app calls `useToast()`.

### Building

bluestar ships compiled output from `dist/`, so it must be built before a
consuming app can resolve it:

```bash
npm run bootstrap        # from the repo root — installs and builds bluestar
```

`npm install` inside an app runs bluestar's `prepare` but does **not** install
bluestar's own devDependencies, so a fresh clone must install `packages/bluestar`
first. The Dockerfiles follow the same order.

---

## Theming

### How it works

Tokens are emitted as CSS custom properties (`--bs-color-primary`,
`--bs-radius-md`, `--bs-text-body-size`, …). `useTheme()` returns a theme-shaped
object whose leaves are `var(--bs-…)` **references**, not literals:

```tsx
const theme = useTheme();
theme.colors.primary; // "var(--bs-color-primary)"

css`
  background: ${theme.colors.primary};
`; // follows light/dark automatically
```

Because the values are variables, switching schemes repaints without re-rendering.

### Colour scheme

```tsx
<ThemeProvider colorScheme="auto">   // follow the OS (default)
<ThemeProvider colorScheme="dark">   // pin it
```

```tsx
const { scheme, resolved, setScheme } = useColorScheme();
// scheme:   "auto" | "light" | "dark"  — what was asked for
// resolved: "light" | "dark"           — what is actually showing
setScheme("dark"); // persisted to localStorage
```

### `ThemeProvider` props

| Prop          | Type                            | Default                   |
| ------------- | ------------------------------- | ------------------------- |
| `theme`       | `DeepPartial<Theme>`            | —                         |
| `darkTheme`   | `DeepPartial<Theme>`            | —                         |
| `colorScheme` | `"auto" \| "light" \| "dark"`   | `"auto"`                  |
| `baseline`    | `boolean` (reset + body styles) | `true`                    |
| `storageKey`  | `string \| null`                | `"bluestar-color-scheme"` |

Overrides are deep-merged over `defaultTheme` / `darkTheme`:

```tsx
<ThemeProvider theme={{ colors: { primary: "#ff6b6b" } }}>
```

A **nested** `ThemeProvider` scopes its variables to its own subtree rather than
the document — useful for a themed section, and why the theme playground story
doesn't leak into other stories.

### `Theme` shape

```ts
type Spacing = 4 | 8 | 12 | 16 | 20 | 24 | 32;

type Theme = {
  colors: {
    primary; primaryHover;
    secondary; secondaryHover;
    success; successHover;
    error; errorHover;
    warning; warningHover;
    background; surface; surfaceHover;
    text; textMuted; textOnAccent;
    border; borderStrong;
    focusRing; overlay;
  };
  fonts: { body; heading; mono };
  textTypes: {
    caption | body | subtitle | label | display:
      { size: string; weight: string; style: string; color: string };
  };
  headings: { h1 | h2 | h3: { size: string; weight: string } };
  radius: { none; sm; md; lg; full };
  shadow: { none; sm; md; lg };
};
```

Notes that catch people out:

- **Spacing is a raw pixel union**, not a token: `gap={16}`, `padding={24}`.
- `radius` and `shadow` are **scales** — `theme.radius.md`, not `theme.radius`.
- `textOnAccent` is the text colour for a filled accent (a primary button). It is
  near-white in light mode and near-black in dark mode.

Also exported: `defaultTheme`, `darkTheme`, `themeToVars(theme)`,
`varRefs(theme)`, `VAR_PREFIX`, `deepMerge`.

**`breakpoints`** — `{ sm: 480, md: 768, lg: 1024 }`, plain pixel numbers for
`@media` conditions (e.g. `` `@media (max-width: ${breakpoints.sm}px)` ``).
Not part of `Theme` and not a `var(--bs-…)` reference — a media query
condition can't be a CSS custom property, so these can't flow through the
same var-based system as the rest of the theme.

---

## Forms

`useForm` is the reason apps don't hand-roll a `useState` per field.

```tsx
import { useForm, Form, SubmitButton, TextInput, NumberInput, Switch } from "bluestar";
import { pb } from "./pb";

function NewRecipe() {
  const form = useForm({
    initialValues: { title: "", servings: 4 as number | null, published: false },
    validate: (v) => (v.title.trim() ? {} : { title: "Title is required" }),
    onSubmit: async (v) => {
      await pb.collection("recipes_entries").create(v);
    },
  });

  return (
    <Form form={form}>
      <TextInput {...form.field("title")} label="Title" required />
      <NumberInput {...form.field("servings")} label="Servings" min={1} />
      <Switch {...form.field("published")} label="Published" />
      <SubmitButton label="Save" />
    </Form>
  );
}
```

`field(name)` is generic over the values object: a misspelled name is a **compile
error** listing the valid keys, and the value type flows through to `onChange`.

### `useForm(options)`

| Option          | Type                                              | Notes                            |
| --------------- | ------------------------------------------------- | -------------------------------- |
| `initialValues` | `T`                                               | required; shapes everything else |
| `validate`      | `(values: T) => Partial<Record<keyof T, string>>` | pure; runs on every change       |
| `onSubmit`      | `(values: T) => void \| Promise<void>`            | only runs when validation passes |

Returns `{ values, errors, touched, isValid, isDirty, isSubmitting, submitError,
field, setValue, setValues, setError, reset, handleSubmit }`.

- Errors are withheld until a field is touched or a submit is attempted.
- A rejected async `onSubmit` becomes `submitError`, which `<Form>` renders as an
  `Alert` above the fields.
- `setError(name, message)` is for failures only the server knows about
  ("email already taken"); editing that field clears it.
- `useForm` works standalone — `<Form>` is only needed for a real `<form>`
  element and `SubmitButton`.

### `Form`

| Prop              | Type         | Default  |
| ----------------- | ------------ | -------- |
| `form`            | `FormApi<T>` | required |
| `gap`             | `Spacing`    | `16`     |
| `showSubmitError` | `boolean`    | `true`   |
| `maxWidth`        | `number`     | `480`    |

`maxWidth` caps the rendered `<form>`'s width so fields don't stretch
edge-to-edge of an arbitrarily wide parent. Pass `maxWidth={undefined}` for a
form that should genuinely stretch full-width.

### `SubmitButton`

Takes `Button`'s props minus `type`/`onClick`. Disables and shows a spinner while
`isSubmitting`. `disableWhenInvalid` (default `false`) also disables it while
validation is failing.

---

## Components

Every form control shares these props: `label`, `description`, `warning` (amber),
`error` (red, sets `aria-invalid`), `required`, `name`, `isDisabled`. They are
**controlled**: pass `value`, handle `onChange(parsedValue)` — which receives the
value, not an event.

### Layout

#### `Flexbox`

| Prop               | Type                                                                                            | Default |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------- |
| `direction`        | `"row" \| "column"`                                                                             | `"row"` |
| `gap`              | `Spacing`                                                                                       | —       |
| `grow` / `shrink`  | `number`                                                                                        | —       |
| `flexWrap`         | `"wrap" \| "nowrap"`                                                                            | —       |
| `justifyContent`   | `"flex-start" \| "flex-end" \| "center" \| "space-between" \| "space-around" \| "space-evenly"` | —       |
| `alignContent`     | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "space-between" \| "space-around"`      | —       |
| `alignItems`       | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "baseline"`                             | —       |
| `width` / `height` | `number \| string`                                                                              | —       |
| `style`            | `React.CSSProperties`                                                                           | —       |

#### `Card`

| Prop      | Type      | Default           |
| --------- | --------- | ----------------- |
| `padding` | `Spacing` | `16`              |
| `shadow`  | `string`  | `theme.shadow.md` |

#### `Divider`

| Prop        | Type                         | Default        |
| ----------- | ---------------------------- | -------------- |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` |
| `length`    | `number` (percent)           | `100`          |

### Text

#### `Header`

`variant`: `"h1" | "h2" | "h3"` (default `"h1"`). Renders the matching element.

#### `Text`

| Prop      | Type                                                        | Default      |
| --------- | ----------------------------------------------------------- | ------------ |
| `variant` | `"caption" \| "body" \| "subtitle" \| "label" \| "display"` | `"subtitle"` |
| `color`   | `string`                                                    | —            |
| `as`      | `"p" \| "span" \| "label"`                                  | `"p"`        |

There are no `bold` / `italic` / `muted` / `size` props — the variant carries all
of that.

#### `TextPairing`

`title`, `subtitle`, `titleVariant` (default `"h2"`), `subtitleVariant`
(default `"caption"`).

### Buttons

#### `Button`

Accepts all native `<button>` props except `disabled`.

| Prop         | Type                                                      | Default     |
| ------------ | --------------------------------------------------------- | ----------- |
| `label`      | `string`                                                  | required    |
| `variant`    | `"primary" \| "secondary" \| "creation" \| "destructive"` | `"primary"` |
| `isDisabled` | `boolean`                                                 | `false`     |
| `density`    | `"normal" \| "dense"`                                     | `"normal"`  |
| `type`       | `"button" \| "submit" \| "reset"`                         | `"button"`  |

> Visual intent is **`variant`**. `type` is the real HTML attribute — use
> `SubmitButton` inside a `<Form>` rather than setting it by hand. Disable with
> `isDisabled`, not `disabled`.

#### `AsyncButton`

`Button`'s props, but `onClick: () => Promise<void>`. Disables and spins until the
promise settles, including on rejection.

### Form controls

| Component       | Value type                                   | Extra props                                               |
| --------------- | -------------------------------------------- | --------------------------------------------------------- |
| `TextInput`     | `string`                                     | `placeholder`, `type` (`text\|email\|password\|url\|tel`) |
| `NumberInput`   | `number \| null`                             | `min`, `max`, `step`, `placeholder`                       |
| `TextAreaInput` | `string`                                     | `rows` (default `4`), `placeholder`                       |
| `Checkbox`      | `boolean`                                    | `label` is the text beside the box                        |
| `Switch`        | `boolean`                                    | same shape as `Checkbox`, toggle UI                       |
| `CheckboxList`  | `string[]`                                   | `options: { label, value }[]`                             |
| `RadioGroup`    | `string \| null`                             | `options: { label, value, description? }[]`               |
| `Dropdown`      | `string \| null`, or `string[]` with `multi` | `options`, `placeholder`                                  |

An empty `NumberInput` yields `null`, never `NaN`.

`FormInputLayout` is exported for wrapping a custom control so it matches the
rest; it takes a render function receiving `{ id, describedBy, invalid }`.

### Feedback

#### `Alert`

| Prop        | Type                                          | Default                                 |
| ----------- | --------------------------------------------- | --------------------------------------- |
| `variant`   | `"info" \| "success" \| "warning" \| "error"` | `"info"`                                |
| `title`     | `string`                                      | —                                       |
| `onDismiss` | `() => void`                                  | — (renders the close button when given) |

#### `Toast`

```tsx
const toast = useToast();
toast.success("Recipe saved");
toast.error("Couldn't reach the server");
toast.show("Sync started", { title: "Heads up", duration: 0 }); // 0 = sticky
```

`ToastProvider` takes `position`: `"top-right" | "bottom-right" | "top-center"`
(default `"bottom-right"`). `show`/`success`/`error` return an id for
`toast.dismiss(id)`.

#### `Spinner`

`size` (default `20`), `color` (default `theme.colors.primary`).

#### `Skeleton`

`width` (default `"100%"`), `height` (default `16`), `circle`, `lines`
(default `1`; the last line is shortened so a block reads as text).

#### `EmptyState`

`title`, `description`, `icon`, `action`.

### Display

#### `Avatar`

| Prop   | Type     | Default  |
| ------ | -------- | -------- |
| `src`  | `string` | —        |
| `name` | `string` | required |
| `size` | `number` | `36`     |
| `alt`  | `string` | —        |

Circular; shows `src` if given, falling back to initials on a hashed color
(missing `src`, or the image failing to load). `name` is plain text — pass a
display name or email, never a backend record; bluestar stays backend-agnostic.

#### `Badge`

`variant`: `"neutral" | "primary" | "success" | "warning" | "error"` (default
`"neutral"`); `emphasis`: `"subtle" | "solid"` (default `"subtle"`).

#### `Table`

Generic over the row type, so `cell` receives a typed row.

```tsx
<Table
  rows={recipes}
  rowKey={(r) => r.id}
  columns={[
    { header: "Title", cell: (r) => r.title },
    { header: "Serves", cell: (r) => r.servings, width: "90px", align: "right" },
    { header: "Status", cell: (r) => <Badge>{r.status}</Badge> },
  ]}
  empty={<EmptyState title="No recipes yet" />}
  onRowClick={(r) => open(r)}
/>
```

### Overlay

#### `Modal`

| Prop              | Type               | Default  |
| ----------------- | ------------------ | -------- |
| `isOpen`          | `boolean`          | required |
| `onClose`         | `() => void`       | required |
| `title`           | `string`           | required |
| `footer`          | `ReactNode`        | —        |
| `width`           | `number \| string` | `480`    |
| `closeOnBackdrop` | `boolean`          | `true`   |

Built on native `<dialog>`, so focus trapping and Esc-to-close come for free.

#### `ConfirmDialog`

`isOpen`, `onClose`, `onConfirm` (may be async), `title`, `message`,
`confirmLabel`, `cancelLabel`, `confirmVariant` (default `"destructive"`).

#### `Menu`

| Prop           | Type        | Default  |
| -------------- | ----------- | -------- |
| `trigger`      | `ReactNode` | required |
| `triggerLabel` | `string`    | —        |
| `children`     | `ReactNode` | required |
| `width`        | `number`    | `240`    |

A single flat dropdown, right-aligned to its trigger. Built on the native
Popover API — click-to-toggle, light-dismiss, Esc-to-close, and top-layer
stacking all come from the browser rather than hand-rolled JS. No nested
submenus or configurable alignment — the only real use case today is a
top-right account pill. No close-on-item-click plumbing either: a navigating
`Link` or an action that unmounts the tree (like signing out) closes the
popover along with everything else.

### Navigation

#### `Link`

Native anchor props plus `variant` (`"primary" | "muted"`) and `external` (adds
`target="_blank"` **and** `rel="noopener noreferrer"`).

#### `AppShell`

| Prop       | Type        | Default  |
| ---------- | ----------- | -------- |
| `title`    | `string`    | required |
| `nav`      | `ReactNode` | —        |
| `account`  | `ReactNode` | —        |
| `children` | `ReactNode` | required |
| `footer`   | `ReactNode` | —        |
| `maxWidth` | `number`    | `960`    |

Full-width header (title pinned left, `nav` then `account` pinned right —
`account` is always the rightmost element), centred content column below it,
optional footer. `account` is meant for a profile pill (see `Avatar` + `Menu`);
`nav` is nav links/buttons.

---

## Development

```bash
cd packages/bluestar
npm install              # installs deps and builds dist/
npm run storybook        # component workbench at http://localhost:6006
npm run typecheck        # tsc over all of src, including stories
npm run build            # typecheck + compile to dist/
npm run build-storybook  # static Storybook (deployed to ui.ryanzrau.dev)
```

After changing the library, rebuild it before running a consuming app — apps
import `dist/`, not `src/`.

Adding a component: create
`src/components/<category>/<Name>/{Name.tsx, index.ts, Name.stories.tsx}`,
re-export it from `src/index.ts`, then document it here. Read colours through
`useTheme()` rather than hardcoding — `AUDIT.md` explains why, and what the two
non-obvious constraints on the theme engine are.
