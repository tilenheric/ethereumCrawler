import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [address, setAddress] = useState('');
  const [startBlock, setStartBlock] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [internalTransactions, setInternalTransactions] = useState([]);
  const [tokenTransactions, setTokenTransactions] = useState([]);
  const [nftTransactions, setNftTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayLimit] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('transactions'); // Dodano za zavihke

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTransactions([]);
    setCurrentPage(1);

    try {
      const response = await axios.get('/api/transactions', {
        params: {
          address: address,
          startBlock: startBlock
        }
      });

      if (response.data.success) {
        // Support both array and object response for backward compatibility
        let allTransactions = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data?.transactions || [];
        setTransactions(allTransactions[0] || []);
        setInternalTransactions(allTransactions[1] || []);
        setTokenTransactions(allTransactions[2] || []); 
        setNftTransactions(allTransactions[3] || []);
        // Reset pagination to first page
        setCurrentPage(1);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatEther = (wei) => {
    return (parseInt(wei) / 1e18).toFixed(6);
  };

  const formatAddress = (address) => {
    if (!address || typeof address !== 'string') return 'N/A';
    return  address;//`${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const getSymbol = (symbol) => {
    return symbol ? ` ${symbol}` : ' ETH';
  };

  // Helper za prikaz transakcij
  const renderTransactions = (txs, title) => (
    <div className="results">
      <h2>{title} ({txs.length} found)</h2>
      <div className="transactions-list">
        {txs
          .slice((currentPage - 1) * displayLimit, currentPage * displayLimit)
          .map((tx, index) => (
            <div key={`${tx.hash || tx.id || index}-${index}`} className="transaction-card">
              <div className="transaction-header">
                <span className="transaction-type">{tx.type || title}</span>
                <span className="transaction-hash">{formatAddress(tx.hash || tx.id)}</span>
              </div>
              <div className="transaction-details">
                <div className="detail-row">
                  <span className="label">From:</span>
                  <span className="value">{formatAddress(tx.from)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">To:</span>
                  <span className="value">{formatAddress(tx.to)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value">{tx.value ? formatEther(tx.value) + getSymbol(tx.tokenSymbol) : '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Block:</span>
                  <span className="value">{tx.blockNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">{tx.timeStamp ? formatTimestamp(tx.timeStamp) : '-'}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
      {/* Pagination controls */}
      <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {Math.ceil(txs.length / displayLimit)}</span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(Math.ceil(txs.length / displayLimit), p + 1))}
          disabled={currentPage === Math.ceil(txs.length / displayLimit)}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>Ethereum Transaction Viewer</h1>
      </header>
      
      <main className="App-main">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-group">
            <label htmlFor="address">Wallet Address:</label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="startBlock">Starting Block:</label>
            <input
              type="number"
              id="startBlock"
              value={startBlock}
              onChange={(e) => setStartBlock(e.target.value)}
              placeholder="12345678"
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Search Transactions'}
          </button>
        </form>

        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Zavihek za transakcije */}
        <div className="tabs" style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          <button onClick={() => { setActiveTab('transactions'); setCurrentPage(1); }} className={activeTab === 'transactions' ? 'active' : ''}>Transactions</button>
          <button onClick={() => { setActiveTab('internal'); setCurrentPage(1); }} className={activeTab === 'internal' ? 'active' : ''}>Internal Transactions</button>
          <button onClick={() => { setActiveTab('token'); setCurrentPage(1); }} className={activeTab === 'token' ? 'active' : ''}>Token Transactions</button>
          <button onClick={() => { setActiveTab('nft'); setCurrentPage(1); }} className={activeTab === 'nft' ? 'active' : ''}>NFT</button>
        </div>

        {/* Prikaz aktivnega zavihka */}
        {activeTab === 'transactions' && transactions.length > 0 && renderTransactions(transactions, 'Transactions')}
        {activeTab === 'internal' && internalTransactions.length > 0 && renderTransactions(internalTransactions, 'Internal Transactions')}
        {activeTab === 'token' && tokenTransactions.length > 0 && renderTransactions(tokenTransactions, 'Token Transactions')}
        {activeTab === 'nft' && nftTransactions.length > 0 && renderTransactions(nftTransactions, 'NFT Transactions')}
      </main>
    </div>
  );
}

export default App; 