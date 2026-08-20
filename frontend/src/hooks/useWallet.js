import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import abi from "../contract/abi.json";
import config from "../contract/config.js";

const ROLE_NAMES = ["NONE", "OWNER", "SERVICE_CENTER", "INSURANCE", "GOVERNMENT", "BUYER"];

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null);
  const [roleName, setRoleName] = useState("NONE");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const network = await browserProvider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== config.network.chainId) {
        setWrongNetwork(true);
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${config.network.chainId.toString(16)}` }],
          });
          setWrongNetwork(false);
        } catch (err) {
          console.error("Failed to switch network:", err);
          return;
        }
      }

      const currentSigner = await browserProvider.getSigner();
      const currentAccount = await currentSigner.getAddress();

      const vehicleContract = new ethers.Contract(
        config.contractAddress,
        abi,
        currentSigner
      );

      setProvider(browserProvider);
      setSigner(currentSigner);
      setAccount(currentAccount);
      setContract(vehicleContract);

      // Fetch role
      try {
        const roleNum = await vehicleContract.getMyRole();
        const roleIdx = Number(roleNum);
        setRole(roleIdx);
        setRoleName(ROLE_NAMES[roleIdx] || "UNKNOWN");
      } catch (err) {
        console.error("Failed to fetch role:", err);
        setRole(0);
        setRoleName("NONE");
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setRole(null);
        setRoleName("NONE");
        setContract(null);
        setSigner(null);
      } else if (accounts[0] !== account) {
        // Reconnect with new account
        await connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [account, connect]);

  return { account, role, roleName, connect, provider, signer, contract, wrongNetwork };
}
