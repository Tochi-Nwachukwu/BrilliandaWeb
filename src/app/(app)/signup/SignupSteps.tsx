import { cx } from "@brillianda/ui/cx";

const LABELS = ["Your school", "Your account", "Check your email", "Your address"];

/** "Step 2 of 4" with four bars, the done ones filled. */
export function SignupSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mb-6">
      <p className="text-[13px] font-medium text-text-secondary">
        Step {current} of 4 <span className="sr-only">: {LABELS[current - 1]}</span>
      </p>
      <ol aria-hidden className="mt-2 grid grid-cols-4 gap-1.5">
        {LABELS.map((label, i) => (
          <li key={label} className={cx("h-1.5 rounded-full transition-colors", i < current ? "bg-accent" : "bg-sunken")} />
        ))}
      </ol>
    </div>
  );
}
