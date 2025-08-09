const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const url = `https://api.etherscan.io/v2/api?chainid=1`;

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY;

// Limit concurrency to respect rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const RATE_LIMIT_DELAY = 1000; // milliseconds between requests 
// Fetch transactions for a block range
async function getTransactions({ address, startBlock, endBlock, action, step, depth=0}) {
  const MAX_RESULTS = 10000;
  const API = ETHERSCAN_KEY;
  const params = {
    module: "account",
    action: action,
    startblock: startBlock,
    endblock: endBlock,
    page: 1,
    offset: MAX_RESULTS,
    sort: "asc",
    apikey: API,
    address: address,
  };

  try {
    const response = await axios.get(url, { params });
    let txs = response.data.result || [];

    if (txs.length >= MAX_RESULTS && startBlock !== endBlock) {
      console.warn(`Too many txs in blocks ${startBlock}-${endBlock}.`);
      const mid = Math.floor((startBlock + endBlock) / 2);
      const txs1 = await getTransactions({
        address,
        startBlock: startBlock,
        endBlock: mid,
        action,
        step: Math.floor((mid - startBlock + 1) / 2),
        depth: depth + 1
      });
      const txs2 = await getTransactions({
        address,
        startBlock: mid + 1,
        endBlock: endBlock,
        action,
        step: Math.floor((mid - startBlock + 1) / 2),
        depth: depth + 1
      });
      txs = [...txs1, ...txs2];
    }

    if(depth == 0)
      console.log(`Fetched ${txs.length} ${action} txs from blocks ${startBlock}-${endBlock}`);
    
    return txs;

  } catch (error) {
    console.error(`Error fetching ${action} txs for blocks ${startBlock}-${endBlock}:`, error.message);
    return [];
  }
}

// Fetch in parallel with limited concurrency and delay
async function fetchTxsParallel({ address, startBlock, endBlock, action, step = 500000, concurrency = 5 }) {
  const STEP = step;
  const ranges = [];
  for (let from = startBlock; from <= endBlock; from += STEP) {
    const to = Math.min(from + STEP - 1, endBlock);
    ranges.push({ from, to });
  }
  console.log(ranges.length, "ranges to fetch");
  const results = [];
  let i = 0;
  while (i < ranges.length) {
    // Pripravi batch do velikosti concurrency
    counter = 0;
    const batch = ranges.slice(i, i + concurrency).map(range =>
      getTransactions({
        address,
        startBlock: range.from,
        endBlock: range.to,
        action,
        step: STEP,
        counter: counter++
      })
    );
    // Počakaj, da se vse v batchu končajo
    const batchResults = await Promise.all(batch);
    batchResults.forEach(txs => results.push(...txs));
    i += concurrency;
    // Počakaj RATE_LIMIT_DELAY po vsakem batchu
    if (i < ranges.length) await delay(RATE_LIMIT_DELAY);
  }

  return results;
}

async function fetchTxs({ address, startBlock, endBlock, action, step=500000 }) {
  const STEP = step; 
  const ranges = [];
  for (let from = startBlock; from <= endBlock; from += STEP) {
    const to = Math.min(from + STEP - 1, endBlock);
    ranges.push({ from, to });
  }

  const results = [];
  for (const range of ranges) {
    if(range.to != endBlock) 
      await delay(RATE_LIMIT_DELAY);

    const txs = await getTransactions({
      address,
      startBlock: range.from,
      endBlock: range.to,
      action,
      step: STEP
    });
    results.push(...txs);
    //await delay(RATE_LIMIT_DELAY);
  }
  
  return results;
}

//  Get latest block
async function getLatestBlock() {
  const params = {
    module: "proxy",
    action: "eth_blockNumber",
    apikey: process.env.ETHERSCAN_API_KEY,
  };

  try {
    const response = await axios.get(url, { params });
    const hexBlock = response.data.result;
    const latestBlock = parseInt(hexBlock, 16);
    console.log(`Latest block is ${latestBlock}`);
    await delay(RATE_LIMIT_DELAY*2);
    return latestBlock;
  } catch (error) {
    console.error("Failed to fetch latest block number:", error.message);
    return 99999999; // fallback, if needed
  }
}

// API Routes

