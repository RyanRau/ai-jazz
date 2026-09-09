import { useEffect, useState } from "react";
import { Card, Checkbox, Flexbox, Header, Spinner, Table, Text, useToast } from "bluestar";
import { pb } from "./pb";

type AdminUser = { id: string; email: string; name: string };
type AdminApp = { id: string; slug: string; name: string };
type AdminGrant = { user: string; app: string };
type AccessData = { users: AdminUser[]; apps: AdminApp[]; grants: AdminGrant[] };

function grantKey(userId: string, appId: string) {
  return `${userId}:${appId}`;
}

export function AdminPage() {
  const toast = useToast();
  const [data, setData] = useState<AccessData | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    pb.send<AccessData>("/api/custom/admin/access", { method: "GET" }).then((res) => {
      setData(res);
      setGranted(new Set(res.grants.map((g) => grantKey(g.user, g.app))));
    });
  }, []);

  async function toggle(userId: string, appId: string, next: boolean) {
    const key = grantKey(userId, appId);
    setPending((prev) => new Set(prev).add(key));
    setGranted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    try {
      await pb.send("/api/custom/admin/access", {
        method: "POST",
        body: { user: userId, app: appId, granted: next },
      });
    } catch {
      // Revert on failure — the checkbox already flipped optimistically above.
      setGranted((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(key);
        else copy.add(key);
        return copy;
      });
      toast.error("Couldn't update access. Try again.");
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  }

  if (!data) return <Spinner />;

  return (
    <Card padding={24}>
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Access</Header>
        <Table
          rows={data.users}
          rowKey={(u) => u.id}
          caption="Which users can access which apps"
          columns={[
            {
              header: "User",
              cell: (u) => (
                <Flexbox direction="column" gap={4}>
                  <Text variant="subtitle">{u.name || u.email}</Text>
                  {u.name && <Text variant="caption">{u.email}</Text>}
                </Flexbox>
              ),
            },
            ...data.apps.map((app) => ({
              header: app.name,
              align: "center" as const,
              cell: (u: AdminUser) => {
                const key = grantKey(u.id, app.id);
                return (
                  <Checkbox
                    label={`${app.name} access for ${u.name || u.email}`}
                    hideLabel
                    value={granted.has(key)}
                    isDisabled={pending.has(key)}
                    onChange={(value) => toggle(u.id, app.id, value)}
                  />
                );
              },
            })),
          ]}
        />
      </Flexbox>
    </Card>
  );
}
