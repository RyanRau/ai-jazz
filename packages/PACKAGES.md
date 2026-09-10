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

```tsx
const { customAccent, setCustomAccent } = useCustomAccent();
// customAccent: string | null — a hex color overriding theme.colors.primary, or null for the theme's own default
setCustomAccent("#8b7fd1"); // persisted per ThemeProvider's storage/cookie config
```

### `ThemeProvider` props

| Prop                     | Type                            | Default                    |
| ------------------------ | ------------------------------- | -------------------------- |
| `theme`                  | `DeepPartial<Theme>`            | —                          |
| `darkTheme`              | `DeepPartial<Theme>`            | —                          |
| `colorScheme`            | `"auto" \| "light" \| "dark"`   | `"auto"`                   |
| `baseline`               | `boolean` (reset + body styles) | `true`                     |
| `storageKey`             | `string \| null`                | `"bluestar-color-scheme"`  |
| `customAccentStorageKey` | `string \| null`                | `"bluestar-custom-accent"` |
| `cookieDomain`           | `string`                        | —                          |

`storageKey` (localStorage) remembers an explicit `colorScheme` choice
across visits; `customAccentStorageKey` (sessionStorage — cleared when the
tab closes) remembers a viewer's custom accent color from `useCustomAccent`
for the rest of that session. Pass either as `null` to disable that
persistence.

`cookieDomain` (e.g. `".ryanzrau.dev"`) switches both away from
localStorage/sessionStorage to a cookie scoped to that domain — so a choice
made on one subdomain applies on every other subdomain too, the same way
`CookieAuthStore` shares one auth session across `*.ryanzrau.dev`. Every app
in this repo sets it; leave it unset for a single-origin consumer (e.g.
Storybook, which also passes `storageKey={null}` to keep story state from
leaking between stories).

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

| Prop              | Type             | Default  |
| ----------------- | ---------------- | -------- |
| `form`            | `FormApi<T>`     | required |
| `gap`             | `Spacing`        | `16`     |
| `showSubmitError` | `boolean`        | `true`   |
| `maxWidth`        | `number \| null` | `480`    |

`maxWidth` caps the rendered `<form>`'s width so fields don't stretch
edge-to-edge of an arbitrarily wide parent. Pass `maxWidth={null}` (not
`undefined` — an omitted or explicitly-`undefined` prop both fall through to
the default, a real JS default-parameter gotcha) for a form that should
genuinely stretch full-width, e.g. to fill a `Card` of a known width.

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

| Prop      | Type      | Default  |
| --------- | --------- | -------- |
| `padding` | `Spacing` | `16`     |
| `shadow`  | `string`  | `"none"` |

The border is the surface's primary separator — flat-dashboard style, not a
floating panel. Pass `theme.shadow.sm/md/lg` for a card that should read as
genuinely elevated (rare; reserve real shadow for overlays like `Menu` and
`Modal`).

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
| `appearance` | `"solid" \| "outline" \| "text"`                          | `"solid"`   |
| `isDisabled` | `boolean`                                                 | `false`     |
| `density`    | `"normal" \| "dense"`                                     | `"normal"`  |
| `type`       | `"button" \| "submit" \| "reset"`                         | `"button"`  |

> Visual intent is **`variant`**; structural style is **`appearance`** — the
> two are independent, so `variant="destructive" appearance="outline"` is a
> red outlined button. `type` is the real HTML attribute — use `SubmitButton`
> inside a `<Form>` rather than setting it by hand. Disable with
> `isDisabled`, not `disabled`.

#### `AsyncButton`

`Button`'s props, but `onClick: () => Promise<void>`. Disables and spins until the
promise settles, including on rejection.

#### `SegmentedControl`

| Prop       | Type                            | Default  |
| ---------- | ------------------------------- | -------- |
| `options`  | `{ label: string; value: T }[]` | required |
| `value`    | `T`                             | required |
| `onChange` | `(value: T) => void`            | required |

