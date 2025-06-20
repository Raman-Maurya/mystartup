/**
 * Custom error classes for the application
 */

class PaymentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentError';
  }
}

class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds') {
    super(message);
    this.name = 'InsufficientFundsError';
    this.statusCode = 400;
  }
}

class ContestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContestError';
    this.statusCode = 400;
  }
}

class VirtualWalletError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VirtualWalletError';
    this.statusCode = 400;
  }
}

class TradeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TradeError';
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class ResourceNotFoundError extends Error {
  constructor(resource = 'Resource', id = '') {
    super(`${resource} not found${id ? `: ${id}` : ''}`);
    this.name = 'ResourceNotFoundError';
    this.statusCode = 404;
  }
}

module.exports = {
  PaymentError,
  InsufficientFundsError,
  ContestError,
  VirtualWalletError,
  TradeError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError
}; 