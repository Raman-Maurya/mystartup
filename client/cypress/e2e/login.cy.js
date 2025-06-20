describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display the login form', () => {
    cy.get('form').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    cy.get('button[type="submit"]').click();
    cy.get('form').contains('Email is required').should('be.visible');
    cy.get('form').contains('Password is required').should('be.visible');
  });

  it('should navigate to register page when clicking sign up link', () => {
    cy.contains('Sign up').click();
    cy.url().should('include', '/register');
  });

  // This test would require mocking API calls in a real setup
  it('should login with valid credentials', () => {
    // Mock the backend API response
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        token: 'fake-jwt-token',
        user: {
          _id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'USER',
        },
      },
    }).as('loginRequest');

    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });
});
