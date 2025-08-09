# Ethereum Transaction Viewer

A web application that allows users to view transaction data from the Ethereum blockchain for a specific wallet address, starting from a given block number.


## Setup Instructions

### 1. Get Etherscan API Key


### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:
```
ETHERSCAN_API_KEY=your_etherscan_api_key_here
PORT=5000
```

### 3. Install Dependencies

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 4. Start the Application

Start the backend server (in one terminal):
```bash
cd backend
npm start
```

Start the frontend development server (in another terminal):
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000


## API Endpoints

- `GET /api/transactions?address={address}&startBlock={block}` - Fetch transactions
- `GET /api/` - check endpoint