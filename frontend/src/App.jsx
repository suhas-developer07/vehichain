import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useWallet } from "./hooks/useWallet.js";
import useTheme from "./hooks/useTheme.js";
import config from "./contract/config.js";
import Icon from "./components/Icon.jsx";
import ConnectWalletButton from "./components/ConnectWalletButton.jsx";
import RoleBadge from "./components/RoleBadge.jsx";
import VehicleHistory from "./pages/VehicleHistory.jsx";
import RegisterVehicle from "./pages/RegisterVehicle.jsx";
import AddRecord from "./pages/AddRecord.jsx";
import TransferOwnership from "./pages/TransferOwnership.jsx";
import AdminRoles from "./pages/AdminRoles.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Passport from "./pages/Passport.jsx";
import DueDiligence from "./pages/DueDiligence.jsx";
import "./App.css";

const NAV_GROUPS = [
  {
    label: "Explore",
    items: [
      { to: "/", label: "Vehicle lookup", icon: "search", end: true },
      { to: "/dashboard", label: "Registry dashboard", icon: "activity" },
      { to: "/due-diligence", label: "Buyer check", icon: "shield" },
    ],
  },
  {
    label: "Operate",
    items: [
      { to: "/register", label: "Register vehicle", icon: "plus" },
      { to: "/add-record", label: "Add record", icon: "file" },
      { to: "/transfer", label: "Transfer ownership", icon: "transfer" },
    ],
  },
  {
    label: "Control",
    items: [{ to: "/admin", label: "Admin console", icon: "settings" }],
  },
];

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function crumbFor(pathname) {
  if (pathname.startsWith("/vehicle/")) return "Vehicle dossier";
  if (pathname.startsWith("/passport/")) return "Vehicle passport";
  if (pathname.startsWith("/due-diligence/")) return "Buyer report";
  if (pathname === "/due-diligence") return "Buyer check";
  const match = NAV_GROUPS.flatMap((group) => group.items).find(
    (item) => item.to === pathname
  );
  return match?.label || "Overview";
}

function ThemeSwitch({ theme, setTheme }) {
  return (
    <div className="theme-switch" role="group" aria-label="Colour theme">
      <button
        type="button"
        className={`theme-option ${theme === "dark" ? "is-active" : ""}`}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
      >
        <Icon name="moon" size={14} />
        <span>Dark</span>
      </button>
      <button
        type="button"
        className={`theme-option ${theme === "light" ? "is-active" : ""}`}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
      >
        <Icon name="sun" size={14} />
        <span>Light</span>
      </button>
    </div>
  );
}

function Shell({ wallet, theme, setTheme, toggleTheme, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickVin, setQuickVin] = useState("");

  const { account, roleName, connect, wrongNetwork } = wallet;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const handleQuickLookup = (event) => {
    event.preventDefault();
    const vin = quickVin.trim();
    if (!vin) return;
    navigate(`/vehicle/${encodeURIComponent(vin)}`);
    setQuickVin("");
    setDrawerOpen(false);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside
        className={`sidebar ${drawerOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="brand">
          <Link to="/" className="brand-link" aria-label="Vellum home">
            <span className="brand-mark">
              <Icon name="shieldCheck" size={22} />
            </span>
            <span className="brand-text">
              <strong>Vellum</strong>
              <span>Vehicle trust registry</span>
            </span>
          </Link>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="rail-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="nav-icon">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="nav-text">{item.label}</span>
                  <Icon
                    name="chevronRight"
                    size={13}
                    className="nav-arrow"
                  />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail-footer">
          <div className="network-card">
            <div className="network-card-head">
              <span className="status-dot" />
              <strong>Local network</strong>
              <span className="chain-tag">#{config.network.chainId}</span>
            </div>
            <span className="network-card-rpc">{config.network.rpcUrl}</span>
            <span
              className="network-card-contract"
              title={config.contractAddress}
            >
              <Icon name="certificate" size={12} />
              {shortAddress(config.contractAddress)}
            </span>
          </div>

          <div className="rail-theme">
            <span className="nav-label">Appearance</span>
            <ThemeSwitch theme={theme} setTheme={setTheme} />
          </div>

          <p className="rail-legal">Local development · chain #{config.network.chainId}</p>
        </div>
      </aside>

      <button
        type="button"
        className={`drawer-scrim ${drawerOpen ? "is-visible" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-label="Close navigation"
        tabIndex={drawerOpen ? 0 : -1}
      />

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={20} />
          </button>

          <nav className="crumb" aria-label="Breadcrumb">
            <span className="crumb-root">Workspace</span>
            <Icon name="chevronRight" size={12} className="crumb-sep" />
            <span className="crumb-current" aria-current="page">
              {crumbFor(location.pathname)}
            </span>
          </nav>

          <form className="quick-lookup" onSubmit={handleQuickLookup} role="search">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={quickVin}
              onChange={(event) => setQuickVin(event.target.value)}
              placeholder="Quick VIN lookup"
              aria-label="Quick VIN lookup"
            />
            <button type="submit" aria-label="Look up vehicle">
              <Icon name="arrowRight" size={15} />
            </button>
          </form>

          <div className="topbar-right">
            <span
              className="chain-pill"
              title={`Chain ${config.network.chainId} · ${config.network.rpcUrl}`}
            >
              <span className="status-dot" />
              <span className="chain-pill-label">Chain</span>
              <strong>{config.network.chainId}</strong>
            </span>

            <button
              type="button"
              className="icon-btn theme-icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>

            {account && <RoleBadge roleName={roleName} />}

            <ConnectWalletButton
              account={account}
              connect={connect}
              wrongNetwork={wrongNetwork}
              chainId={config.network.chainId}
            />
          </div>
        </header>

        <main className="page-shell" id="main-content">
          {children}
        </main>

        <footer className="app-footer no-print">
          <span>
            <Icon name="shieldCheck" size={13} />
            Vellum · tamper-evident vehicle provenance
          </span>
          <span className="footer-mono">
            Contract {shortAddress(config.contractAddress)} · chain #
            {config.network.chainId}
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const wallet = useWallet();
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <Shell
        wallet={wallet}
        theme={theme}
        setTheme={setTheme}
        toggleTheme={toggleTheme}
      >
        <Routes>
          <Route
            path="/"
            element={
              <VehicleHistory account={wallet.account} signer={wallet.signer} />
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/passport/:vin" element={<Passport />} />
          <Route path="/due-diligence" element={<DueDiligence />} />
          <Route path="/due-diligence/:vin" element={<DueDiligence />} />
          <Route
            path="/vehicle/:vin"
            element={
              <VehicleHistory account={wallet.account} signer={wallet.signer} />
            }
          />
          <Route
            path="/register"
            element={
              <RegisterVehicle
                contract={wallet.contract}
                account={wallet.account}
                signer={wallet.signer}
              />
            }
          />
          <Route
            path="/add-record"
            element={
              <AddRecord
                contract={wallet.contract}
                account={wallet.account}
                roleName={wallet.roleName}
              />
            }
          />
          <Route
            path="/transfer"
            element={
              <TransferOwnership
                contract={wallet.contract}
                account={wallet.account}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoles
                contract={wallet.contract}
                account={wallet.account}
                signer={wallet.signer}
              />
            }
          />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
