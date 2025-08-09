import React, { useState } from 'react';
import axios from 'axios';

function BalanceAtDate() {
    const [address, setAddress] = useState('');
    const [date, setDate] = useState('');
    const [ethBalance, setEthBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contractAddress, setContractAddress] = useState('');
    const [tokenBalance, setTokenBalance] = useState(null);

    const handleBalanceCheck = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setEthBalance(null);
        setTokenBalance(null);

        try {
            const response = await axios.get('/api/balanceAtDate', {
                params: {
                    address: address,
                    date: date,
                    contractAddress: contractAddress || undefined
                }
            });
            if (response.data.success) {
                setEthBalance(response.data.balance);
                setTokenBalance(response.data.tokenBalance || null);
            } else {
                setError('Failed to fetch balance');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred while fetching balance');
        } finally {
            setLoading(false);
        }
    };

  const formatEther = (wei) => (parseInt(wei) / 1e18).toFixed(6);

  return (
    <div className="App">
      <h2>Check ETH Balance at Date</h2>
      <form onSubmit={handleBalanceCheck} className="balance-form" >
        <div className="form-group">
          <label htmlFor="balanceAddress">Wallet Address:</label>
          <input
            type="text"
            id="balanceAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
            <label htmlFor="contractAddress">Token Contract Address (optional):</label>
            <input
            type="text"
            id="contractAddress"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="0x... (ERC20 Token)"
            />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Check ETH Balance at Date'}
        </button>
      </form>
      {ethBalance !== null && (
        <div className="balance-result">
          <strong>ETH Balance at {date} 00:00 UTC: {formatEther(ethBalance)} ETH</strong> 
          <br/>
          {tokenBalance ? <strong>Token Balance at {date} 00:00 UTC: {formatEther(tokenBalance)} Token</strong> : ""}
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default BalanceAtDate;