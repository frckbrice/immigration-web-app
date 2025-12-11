/**
 * Retry with Exponential Backoff and Circuit Breaker
 * Handles transient and long-lasting errors gracefully
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenRetries?: number;
}

export interface RetryWithCircuitBreakerOptions extends RetryOptions, CircuitBreakerOptions {
  operationName?: string;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private successCount = 0;

  constructor(
    private options: CircuitBreakerOptions = {},
    private operationName: string = 'operation'
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeoutMs: options.resetTimeoutMs ?? 60000, // 1 minute
      halfOpenRetries: options.halfOpenRetries ?? 2,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should transition states
    this.updateState();

    if (this.state === CircuitBreakerState.OPEN) {
      throw new Error(
        `Circuit breaker is OPEN for ${this.operationName}. Service is unavailable. Please try again later.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState(): void {
    const now = Date.now();

    if (this.state === CircuitBreakerState.OPEN) {
      // Check if we should transition to HALF_OPEN
      if (
        this.lastFailureTime &&
        now - this.lastFailureTime >= (this.options.resetTimeoutMs ?? 60000)
      ) {
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${this.operationName}`);
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      }
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      // If we've had enough successes in half-open, close the circuit
      if (this.successCount >= (this.options.halfOpenRetries ?? 2)) {
        logger.info(`Circuit breaker CLOSED for ${this.operationName} - service recovered`);
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      logger.warn(
        `Circuit breaker OPENED for ${this.operationName} - service still failing in half-open state`
      );
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= (this.options.failureThreshold ?? 5)
    ) {
      logger.warn(
        `Circuit breaker OPENED for ${this.operationName} - failure threshold reached (${this.failureCount} failures)`
      );
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logger.info(`Circuit breaker RESET for ${this.operationName}`);
  }
}

// Global circuit breakers per operation
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(operationName: string, options: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(operationName)) {
    circuitBreakers.set(operationName, new CircuitBreaker(options, operationName));
  }
  return circuitBreakers.get(operationName)!;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: any,
  options: RetryOptions
): { retryable: boolean; reason?: string } {
  // Check for retryable status codes
  if (error.response?.status) {
    const status = error.response.status;
    const retryableStatusCodes = options.retryableStatusCodes ?? [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];

    if (retryableStatusCodes.includes(status)) {
      return { retryable: true, reason: `HTTP ${status}` };
    }

    // Don't retry on client errors (4xx except 408, 429)
    if (status >= 400 && status < 500 && !retryableStatusCodes.includes(status)) {
      return { retryable: false, reason: `Client error: HTTP ${status}` };
    }
  }

  // Check for retryable error messages
  const errorMessage = error.message?.toLowerCase() || '';
  const retryableErrors = options.retryableErrors ?? [
    'timeout',
    'network',
    'econnrefused',
    'econnreset',
    'etimedout',
    'enotfound',
    'request aborted',
  ];

  if (retryableErrors.some((retryableError) => errorMessage.includes(retryableError))) {
    return { retryable: true, reason: 'Network/timeout error' };
  }

  // Check for specific error codes
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return { retryable: true, reason: `Error code: ${error.code}` };
  }

  // Default: don't retry unknown errors
  return { retryable: false, reason: 'Unknown error type' };
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff and circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: RetryWithCircuitBreakerOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    operationName = 'operation',
    ...circuitBreakerOptions
  } = options;

  const circuitBreaker = getCircuitBreaker(operationName, circuitBreakerOptions);

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute through circuit breaker
      const result = await circuitBreaker.execute(fn);
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if circuit breaker is open (service unavailable)
      if (circuitBreaker.getState() === CircuitBreakerState.OPEN) {
        logger.warn(`Circuit breaker is OPEN for ${operationName} - aborting retries`);
        throw new Error(`Service is temporarily unavailable. Please try again in a few moments.`);
      }

      // Check if error is retryable
      const { retryable, reason } = isRetryableError(error, options);
      if (!retryable) {
        logger.warn(
          `Non-retryable error for ${operationName} on attempt ${attempt}: ${reason}`,
          error
        );
        throw error; // Don't retry non-retryable errors
      }

      // If this is the last attempt, don't wait
      if (attempt >= maxRetries) {
        logger.error(
          `All retry attempts exhausted for ${operationName} after ${maxRetries} attempts`,
          error
        );
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      logger.info(
        `Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries}) after ${delayMs}ms. Reason: ${reason}`,
        {
          attempt,
          maxRetries,
          delayMs,
          reason,
          errorMessage: error.message,
        }
      );

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

/**
 * Reset circuit breaker for an operation (useful for testing or manual recovery)
 */
export function resetCircuitBreaker(operationName: string): void {
  const circuitBreaker = circuitBreakers.get(operationName);
  if (circuitBreaker) {
    circuitBreaker.reset();
  }
}

/**
 * Get circuit breaker state (useful for debugging)
 */
export function getCircuitBreakerState(operationName: string): CircuitBreakerState | null {
  const circuitBreaker = circuitBreakers.get(operationName);
  return circuitBreaker?.getState() ?? null;
}
