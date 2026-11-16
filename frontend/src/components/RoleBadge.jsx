const ROLE_LABELS = {
  NONE: "No role",
  OWNER: "Owner",
  SERVICE_CENTER: "Service",
  INSURANCE: "Insurance",
  GOVERNMENT: "Government",
  BUYER: "Buyer",
};

export default function RoleBadge({ roleName = "NONE" }) {
  const key = (roleName || "NONE").toLowerCase().replace(/_/g, "-");
  const label = ROLE_LABELS[roleName] || roleName;

  return (
    <span
      className={`role-badge role-${key}`}
      title={`Connected role: ${label}`}
    >
      <span className="role-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
