import { css } from "goober";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";
import Icon from "../../display/Icon/Icon";
import Text from "../../text/Text/Text";

export type DropdownOption = {
  label: string;
  value: string;
};

type BaseProps = FormFieldProps & {
  options: DropdownOption[];
  placeholder?: string;
};

type SingleProps = BaseProps & {
  multi?: false;
  value: string | null;
  onChange: (value: string | null) => void;
};

type MultiProps = BaseProps & {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type DropdownProps = SingleProps | MultiProps;

/**
 * A custom-rendered select, not a native `<select>` — a bare `<select>`
 * keeps its OS-native popup menu and doesn't fully respect the shared
 * `controlClass` border/radius in every browser, so it visually clashes
 * with `TextInput`/`TextAreaInput` right next to it. Built the same way
 * `Menu` is: the native Popover API for the open panel (light-dismiss,
 * Esc-to-close, top-layer stacking all come free), styled to match every
 * other control when closed.
 */
export default function Dropdown(props: DropdownProps) {
  const theme = useTheme();
  const {
    options,
    label,
    description,
    warning,
    error,
    required,
    name,
    placeholder,
    isDisabled,
    hideLabel,
  } = props;
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Same reasoning as Menu: a `position: fixed` panel computed once on
    // open doesn't track scroll, so close rather than visually detach.
    const close = () => panelRef.current?.hidePopover();
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  function selectSingle(value: string) {
    if (!props.multi) props.onChange(value);
    panelRef.current?.hidePopover();
    triggerRef.current?.focus();
  }

  function toggleMulti(value: string) {
    if (!props.multi) return;
    const next = props.value.includes(value)
      ? props.value.filter((v) => v !== value)
      : [...props.value, value];
    props.onChange(next);
  }

  function moveFocus(direction: 1 | -1) {
    const panel = panelRef.current;
    if (!panel) return;
    const rows = Array.from(panel.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    if (rows.length === 0) return;
    const current = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = current === -1 ? 0 : (current + direction + rows.length) % rows.length;
    rows[next]?.focus();
  }

  let triggerText: string;
  let hasValue: boolean;
  if (props.multi) {
    const selectedLabels = options.filter((o) => props.value.includes(o.value)).map((o) => o.label);
    hasValue = selectedLabels.length > 0;
    triggerText = hasValue ? selectedLabels.join(", ") : (placeholder ?? "Select…");
  } else {
    const selectedLabel = options.find((o) => o.value === props.value)?.label;
    hasValue = props.value !== null;
    triggerText = selectedLabel ?? placeholder ?? "Select…";
  }

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
      hideLabel={hideLabel}
    >
      {({ id, describedBy, invalid }) => {
        const base = controlClass(theme, { invalid, warning: Boolean(warning) });

        return (
          <>
            <button
              ref={triggerRef}
              type="button"
              id={id}
              name={name}
              disabled={isDisabled}
              popoverTarget={popoverId}
              popoverTargetAction="toggle"
              role="combobox"
              aria-haspopup="listbox"
              aria-controls={popoverId}
              aria-expanded={open}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              // Two space-joined class names, not `base` interpolated inside
              // this `css` template -- `base` is already a generated class
              // name (controlClass's own `css` output), and embedding a
              // class name as literal text inside another `css` template is
              // invalid CSS that goober silently drops. See
              // TextAreaInput.tsx's own version of this comment for the
              // user-visible fallout (the browser's default styling instead
              // of the theme's) the same mistake caused there.
              className={`${base} ${css`
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                cursor: ${isDisabled ? "not-allowed" : "pointer"};
                text-align: left;
              `}`}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: hasValue ? theme.colors.text : theme.colors.textMuted,
                }}
              >
                {triggerText}
              </span>
              <Icon name="chevronDown" size={16} color={theme.colors.textMuted} label={undefined} />
            </button>

            <div
              ref={panelRef}
              id={popoverId}
              popover="auto"
              role="listbox"
              aria-multiselectable={props.multi || undefined}
              onBeforeToggle={(e) => {
                if (e.newState === "open") {
                  const rect = triggerRef.current?.getBoundingClientRect();
                  const panel = panelRef.current;
                  if (rect && panel) {
                    panel.style.top = `${rect.bottom + 4}px`;
                    panel.style.left = `${rect.left}px`;
                    panel.style.width = `${rect.width}px`;
                  }
                }
                setOpen(e.newState === "open");
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveFocus(1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveFocus(-1);
                }
              }}
              className={css`
                position: fixed;
                margin: 0;
                padding: 4px;
                max-height: 320px;
                overflow-y: auto;
                border: 1px solid ${theme.colors.border};
                border-radius: ${theme.radius.md};
                background-color: ${theme.colors.surface};
                box-shadow: ${theme.shadow.lg};
              `}
            >
              {options.map((opt) => {
                const selected = props.multi
                  ? props.value.includes(opt.value)
                  : props.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => (props.multi ? toggleMulti(opt.value) : selectSingle(opt.value))}
                    className={css`
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      width: 100%;
                      padding: 8px 10px;
                      border: none;
                      background: ${selected ? theme.colors.surfaceHover : "none"};
                      border-radius: ${theme.radius.sm};
                      color: inherit;
                      font-family: ${theme.fonts.body};
                      cursor: pointer;
                      text-align: left;

                      &:hover,
                      &:focus-visible {
                        background-color: ${theme.colors.surfaceHover};
                      }
                      &:focus-visible {
                        outline: 2px solid ${theme.colors.focusRing};
                        outline-offset: -2px;
                      }
                    `}
                  >
                    {props.multi && (
                      <span
                        aria-hidden
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
                          background: selected ? theme.colors.primary : "transparent",
                        }}
                      >
                        {selected && (
                          <Icon name="check" size={12} color={theme.colors.textOnAccent} />
                        )}
                      </span>
                    )}
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      <Text variant="body">{opt.label}</Text>
                    </span>
                    {!props.multi && selected && (
                      <Icon name="check" size={16} color={theme.colors.primary} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        );
      }}
    </FormInputLayout>
  );
}
