import React from 'react';
import { Card, Badge, Button, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Contests.css';

const ContestCard = ({ contest, isUserContest }) => {
  const calculateFillPercentage = () => {
    return (contest.participants.length / contest.maxParticipants) * 100;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  // Determine contest category badge color
  const getCategoryBadgeColor = () => {
    switch(contest.category.toLowerCase()) {
      case 'nifty50':
        return 'info';
      case 'banknifty':
        return 'warning';
      case 'stocks':
        return 'success';
      default:
        return 'secondary';
    }
  };
  
  // Get stock subcategory if available
  const getStockSubcategory = () => {
    if (contest.category.toLowerCase() !== 'stocks' || !contest.stockCategory) return null;
    
    switch(contest.stockCategory.toLowerCase()) {
      case 'pharma':
        return 'Pharmaceutical';
      case 'it':
        return 'IT Sector';
      case 'banking':
        return 'Banking';
      default:
        return contest.stockCategory.charAt(0).toUpperCase() + contest.stockCategory.slice(1);
    }
  };
  
  // Get a detailed prize breakdown text
  const getPrizeBreakdownText = () => {
    if (!contest.prizeDistribution) {
      return `Prize pool: ₹${contest.prizePool.toLocaleString()}`;
    }

    // Handle array format (old)
    if (Array.isArray(contest.prizeDistribution)) {
      if (contest.prizeDistribution.length === 0) {
        return `Prize pool: ₹${contest.prizePool.toLocaleString()}`;
      }

      // Display high win rate if applicable
      if (contest.highWinRate) {
        const totalWinners = contest.prizeDistribution.reduce((count, prize) => {
          const rank = prize.rank;
          if (rank.includes('-')) {
            const [start, end] = rank.split('-').map(Number);
            return count + (end - start + 1);
          }
          return count + 1;
        }, 0);
        
        const winPercentage = Math.round((totalWinners / contest.maxParticipants) * 100);
        const firstPrize = contest.prizeDistribution[0].prize.replace('₹', '').trim();
        
        return `${winPercentage}% win rate! First prize: ₹${firstPrize}`;
      }
      
      // Show first prize and total winners with better formatting
      const firstPrize = contest.prizeDistribution[0].prize.replace('₹', '').trim();
      const totalWinners = contest.prizeDistribution.reduce((count, prize) => {
        const rank = prize.rank;
        if (rank.includes('-')) {
          const [start, end] = rank.split('-').map(Number);
          return count + (end - start + 1);
        }
        return count + 1;
      }, 0);
      
      return `First: ₹${firstPrize} • ${totalWinners} winners`;
    }

    // Handle Map format (new)
    const entries = Object.entries(contest.prizeDistribution);
    if (entries.length === 0) {
      return `Prize pool: ₹${contest.prizePool.toLocaleString()}`;
    }

    const firstPrizePercentage = entries[0][1];
    const firstPrizeAmount = Math.round(contest.prizePool * (firstPrizePercentage / 100)) / entries.length;
    const totalWinners = entries.length;
    
    return `First: ₹${firstPrizeAmount.toLocaleString()} • ${totalWinners} winners`;
  };

  const getStatusBadge = () => {
    if (contest.status === 'UPCOMING') {
      return (
        <Badge 
          bg="warning" 
          className="animate-pulse position-absolute top-0 end-0 m-2 px-3 py-2"
          style={{ fontSize: '0.9rem', fontWeight: '600' }}
        >
          UPCOMING
        </Badge>
      );
    }
    
    if (contest.status === 'ACTIVE') {
      return (
        <Badge 
          bg="success" 
          className="animate-pulse position-absolute top-0 end-0 m-2 px-3 py-2"
          style={{ fontSize: '0.9rem', fontWeight: '600' }}
        >
          LIVE
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Card className={`contest-card h-100 shadow-sm border-0 position-relative ${contest.highWinRate ? 'border-success border-2' : ''}`}>
      {getStatusBadge()}
      
      {contest.highWinRate && (
        <div className="position-absolute top-0 start-0 m-2">
          <Badge 
            bg="success" 
            className="animate-pulse px-2 py-1"
            style={{ fontSize: '0.8rem' }}
          >
            HIGH WIN RATE
          </Badge>
        </div>
      )}
      
      {contest.isNew && (
        <div className="position-absolute top-0 start-0 m-2">
          <Badge 
            bg="primary" 
            className="animate-pulse px-2 py-1"
            style={{ fontSize: '0.8rem' }}
          >
            NEW
          </Badge>
        </div>
      )}
      
      <div 
        className="contest-card-image" 
        style={{ 
          height: '140px', 
          backgroundImage: `url(${contest.image})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}
      />
      
      <Card.Body className="d-flex flex-column">
        <div className="mb-3 d-flex justify-content-between align-items-start">
          <div>
            <Badge 
              bg={contest.contestType.toUpperCase() === 'FREE' ? 'success' : 'primary'} 
              className="me-2"
            >
              {contest.contestType.toUpperCase() === 'FREE' ? 'Free Entry' : `₹${contest.entryFee}`}
            </Badge>
            <Badge bg={getCategoryBadgeColor()}>
              {contest.category === 'nifty50' ? 'Nifty50' : 
               contest.category === 'banknifty' ? 'BankNifty' : 'Stocks'}
            </Badge>
            {contest.instrumentType && (
              <Badge bg="secondary" className="ms-1">
                {contest.instrumentType.charAt(0).toUpperCase() + contest.instrumentType.slice(1)}
              </Badge>
            )}
            {getStockSubcategory() && (
              <Badge bg="info" className="ms-1">{getStockSubcategory()}</Badge>
            )}
          </div>
          <div className="text-muted small">
            {formatDate(contest.startDate)}
          </div>
        </div>
        
        <Card.Title className="mb-1 h5">{contest.name}</Card.Title>
        <Card.Text className="small text-muted mb-3">
          {contest.description}
        </Card.Text>
        
        <div className="d-flex justify-content-between mb-3 text-center">
          <div>
            <div className="fw-bold">₹{contest.entryFee.toLocaleString()}</div>
            <div className="text-muted small">Entry</div>
          </div>
          <div className="border-start border-end px-3">
            <div className="fw-bold text-success">₹{contest.prizePool.toLocaleString()}</div>
            <div className="text-muted small">Prize Pool</div>
          </div>
          <div>
            <div className="fw-bold">{contest.maxParticipants.toLocaleString()}</div>
            <div className="text-muted small">Max Players</div>
          </div>
        </div>
        
        <div className={`text-center mb-3 ${contest.highWinRate ? 'bg-success-subtle p-2 rounded' : ''}`}>
          <small className={contest.highWinRate ? 'text-success fw-bold' : 'text-muted'}>
            {getPrizeBreakdownText()}
          </small>
        </div>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center small mb-1">
            <span>{contest.participants.length.toLocaleString()} joined</span>
            <span className={calculateFillPercentage() > 80 ? 'text-danger' : 'text-muted'}>
              {Math.round(calculateFillPercentage())}% full
            </span>
          </div>
          <ProgressBar 
            now={calculateFillPercentage()} 
            variant={calculateFillPercentage() > 80 ? 'danger' : calculateFillPercentage() > 40 ? 'warning' : 'info'}
            style={{ height: '6px' }}
          />
        </div>
        
        <div className="mt-auto">
          {isUserContest ? (
            <Link 
              to={`/trade/${contest._id}`} 
              className={`btn ${contest.status === 'ACTIVE' ? 'btn-success' : 'btn-primary'} w-100`}
            >
              {contest.status === 'UPCOMING' ? 'View Contest' : 'Start Trading'}
            </Link>
          ) : (
            <Link 
              to={`/contest/${contest._id}`} 
              className={`btn ${contest.highWinRate ? 'btn-success' : 'btn-primary'} w-100`}
            >
              {contest.status === 'UPCOMING' ? 'Join Contest' : 'Join & Trade'}
            </Link>
          )}
        </div>
      </Card.Body>
      
      <style jsx="true">{`
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .contest-card {
          transition: transform 0.2s;
        }
        
        .contest-card:hover {
          transform: translateY(-5px);
        }
        
        .border-success {
          border-left: 4px solid #28a745 !important;
        }
      `}</style>
    </Card>
  );
};

export default ContestCard;