A dense, single-select toggle group for picking one of a small set of views
(chart vs. table, a time range) — not a form field, so it takes no
`label`/`description`. The selected segment lifts on a sunken track with a
small functional shadow (`theme.shadow.sm`) — the same
lift-to-indicate-state convention `SideNav`'s collapse handle uses, not an
ambient card shadow.

### Form controls

| Component       | Value type                                   | Extra props                                                                                                                         |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `TextInput`     | `string`                                     | `placeholder`, `type` (`text\|email\|password\|url\|tel`), `readOnly` for a copyable but non-editable value (e.g. a generated link) |
| `NumberInput`   | `number \| null`                             | `min`, `max`, `step`, `placeholder`                                                                                                 |
| `TextAreaInput` | `string`                                     | `rows` (default `4`), `placeholder`                                                                                                 |
| `Checkbox`      | `boolean`                                    | `label` is the text beside the box; `hideLabel` visually hides it (sr-only) for dense grids where the label would be redundant      |
| `Switch`        | `boolean`                                    | same shape as `Checkbox`, toggle UI                                                                                                 |
| `CheckboxList`  | `string[]`                                   | `options: { label, value }[]`                                                                                                       |
| `RadioGroup`    | `string \| null`                             | `options: { label, value, description? }[]`                                                                                         |
| `Dropdown`      | `string \| null`, or `string[]` with `multi` | `options`, `placeholder`                                                                                                            |

An empty `NumberInput` yields `null`, never `NaN`.

`Dropdown` is custom-rendered, not a native `<select>` — a bare `<select>`
keeps its own OS popup and doesn't fully respect the shared control
border/radius in every browser, clashing with `TextInput`/`TextAreaInput`
next to it. Built on the native Popover API, the same way `Menu` is
(light-dismiss, Esc-to-close, top-layer stacking for free). Same props
either way — nothing to change at call sites.

`FormInputLayout` is exported for wrapping a custom control so it matches the
rest; it takes a render function receiving `{ id, describedBy, invalid }`.

#### `FileDropzone`

| Prop       | Type                                        | Default                                  |
| ---------- | ------------------------------------------- | ---------------------------------------- |
| `value`    | `{ name: string; dataUrl: string } \| null` | required                                 |
| `onChange` | `(value) => void`                           | required                                 |
| `accept`   | `string`                                    | — (native `accept`, e.g. `"image/*"`)    |
| `prompt`   | `string`                                    | `"Drag a file here, or click to browse"` |

Drag-and-drop with a click-to-browse fallback (a `<label>` over a
visually-hidden native input, so keyboard/click semantics come free). Reads
the file to a data URL itself and hands back `{ name, dataUrl }` — the
caller never touches `FileReader`. Shows a thumbnail for an image value, an
upload icon otherwise, plus a Remove button once a file's selected.

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

#### `Icon`

| Prop    | Type       | Default          |
| ------- | ---------- | ---------------- |
| `name`  | `IconName` | required         |
| `size`  | `number`   | `20`             |
| `color` | `string`   | `"currentColor"` |
| `label` | `string`   | —                |

