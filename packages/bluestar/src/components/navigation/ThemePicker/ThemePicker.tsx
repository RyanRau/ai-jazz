import { useState } from "react";
import { css } from "goober";
import { useTheme, useColorScheme, useCustomAccent } from "../../../theme";
import type { Theme } from "../../../theme";
import Modal from "../../overlay/Modal/Modal";
import Button from "../../buttons/Button/Button";
import SegmentedControl from "../../buttons/SegmentedControl/SegmentedControl";
import Icon from "../../display/Icon/Icon";
import Text from "../../text/Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";

type AccentMode = "preset" | "custom";

// Matches defaultTheme.colors.primary (theme.ts) — a literal hex, since the
// native color input's own value can't be a var(--bs-…) reference.
const DEFAULT_ACCENT = "#7da7d9";

const PRESET_ACCENTS = [
  { label: "Teal", value: "#4fa88f" },
  { label: "Violet", value: "#8b7fd1" },
  { label: "Rose", value: "#c97a86" },
  { label: "Slate", value: "#64748b" },
];

function swatchClass(theme: Theme, background: string, selected: boolean) {
  return css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: ${theme.radius.full};
    background-color: ${background};
    border: 2px solid ${selected ? theme.colors.text : "transparent"};
    cursor: pointer;
  `;
}

/**
 * A palette-icon button that opens a modal for the full theme: Auto/Light/
 * Dark appearance, plus a custom accent color — five presets or any color
 * via the native picker. Both apply live through `useColorScheme`/
 * `useCustomAccent` — there's no separate save step. The accent is a
 * viewer preference rather than an app default, so `ThemeProvider`
 * persists it to sessionStorage rather than `colorScheme`'s longer-lived
 * localStorage.
 */
export default function ThemePicker() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { scheme, setScheme } = useColorScheme();
  const { customAccent, setCustomAccent } = useCustomAccent();

  const isPreset = customAccent !== null && PRESET_ACCENTS.some((p) => p.value === customAccent);
  const isCustomColor = customAccent !== null && !isPreset;
  const [mode, setMode] = useState<AccentMode>(isCustomColor ? "custom" : "preset");

  return (
    <>
      <Button
        label="Theme"
        aria-label="Customize theme"
        appearance="text"
        variant="secondary"
        density="dense"
        onClick={() => setOpen(true)}
      >
        <Icon name="palette" size={16} />
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Theme" width={360}>
        <Flexbox direction="column" gap={20}>
          <Flexbox direction="column" gap={8}>
            <Text variant="label">Appearance</Text>
            <SegmentedControl
              options={[
                { label: "Auto", value: "auto" },
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
              ]}
              value={scheme}
              onChange={setScheme}
            />
          </Flexbox>

          <Flexbox direction="column" gap={8}>
            <Text variant="label">Accent color</Text>
            <SegmentedControl
              options={[
                { label: "Presets", value: "preset" },
                { label: "Custom", value: "custom" },
              ]}
              value={mode}
              onChange={setMode}
            />

            {mode === "preset" ? (
              <Flexbox direction="row" gap={8} flexWrap="wrap" alignItems="center">
                <button
                  type="button"
                  aria-label="Default accent"
                  aria-pressed={customAccent === null}
                  onClick={() => setCustomAccent(null)}
                  className={swatchClass(theme, theme.colors.primary, customAccent === null)}
                >
                  {customAccent === null && <Icon name="check" size={14} color="#fff" />}
                </button>

                {PRESET_ACCENTS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    aria-label={preset.label}
                    aria-pressed={customAccent === preset.value}
                    onClick={() => setCustomAccent(preset.value)}
                    className={swatchClass(theme, preset.value, customAccent === preset.value)}
                  >
                    {customAccent === preset.value && <Icon name="check" size={14} color="#fff" />}
                  </button>
                ))}
              </Flexbox>
            ) : (
              <Flexbox direction="row" gap={12} alignItems="center">
                <label
                  className={css`
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: ${theme.radius.full};
                    background-color: ${isCustomColor ? customAccent : DEFAULT_ACCENT};
                    border: 2px solid ${theme.colors.text};
                    cursor: pointer;
                    overflow: hidden;
                    flex-shrink: 0;
                  `}
                >
                  <input
                    type="color"
                    aria-label="Custom accent color"
                    value={customAccent ?? DEFAULT_ACCENT}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className={css`
                      position: absolute;
                      inset: 0;
                      width: 100%;
                      height: 100%;
                      opacity: 0;
                      cursor: pointer;
                    `}
                  />
                </label>
                <Text variant="caption">Pick any color — it's remembered for this tab.</Text>
              </Flexbox>
            )}
          </Flexbox>
        </Flexbox>
      </Modal>
    </>
  );
}
