import { useEffect, useState } from "react";
import {
  AppIcon,
  AppShell,
  AsyncButton,
  Button,
  Card,
  Dropdown,
  EmptyState,
  Flexbox,
  Form,
  Modal,
  NumberInput,
  SideNav,
  SubmitButton,
  Table,
  Text,
  TextInput,
  useForm,
} from "bluestar";
import { useAuthRecord } from "./useAuth";
import { LoginForm } from "./LoginForm";
import { AccountMenu } from "./AccountMenu";
import { AppSwitcher } from "./AppSwitcher";
import { pb } from "./pb";

type StashItem = {
  id: string;
  owner: string;
  name: string;
  description: string;
  quantity: number;
  location: string;
  shared_with: string[];
};

type ShareableUser = { id: string; email: string };

type AddItemValues = { name: string; quantity: number | null; location: string };

function App() {
  const record = useAuthRecord();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [items, setItems] = useState<StashItem[]>([]);
  const [shareableUsers, setShareableUsers] = useState<ShareableUser[]>([]);
  const [sharingItem, setSharingItem] = useState<StashItem | null>(null);

  useEffect(() => {
    if (!record) return;
    // Distinct requestKey: AppSwitcher fetches from this same endpoint
    // concurrently on this same page, and the PocketBase SDK auto-cancels
    // requests that share a key (by default, method+URL).
    pb.collection("registry_grants")
      .getFullList({ expand: "app", requestKey: "stash-access" })
      .then((grants) =>
        setGranted(
          record.is_admin === true ||
            grants.some((g) => (g.expand?.app as { slug?: string } | undefined)?.slug === "stash")
        )
      );
  }, [record]);

  const refresh = () =>
    pb.collection("stash_items").getFullList<StashItem>({ sort: "-created" }).then(setItems);

  useEffect(() => {
    if (granted) {
      refresh();
      pb.send<{ users: ShareableUser[] }>("/api/custom/stash/shareable-users", {
        method: "GET",
      }).then((res) => setShareableUsers(res.users));
    }
  }, [granted]);

  const form = useForm<AddItemValues>({
    initialValues: { name: "", quantity: 1, location: "" },
    validate: (v) => ({ name: v.name ? undefined : "Required" }),
    onSubmit: async (v) => {
      await pb.collection("stash_items").create({
        owner: record!.id,
        name: v.name,
        quantity: v.quantity ?? 0,
        location: v.location,
      });
      form.reset();
      await refresh();
    },
  });

  if (!record) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <LoginForm />
      </Flexbox>
    );
  }

  if (granted === false) {
    return (
      <Flexbox direction="column" alignItems="center" style={{ padding: 32 }}>
        <EmptyState title="No access" description="Ask the admin to grant you the Stash app." />
      </Flexbox>
    );
  }

  if (granted === null) return null;

  return (
    <AppShell
      sideNav={
        <SideNav
          top={<AppSwitcher appName="Stash" icon={<AppIcon slug="stash" size={20} />} />}
          collapsedTop={<AppIcon slug="stash" size={20} />}
          footer={<AccountMenu />}
        />
      }
    >
      <Flexbox direction="column" gap={24}>
        <Card padding={20}>
          <Form form={form}>
            <TextInput {...form.field("name")} label="Item name" required />
            <NumberInput {...form.field("quantity")} label="Quantity" min={0} />
            <TextInput {...form.field("location")} label="Location" />
            <SubmitButton label="Add item" />
          </Form>
        </Card>

        <Table
          rows={items}
          rowKey={(r) => r.id}
          columns={[
            { header: "Name", cell: (r) => r.name },
            { header: "Quantity", cell: (r) => r.quantity, align: "right" },
            { header: "Location", cell: (r) => r.location },
            {
              header: "",
              cell: (r) =>
                r.owner === record.id && (
                  <Flexbox direction="row" gap={8}>
                    <Button
                      label="Share"
                      variant="secondary"
                      density="dense"
                      onClick={() => setSharingItem(r)}
                    />
                    <AsyncButton
                      label="Delete"
                      variant="destructive"
                      density="dense"
                      onClick={async () => {
                        await pb.collection("stash_items").delete(r.id);
                        await refresh();
                      }}
                    />
                  </Flexbox>
                ),
            },
          ]}
          empty={<EmptyState title="Nothing in the stash yet" />}
        />
      </Flexbox>

      <Modal
        isOpen={sharingItem !== null}
        onClose={() => setSharingItem(null)}
        title={`Share "${sharingItem?.name ?? ""}"`}
      >
        {sharingItem && (
          <ShareForm
            item={sharingItem}
            shareableUsers={shareableUsers}
            onDone={async () => {
              setSharingItem(null);
              await refresh();
            }}
          />
        )}
      </Modal>
    </AppShell>
  );
}

function ShareForm({
  item,
  shareableUsers,
  onDone,
}: {
  item: StashItem;
  shareableUsers: ShareableUser[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(item.shared_with);

  return (
    <Flexbox direction="column" gap={16}>
      {shareableUsers.length === 0 ? (
        <Text variant="body">
          No one else has access to Stash yet — ask the admin to grant someone first.
        </Text>
      ) : (
        <Dropdown
          multi
          label="Shared with"
          value={selected}
          onChange={setSelected}
          options={shareableUsers.map((u) => ({ label: u.email, value: u.id }))}
        />
      )}
      <AsyncButton
        label="Save"
        onClick={async () => {
          await pb.collection("stash_items").update(item.id, { shared_with: selected });
          onDone();
        }}
      />
    </Flexbox>
  );
}

export default App;
