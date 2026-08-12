import type { Meta, StoryObj } from "@storybook/react";
import Table from "./Table";
import Badge from "../Badge/Badge";
import Button from "../../buttons/Button/Button";
import EmptyState from "../../feedback/EmptyState/EmptyState";

const meta = {
  title: "Display/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Generic over the row type, so `cell` receives a fully-typed row rather than `any` — usually a PocketBase record.",
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof Table>;

type Recipe = {
  id: string;
  title: string;
  servings: number;
  status: "draft" | "published";
};

const rows: Recipe[] = [
  { id: "a1", title: "Weeknight ragu", servings: 4, status: "published" },
  { id: "b2", title: "Miso aubergine", servings: 2, status: "published" },
  { id: "c3", title: "Sourdough attempt #7", servings: 1, status: "draft" },
];

const columns = [
  { header: "Title", cell: (r: Recipe) => r.title },
  { header: "Serves", cell: (r: Recipe) => r.servings, width: "90px", align: "right" as const },
  {
    header: "Status",
    cell: (r: Recipe) => (
      <Badge variant={r.status === "published" ? "success" : "neutral"}>{r.status}</Badge>
    ),
    width: "120px",
  },
];

export const Default: Story = {
  render: () => <Table rows={rows} columns={columns} rowKey={(r) => r.id} />,
};

export const Clickable: Story = {
  render: () => (
    <Table
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      onRowClick={(r) => alert(`Open ${r.title}`)}
      caption="Rows highlight on hover when onRowClick is set."
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <Table
      rows={[] as Recipe[]}
      columns={columns}
      empty={
        <EmptyState
          icon="🍲"
          title="No recipes yet"
          description="Add your first recipe and it'll show up here."
          action={<Button label="Add recipe" onClick={() => {}} />}
        />
      }
    />
  ),
};
