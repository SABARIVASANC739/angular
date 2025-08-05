import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest, AuthError } from './auth.services';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showRetryButton = false;
  connectionStatus = 'checking'; // 'checking', 'connected', 'disconnected'
  retryAttempts = 0;
  maxRetryAttempts = 3;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.checkServerConnection();
  }

  checkServerConnection(): void {
    this.connectionStatus = 'checking';
    this.authService.checkServerHealth().subscribe({
      next: () => {
        this.connectionStatus = 'connected';
        this.errorMessage = '';
        this.showRetryButton = false;
      },
      error: () => {
        this.connectionStatus = 'disconnected';
        this.errorMessage = 'Unable to connect to the authentication server. Please check if the server is running.';
        this.showRetryButton = true;
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.connectionStatus === 'disconnected') {
      this.errorMessage = 'Cannot login: Server is not reachable. Please check server connection first.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.showRetryButton = false;

    const credentials: LoginRequest = {
      username: this.loginForm.get('username')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          // Store token and redirect
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || 'Login failed. Please try again.';
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
      this.errorMessage += ' Please ensure the backend server is running on http://localhost:7022';
    } else if (error.code === 401) {
      // Clear form for security
      this.loginForm.get('password')?.setValue('');
    }
  }

  onRetry(): void {
    if (this.retryAttempts < this.maxRetryAttempts) {
      this.retryAttempts++;
      this.checkServerConnection();
      
      // If server is back online, try login again
      setTimeout(() => {
        if (this.connectionStatus === 'connected' && this.loginForm.valid) {
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

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
}