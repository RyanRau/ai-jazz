# bluestar Audit (August 2026)

Assessment of the component library against its actual job: being the UI layer
every app in this monorepo is _required_ to build on, largely with AI assistance.

Verdict: the foundations were sound — goober, a theme, a consistent folder
convention — but the library was too thin to build a real app against, and the
theme couldn't express dark mode. An app author hitting a missing Modal or Table
would write local components, which is precisely the failure the house stack
exists to prevent.

## What was wrong

**The theme couldn't do dark mode.** `.storybook/preview.tsx` hand-rolled a dark
palette by overriding five colours, but the library exported nothing for it, so
no deployed app could be dark. Theme values were interpolated into goober classes
at render time, so switching themes meant regenerating every class.

**The theme was brittle to extend.** `ThemeProvider` merged with hand-written
per-group functions (`mergeTextType`, `mergeHeading`). Adding a token silently
failed to merge until someone remembered to extend that function. The merged
object was also rebuilt on every render with no `useMemo`, making the context
value unstable and re-rendering every consumer on any parent render.

**`Button` made a submit button impossible.** It repurposed the native `type`
attribute for visual intent (`type="destructive"`), so `type="submit"` could not
be expressed — which in turn meant no real form could be built.

**No form layer at all.** The five inputs were controlled and unconnected, so
every app would hand-roll a `useState` per field plus its own validation, submit
and error plumbing. For apps whose main job is writing records to PocketBase,
that was the single most-repeated boilerplate.

**Smaller defects.** `Flexbox` used inline styles rather than goober (and a
`useMemo` whose `style` dependency was a fresh object every render, so it never
hit). `FormInputLayout` rendered labels with no `htmlFor`, so no label was
associated with its control — failing assistive tech and breaking click-to-focus.
`AsyncButton` passed both `label` and a children `<Text>` containing the label.
Nothing type-checked the stories, so they had rotted.

## What changed

### Theming is now CSS custom properties

The whole theme is emitted as `--bs-*` variables. The move that kept this cheap:
`useTheme()` keeps its shape, but its leaves are now `var(--bs-…)` reference
strings rather than literals — so a component doing
`` css`color: ${theme.colors.text}` `` was already correct and became
scheme-reactive for free.

Three blocks make every scheme state resolve: `:root` for light, a
`prefers-color-scheme` query guarded with `:not([data-bs-scheme="light"])`, and
an explicit `[data-bs-scheme]` block last so a manual choice beats the OS in both
directions. `ThemeProvider` gained `colorScheme` (`auto` | `light` | `dark`),
`darkTheme` overrides, an opt-out `baseline` reset, and `localStorage`
persistence; `useColorScheme()` reads and sets it.

**Two things worth knowing for anyone touching this code:**

1. **All global CSS must go out in a single `glob` call.** goober keys global
   styles such that a second `glob` _replaces_ the first rather than appending.
   Splitting the baseline and the palettes into two calls silently dropped
   whichever ran first — the baseline vanished with no error. `emitGlobalStyles`
   exists to keep it one call.
2. **A nested `ThemeProvider` scopes its variables to a wrapper element** rather
   than emitting `:root`, because `:root` is global and a nested provider would
   otherwise re-theme the entire document. Root providers own `:root` and the
   `data-bs-scheme` attribute; nested ones cascade inline. This is what lets the
   theme playground story work without leaking into every other story.

Token changes: `radius` and `shadow` became scales (`none|sm|md|lg`, plus
`radius.full`) instead of single strings; the component-specific colour leaks
(`secondaryButton`, `secondaryButtonHover`) became semantic `secondary` /
`secondaryHover`; `light` became `textOnAccent`, which flips to a dark ink in the
dark palette because the accents are light enough there that white would fail
contrast; `textTypes` entries moved from `{size, bold, italic, muted}` booleans to
`{size, weight, style, color}` CSS values, which deleted the branching inside
`Text`. Unused `colors.secondary` and `colors.dark` were dropped.

### A typed form layer

`useForm` holds values, validation, touched state and submit status. `field(name)`
is generic over the values object, so `form.field("titel")` is a compile error
naming the valid keys rather than an input that silently never updates — the
property that makes it safe for generated code. It spreads straight onto any
bluestar input because they already took `value` + `onChange(parsed)`.

