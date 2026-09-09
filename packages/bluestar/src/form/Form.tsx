import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { css } from "goober";
import Flexbox from "../components/layout/Flexbox/Flexbox";
import Alert from "../components/feedback/Alert/Alert";
import type { Spacing } from "../theme";
import type { FormApi, FormValues } from "./useForm";

// The context can't be generic, so it holds the loosest shape. Components that
// read it (SubmitButton) only need the non-generic parts.
type AnyFormApi = FormApi<FormValues>;

const FormContext = createContext<AnyFormApi | null>(null);

export type FormProps<T extends FormValues> = {
  form: FormApi<T>;
  children: ReactNode;
  /** Gap between children in pixels. Defaults to `16`. */
  gap?: Spacing;
  /** Render `submitError` as an Alert above the fields. Defaults to true. */
  showSubmitError?: boolean;
  /**
   * Max width in pixels for the rendered `<form>`. Defaults to `480` — a
   * comfortable form-column width so fields don't stretch edge-to-edge of
   * an arbitrarily wide parent. Pass `null` (not `undefined` — an omitted
   * or explicitly-`undefined` prop both fall through to the default) for a
   * form that should genuinely stretch full-width.
   */
  maxWidth?: number | null;
};

/**
 * A real `<form>` wired to `useForm`.
 *
 * `noValidate` is deliberate: inputs carry `required` for assistive tech, but
 * the browser's own validation bubbles would compete with the inline messages
 * this library renders.
 */
export function Form<T extends FormValues>({
  form,
  children,
  gap = 16,
  showSubmitError = true,
  maxWidth = 480,
}: FormProps<T>) {
  return (
    <FormContext.Provider value={form as unknown as AnyFormApi}>
      <form
        onSubmit={form.handleSubmit}
        noValidate
        className={
          maxWidth === null
            ? undefined
            : css`
                max-width: ${maxWidth}px;
              `
        }
      >
        <Flexbox direction="column" gap={gap}>
          {showSubmitError && form.submitError && <Alert variant="error">{form.submitError}</Alert>}
          {children}
        </Flexbox>
      </form>
    </FormContext.Provider>
  );
}

/** The enclosing `<Form>`'s api. Throws outside a Form so the mistake is loud. */
export function useFormContext(): AnyFormApi {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used inside a <Form>");
  }
  return context;
}

/** The enclosing `<Form>`'s api, or null when there isn't one. */
export function useOptionalFormContext(): AnyFormApi | null {
  return useContext(FormContext);
}
