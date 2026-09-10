import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Pagination from "./Pagination";
import Text from "../../text/Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Navigation/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Prev/next plus a truncated run of page numbers — pairs with Table for paged data.",
      },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof Pagination>;

function Demo() {
  const [page, setPage] = useState(5);
  return (
    <Flexbox direction="column" gap={16}>
      <Pagination page={page} pageCount={12} onPageChange={setPage} />
      <Text variant="subtitle">Page {page} of 12</Text>
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};

export const FewPages: Story = {
  render: () => {
    function FewDemo() {
      const [page, setPage] = useState(1);
      return <Pagination page={page} pageCount={3} onPageChange={setPage} />;
    }
    return <FewDemo />;
  },
};