// Transactions endpoint
app.get('/api/transactions', async (req, res) => {
  try {
    const { address, startBlock } = req.query;
    
    if (!address || !startBlock) {
      return res.status(400).json({ 
        error: 'Address and startBlock are required' 
      });
    }

    // Clean and validate Ethereum address format
    const cleanAddress = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      return res.status(400).json({ 
        error: 'Invalid Ethereum address format' 
      });
    }

    // Get latest block
    const endBlock = await getLatestBlock();

    // Get normal transactions
    const normalTransactions = await fetchTxsParallel({ 
      address: cleanAddress, 
      startBlock: parseInt(startBlock), 
      endBlock: endBlock, 
      action: "txlist",
      step: 1000000,
      concurrency: 5 
    });

    // Get internal transactions
    const internalTransactions = await getTransactions({ 
      address: cleanAddress, 
      startBlock: parseInt(startBlock), 
      endBlock: endBlock, 
      action: "txlistinternal", 
      step: endBlock
    });

    // Get ERC-20 token transactions
    const tokenTransactions = await getTransactions({ 
      address: cleanAddress, 
      startBlock: parseInt(startBlock), 
      endBlock: endBlock, 
      action: "tokentx", 
      step: endBlock
    });

    // Get ERC-721 (NFT) token transactions
    const nftTransactions = await getTransactions({ 
      address: cleanAddress, 
      startBlock: parseInt(startBlock), 
      endBlock: endBlock, 
      action: "tokennfttx", 
      step: endBlock
    });
    
    // Add type to transactions and combine them
    const normalLabeled = normalTransactions.map(tx => ({ ...tx, type: "normal" }));
    const internalLabeled = internalTransactions.map(tx => ({ ...tx, type: "internal" }));
    const tokenLabeled = tokenTransactions.map(tx => ({ ...tx, type: "token" }));
    console.log(nftTransactions + " NFT transactions " + nftTransactions.length);
    const nftLabeled = nftTransactions?.map(tx => ({ ...tx, type: "nft" }));
    const transactions = [normalLabeled, internalLabeled, tokenLabeled, nftLabeled];

    res.json({
      success: true,
      data: transactions
    });

    console.log(`Fetched ${transactions.length} transactions for address ${cleanAddress} from blocks ${startBlock}-${endBlock}`);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
});

// Balance at date endpoint
// ETH balance at date endpoint
app.get('/api/balanceAtDate', async (req, res) => {
  try {
    const { address, date, contractAddress } = req.query;
    if (!address || !date) {
      return res.status(400).json({ error: 'Address and date are required' });
    }
    const cleanAddress = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }
    const cleanContractAddress = contractAddress ? contractAddress.trim() : null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanContractAddress)) {
      return res.status(400).json({ error: 'Invalid ContractAddress address format' });
    }
    // Pretvori datum v timestamp (YYYY-MM-DD 00:00 UTC)
    const targetTime = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000);
    console.log(`Fetching balance for address ${address} at date ${date} (timestamp: ${targetTime})`);
    // Najdi najbližji block pred ali ob tem času
    const blockResp = await axios.get(url, {
      params: {
        module: 'block',
        action: 'getblocknobytime',
        timestamp: targetTime,
        closest: 'before',
        apikey: ETHERSCAN_KEY
      }
    });
    const blockNumber = blockResp.data.result;
    const hexBlock = "0x" + blockNumber.toString(16);
    // Pridobi balance na tem blocku
    const balanceResp = await axios.get(url, {
      params: {
        module: 'account',
        action: 'balance',
        address: cleanAddress,
        tag: blockNumber,
        apikey: ETHERSCAN_KEY
      }
    });
    console.log(`Balance for ${address} at block ${blockNumber} (${date}): ${balanceResp.data.result}`);
    // Pridobi token balance, če je podan contract address
    if(contractAddress != null && contractAddress !== '') {
      tokenBalance = await axios.get(url, {
        params: {
          module: 'account',
          action: 'tokenbalance',
          contractaddress: cleanContractAddress,
          address: cleanAddress,
          tag: blockNumber,
          apikey: ETHERSCAN_KEY
        }
      });
      console.log(`Token balance for ${address} at block ${blockNumber} (${date}): ${tokenBalance.data.result}`);
    }


    res.json({
      success: true,
      balance: balanceResp.data.result? balanceResp.data.result : '0',
      tokenBalance: contractAddress ? tokenBalance.data.result : null,
      blockNumber
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance', details: error.message });
  }
});

// check endpoint
app.get('/api', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Status check: http://localhost:${PORT}/api`);
}); 