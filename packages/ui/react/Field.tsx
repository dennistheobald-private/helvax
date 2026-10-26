import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
}

/** Label + input + help or error text, wired with ids for screen readers. */
export function Field({ label, help, error, id, className, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const noteId = `${inputId}-note`;
  return (
    <div className="hx-field">
      <label className="hx-label" htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className={cx("hx-input", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || help ? noteId : undefined}
        {...rest}
      />
      {error ? (
        <span className="hx-error" id={noteId}><Icon name="warn" size="sm" />{error}</span>
      ) : help ? (
        <span className="hx-help" id={noteId}>{help}</span>
      ) : null}
    </div>
  );
}
