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
is the whole point of the library.

### Setup

The library calls `setup(React.createElement)` on import, so no extra
configuration is needed. Wrap the app in `ThemeProvider` to override theme
values; without it, components fall back to `defaultTheme`.

```tsx
import { ThemeProvider } from "bluestar";

<ThemeProvider theme={{ colors: { primary: "#ff6b6b" } }}>
  <App />
</ThemeProvider>;
```

### Building

bluestar ships compiled output from `dist/`, so it must be built before a
consuming app can resolve it:

```bash
npm --prefix packages/bluestar install   # installs deps and runs the build
```

`npm install` inside an app runs bluestar's `prepare` script but does **not**
install bluestar's own devDependencies, so a fresh clone must install
`packages/bluestar` first (`npm run bootstrap` at the repo root does exactly
this). The Dockerfiles follow the same order.

### Exports

```ts
import {
  // theme
  ThemeProvider,
  useTheme,
  defaultTheme,
  // layout
  Flexbox,
  Card,
  Divider,
  // buttons
  Button,
  AsyncButton,
  // feedback
  Spinner,
  // text
  Header,
  Text,
  TextPairing,
  // form
  FormInputLayout,
  TextInput,
  NumberInput,
  TextAreaInput,
  CheckboxList,
  Dropdown,
} from "bluestar";

import type { Theme, Spacing, ButtonType, TextType, HeaderVariant } from "bluestar";
```

---

## Theme

### `Theme` type

```ts
type Spacing = 4 | 8 | 12 | 16 | 20 | 24 | 32;

type Theme = {
  colors: {
    primary; primaryHover;
    secondary;
    background; surface;
    text; textMuted; border;
    error; errorHover;
    success; successHover;
    warning;
    secondaryButton; secondaryButtonHover;
    light; dark;
  };
  fonts: { body; heading; mono };
  textTypes: {
    caption | body | subtitle | display | label:
      { size: string; bold: boolean; italic: boolean; muted: boolean };
  };
  headings: { h1 | h2 | h3: { size: string; weight: string } };
  radius: string; // single value, not a scale
  shadow: string; // single value, not a scale
};
```

Note the shape: spacing is a **numeric union used directly as pixels**
(`gap={16}`, `padding={24}`), and `radius`/`shadow` are single strings — there is
no `spacing`, `fontSizes`, `radius.md`, or `shadows.lg` map.

### `ThemeProvider`

All fields are optional and deep-merged over `defaultTheme`.

| Prop       | Type                 | Default        |
| ---------- | -------------------- | -------------- |
| `theme`    | `DeepPartial<Theme>` | `defaultTheme` |
| `children` | `React.ReactNode`    | —              |

### `useTheme`

```tsx
const theme = useTheme(); // full resolved Theme
```

---

## Layout

### `Flexbox`

Flexbox wrapper mapping props to CSS. Applies styles inline (no goober class).

```tsx
<Flexbox direction="column" gap={16} alignItems="center" justifyContent="space-between">
  {children}
</Flexbox>
```

| Prop             | Type                                                                                            | Default |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------- |
| `children`       | `React.ReactNode`                                                                               | —       |
| `direction`      | `"row" \| "column"`                                                                             | `"row"` |
| `gap`            | `Spacing`                                                                                       | —       |
| `grow`           | `number`                                                                                        | —       |
| `shrink`         | `number`                                                                                        | —       |
| `flexWrap`       | `"wrap" \| "nowrap"`                                                                            | —       |
| `justifyContent` | `"flex-start" \| "flex-end" \| "center" \| "space-between" \| "space-around" \| "space-evenly"` | —       |
| `alignContent`   | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "space-between" \| "space-around"`      | —       |
| `alignItems`     | `"flex-start" \| "flex-end" \| "center" \| "stretch" \| "baseline"`                             | —       |
| `width`          | `number \| string`                                                                              | —       |
| `height`         | `number \| string`                                                                              | —       |
| `style`          | `object`                                                                                        | —       |

### `Card`

Surface container with border, background, and shadow.

```tsx
<Card padding={24}>
  <Header variant="h3">Title</Header>
