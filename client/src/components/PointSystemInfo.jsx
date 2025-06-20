import React from 'react';
import { Card, Table, Alert, Badge } from 'react-bootstrap';

/**
 * Component to explain the points system and prize distribution
 */
const PointSystemInfo = ({ showPrizeInfo = true }) => {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header>
        <h5 className="mb-0">Trading Points System & Ranking</h5>
      </Card.Header>
      <Card.Body>
        <p>
          Your performance in contests is measured by two key metrics:
        </p>
        
        <Alert variant="info">
          <Alert.Heading>How Rankings Work</Alert.Heading>
          <p className="mb-1">
            <strong>1. Points:</strong> Earned for trading activity and P&L. Visible on leaderboard.
          </p>
          <p className="mb-1">
            <strong>2. Ranking Score:</strong> A calculation that heavily weights P&L performance.
            This is used to determine winners and prize distribution.
          </p>
          <p className="mb-0">
            <strong>Note:</strong> Even if two traders have the same points, the one with higher
            P&L percentage will rank higher.
          </p>
        </Alert>
        
        <h6 className="mt-4 mb-3">Points Calculation</h6>
        <Table striped size="sm" className="mb-4">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Profitable trade</td>
              <td>+10 base points</td>
            </tr>
            <tr>
              <td>P&L Percentage</td>
              <td>+2 points per 1% profit</td>
            </tr>
            <tr>
              <td>Trade Activity</td>
              <td>+2 points per trade (max 30)</td>
            </tr>
            <tr>
              <td>Consecutive profitable trades</td>
              <td>+5 points per streak (max 25)</td>
            </tr>
            <tr>
              <td>Unprofitable trade</td>
              <td>-5 points</td>
            </tr>
          </tbody>
        </Table>
        
        {showPrizeInfo && (
          <>
            <h6 className="mt-4 mb-3">Prize Money Distribution</h6>
            <p>
              Prize distribution is determined by contest administrators when creating each contest. 
              The leaderboard will show your projected prize based on your current rank.
            </p>
            
            <Alert variant="info">
              <Alert.Heading>How Prize Money Works</Alert.Heading>
              <p>Contest organizers define exactly what percentage of the prize pool goes to each rank.</p>
              <p>For example, a contest might allocate:</p>
              <ul className="mb-0">
                <li>50% to 1st place</li>
                <li>30% to 2nd place</li>
                <li>20% to 3rd place</li>
              </ul>
              <p className="mt-2 mb-0">While another contest might reward more positions with different percentages.</p>
            </Alert>
            
            <Alert variant="warning" className="mt-3 mb-0">
              <strong>Important:</strong> Final rankings are determined primarily by your P&L performance, 
              not just points. The trader with the highest P&L percentage will generally rank highest.
            </Alert>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default PointSystemInfo; 