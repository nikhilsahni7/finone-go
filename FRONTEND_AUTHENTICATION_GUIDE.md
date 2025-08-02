# 🔐 Frontend Authentication Integration Guide

## Overview

This guide explains how to integrate with the new **session-based JWT authentication system**. The backend now implements proper session management with server-side token validation and invalidation.

## 🏗️ Authentication Architecture

### Backend System

- **JWT Tokens**: 24-hour expiry (configurable in `config.yaml`)
- **Session Management**: Database-backed session tracking
- **Security**: SHA256 token hashing, real-time user validation
- **Logout**: Server-side session invalidation

### Key Features

- ✅ Proper session management
- ✅ Server-side logout functionality
- ✅ Real-time user status checking
- ✅ Configurable JWT expiry
- ✅ Admin session monitoring

---

## 📡 API Endpoints

### Base URL

```
http://localhost:8082/api/v1
```

---

## 🔑 Authentication Endpoints

### 1. Login

**Endpoint:** `POST /auth/login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "f1000573-5228-4faf-8ff9-75e29e81b841",
    "name": "John Doe",
    "email": "user@example.com",
    "user_type": "PERMANENT",
    "role": "USER",
    "expires_at": null,
    "is_active": true,
    "max_searches_per_day": 500,
    "max_exports_per_day": 3,
    "created_at": "2025-08-02T03:52:39.846608Z",
    "updated_at": "2025-08-02T03:52:39.846608Z"
  },
  "expires_at": "2025-08-04T03:01:23.825637652+05:30",
  "session_id": "1866f38e-3697-45c4-85e9-7da17ea5aedc"
}
```

**Response (Error - 401):**

```json
{
  "error": "invalid credentials"
}
```

### 2. Logout

**Endpoint:** `POST /users/logout`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Response (Success - 200):**

```json
{
  "message": "Logged out successfully",
  "note": "Session has been invalidated on the server"
}
```

**Response (Error - 401):**

```json
{
  "error": "Invalid session",
  "details": "invalid or expired session"
}
```

---

## 👤 User Endpoints

### 1. Get User Profile

**Endpoint:** `GET /users/profile`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Response (Success - 200):**

```json
{
  "id": "f1000573-5228-4faf-8ff9-75e29e81b841",
  "name": "John Doe",
  "email": "user@example.com",
  "user_type": "PERMANENT",
  "role": "USER",
  "expires_at": null,
  "is_active": true,
  "max_searches_per_day": 500,
  "max_exports_per_day": 3,
  "created_at": "2025-08-02T03:52:39.846608Z",
  "updated_at": "2025-08-02T03:52:39.846608Z"
}
```

### 2. Update User Profile

**Endpoint:** `PUT /users/profile`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request:**

```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

---

## 👑 Admin Endpoints

### 1. Create User (Admin Only)

**Endpoint:** `POST /admin/users`

**Headers:**

```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Request:**

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "user_type": "PERMANENT",
  "role": "USER",
  "max_searches_per_day": 500,
  "max_exports_per_day": 3
}
```

### 2. Get All Users (Admin Only)

**Endpoint:** `GET /admin/users?page=1&limit=10`

**Response:**

```json
{
  "users": [...],
  "total_count": 25,
  "page": 1,
  "limit": 10
}
```

### 3. Update User (Admin Only)

**Endpoint:** `PUT /admin/users/{user_id}`

**Request:**

```json
{
  "name": "Updated Name",
  "is_active": false,
  "max_searches_per_day": 1000
}
```

### 4. Session Management (Admin Only)

#### Get All Active Sessions

**Endpoint:** `GET /admin/sessions`

**Response:**

```json
{
  "sessions": [
    {
      "id": "d299ca06-42c0-45bc-8ec7-63c80b381728",
      "user_id": "f1000573-5228-4faf-8ff9-75e29e81b841",
      "created_at": "2025-08-03T03:02:36.745348Z",
      "expires_at": "2025-08-04T03:02:36.74528Z",
      "is_active": true,
      "ip_address": "127.0.0.1",
      "user_agent": "",
      "logged_out_at": null
    }
  ]
}
```

#### Get User Sessions

**Endpoint:** `GET /admin/users/{user_id}/sessions`

#### Invalidate All User Sessions

**Endpoint:** `DELETE /admin/users/{user_id}/sessions`

#### Cleanup Expired Sessions

**Endpoint:** `POST /admin/sessions/cleanup`

---

## 🔒 Error Handling

### Common Error Responses

#### 401 Unauthorized

```json
{
  "error": "Invalid session",
  "details": "invalid or expired session"
}
```

#### 403 Forbidden (Admin required)

```json
{
  "error": "Admin access required"
}
```

#### 400 Bad Request

```json
{
  "error": "Invalid request data"
}
```

---

## 💻 Frontend Implementation

### 1. Setup Axios Interceptor

```javascript
import axios from "axios";

