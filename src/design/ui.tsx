import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixToast from "@radix-ui/react-toast";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import * as RadixAvatar from "@radix-ui/react-avatar";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

/**
 * The GoSaath Admin component set.
 *
 * Radix primitives underneath for behaviour that is genuinely hard to get
 * right — focus traps, escape handling, roving tab indexes, live regions —
 * and GoSaath's own tokens on top, so the console looks like the product
 * rather than like the library.
 *
 * Every component here is shared. Nothing is styled inside a page.
 */

// --------------------------------------------------------------- button

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "soft" | "danger" | "ghost";
  size?: "md" | "sm" | "icon";
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, children, className = "", disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : size === "icon" ? "btn-icon" : ""} ${className}`}
      disabled={disabled || loading}
      // Announced rather than implied by a spinner nobody's screen reader
      // can see.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <CircleNotchIcon size={15} className="spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------- inputs

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }
>(function Input({ icon, className = "", ...rest }, ref) {
  const field = <input ref={ref} className={`input ${className}`} {...rest} />;
  if (!icon) return field;
  return (
    <span className="input-icon">
      {icon}
      {field}
    </span>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...rest }, ref) {
  return <textarea ref={ref} className={`input ${className}`} {...rest} />;
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {/* Error below the input, hint above it in importance. */}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------- badge

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** The badge state, named the same way the app names it. */
export function BadgeStatus({ status }: { status: string }) {
  if (status === "approved") return <Badge tone="success">Verified</Badge>;
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  if (status === "rejected") return <Badge tone="neutral">Rejected</Badge>;
  return <Badge tone="neutral">Not verified</Badge>;
}

// ---------------------------------------------------------------- avatar

export function Avatar({
  name,
  src,
  large,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <RadixAvatar.Root className={`avatar ${large ? "avatar-lg" : ""}`}>
      {src ? <RadixAvatar.Image src={src} alt="" /> : null}
      {/* Initials rather than a generic silhouette: a wall of identical grey
          heads tells an admin nothing about who is who. */}
      <RadixAvatar.Fallback delayMs={src ? 300 : 0}>{initials}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

// ----------------------------------------------------------------- card

export function Card({
  children,
  pad = true,
  className = "",
  ...rest
}: {
  children: ReactNode;
  pad?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${pad ? "card-pad" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className="between gap-4" style={{ marginBottom: "var(--space-3)" }}>
      <div>
        <h2 className="h2">{title}</h2>
        {caption ? (
          <p className="small t-2" style={{ marginTop: 2 }}>
            {caption}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ------------------------------------------------------- states

/** A skeleton shaped like what is coming, not a spinner in its place. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = "var(--radius-sm)",
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
}) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius }} />;
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="rows">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="row-item" key={index}>
            <Skeleton width={34} height={34} radius="var(--radius-full)" />
            <div className="grow stack gap-2">
              <Skeleton width={`${38 + ((index * 7) % 22)}%`} height={13} />
              <Skeleton width={`${24 + ((index * 11) % 18)}%`} height={11} />
            </div>
            <Skeleton width={68} height={22} radius="var(--radius-md)" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="card stack gap-2"
      style={{ alignItems: "center", padding: "var(--space-12) var(--space-6)" }}
    >
      {icon ? <div style={{ color: "var(--brand)" }}>{icon}</div> : null}
      <p className="h2">{title}</p>
      <p className="small t-2" style={{ maxWidth: 380, textAlign: "center" }}>
        {body}
      </p>
      {action ? <div style={{ marginTop: "var(--space-2)" }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  what = "this",
}: {
  error: Error;
  onRetry: () => void;
  what?: string;
}) {
  return (
    <div className="card stack gap-2" style={{ alignItems: "center", padding: "var(--space-10)" }}>
      <WarningCircleIcon size={22} color="var(--danger)" />
      <p className="h2">Something went wrong</p>
      <p className="small t-2" style={{ maxWidth: 400, textAlign: "center" }}>
        {/* The server's message when there is one, because "try again" is not
            an answer to "your session expired". */}
        {error.message || `We could not load ${what} right now.`}
      </p>
      <Button
        variant="secondary"
        onClick={onRetry}
        icon={<ArrowClockwiseIcon size={15} />}
        style={{ marginTop: "var(--space-2)" }}
      >
        Try again
      </Button>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div
      className="row gap-2"
      role="alert"
      style={{
        background: "var(--danger-bg)",
        color: "var(--danger)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        fontSize: 13,
      }}
    >
      <WarningCircleIcon size={16} weight="fill" />
      <span>{message}</span>
    </div>
  );
}

// --------------------------------------------------------------- dialog

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay" />
        <RadixDialog.Content className="dialog">
          <RadixDialog.Title className="h1" style={{ fontSize: 19, lineHeight: "26px" }}>
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description
              className="small t-2"
              style={{ marginTop: "var(--space-2)" }}
            >
              {description}
            </RadixDialog.Description>
          ) : null}
          {children ? (
            <div className="stack gap-4" style={{ marginTop: "var(--space-5)" }}>
              {children}
            </div>
          ) : null}
          <div
            className="row gap-2"
            style={{ justifyContent: "flex-end", marginTop: "var(--space-6)" }}
          >
            {footer}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;

// ---------------------------------------------------------------- toast

type Toast = { id: number; title: string; body?: string; tone: "success" | "danger" };
type ToastApi = { show: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

/** Confirmation that an action landed. An admin should never have to wonder. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    setToasts((current) => [...current, { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            className="toast"
            onOpenChange={(open) =>
              !open && setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          >
            {toast.tone === "success" ? (
              <CheckCircleIcon size={18} weight="fill" color="var(--success)" />
            ) : (
              <WarningCircleIcon size={18} weight="fill" color="var(--danger)" />
            )}
            <div className="grow">
              <RadixToast.Title className="h3">{toast.title}</RadixToast.Title>
              {toast.body ? (
                <RadixToast.Description className="small t-2">
                  {toast.body}
                </RadixToast.Description>
              ) : null}
            </div>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

// --------------------------------------------------------------- tooltip

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className="tooltip" sideOffset={6}>
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export const TooltipProvider = RadixTooltip.Provider;

// -------------------------------------------------------------- segments

export function Segments<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="segments" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segment"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && option.count > 0 ? (
            <span className="numeric t-3" style={{ marginLeft: 6 }}>
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
