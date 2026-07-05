import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotifications, markNotificationRead } from "@/lib/data.functions";
import { Card, EmptyState, MascotImage } from "@/components/Primitives";
import { StatusBadge } from "@/components/StatusBadge";
import { isDemo, demoGetNotifications } from "@/lib/demo";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — AH" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const fetchNotifs = useServerFn(getNotifications);
  const { data } = useQuery({
    queryKey: ["notifications", isDemo()],
    queryFn: () => (isDemo() ? demoGetNotifications() : fetchNotifs({ data: undefined })),
  });
  const notifs: any[] = data?.notifications || [];

  const markRead = useServerFn(markNotificationRead);
  const mut = useMutation({
    mutationFn: (id: string) => (isDemo() ? Promise.resolve({ success: true }) : markRead({ data: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-2.5">
      <Card title="Notifications" subtitle="Updates from sessions, recall checks, and milestones.">
        {notifs.length === 0 && (
          <EmptyState
            title="No notifications yet"
            description="Updates from sessions, recall checks, and milestones will appear here."
          />
        )}
        {notifs.map((n: any) => {
          const isTip = (n.type || "").toLowerCase().includes("tip");
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 py-2"
              style={{ borderBottom: "0.5px solid var(--border)" }}
            >
              {isTip && <MascotImage size={28} className="mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {!n.read && <StatusBadge tone="blue">New</StatusBadge>}
                  {isTip && <StatusBadge tone="teal">Tip</StatusBadge>}
                  <span className="text-[11px] text-muted-foreground">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                  </span>
                </div>
                <div className="text-sm font-medium">{n.title || n.type || "Update"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.message || n.body || ""}</div>
              </div>
              {!n.read && (
                <button
                  onClick={() => mut.mutate(n.id)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Mark read
                </button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
