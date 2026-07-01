import { IconKey } from "@/lib/types";

type IconProps = { size?: number; className?: string };

function Base({
  children,
  size = 18,
  className,
}: { children: React.ReactNode } & IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 0 0 7.07 7.07L13.5 18.5" />
    </Base>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20s-7-4.35-9.5-8.5C.7 8 2.4 4.5 6 4.5c2 0 3.5 1.2 4 2.3.5-1.1 2-2.3 4-2.3 3.6 0 5.3 3.5 3.5 7C19 15.65 12 20 12 20z" />
    </Base>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20l1.4-6.3-4.8-4.3 6.4-.6L12 3z" />
    </Base>
  );
}

export function UserPlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M18 9v4M16 11h4" />
    </Base>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 13h18" />
      <path d="M12 9v11" />
      <path d="M12 9c-1.4-3-5-3-5-.7C7 9.5 9.2 9 12 9zM12 9c1.4-3 5-3 5-.7 0 1.2-2.2 1.7-5 1.7z" />
    </Base>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4 3V6l-4 3H4a1 1 0 0 0-1 1z" />
      <path d="M14 8a4 4 0 0 1 0 8" />
      <path d="M17 5a8 8 0 0 1 0 14" />
    </Base>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Base>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4L21 21l-4.3-1.1a8.5 8.5 0 1 1 4.3-8.4z" />
    </Base>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Base>
  );
}

// The following are structural UI icons (stack layout state, video player
// controls) rather than admin-selectable per-step icons, so they're exported
// directly instead of being added to ICONS/IconKey.

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12.5l5 5L20 6" />
    </Base>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Base>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

type IconComponent = (props: IconProps) => React.JSX.Element;

export const ICONS: Record<Exclude<IconKey, "none">, IconComponent> = {
  link: LinkIcon,
  play: PlayIcon,
  heart: HeartIcon,
  star: StarIcon,
  userPlus: UserPlusIcon,
  gift: GiftIcon,
  megaphone: MegaphoneIcon,
  clock: ClockIcon,
  info: InfoIcon,
  message: MessageIcon,
  shield: ShieldIcon,
};

export const ICON_LABELS: Record<Exclude<IconKey, "none">, string> = {
  link: "Link",
  play: "Play / video",
  heart: "Heart / like",
  star: "Star / favorite",
  userPlus: "Follow / join",
  gift: "Gift / tip",
  megaphone: "Megaphone / sponsor",
  clock: "Clock",
  info: "Info",
  message: "Message / chat",
  shield: "Shield / verify",
};

export function Icon({ name, ...props }: { name?: IconKey } & IconProps) {
  if (!name || name === "none") return null;
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component {...props} />;
}
