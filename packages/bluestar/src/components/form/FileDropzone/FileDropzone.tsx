import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";
import Button from "../../buttons/Button/Button";

export type FileDropzoneValue = { name: string; dataUrl: string };

export type FileDropzoneProps = FormFieldProps & {
  value: FileDropzoneValue | null;
  onChange: (value: FileDropzoneValue | null) => void;
  /** Native `accept` attribute, e.g. `"image/*"`. */
  accept?: string;
  /** Prompt shown in the empty state. Defaults to "Drag a file here, or click to browse". */
  prompt?: string;
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * A drag-and-drop file picker with a click-to-browse fallback (a real
 * `<label>` wrapping a hidden native input, so both interactions come free
 * -- no manual keyboard handling to get right). Reads the file to a data
 * URL itself, since every consumer needs that anyway; hands back
 * `{ name, dataUrl }` rather than a raw `File` so the caller never touches
 * `FileReader`.
 */
export default function FileDropzone({
  value,
  onChange,
  accept,
  prompt = "Drag a file here, or click to browse",
  label,
  description,
  warning,
  error,
  required,
  name,
  isDisabled,
}: FileDropzoneProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    onChange({ name: file.name, dataUrl });
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    if (isDisabled) return;
    void handleFile(e.dataTransfer.files?.[0]);
  }

  function removeFile() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ id, describedBy, invalid }) => {
        const borderColor = invalid
          ? theme.colors.error
          : dragActive
            ? theme.colors.primary
            : theme.colors.border;

        if (value) {
          const isImage = value.dataUrl.startsWith("data:image/");
          return (
            <div
              className={css`
                display: flex;
                align-items: center;
                gap: 12px;
                border: 1px solid ${theme.colors.border};
                border-radius: ${theme.radius.md};
                padding: 10px 12px;
              `}
            >
              {isImage ? (
                <img
                  src={value.dataUrl}
                  alt={value.name}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Icon name="upload" size={20} color={theme.colors.textMuted} />
              )}
              <span style={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                <Text variant="caption">{value.name}</Text>
              </span>
              <Button
                label="Remove"
                variant="secondary"
                density="dense"
                onClick={removeFile}
                isDisabled={isDisabled}
              />
            </div>
          );
        }

        return (
          <label
            htmlFor={id}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDisabled) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 6px;
              min-height: 96px;
              padding: 16px;
              border: 1.5px dashed ${borderColor};
              border-radius: ${theme.radius.md};
              background: ${dragActive ? theme.colors.surface : "transparent"};
              cursor: ${isDisabled ? "not-allowed" : "pointer"};
              opacity: ${isDisabled ? 0.5 : 1};
              text-align: center;
              transition:
                border-color 0.15s ease,
                background-color 0.15s ease;

              &:focus-within {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            <Icon name="upload" size={20} color={theme.colors.textMuted} />
            <Text variant="caption">{prompt}</Text>
            <input
              ref={inputRef}
              id={id}
              name={name}
              type="file"
              accept={accept}
              disabled={isDisabled}
              onChange={(e) => void handleFile(e.target.files?.[0])}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />
          </label>
        );
      }}
    </FormInputLayout>
  );
}
