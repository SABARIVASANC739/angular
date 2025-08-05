import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, timeout, retryWhen, delayWhen, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

// DTOs
export interface LoginDto {
  Name: string;
  Password: string;
}

export interface UserAddDto {
  Name: string;
  Email: string;
  PhoneNumber: string;
  Password: string;
}

export interface AuthResponseDto {
  token: string;
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
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(private http: HttpClient) { }

  /**
   * Submits a login request to the /Auth/user-login endpoint.
   * On success, it stores the token in local storage.
   */
  login(loginDto: LoginDto): Observable<AuthResponseDto> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<AuthResponseDto>(`${environment.apiUrl}/Auth/user-login`, loginDto, { headers }).pipe(
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
      map(response => {
        if (response.token) {
          this.setToken(response.token);
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Submits a registration request to the /User/adduser endpoint.
   */
  register(userAddDto: UserAddDto): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post(`${environment.apiUrl}/User/adduser`, userAddDto, { headers }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retryWhen(errors =>
        errors.pipe(
          delayWhen((error, index) => {
            if (this.isRetryableError(error) && index < this.MAX_RETRIES - 1) {
              console.log(`Retrying registration request (attempt ${index + 1}/${this.MAX_RETRIES}) after ${this.RETRY_DELAY}ms...`);
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

  /**
   * Check if the auth server is reachable
   */
  checkServerHealth(): Observable<boolean> {
    return this.http.get(`${environment.apiUrl}/health`, { 
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      timeout(5000),
      map(() => true),
      catchError(() => throwError(false))
    );
  }

  /**
   * Alternative health check using the auth endpoint with a HEAD request
   */
  checkAuthEndpointHealth(): Observable<boolean> {
    return this.http.head(`${environment.apiUrl}/Auth/user-login`).pipe(
      timeout(5000),
      map(() => true),
      catchError(() => throwError(false))
    );
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken.sub ? +decodedToken.sub : null;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  }

  getUserDetails(): any | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (e) {
      return true;
    }
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
        details: `Server may be offline or unreachable at ${environment.apiUrl}`,
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
    return throwError(() => authError);
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
}