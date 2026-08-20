import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useWallet } from "./hooks/useWallet.js";
import ConnectWalletButton from "./components/ConnectWalletButton.jsx";
import RoleBadge from "./components/RoleBadge.jsx";
import VehicleHistory from "./pages/VehicleHistory.jsx";
import RegisterVehicle from "./pages/RegisterVehicle.jsx";
import AddRecord from "./pages/AddRecord.jsx";
import TransferOwnership from "./pages/TransferOwnership.jsx";
import AdminRoles from "./pages/AdminRoles.jsx";
import "./App.css";

function Navbar({ account, roleName, connect, wrongNetwork }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">🚗 Vehicle Registry</Link>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive("/") ? "active" : ""}>
          History
        </Link>
        <Link to="/register" className={isActive("/register") ? "active" : ""}>
          Register
        </Link>
        <Link to="/add-record" className={isActive("/add-record") ? "active" : ""}>
          Add Record
        </Link>
        <Link
          to="/transfer"
          className={isActive("/transfer") ? "active" : ""}
        >
          Transfer
        </Link>
        <Link
          to="/admin"
          className={isActive("/admin") ? "active" : ""}
        >
          Admin
        </Link>
      </div>
      <div className="nav-right">
        {account && <RoleBadge roleName={roleName} />}
        <ConnectWalletButton
          account={account}
          connect={connect}
          wrongNetwork={wrongNetwork}
        />
      </div>
    </nav>
  );
}

export default function App() {
  const wallet = useWallet();

  return (
    <BrowserRouter>
      <div className="app">
        <Navbar {...wallet} />
        <main className="container">
          <Routes>
            <Route path="/" element={<VehicleHistory />} />
            <Route
              path="/vehicle/:vin"
              element={<VehicleHistory />}
            />
            <Route
              path="/register"
              element={
                <RegisterVehicle
                  contract={wallet.contract}
                  account={wallet.account}
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
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
