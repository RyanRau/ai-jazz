import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";
import Text from "../../text/Text/Text";

export type EmptyStateProps = {
  /** Headline — say what's missing, not "No data". */
  title: string;
  /** Optional sentence explaining how to fill it. */
  description?: string;
  /** Glyph or illustration shown above the title. */
  icon?: ReactNode;
  /** Primary call to action, usually a Button. */
  action?: ReactNode;
};

/** What a list renders before it has anything to show. */
export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Flexbox
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap={12}
      style={{ textAlign: "center", padding: "48px 24px" }}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={css`
            font-size: 32px;
            line-height: 1;
            color: ${theme.colors.textMuted};
          `}
        >
          {icon}
        </div>
      )}
      <Header variant="h3">{title}</Header>
      {description && <Text variant="body">{description}</Text>}
      {action}
    </Flexbox>
  );
}
