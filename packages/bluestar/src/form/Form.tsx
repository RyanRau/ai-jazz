import { createContext, useContext } from "react";
import type { ReactNode } from "react";
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
}: FormProps<T>) {
  return (
    <FormContext.Provider value={form as unknown as AnyFormApi}>
      <form onSubmit={form.handleSubmit} noValidate>
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
