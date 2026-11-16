import Icon from "./Icon.jsx";

export default function ConnectWalletButton({
  account,
  connect,
  wrongNetwork,
  chainId = 1337,
}) {
  if (wrongNetwork) {
    return (
      <button
        type="button"
        className="connect-btn wrong-network"
        disabled
        title={`Switch MetaMask to chain ${chainId}`}
      >
        <Icon name="alert" size={15} />
        <span>Wrong network</span>
      </button>
    );
  }

  if (account) {
    return (
      <span className="wallet-chip" title={account}>
        <span className="wallet-pulse" aria-hidden="true" />
        <span className="wallet-copy">
          <span className="wallet-label">Connected</span>
          <strong className="wallet-address">
            {account.slice(0, 6)}…{account.slice(-4)}
          </strong>
        </span>
      </span>
    );
  }

  return (
    <button type="button" className="connect-btn" onClick={connect}>
      <Icon name="wallet" size={16} />
      <span>Connect wallet</span>
    </button>
  );
}