A small curated set of stroke icons (adapted from Lucide, ISC License) — not
a general-purpose icon library; a name is added only when a real consumer
needs it. Names: `settings`, `logOut`, `close`, `chevronDown`, `chevronLeft`,
`chevronRight`, `check`, `user`, `plus`, `trash`, `search`, `externalLink`,
`image`, `key`, `chat`, `menu`, `upload`, `grid`, `switch`, `palette`
(`key`/`chat`/`menu`/`switch`/`palette` are hand-drawn for this repo, not
adapted from Lucide).
`color` defaults to `"currentColor"` so it inherits surrounding text/button
color for free — pass `label` only for an icon standing alone with no
adjacent text (it's decorative/`aria-hidden` otherwise).

#### `StatTile`

| Prop    | Type               | Default  |
| ------- | ------------------ | -------- |
| `label` | `string`           | required |
| `value` | `string \| number` | required |

A label + a large number, for a headline metric that doesn't need a chart
(e.g. a total). `value` renders with `font-variant-numeric: proportional-nums`
per the dataviz skill's guidance for standalone big numbers.

#### `LineChart`

| Prop          | Type                    | Default              |
| ------------- | ----------------------- | -------------------- |
| `series`      | `LineChartSeries[]`     | required             |
| `height`      | `number`                | `260`                |
| `formatValue` | `(n: number) => string` | `n.toLocaleString()` |

```ts
type LineChartSeries = {
  key: string;
  label: string;
  color: string;
  points: { x: string; y: number }[];
};
```

A multi-series SVG line chart. All series must share the same `x` categories
in the same order. Ships with a legend + direct end-labels, a crosshair +
tooltip on hover, and a "Show table" toggle for the accessibility-required
table view. Colors are caller-supplied — pick a categorical pair with the
dataviz skill's `scripts/validate_palette.js` and pass different hexes for
light vs. dark mode (`useColorScheme().resolved`); a pair validated against
one surface can fail against the other.

#### `BarChart`

| Prop          | Type                    | Default              |
| ------------- | ----------------------- | -------------------- |
| `series`      | `BarChartSeries[]`      | required             |
| `height`      | `number`                | `260`                |
| `formatValue` | `(n: number) => string` | `n.toLocaleString()` |

Same props shape as `LineChart` (`BarChartSeries` is the same `{ key, label,
color, points }` shape) — the two are interchangeable views over identical
data, e.g. a day-by-day comparison next to a trend line. Grouped, top-rounded
bars per category, a legend, a hover highlight + tooltip, and the same
"Show table" toggle. Same color-pair rule as `LineChart`: validate with the
dataviz skill's script, different hexes per color scheme.

#### `Badge`

`variant`: `"neutral" | "primary" | "success" | "warning" | "error"` (default
`"neutral"`); `emphasis`: `"outline" | "subtle" | "solid"` (default
`"outline"` — transparent background, colored border and text; the flat
status-chip look).

#### `StatusDot`

| Prop      | Type                                             | Default     |
| --------- | ------------------------------------------------ | ----------- |
| `variant` | `"neutral" \| "success" \| "warning" \| "error"` | `"neutral"` |
| `label`   | `string`                                         | —           |
| `pulse`   | `boolean`                                        | `false`     |

A small colored dot, optionally with a text label beside it — a
live/offline/warning indicator (a server's reachability, a connection
state) too minor for a full `Badge` pill. Shares `Badge`'s variant naming
and colors so the two read as the same status language. `pulse` adds a
soft expanding ring, for a state that's live right now — skip it for a
static state like "offline".

#### `ChatBubble`

| Prop      | Type                                                | Default      |
| --------- | --------------------------------------------------- | ------------ |
| `role`    | `"user" \| "assistant"`                             | required     |
| `content` | `string`                                            | required     |
| `status`  | `"pending" \| "streaming" \| "complete" \| "error"` | `"complete"` |

One message in a chat thread. User bubbles are right-aligned and filled with
the accent color; assistant bubbles are left-aligned, bordered, on
`surface` — the same solid-vs-outlined distinction `Button`'s `solid`/
`outline` appearances draw elsewhere. `"pending"`/`"streaming"` show a
spinner + "Generating…" below the content (and a placeholder "…" while
`content` is still empty); `"error"` shows "Generation failed".

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

#### `MenuItem`

| Prop       | Type         | Default  |
| ---------- | ------------ | -------- |
| `icon`     | `ReactNode`  | —        |
| `title`    | `string`     | required |
| `subtitle` | `string`     | —        |
| `href`     | `string`     | —        |
| `onClick`  | `() => void` | —        |

A clickable row for `Menu` content — icon, title, optional subtitle, with a
block background highlight on hover/focus. `Menu` itself imposes no styling
on its children, so this is what makes a list of entries feel like a picker
rather than plain links in a box. `icon` is a plain `ReactNode` — an emoji
string works fine, same pattern `EmptyState`'s `icon` prop already uses.
`subtitle` is truncated to one line internally, so callers don't need to
pre-truncate a longer field (e.g. an app's `description`). Provide `href`
_or_ `onClick`, not both — `href` renders an `<a>`, `onClick` a `<button>`.

#### `Tooltip`

| Prop        | Type                | Default  |
| ----------- | ------------------- | -------- |
| `content`   | `string`            | required |
| `children`  | `ReactNode`         | required |
| `placement` | `"top" \| "bottom"` | `"top"`  |

A small inverted-color label shown on hover or keyboard focus. Not
portaled — fine wrapping a button in normal flow, but it can clip inside an
`overflow: hidden` ancestor. `children` needs to be focusable on its own
(a `Button`, `Icon`-only button, `Link`) for the keyboard-focus trigger to
work — a bare `<span>` only gets the hover trigger.

### Navigation

#### `Link`

Native anchor props plus `variant` (`"primary" | "muted"`) and `external` (adds
`target="_blank"` **and** `rel="noopener noreferrer"`).

#### `AppShell`

| Prop          | Type        | Default  |
| ------------- | ----------- | -------- |
| `title`       | `string`    | —        |
| `appSwitcher` | `ReactNode` | —        |
| `nav`         | `ReactNode` | —        |
| `account`     | `ReactNode` | —        |
| `sideNav`     | `ReactNode` | —        |
| `children`    | `ReactNode` | required |
| `footer`      | `ReactNode` | —        |
| `maxWidth`    | `number`    | `960`    |

Full-width header (title pinned left, `nav` then `account` pinned right —
`account` is always the rightmost element), centred content column below it,
optional footer. **The header only renders at all when it has something to
show** — `title`, `appSwitcher`, `nav`, or `account`. An app whose branding
and app switcher already live in `SideNav`'s own `top` slot (see below) has
no reason to pass any of these, and gets no header at all: just the rail and
content, without a second bar repeating the same app name above it. `title`
without a `sideNav` (e.g. a public landing page with nothing to switch
between) still works exactly as before — pass it and the header renders.

`sideNav` (typically a `SideNav`) is locked to the true left edge, below the
header (if any), spanning its own full height — not inside the centred
content column. Passing it flips the shell into a scroll-locked layout: the
header, sideNav, and footer stay fixed in place and only `children` scrolls.
Omit it (the default) for the normal behavior, where the whole page scrolls
as one — every app without this prop is completely unaffected by its
existence.

Below the `sm` breakpoint (480px), the permanent rail disappears entirely —
a small floating menu button (fixed to the top-left corner, independent of
whether a header renders) opens the same `sideNav` content as an overlay
drawer (a native `<dialog>`, same `showModal()` technique as `Modal`: focus
trapping, top-layer, Esc-to-close for free) rather than eating permanent
width on a phone-sized screen. A visible close (×) button floats just
outside the drawer's right edge — `showModal()` makes the floating menu
button inert while open, and there's no Esc key on a touchscreen, so
backdrop-tap and Esc aren't the only ways out. One known simplification:
selecting a page from the drawer does not auto-close it — there's no
plumbing between an opaque `sideNav` node and AppShell's drawer state to
detect "that click was a navigation, not a collapse-toggle," so it stays
open until dismissed. Nothing here needs wiring from the app; it's automatic
based on `sideNav` being passed and the viewport width.

#### `SideNav`

| Prop         | Type                    | Default                        |
| ------------ | ----------------------- | ------------------------------ |
| `items`      | `SideNavItem[]`         | `[]`                           |
| `activeKey`  | `string`                | `""`                           |
| `onSelect`   | `(key: string) => void` | no-op                          |
| `top`        | `ReactNode`             | —                              |
| `footer`     | `ReactNode`             | —                              |
| `storageKey` | `string \| null`        | `"bluestar-sidenav-collapsed"` |

`SideNavItem` is `{ key, label, icon? }`. A collapsible left rail for an
app's top-level pages — meant for `AppShell`'s `sideNav` slot. Collapses to
an icon-only strip via a small circular toggle straddling the rail's right
border at vertical centre (the convention most dashboard component
libraries — Bootstrap, Tailwind UI — use, rather than a full-width row).
Give every item an `icon` or it becomes unusable once collapsed. Collapsed
state persists to `localStorage` the same way `useColorScheme` persists its
own choice — pass `storageKey={null}` to disable that. The active item is a
3px left accent bar + tinted background, not a solid fill — the same
flat-selection language `Tabs` uses for the underline.

`top` and `footer` turn the rail into the app's whole chrome, so `AppShell`
needs no header at all (see its own doc above) — `top` is each app's own
`AppSwitcher.tsx` (branding + a `switch`-icon `Menu` for jumping to another
app, scaffolded like `AccountMenu.tsx`), `footer` an account/profile block
pinned above a top border. Both are hidden while collapsed rather than
squeezed into 64px — expand to reach them. `items` is optional: a
single-page app can render `SideNav` for just its `top`/`footer` chrome with
an empty (or omitted) `items` array and nothing to switch between.

#### `ThemeToggle`

No props. A three-way Auto/Light/Dark `SegmentedControl` wired straight to
`useColorScheme` — there's exactly one color scheme per page, so nothing to
parameterize. Drop it in `SideNav`'s `footer` slot, or anywhere else app
chrome needs a way to change the theme.

#### `ThemePicker`

No props. A `palette`-icon button opening a `Modal` with the full theme:
the same Auto/Light/Dark `SegmentedControl` as `ThemeToggle`, plus an accent
color section with its own `SegmentedControl` toggling between "Presets"
(the default swatch plus four preset colors) and "Custom" (any color via a
native color input). Both apply live through `useColorScheme`/
`useCustomAccent`, no separate save step. Every app in this repo sets
`ThemeProvider`'s `cookieDomain` to `.ryanzrau.dev`, so both the scheme and
the accent persist as cookies shared across every subdomain rather than
per-origin storage — pick a theme on one app and it follows you to the
others. Every app renders this inline in `AccountMenu`'s icon row, next to
the Settings button; `ThemeToggle` stays around for a plain inline toggle
elsewhere.

#### `ListRow`

| Prop       | Type         | Default  |
| ---------- | ------------ | -------- |
| `title`    | `string`     | required |
| `subtitle` | `string`     | —        |
| `badge`    | `ReactNode`  | —        |
| `muted`    | `boolean`    | `false`  |
| `selected` | `boolean`    | required |
| `onClick`  | `() => void` | required |

One row in a selectable master-detail list — an API key list, a chat list.
Selection reads the same way `SideNav`'s does: a left accent bar + tinted
background, so "this is the current pick" looks the same everywhere in the
library, not just in the permanent app rail. `muted` dims the title (a
revoked/archived row that stays clickable) and takes precedence over the
selected color.

#### `Tabs`

| Prop        | Type                    | Default  |
| ----------- | ----------------------- | -------- |
| `items`     | `TabItem[]`             | required |
| `activeKey` | `string`                | required |
| `onSelect`  | `(key: string) => void` | required |

`TabItem` is `{ key, label, icon? }`. A flat, underline-selected tab row for
switching between views _within_ a page — `SideNav`'s counterpart for
switching between an app's top-level _sections_.

#### `Breadcrumbs`

`items: BreadcrumbItem[]` — `{ label, href? }`. A chevron-separated ancestor
trail; the last item always renders as plain (non-link) current-page text
regardless of whether it has an `href`. Omit `href` on any item to render it
as plain text instead of a link.

#### `Pagination`

| Prop           | Type                     | Default  |
| -------------- | ------------------------ | -------- |
| `page`         | `number` (1-indexed)     | required |
| `pageCount`    | `number`                 | required |
| `onPageChange` | `(page: number) => void` | required |

Prev/next controls plus a truncated run of page numbers (first, last,
current ± 1, `…` elsewhere) — pairs with `Table` for paged data. Renders
`null` when `pageCount <= 1`.

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
