import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AllTransactions from './components/AllTransactions';
import BalanceAtDate from './components/BalanceAtDate';
import './App.css';

function App() {
  return (
    <Router>
      <header className="App-header">
        <h1>Ethereum Crawler</h1>
        <br/>
        <nav style={{marginBottom: '20px'}}>
          <Link className='linkNav' to="/" style={{marginRight: '10px'}}>Transactions</Link>
          <Link className='linkNav' to="/balance-at-date">ETH Balance at Date</Link>
        </nav>
      </header>
      <main className="App-main">
        <Routes>
          <Route path="/" element={<AllTransactions />} />
          <Route path="/balance-at-date" element={<BalanceAtDate />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;