`<Form>` renders a real `<form>` (with `noValidate`, so the browser's own
validation bubbles don't compete with the inline messages) and provides context.
`SubmitButton` reads that context to disable and spin while submitting — possible
only because `Button`'s native `type` was restored.

Errors are held back until a field is touched or a submit is attempted, so a
pristine form isn't a wall of red. `setError(name, message)` exists for failures
only the server knows about, and editing the field clears them.

### Components added

`Alert`, `Badge`, `Skeleton`, `EmptyState`, `Toast` + `useToast`, `Modal`,
`ConfirmDialog`, `Table`, `Link`, `AppShell`, `Checkbox`, `Switch`, `RadioGroup`,
plus the form layer. That is enough to build a CRUD app end to end without
inventing UI.

`Modal` is built on the native `<dialog>` element via `showModal()`, which
supplies focus trapping, the top layer, page inertness and Esc-to-close — all
fiddly to hand-roll and easy to get subtly wrong. `Alert` and `Badge` tint their
backgrounds with `color-mix()` against the tone's own colour, so they re-tint
correctly in dark mode without a parallel set of background tokens.

### Defects fixed

`Button` takes `variant` for intent and passes `type` through natively (no
consumer passed either, so this cost nothing); `AsyncButton` forwards its props
and renders the label once; `Flexbox` uses goober; `FormInputLayout` wires
`htmlFor`/`aria-describedby`/`aria-invalid` through a render prop and gained
`error` (red, `role="alert"`) as distinct from `warning` (amber), plus a
`required` marker; every control now shares one `controlClass` so focus rings and
disabled states can't drift apart.

Two follow-ups, found when `FormInputLayout` finally got the story it had always
been missing:

- Its label was `<Text as="label">` wrapping a `<label htmlFor>` — `Text` renders
  the tag `as` names and does not forward `htmlFor`, so the fix above had shipped
  as **nested labels**, which are invalid and let the browser pick the
  association. The `<label>` is now the outer element around a `<Text as="span">`.
- The repo-wide eslint ignore said `**/.storybook-static/**` with a leading dot,
  which matches nothing. Anyone who ran `npm run build-storybook` before
  `npm run lint` got ~10,000 errors out of minified bundles.

### Stories are type-checked now

They weren't reachable from `index.ts`, so tsup's dts pass never saw them and
they had rotted. `npm run typecheck` covers all of `src`, and `build` runs it
first. It immediately caught three stale `type="secondary"` usages that would
have shipped as broken stories.

## Deliberately not done

- **`Tabs`, `Tooltip`, `Menu`/`Popover`, `Pagination`, `Accordion`,
  `Breadcrumbs`, `ProgressBar`, `Avatar`.** Speculative until an app needs one.
- **`DatePicker`, `FileUpload`, `SearchInput`.** Cheaper now: they only have to
  satisfy the `value`/`onChange` contract that `field()` already spreads.
- **`LoginForm`.** Every app needs one, but it would make the UI library import
  the `pocketbase` SDK, and `packages/PACKAGES.md` is explicit that the backend
  is not a package. With `useForm` it is ~20 lines of app code; the right home is
  `infra/templates/app`, so a scaffolded app is born with a working login screen.
- **A spacing scale in the theme.** Spacing does not vary by colour scheme, so
  making it a variable adds indirection for nothing. `Spacing` stays a numeric
  pixel union.

## Known weaknesses

| Issue                                                                                          | Impact                                                                      | Fix when it bites                                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No tests.** `useForm` is the first piece of bluestar with real logic rather than markup      | A form-state regression would only show up in an app                        | Add vitest + testing-library and cover `useForm` first; the components are mostly declarative                                                     |
| **The type scale runs small** — `body` is 12px, `caption` 10px, against a 16px browser default | Below comfortable reading size, and 10px is a genuine accessibility problem | One edit in `theme.ts`. Left alone here because changing it restyles every existing page, which is a design decision rather than an audit finding |
| **`Dropdown` multi-select is a native `<select multiple>`**                                    | Poor UX — ctrl-click to multi-select, no search                             | A popover-based multi-select, once something actually needs it                                                                                    |
| **`color-mix()` needs a 2023+ browser**                                                        | `Alert`/`Badge` tints fall back to nothing on very old browsers             | Acceptable for personal apps; add explicit tint tokens if it ever matters                                                                         |
| **No focus-visible polyfill**                                                                  | Older Safari shows focus rings on mouse click too                           | Cosmetic, and shrinking                                                                                                                           |
| **Storybook is the only visual check**                                                         | A component can regress visually without CI noticing                        | Chromatic or Playwright screenshots, if visual churn ever becomes a problem                                                                       |

## Verification performed

`npm run typecheck` (all of `src`, including stories), `npm run build`, ESLint and
Prettier across the repo, and the emitted CSS asserted directly — reset present,
all three scheme blocks present, braces balanced, `--bs-color-text-on-accent`
flipping between palettes. `apps/ryanzrau` and a freshly scaffolded app were both
built against the new `dist/`. The `field()` typo case was confirmed to fail
compilation.

**Not verified:** anything visual. There is no browser in the environment this
was built in, so Storybook has not been rendered — dark-mode contrast, focus
rings, and `Modal`/`Toast` focus behaviour need a human with `npm run storybook`.
