import { useCallback, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

export type FormValues = Record<string, unknown>;

/** Field name → message. Return `{}` from `validate` when everything is valid. */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * What a bluestar form control needs. Spread it straight onto an input:
 * `<TextInput {...form.field("title")} label="Title" />`
 */
export type FieldBinding<V> = {
  name: string;
  value: V;
  onChange: (value: V) => void;
  error?: string;
};

export type UseFormOptions<T extends FormValues> = {
  initialValues: T;
  /** Pure function; runs on every change. Return only the fields that failed. */
  validate?: (values: T) => FormErrors<T>;
  /** Runs on submit, only once validation passes. May be async. */
  onSubmit?: (values: T) => void | Promise<void>;
};

export type FormApi<T extends FormValues> = {
  values: T;
  /** Every current validation failure, whether or not it is being shown yet. */
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  /** Set when an async `onSubmit` throws — e.g. a rejected PocketBase write. */
  submitError?: string;
  field: <K extends keyof T>(name: K) => FieldBinding<T[K]>;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  /** Attach a message the client couldn't know about, e.g. "email already taken". */
  setError: <K extends keyof T>(name: K, message: string | undefined) => void;
  reset: (values?: T) => void;
  handleSubmit: (event?: FormEvent) => void;
};

/**
 * Form state for a plain object of values.
 *
 * Works standalone or inside `<Form>`. `field(name)` is generic over the values
 * object, so a misspelled name is a compile error rather than an input that
 * silently never updates.
 */
export function useForm<T extends FormValues>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): FormApi<T> {
  const initial = useRef(initialValues);
  const [values, setValuesState] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  // Errors that validation can't derive — server responses, mostly.
  const [externalErrors, setExternalErrors] = useState<FormErrors<T>>({});

  const errors = useMemo<FormErrors<T>>(
    () => ({ ...(validate ? validate(values) : {}), ...externalErrors }),
    [validate, values, externalErrors]
  );

  const isValid = Object.values(errors).every((message) => !message);
  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initial.current),
    [values]
  );

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    // A server error is about the old value, so editing clears it.
    setExternalErrors((prev) => (name in prev ? { ...prev, [name]: undefined } : prev));
  }, []);

  const setValues = useCallback((next: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...next }));
  }, []);

  const setError = useCallback(<K extends keyof T>(name: K, message: string | undefined) => {
    setExternalErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const reset = useCallback((next?: T) => {
    const target = next ?? initial.current;
    initial.current = target;
    setValuesState(target);
    setTouched({});
    setSubmitted(false);
    setSubmitError(undefined);
    setExternalErrors({});
  }, []);

  const field = useCallback(
    <K extends keyof T>(name: K): FieldBinding<T[K]> => ({
      name: String(name),
      value: values[name],
      onChange: (value: T[K]) => setValue(name, value),
      // Hold the message back until the field has been touched or a submit has
      // been attempted, so a pristine form isn't a wall of red.
      error: touched[name] || submitted ? errors[name] : undefined,
    }),
    [values, touched, submitted, errors, setValue]
  );

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      setSubmitted(true);
      setSubmitError(undefined);

      const current = validate ? { ...validate(values), ...externalErrors } : externalErrors;
      if (Object.values(current).some(Boolean)) return;
      if (!onSubmit) return;

      const result = onSubmit(values);
      if (!(result instanceof Promise)) return;

      setIsSubmitting(true);
      result
        .catch((error: unknown) => {
          setSubmitError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setIsSubmitting(false));
    },
    [validate, values, externalErrors, onSubmit]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    submitError,
    field,
    setValue,
    setValues,
    setError,
    reset,
    handleSubmit,
  };
}
