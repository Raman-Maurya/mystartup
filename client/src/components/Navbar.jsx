import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/actions/authActions';
import { ThemeContext } from '../context/ThemeContext';

const AppNavbar = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <Navbar bg={darkMode ? "dark" : "light"} variant={darkMode ? "dark" : "light"} expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          <i className="bi bi-graph-up-arrow me-2"></i>
          Trading Arena
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={isActive('/') ? 'active' : ''}>Home</Nav.Link>
            <Nav.Link as={Link} to="/contests" className={isActive('/contests') ? 'active' : ''}>Contests</Nav.Link>
            {isAuthenticated && user?.role === 'ADMIN' && (
              <>
                <Nav.Link as={Link} to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>Admin Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/admin/contests/new" className={isActive('/admin/contests/new') ? 'active' : ''}>Create Contest</Nav.Link>
              </>
            )}
            <Nav.Link as={Link} to="/leaderboard" className={isActive('/leaderboard') ? 'active' : ''}>Leaderboard</Nav.Link>
            <Nav.Link as={Link} to="/how-to-play" className={isActive('/how-to-play') ? 'active' : ''}>How to Play</Nav.Link>
            <Nav.Link as={Link} to="/trading-demo" className={isActive('/trading-demo') ? 'active' : ''}>
              <i className="bi bi-graph-up me-1"></i>Trading Demo
            </Nav.Link>
          </Nav>
          
          <Nav>
            <Button 
              variant={darkMode ? "light" : "dark"} 
              size="sm" 
              className="me-3 rounded-circle p-2" 
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <i className={`bi ${darkMode ? "bi-sun" : "bi-moon"}`}></i>
            </Button>
            
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant={darkMode ? "outline-light" : "outline-dark"}
                  id="dropdown-basic"
                  className="text-truncate"
                  style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  <i className="bi bi-person-circle me-1"></i>
                  {user?.username || 'User'}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  className={darkMode ? "dropdown-menu-dark" : "dropdown-menu-light"}
                  style={{ backgroundColor: darkMode ? "#343a40" : "#ffffff", color: darkMode ? "#ffffff" : "#000000" }}
                >
                  <Dropdown.Item as={Link} to="/profile" className={isActive('/profile') ? 'active' : ''}>
                    <i className="bi bi-person me-2"></i>My Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/my-contests" className={isActive('/my-contests') ? 'active' : ''}>
                    <i className="bi bi-trophy me-2"></i>My Contests
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/transactions" className={isActive('/transactions') ? 'active' : ''}>
                    <i className="bi bi-credit-card me-2"></i>Transactions
                  </Dropdown.Item>
                  
                  {user?.role === 'ADMIN' && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Header>Admin Controls</Dropdown.Header>
                      <Dropdown.Item as={Link} to="/admin" className={isActive('/admin') ? 'active' : ''}>
                        <i className="bi bi-speedometer2 me-2"></i>Admin Dashboard
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to="/admin/contests/new" className={isActive('/admin/contests/new') ? 'active' : ''}>
                        <i className="bi bi-plus-circle me-2"></i>Create Contest
                      </Dropdown.Item>
                    </>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div>
                <Button as={Link} to="/login" variant={darkMode ? "outline-light" : "outline-dark"} className="me-2">
                  Login
                </Button>
                <Button as={Link} to="/register" variant="primary">
                  Register
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;