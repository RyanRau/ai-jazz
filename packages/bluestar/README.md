# Ozark Bluestar

The React component library every app in this monorepo builds its UI from.
Components are styled with [goober](https://github.com/cristianbote/goober) and
driven entirely by a theme, so apps get a consistent look without writing CSS.

The full component and prop reference lives in
[`packages/PACKAGES.md`](../PACKAGES.md) — start there when building an app.

This package is also deployed: its Storybook is published as a static site at
[ui.ryanzrau.dev](https://ui.ryanzrau.dev) (registered in the repo-root
`deploy.yml` as the `bluestar` app with `path: packages/bluestar`).

## Development

```bash
cd packages/bluestar
npm install              # installs deps and builds dist/ via the prepare script
npm run storybook        # workbench at http://localhost:6006
npm run build            # compile to dist/ — apps import this, not src/
npm run build-storybook  # static site, what gets deployed
```

Apps resolve bluestar through `file:` references, so **rebuild after every
change** or the consuming app keeps the stale `dist/`.

## Adding a component

1. Create `src/components/<category>/<Name>/` containing:
   - `Name.tsx` — default export, props typed inline, JSDoc on each prop
   - `index.ts` — `export { default as Name } from "./Name";` plus any prop types
   - `Name.stories.tsx` — at least a default story and the interesting states
2. Re-export the folder from `src/index.ts`.
3. Document the props in [`packages/PACKAGES.md`](../PACKAGES.md).

Conventions worth matching:

- Read all colors, fonts, radius, and shadow from `useTheme()` — never hardcode.
- Sizes and gaps use the `Spacing` union (`4 | 8 | 12 | 16 | 20 | 24 | 32`) as raw
  pixel numbers.
- Form controls are controlled: take `value` + `onChange(parsedValue)`, and wrap
  the input in `FormInputLayout` so labels, descriptions, and warnings render the
  same everywhere.
- Disable with `isDisabled`, not the native `disabled` prop.

## Structure

```
src/
  index.ts              # public surface — everything apps can import
  styling.ts            # goober setup, imported for its side effect
  theme/                # Theme type, defaultTheme, ThemeProvider, useTheme
  components/
    layout/             # Flexbox, Card, Divider
    buttons/            # Button, AsyncButton
    feedback/           # Spinner
    text/               # Header, Text, TextPairing
    form/               # FormInputLayout, TextInput, NumberInput,
                        # TextAreaInput, CheckboxList, Dropdown
```
