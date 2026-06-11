import { useState } from "react";
import { css } from "goober";
import { Flexbox, Header, Text, TextInput, TextAreaInput, Button, useTheme } from "bluestar";
import { insertProduct, updateProduct } from "./api";
import type { PreferredProduct } from "./api";

type Props = {
  product: PreferredProduct | null;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function ProductModal({ product, onClose, onSave }: Props) {
  const theme = useTheme();
  const isEdit = product !== null;

  const [label, setLabel] = useState(product?.label ?? "");
  const [searchTermInput, setSearchTermInput] = useState("");
  const [searchTerms, setSearchTerms] = useState<string[]>(product?.search_terms ?? []);
  const [walmartProductId, setWalmartProductId] = useState(product?.walmart_product_id ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTerm = () => {
    const trimmed = searchTermInput.trim();
    if (trimmed && !searchTerms.includes(trimmed)) {
      setSearchTerms([...searchTerms, trimmed]);
      setSearchTermInput("");
    }
  };

  const handleTermKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTerm();
    }
  };

  const removeTerm = (term: string) => {
    setSearchTerms(searchTerms.filter((t) => t !== term));
  };

  const handleSave = async () => {
    if (!label.trim() || !walmartProductId.trim()) {
      setError("Label and Walmart Product ID are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const vars = {
        label: label.trim(),
        search_terms: searchTerms,
        walmart_product_id: walmartProductId.trim(),
        notes: notes.trim() || null,
      };
      if (isEdit) {
        await updateProduct({ id: product.id, ...vars });
      } else {
        await insertProduct(vars);
      }
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={css`
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      `}
      onClick={onClose}
    >
      <div
        className={css`
          background: ${theme.colors.background};
          border-radius: ${theme.radius};
          padding: 24px;
          width: 440px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: ${theme.shadow};
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <Flexbox direction="column" gap={16}>
          <Header variant="h2">{isEdit ? "Edit Product" : "Add Product"}</Header>

          <TextInput
            label="Label"
            value={label}
            onChange={setLabel}
            placeholder='e.g. "Heinz Ketchup 32oz"'
          />

          <div>
            <Text variant="label">Search Terms</Text>
            <div
              className={css`
                margin-top: 4px;
              `}
            >
              <Flexbox gap={8} flexWrap="wrap">
                {searchTerms.map((term) => (
                  <span
                    key={term}
                    className={css`
                      display: inline-flex;
                      align-items: center;
                      gap: 4px;
                      padding: 2px 8px;
                      border-radius: 12px;
                      background: ${theme.colors.primary}18;
                      color: ${theme.colors.primary};
                      font-size: ${theme.textTypes.caption.size};
                      font-family: ${theme.fonts.body};
                    `}
                  >
                    {term}
                    <button
                      type="button"
                      onClick={() => removeTerm(term)}
                      className={css`
                        background: none;
                        border: none;
                        color: ${theme.colors.primary};
                        cursor: pointer;
                        padding: 0 2px;
                        font-size: 14px;
                        line-height: 1;
                      `}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </Flexbox>
              <div
                className={css`
                  margin-top: 8px;
                `}
              >
                <input
                  type="text"
                  value={searchTermInput}
                  onChange={(e) => setSearchTermInput(e.target.value)}
                  onKeyDown={handleTermKeyDown}
                  onBlur={addTerm}
                  placeholder="Type and press Enter or comma to add"
                  className={css`
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid ${theme.colors.border};
                    border-radius: ${theme.radius};
                    background-color: ${theme.colors.background};
                    color: ${theme.colors.text};
                    font-family: ${theme.fonts.body};
                    font-size: ${theme.textTypes.subtitle.size};
                    outline: none;
                    box-sizing: border-box;
                    &::placeholder {
                      color: ${theme.colors.textMuted};
                    }
                    &:focus {
                      border-color: ${theme.colors.primary};
                      box-shadow: 0 0 0 2px ${theme.colors.primary}33;
                    }
                  `}
                />
              </div>
            </div>
          </div>

          <Flexbox gap={8} alignItems="flex-end">
            <Flexbox grow={1}>
              <TextInput
                label="Walmart Product ID"
                value={walmartProductId}
                onChange={setWalmartProductId}
                placeholder="e.g. 123456789"
              />
            </Flexbox>
            {walmartProductId.trim() && (
              <a
                href={`https://www.walmart.com/ip/${walmartProductId.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className={css`
                  color: ${theme.colors.primary};
                  font-size: 18px;
                  text-decoration: none;
                  padding-bottom: 6px;
                  &:hover {
                    text-decoration: underline;
                  }
                `}
              >
                &#8599;
              </a>
            )}
          </Flexbox>

          <TextAreaInput
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Optional notes"
            rows={3}
          />

          {error && <Text color={theme.colors.error}>{error}</Text>}

          <Flexbox justifyContent="flex-end" gap={8}>
            <Button label="Cancel" type="secondary" onClick={onClose} isDisabled={saving} />
            <Button
              label={saving ? "Saving..." : isEdit ? "Update" : "Add"}
              type="creation"
              onClick={handleSave}
              isDisabled={saving}
            />
          </Flexbox>
        </Flexbox>
      </div>
    </div>
  );
}