</Card>
```

| Prop       | Type              | Default        |
| ---------- | ----------------- | -------------- |
| `children` | `React.ReactNode` | —              |
| `padding`  | `Spacing`         | `16`           |
| `shadow`   | `string`          | `theme.shadow` |

### `Divider`

```tsx
<Divider />
<Divider direction="vertical" length={80} />
```

| Prop        | Type                           | Default        |
| ----------- | ------------------------------ | -------------- |
| `direction` | `"horizontal" \| "vertical"`   | `"horizontal"` |
| `length`    | `number` (percent of the axis) | `100`          |

---

## Buttons

### `Button`

Accepts all native `<button>` props except `disabled` and `type` (both are
repurposed below). Renders `children` when given, otherwise `label`.

```tsx
<Button label="Save" onClick={save} />
<Button label="Delete" type="destructive" density="dense" onClick={remove} />
```

| Prop         | Type                                                      | Default     |
| ------------ | --------------------------------------------------------- | ----------- |
| `label`      | `string`                                                  | required    |
| `type`       | `"primary" \| "secondary" \| "creation" \| "destructive"` | `"primary"` |
| `isDisabled` | `boolean`                                                 | `false`     |
| `density`    | `"normal" \| "dense"`                                     | `"normal"`  |
| …rest        | native button props (`onClick`, `aria-*`, …)              | —           |

> `type` is the **visual intent**, not the HTML button type.
> Disable with `isDisabled`, not `disabled`.

### `AsyncButton`

Runs an async `onClick`, disabling itself and showing a spinner until the promise
settles.

| Prop      | Type                  | Required |
| --------- | --------------------- | -------- |
| `label`   | `string`              | yes      |
| `onClick` | `() => Promise<void>` | yes      |

---

## Feedback

### `Spinner`

| Prop    | Type     | Default                |
| ------- | -------- | ---------------------- |
| `size`  | `number` | `20`                   |
| `color` | `string` | `theme.colors.primary` |

---

## Text

### `Header`

Renders the matching `h1`/`h2`/`h3` element, sized from `theme.headings`.

| Prop       | Type                   | Default |
| ---------- | ---------------------- | ------- |
| `children` | `React.ReactNode`      | —       |
| `variant`  | `"h1" \| "h2" \| "h3"` | `"h1"`  |

### `Text`

Renders a `<p>`. Size, weight, style, and muting all come from the variant —
there are no `bold` / `italic` / `muted` / `size` props.

```tsx
<Text>Default body copy</Text>
<Text variant="caption">Timestamp</Text>
<Text variant="display" color={theme.colors.light}>Hero</Text>
```

| Prop       | Type                                                        | Default      |
| ---------- | ----------------------------------------------------------- | ------------ |
| `children` | `React.ReactNode`                                           | —            |
| `variant`  | `"caption" \| "body" \| "subtitle" \| "display" \| "label"` | `"subtitle"` |
| `color`    | `string` (overrides the theme color)                        | —            |

### `TextPairing`

Title over subtitle in a column.

| Prop              | Type            | Default     |
| ----------------- | --------------- | ----------- |
| `title`           | `string`        | required    |
| `subtitle`        | `string`        | required    |
| `titleVariant`    | `HeaderVariant` | `"h2"`      |
| `subtitleVariant` | `TextType`      | `"caption"` |

---

## Form

Every form control wraps `FormInputLayout`, so they all share `label`,
`description`, `warning`, and `isDisabled`. They are **controlled** components:
pass `value` and handle `onChange`, which receives the parsed value (not an
event).

### `FormInputLayout`

Label + description above, warning below. Use it directly when wrapping a custom
control so it matches the rest of the form.

| Prop          | Type              | Notes                            |
| ------------- | ----------------- | -------------------------------- |
| `label`       | `string`          | —                                |
| `description` | `string`          | helper text under the label      |
| `warning`     | `string`          | shown below in the warning color |
| `children`    | `React.ReactNode` | the control itself               |

### `TextInput`

| Prop                                | Type                      | Notes    |
| ----------------------------------- | ------------------------- | -------- |
| `value`                             | `string`                  | required |
| `onChange`                          | `(value: string) => void` | required |
| `placeholder`                       | `string`                  | —        |
| `isDisabled`                        | `boolean`                 | —        |
| `label` / `description` / `warning` | `string`                  | —        |

### `NumberInput`

Empty input yields `null`, not `NaN`.

| Prop                                | Type                              | Notes    |
| ----------------------------------- | --------------------------------- | -------- |
| `value`                             | `number \| null`                  | required |
| `onChange`                          | `(value: number \| null) => void` | required |
| `min` / `max` / `step`              | `number`                          | —        |
| `placeholder`                       | `string`                          | —        |
| `isDisabled`                        | `boolean`                         | —        |
| `label` / `description` / `warning` | `string`                          | —        |

### `TextAreaInput`

| Prop          | Type                      | Default  |
| ------------- | ------------------------- | -------- |
| `value`       | `string`                  | required |
| `onChange`    | `(value: string) => void` | required |
| `rows`        | `number`                  | `4`      |
| `placeholder` | `string`                  | —        |
| `isDisabled`  | `boolean`                 | —        |

### `CheckboxList`

| Prop         | Type                        | Notes              |
| ------------ | --------------------------- | ------------------ |
| `options`    | `CheckboxOption[]`          | `{ label, value }` |
| `value`      | `string[]`                  | selected values    |
| `onChange`   | `(value: string[]) => void` | required           |
| `isDisabled` | `boolean`                   | —                  |

### `Dropdown`

Single-select and multi-select are one component, discriminated by `multi`.

```tsx
<Dropdown options={opts} value={selected} onChange={setSelected} placeholder="Pick one" />
<Dropdown multi options={opts} value={selectedMany} onChange={setSelectedMany} />
```

| Prop          | Type                                                    | Notes                             |
| ------------- | ------------------------------------------------------- | --------------------------------- |
| `options`     | `DropdownOption[]`                                      | `{ label, value }`                |
| `multi`       | `boolean`                                               | switches the value/onChange types |
| `value`       | `string \| null` (single) / `string[]` (multi)          | required                          |
| `onChange`    | `(v: string \| null) => void` / `(v: string[]) => void` | required                          |
| `placeholder` | `string`                                                | single-select only                |
| `isDisabled`  | `boolean`                                               | —                                 |

---

## Development

```bash
cd packages/bluestar
npm install              # installs deps and builds dist/
npm run storybook        # component workbench at http://localhost:6006
npm run build            # compile to dist/ (apps resolve this)
npm run build-storybook  # static Storybook (deployed to ui.ryanzrau.dev)
```

After changing the library, rebuild it before running a consuming app — apps
import `dist/`, not `src/`.

Adding a component: create `src/components/<category>/<Name>/` with `Name.tsx`,
`index.ts` (`export { default as Name }` plus any prop types), and
`Name.stories.tsx`; re-export it from `src/index.ts`; then update this file.
