import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";

export type TableColumn<Row> = {
  /** Column heading. */
  header: string;
  /** Cell contents for a row. Return a string, or any node for richer cells. */
  cell: (row: Row) => ReactNode;
  /** CSS width for the column, e.g. `"120px"` or `"20%"`. */
  width?: string;
  align?: "left" | "right" | "center";
};

export type TableProps<Row> = {
  rows: Row[];
  columns: TableColumn<Row>[];
  /** Stable key per row. Defaults to the array index, which is fine for static lists. */
  rowKey?: (row: Row, index: number) => string | number;
  /** Rendered in place of the body when `rows` is empty — usually an EmptyState. */
  empty?: ReactNode;
  onRowClick?: (row: Row) => void;
  /** Accessible name for the table. */
  caption?: string;
};

/**
 * A plain data table, typed against the row shape.
 *
 * Generic on `Row` so `cell` receives a fully-typed row rather than `any` —
 * the common case is a PocketBase record type.
 */
export default function Table<Row>({
  rows,
  columns,
  rowKey,
  empty,
  onRowClick,
  caption,
}: TableProps<Row>) {
  const theme = useTheme();

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  const cellPadding = "10px 12px";

  return (
    <div
      className={css`
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius.md};
      `}
    >
      <table
        className={css`
          width: 100%;
          border-collapse: collapse;
          font-family: ${theme.fonts.body};
          font-size: ${theme.textTypes.subtitle.size};
          color: ${theme.colors.text};
        `}
      >
        {caption && (
          <caption
            className={css`
              text-align: left;
              padding: ${cellPadding};
              color: ${theme.colors.textMuted};
              font-size: ${theme.textTypes.caption.size};
            `}
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th
                key={i}
                scope="col"
                style={{ width: column.width, textAlign: column.align ?? "left" }}
                className={css`
                  padding: ${cellPadding};
                  background-color: ${theme.colors.surface};
                  border-bottom: 1px solid ${theme.colors.border};
                  font-weight: 600;
                  white-space: nowrap;
                `}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row, rowIndex) : rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={css`
                cursor: ${onRowClick ? "pointer" : "default"};
                &:not(:last-child) > td {
                  border-bottom: 1px solid ${theme.colors.border};
                }
                &:hover > td {
                  background-color: ${onRowClick ? theme.colors.surfaceHover : "transparent"};
                }
              `}
            >
              {columns.map((column, i) => (
                <td
                  key={i}
                  style={{ textAlign: column.align ?? "left" }}
                  className={css`
                    padding: ${cellPadding};
                  `}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && !empty && (
        <div
          className={css`
            padding: 24px;
            text-align: center;
          `}
        >
          <Text variant="caption">No rows</Text>
        </div>
      )}
    </div>
  );
}
