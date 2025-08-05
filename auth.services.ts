import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout, retryWhen, delayWhen, take } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: any;
  success: boolean;
  message?: string;
}

export interface AuthError {
  code: number;
  message: string;
  details?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = 'http://localhost:7022/api/Auth';
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<LoginResponse>(`${this.API_BASE_URL}/user-login`, credentials, { headers })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        retryWhen(errors =>
          errors.pipe(
            delayWhen((error, index) => {
              // Only retry on network errors, not on HTTP errors like 401, 403, etc.
              if (this.isRetryableError(error) && index < this.MAX_RETRIES - 1) {
                console.log(`Retrying login request (attempt ${index + 1}/${this.MAX_RETRIES}) after ${this.RETRY_DELAY}ms...`);
                return timer(this.RETRY_DELAY);
              }
              return throwError(error);
            }),
            take(this.MAX_RETRIES)
          )
        ),
        catchError(this.handleError.bind(this))
      );
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and server unavailable errors
    return error.status === 0 ||           // Network error
           error.status === 408 ||          // Request timeout
           error.status === 502 ||          // Bad gateway
           error.status === 503 ||          // Service unavailable
           error.status === 504 ||          // Gateway timeout
           error.name === 'TimeoutError';   // RxJS timeout error
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let authError: AuthError;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      authError = {
        code: 0,
        message: 'Network error occurred. Please check your internet connection.',
        details: error.error.message,
        timestamp: new Date()
      };
    } else if (error.status === 0) {
      // Network error or server not responding
      authError = {
        code: 0,
        message: 'Unable to connect to the authentication server. Please ensure the server is running and try again.',
        details: 'Server may be offline or unreachable at http://localhost:7022',
        timestamp: new Date()
      };
    } else if (error.name === 'TimeoutError') {
      // Request timeout
      authError = {
        code: 408,
        message: 'Request timed out. The server is taking too long to respond.',
        details: `Request exceeded ${this.REQUEST_TIMEOUT}ms timeout`,
        timestamp: new Date()
      };
    } else {
      // Server-side error
      authError = {
        code: error.status,
        message: this.getErrorMessage(error.status),
        details: error.error?.message || error.message,
        timestamp: new Date()
      };
    }

    console.error('Authentication Error:', authError);
    return throwError(authError);
  }

  private getErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid login credentials provided.';
      case 401:
        return 'Invalid username or password.';
      case 403:
        return 'Access forbidden. Please contact your administrator.';
      case 404:
        return 'Authentication service not found.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. The server is taking too long to respond.';
      default:
        return `An unexpected error occurred (Status: ${status}).`;
    }
  }

  // Method to check if the auth server is reachable
  checkServerHealth(): Observable<boolean> {
    return this.http.get(`${this.API_BASE_URL}/health`, { 
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      timeout(5000),
      catchError(() => throwError(false))
    );
  }
}