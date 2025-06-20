import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../redux/actions/authActions';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);

  // Get redirect path and message from location state
  const from = location.state?.from?.pathname || '/';
  const message = location.state?.message;
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const result = await dispatch(login(email, password));
      // Check if user is admin and redirect accordingly
      if (result.user && result.user.role === 'ADMIN') {
        // Redirect admin users to the admin contest page
        navigate('/admin/contests/new', { replace: true });
      } else {
        // Redirect regular users to the page they tried to visit or home
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    // Update the Row component to include the login-form-container class
    <Container fluid="md">
      <Row className="justify-content-center my-4 my-md-5 login-form-container">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3 p-sm-4 p-md-5">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Welcome Back</h2>
                <p className="text-muted">Sign in to continue to Trading Contest</p>
              </div>
              
              {message && (
                <Alert variant="info" className="mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  {message}
                </Alert>
              )}
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="py-2"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <Form.Label className="mb-0">Password</Form.Label>
                    <Link to="/forgot-password" className="text-decoration-none small">
                      Forgot Password?
                    </Link>
                  </div>
                  <Form.Control 
                    type="password" 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="py-2 mt-2"
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox" 
                    label="Remember me" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Don't have an account? <Link to="/register" className="text-decoration-none">Sign Up</Link>
                  </p>
                </div>
              </Form>
            </Card.Body>
          </Card>
          
          <div className="text-center mt-3 px-3">
            <p className="text-muted small">
              By signing in, you agree to our <a href="#" className="text-decoration-none">Terms of Service</a> and <a href="#" className="text-decoration-none">Privacy Policy</a>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;