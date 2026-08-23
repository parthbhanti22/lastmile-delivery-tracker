const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",     className: "badge badge-pending" },
  assigned:    { label: "Assigned",    className: "badge badge-assigned" },
  picked_up:   { label: "Picked Up",  className: "badge badge-picked_up" },
  in_transit:  { label: "In Transit",  className: "badge badge-in_transit" },
  delivered:   { label: "Delivered",   className: "badge badge-delivered" },
  failed:      { label: "Failed",      className: "badge badge-failed" },
  rescheduled: { label: "Rescheduled", className: "badge badge-rescheduled" },
  cancelled:   { label: "Cancelled",   className: "badge badge-cancelled" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: "badge" };
  return <span className={cfg.className}>{cfg.label}</span>;
}
