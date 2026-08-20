export default function ConnectWalletButton({ account, connect, wrongNetwork }) {
  if (wrongNetwork) {
    return (
      <button className="connect-btn wrong-network" disabled>
        Wrong Network — Switch to Chain {1337}
      </button>
    );
  }

  if (account) {
    return (
      <button className="connect-btn connected" disabled>
        {account.slice(0, 6)}...{account.slice(-4)}
      </button>
    );
  }

  return (
    <button className="connect-btn" onClick={connect}>
      Connect MetaMask
    </button>
  );
}
