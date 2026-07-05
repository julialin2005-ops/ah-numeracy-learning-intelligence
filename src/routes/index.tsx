import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    throw redirect({ to: "/students" });
  },
  component: RoleMissing,
});

function RoleMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">Unable to load user permissions.</h1>
        <p className="text-sm text-muted-foreground mt-2">
          We couldn't determine your role from your profile. Please contact an administrator.
        </p>
      </div>
    </div>
  );
}