const API_BASE_URL = "http://localhost:8082/api/v1";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or session expired
      localStorage.removeItem("access_token");
      localStorage.removeItem("session_id");
      localStorage.removeItem("user");

      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Authentication Service

```javascript
class AuthService {
  // Login
  async login(email, password) {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user, expires_at, session_id } = response.data;

      // Store in localStorage
      localStorage.setItem("access_token", token);
      localStorage.setItem("session_id", session_id);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token_expires_at", expires_at);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  }

  // Logout
  async logout() {
    try {
      await api.post("/users/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("session_id");
      localStorage.removeItem("user");
      localStorage.removeItem("token_expires_at");

      window.location.href = "/login";
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem("access_token");
    const expiresAt = localStorage.getItem("token_expires_at");

    if (!token || !expiresAt) return false;

    // Check if token is expired
    if (new Date(expiresAt) <= new Date()) {
      this.logout();
      return false;
    }

    return true;
  }

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is admin
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === "ADMIN";
  }
}

export default new AuthService();
```

### 3. React Authentication Hook

```javascript
import { useState, useEffect, createContext, useContext } from "react";
import AuthService from "./AuthService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    if (AuthService.isAuthenticated()) {
      setUser(AuthService.getCurrentUser());
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const result = await AuthService.login(email, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 4. Protected Route Component

```javascript
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

### 5. Login Component Example

```javascript
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(credentials.email, credentials.password);

    if (result.success) {
      // Redirect based on user role
      if (result.user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) =>
          setCredentials({ ...credentials, email: e.target.value })
        }
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) =>
          setCredentials({ ...credentials, password: e.target.value })
        }
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginPage;
```

---

## 🛡️ Security Best Practices

### 1. Token Storage

- Store JWT tokens in `localStorage` or `sessionStorage`
- Never store tokens in cookies for XSS protection
- Clear tokens immediately on logout

### 2. Error Handling

- Always handle 401 responses by clearing auth state
- Provide clear error messages to users
- Log authentication errors for debugging

### 3. Session Management

- Check token expiry before making requests
- Implement auto-logout on token expiry
- Handle network errors gracefully

### 4. Admin Features

- Always verify admin role before showing admin UI
- Use separate route protection for admin pages
- Implement proper error boundaries

---

## 🔧 Configuration

### JWT Expiry Settings

The JWT expiry can be configured in `backend/config/config.yaml`:

```yaml
jwt:
  secret: "your-super-secret-key-change-in-production"
  expiry: 24h # Can be: 20m, 1h, 6h, 24h, 168h (7 days), etc.
```

### Environment Variables

For production, consider using environment variables:

- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRY`: Token expiry duration
- `API_BASE_URL`: Backend API URL

---

## 📝 Testing Checklist

### Authentication Flow

- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Access protected routes
- ✅ Logout functionality
- ✅ Session expiry handling
- ✅ Automatic token refresh (if implemented)

### Admin Features

- ✅ Admin login and access
- ✅ User management (CRUD)
- ✅ Session monitoring
- ✅ Role-based access control

### Error Scenarios

- ✅ Network errors
- ✅ Server errors (500)
- ✅ Unauthorized access (401)
- ✅ Forbidden access (403)
- ✅ Invalid data (400)

---

## 🚀 Deployment Notes

### Production Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Configure proper CORS settings
3. **Secrets**: Use environment variables for secrets
4. **Logging**: Implement proper error logging
5. **Monitoring**: Monitor authentication failures

### Frontend Build

```bash
# Environment variables for production
REACT_APP_API_URL=https://api.yourapp.com/api/v1
REACT_APP_JWT_EXPIRY_WARNING=5  # minutes before expiry to warn user
```

---

## 📞 Support

For any issues with authentication integration:

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Ensure JWT tokens are being sent correctly
4. Test with Postman/curl first
5. Check backend logs for authentication errors

---

**The authentication system is production-ready and handles all session management server-side. The frontend just needs to handle token storage and API communication properly.**
