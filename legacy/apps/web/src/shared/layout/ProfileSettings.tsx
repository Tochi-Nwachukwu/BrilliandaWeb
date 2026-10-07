import { useAuthStore } from "../auth/authStore";
import { Card } from "../components/Cards";
import { PageHeader } from "../components/PageHeader";
import { useLook } from "../theme/useLook";
import { cx } from "../utils/cx";

/** Who is signed in, and the look. Email preferences come with the notifications endpoint. */
export function ProfileSettings({ roleLabel }: { roleLabel: string }) {
  const user = useAuthStore((state) => state.user);
  const { look, setLook } = useLook();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-2xl gap-4">
        <Card title="Your profile" description={roleLabel}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
            <dt className="text-text-secondary">Name</dt>
            <dd className="m-0 font-medium">{user?.fullName}</dd>
            <dt className="text-text-secondary">Email</dt>
            <dd className="m-0 break-all font-medium">{user?.email ?? "Signed in with an access code"}</dd>
          </dl>
        </Card>
        <Card title="Look" description="How Brillanda looks on this device.">
          <div role="group" aria-label="Look" className="inline-grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
            {(["pastel", "neutral"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={look === value}
                onClick={() => setLook(value)}
                className={cx(
                  "h-9 rounded-full px-5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  look === value ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
