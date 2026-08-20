const ROLE_COLORS = {
  NONE: "#6c757d",
  OWNER: "#28a745",
  SERVICE_CENTER: "#007bff",
  INSURANCE: "#fd7e14",
  GOVERNMENT: "#6f42c1",
  BUYER: "#17a2b8",
};

export default function RoleBadge({ roleName }) {
  const color = ROLE_COLORS[roleName] || "#6c757d";

  return (
    <span
      className="role-badge"
      style={{ backgroundColor: color, color: "#fff" }}
    >
      {roleName}
    </span>
  );
}
