const CustomError = require("./CustomError");

// errors.js
class AuthorizationError extends CustomError {
  /**
   * Authorization Error Constructor
   * @param {any} [message] - Error payload
   * @param {number} [statusCode] - Status code. Defaults to `401`
   * @param {string} [feedback=""] - Feedback message
   * @param {object} [authParams] - Authorization Parameters to set in `WWW-Authenticate` header
   */
  constructor(message, statusCode, feedback, authParams) {
    super(message, statusCode || 401, feedback); // Call parent constructor with args
    this.authorizationError = true;
    this.authParams = authParams || {};
    this.authHeaders = {
      'WWW-Authenticate': `Bearer ${this.#stringifyAuthParams()}`,
    };
  }

  // Private Method to convert object `key: value` to string `key=value`
  #stringifyAuthParams() {
    let str = '';

    let { realm, ...others } = this.authParams;

    realm = realm || 'Access to user account';

    str = `realm=${realm}`;

    const otherParams = Object.keys(others);
    if (otherParams.length < 1) return str;

    otherParams.forEach((authParam, index, array) => {
      // Delete other `realm(s)` if exists
      if (authParam.toLowerCase() === 'realm') {
        delete others[authParam];
      }

      let comma = ',';
      // If is last Item then no comma
      if (array.length - 1 === index) comma = '';

      str = str + ` ${authParam}=${this.authParams[authParam]}${comma}`;
    });

    return str;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400; // Bad Request
  }
}

class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerError';
    this.status = 500; // Internal Server Error
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409; // Conflict
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403; // HTTP status code for Forbidden
  }
}

class UsageLimitExceededError extends Error {
  constructor(message = 'Usage limit exceeded') {
    super(message);
    this.name = 'UsageLimitExceededError';
    this.status = 429; // Too Many Requests
  }
}

class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
    this.status = 401; // Unauthorized
  }
}

class InvalidUserIDError extends Error {
  constructor(message = 'Invalid user ID') {
    super(message);
    this.name = 'InvalidUserIDError';
    this.status = 400; // Bad Request
  }
}

class TokenExpiredError extends Error {
  constructor(message = 'Token expired') {
    super(message);
    this.name = 'TokenExpiredError';
    this.status = 401; // Unauthorized
  }
}

class TokenNotYetValidError extends Error {
  constructor(message = 'Token not yet valid') {
    super(message);
    this.name = 'TokenNotYetValidError';
    this.status = 401; // Unauthorized
  }
}

class TokenMalformedError extends Error {
  constructor(message = 'Token malformed') {
    super(message);
    this.name = 'TokenMalformedError';
    this.status = 400; // Bad Request
  }
}

class TokenInvalidError extends Error {
  constructor(message = 'Token invalid') {
    super(message);
    this.name = 'TokenInvalidError';
    this.status = 401; // Unauthorized
  }
}

class InvalidOpenAPIError extends Error {
  constructor(message = 'Invalid OpenAPI') {
    super(message);
    this.name = 'InvalidOpenAPIError';
    this.status = 400; // Bad Request
  }
}

class OpenAiApiError extends Error {
  constructor(message = 'OpenAI API error') {
    super(message);
    this.name = 'OpenAiApiError';
    this.status = 500; // Internal Server Error
  }
}

class BadRequestError extends Error {
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
    this.status = 400; // Bad Request
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404; // Not Found
  }
}

class InternalServerError extends Error {
  constructor(message = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
    this.status = 500; // Internal Server Error
  }
}

class ServiceUnavailableError extends Error {
  constructor(message = 'Service unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.status = 503; // Service Unavailable
  }
}

class RateLimitExceededError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
    this.status = 429; // Too Many Requests
  }
}

class PermissionDeniedError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
    this.status = 403; // Forbidden
  }
}

class ResourceConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ResourceConflictError';
    this.status = 409; // Conflict
  }
}

class UnprocessableEntityError extends Error {
  constructor(message = 'Unprocessable entity') {
    super(message);
    this.name = 'UnprocessableEntityError';
    this.status = 422; // Unprocessable Entity
  }
}

class GatewayTimeoutError extends Error {
  constructor(message = 'Gateway timeout') {
    super(message);
    this.name = 'GatewayTimeoutError';
    this.status = 504; // Gateway Timeout
  }
}

module.exports = {
  UsageLimitExceededError,
  InvalidCredentialsError,
  InvalidUserIDError,
  TokenExpiredError,
  TokenNotYetValidError,
  TokenMalformedError,
  TokenInvalidError,
  InvalidOpenAPIError,
  OpenAiApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  ServiceUnavailableError,
  RateLimitExceededError,
  PermissionDeniedError,
  ResourceConflictError,
  UnprocessableEntityError,
  GatewayTimeoutError,
  ValidationError,
  ServerError,
  ConflictError,
  ForbiddenError,
  AuthorizationError,
  Error, // Default Error
};
