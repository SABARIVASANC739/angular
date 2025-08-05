import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginDto, AuthError } from '../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  // Property names match the LoginDto interface and the template
  loginDto: LoginDto = { Name: '', Password: '' };
  errorMessage: string | null = null;
  isLoading = false;
  showRetryButton = false;
  connectionStatus = 'checking'; // 'checking', 'connected', 'disconnected'
  retryAttempts = 0;
  maxRetryAttempts = 3;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.checkServerConnection();
  }

  checkServerConnection(): void {
    this.connectionStatus = 'checking';
    
    // Try the health endpoint first, fallback to auth endpoint
    this.authService.checkServerHealth().subscribe({
      next: () => {
        this.connectionStatus = 'connected';
        this.errorMessage = null;
        this.showRetryButton = false;
      },
      error: () => {
        // Fallback to checking auth endpoint
        this.authService.checkAuthEndpointHealth().subscribe({
          next: () => {
            this.connectionStatus = 'connected';
            this.errorMessage = null;
            this.showRetryButton = false;
          },
          error: () => {
            this.connectionStatus = 'disconnected';
            this.errorMessage = 'Unable to connect to the authentication server. Please check if the server is running.';
            this.showRetryButton = true;
          }
        });
      }
    });
  }

  onLogin(): void {
    // Basic validation
    if (!this.loginDto.Name || !this.loginDto.Password) {
      this.errorMessage = 'Please enter both username and password.';
      return;
    }

    if (this.connectionStatus === 'disconnected') {
      this.errorMessage = 'Cannot login: Server is not reachable. Please check server connection first.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.showRetryButton = false;

    this.authService.login(this.loginDto).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.token) {
          // Login successful, navigate to home
          this.router.navigate(['/']);
        } else {
          this.errorMessage = 'Login failed. No token received from server.';
        }
      },
      error: (error: AuthError) => {
        this.isLoading = false;
        this.handleLoginError(error);
      }
    });
  }

  private handleLoginError(error: AuthError): void {
    console.error('Login failed:', error);
    
    this.errorMessage = error.message;
    
    // Show retry button for network-related errors
    if (error.code === 0 || error.code === 408 || error.code >= 502) {
      this.showRetryButton = true;
      this.connectionStatus = 'disconnected';
    }

    // Provide specific guidance based on error type
    if (error.code === 0) {
      this.errorMessage += ' Please ensure the backend server is running.';
    } else if (error.code === 401) {
      // Clear password for security
      this.loginDto.Password = '';
      this.errorMessage = 'Invalid username or password. Please try again.';
    }
  }

  onRetry(): void {
    if (this.retryAttempts < this.maxRetryAttempts) {
      this.retryAttempts++;
      this.checkServerConnection();
      
      // If server is back online, try login again
      setTimeout(() => {
        if (this.connectionStatus === 'connected' && this.loginDto.Name && this.loginDto.Password) {
          this.onLogin();
        }
      }, 1000);
    } else {
      this.errorMessage = 'Maximum retry attempts reached. Please check your server configuration and try again later.';
      this.showRetryButton = false;
    }
  }

  onRefreshConnection(): void {
    this.retryAttempts = 0;
    this.checkServerConnection();
  }

  // Helper method to check if form is valid
  isFormValid(): boolean {
    return !!(this.loginDto.Name && this.loginDto.Password);
  }
}