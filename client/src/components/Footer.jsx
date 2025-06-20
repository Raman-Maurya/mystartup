import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-column">
          <div className="footer-logo">Trading Contest</div>
          <div className="footer-social">
            <a href="#" aria-label="Facebook"><i className="bi bi-facebook"></i></a>
            <a href="#" aria-label="Twitter"><i className="bi bi-twitter"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="bi bi-linkedin"></i></a>
            <a href="#" aria-label="YouTube"><i className="bi bi-youtube"></i></a>
            <a href="#" aria-label="Instagram"><i className="bi bi-instagram"></i></a>
            <a href="#" aria-label="Telegram"><i className="bi bi-telegram"></i></a>
          </div>
        </div>
        
        <div className="footer-column footer-links">
          <h5>Trading</h5>
          <ul>
            <li><Link to="/fantasy-stocks">Nifty Trading</Link></li>
            <li><Link to="/fantasy-stocks">Sensex Trading</Link></li>
            <li><Link to="/fantasy-stocks">Bank Nifty</Link></li>
            <li><Link to="/how-to-play">How to play</Link></li>
            <li><Link to="/app-download">Trading App Download</Link></li>
          </ul>
        </div>
        
        <div className="footer-column footer-links">
          <h5>About</h5>
          <ul>
            <li><Link to="/winners">Contest Winners</Link></li>
            <li><Link to="/private-contest">Private Contest</Link></li>
            <li><Link to="/about-us">About Us</Link></li>
            <li><Link to="/jobs">Jobs</Link></li>
            <li><Link to="/help">Help & Support</Link></li>
          </ul>
        </div>
        
        <div className="footer-column footer-links">
          <h5>Resources</h5>
          <ul>
            <li><Link to="/community">Community Guidelines</Link></li>
            <li><Link to="/tech">Trading Tech</Link></li>
            <li><Link to="/sitemap">Sitemap</Link></li>
            <li><Link to="/security">Security Vulnerability</Link></li>
            <li><Link to="/disclosure">Disclosure Program</Link></li>
          </ul>
        </div>
        
        <div className="footer-column">
          <div className="footer-badge">
            <div className="footer-badge-title">FOUNDING MEMBER</div>
            <img src="/images/founding-member.png" alt="Founding Member Badge" />
          </div>
          
          <div className="footer-badge mt-4">
            <div className="footer-badge-title">FAIRPLAY POLICY</div>
            <img src="/images/fairplay-badge.png" alt="Fairplay Policy Badge" />
          </div>
        </div>
      </div>
      
      <div className="footer-address">
        CORPORATE OFFICE<br />
        Trading Contest: Tower A, 12th Floor, Peninsula Business Park, Lower Parel, Mumbai 400 013
      </div>
      
      <div className="footer-policy">
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms">Terms & Conditions</Link>
      </div>
      
      <div className="footer-disclaimer">
        This game may be habit-forming or financially risky. Play responsibly.
      </div>
    </footer>
  );
};

export default Footer;