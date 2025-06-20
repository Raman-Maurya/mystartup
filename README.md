# Trading Arena

A full-stack application for running trading contests, featuring virtual wallets, real-time market data, and contest leaderboards.

## Features

- User authentication and registration
- Virtual trading with real market data
- Contests with leaderboards and prize distribution
- Admin dashboard for contest management
- Virtual wallet system

## Tech Stack

- **Frontend**: React, Redux, Vite
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Testing**: Jest, Cypress

## Project Structure

- `/backend`: Express API server
  - `/controllers`: API logic
  - `/models`: MongoDB schemas
  - `/routes`: API routes
  - `/middleware`: Request middleware
  - `/services`: Business logic
  - `/utils`: Helper functions
  
- `/client`: React frontend
  - `/src/components`: UI components
  - `/src/redux`: State management
  - `/src/services`: API services

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd trading-contest-platform
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../client
npm install
```

4. Start the backend server
```bash
cd ../backend
node server.js
```

5. Start the frontend development server
```bash
cd ../client
npm run dev
```

## License

[MIT](LICENSE) 
