import { forwardRef, useState, type ComponentProps } from "react";
import { TextField } from "./TextField";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/**
 * A password field with a show/hide button. People mistype on phone keyboards; the alternative is
 * a failed sign-in they can't explain. The button says "Show"/"Hide" in words, never an unlabelled eye.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(props, ref) {
  const [shown, setShown] = useState(false);

  return (
    <TextField
      ref={ref}
      {...props}
      type={shown ? "text" : "password"}
      // A shown password must not be "helped" by the keyboard or the spell checker.
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="min-h-[40px] rounded-md px-2.5 text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {shown ? "Hide" : "Show"}
        </button>
      }
    />
  );
});
