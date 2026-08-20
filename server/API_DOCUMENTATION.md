# WB Kanban API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected routes require a JWT token in an HTTP-only cookie.

- Cookie name: `token`
- Expiry: 8 hours
- Set automatically on login

---

## Response Format

All endpoints return responses in this format:

```json
{
  "success": true | false,
  "message": "Description of the result",
  "data": { ... }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Server Error - Internal error |

---

## Auth Endpoints

### POST /api/auth/register

Create a new user account.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "Employee"
}
```

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 6 characters |
| name | string | Yes | Any string |
| role | string | No | "Supervisor" or "Employee" (default: "Employee") |

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Employee"
  }
}
```

**Error Responses:**

```json
// Missing fields
{
  "success": false,
  "message": "Email, password, and name are required."
}

// Invalid email
{
  "success": false,
  "message": "Invalid email format."
}

// Invalid role
{
  "success": false,
  "message": "Role must be 'Supervisor' or 'Employee'."
}

// Duplicate email
{
  "success": false,
  "message": "Email already registered."
}
```

---

### POST /api/auth/login

Login and receive JWT token.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Employee"
  }
}
```

**Cookie Set:**
```
token=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Strict; Path=/
```

**Error Responses:**

```json
// Missing credentials
{
  "success": false,
  "message": "Email and password are required."
}

// Invalid credentials
{
  "success": false,
  "message": "Invalid email or password."
}
```

---

### POST /api/auth/logout

Clear JWT cookie and logout.

**Access:** Authenticated

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### GET /api/auth/me

Get current logged-in user info.

**Access:** Authenticated

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Employee"
  }
}
```

**Error Response:**

```json
// User not found
{
  "success": false,
  "message": "User not found."
}
```

---

## Employee Endpoints

All employee endpoints require:
- Authentication (valid JWT token)
- Supervisor role

---

### GET /api/employees

List all team members.

**Access:** Supervisor only

**Headers:**
```
Cookie: token=YOUR_JWT_TOKEN
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "teamMemberId": 1,
        "userId": 2,
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "Employee",
        "isActive": true,
        "joinedAt": "2026-08-20T09:30:00.000Z"
      },
      {
        "teamMemberId": 2,
        "userId": 3,
        "fullName": "Jane Smith",
        "email": "jane@example.com",
        "role": "Employee",
        "isActive": false,
        "joinedAt": "2026-08-19T14:20:00.000Z"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| teamMemberId | number | Unique ID for team membership |
| userId | number | Unique ID for the user |
| fullName | string | User's full name |
| email | string | User's email |
| role | string | "Employee" or "Supervisor" |
| isActive | boolean | Account status |
| joinedAt | string | ISO date when joined team |

---

### POST /api/employees

Add a new employee to the team.

**Access:** Supervisor only

**Headers:**
```
Cookie: token=YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newemployee@example.com",
  "password": "securepass123",
  "name": "New Employee"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 6 characters |
| name | string | Yes | Any string |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Employee added successfully.",
  "data": {
    "employee": {
      "userId": 4,
      "email": "newemployee@example.com",
      "name": "New Employee",
      "role": "Employee"
    }
  }
}
```

**Error Responses:**

```json
// Missing fields
{
  "success": false,
  "message": "Email, password, and name are required."
}

// Invalid email
{
  "success": false,
  "message": "Invalid email format."
}

// Short password
{
  "success": false,
  "message": "Password must be at least 6 characters."
}

// Duplicate email
{
  "success": false,
  "message": "Email already registered."
}
```

---

### PATCH /api/employees/:id

Toggle employee active/inactive status.

**Access:** Supervisor only

**Headers:**
```
Cookie: token=YOUR_JWT_TOKEN
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | The userId of the employee |

**Success Response (200):**
```json
// Deactivating
{
  "success": true,
  "message": "Employee is now inactive.",
  "data": { "isActive": false }
}

// Activating
{
  "success": true,
  "message": "Employee is now active.",
  "data": { "isActive": true }
}
```

**Error Responses:**

```json
// Invalid ID
{
  "success": false,
  "message": "Invalid user ID."
}

// Employee not found
{
  "success": false,
  "message": "Employee not found."
}

// Trying to toggle yourself
{
  "success": false,
  "message": "Cannot change your own account status."
}
```

---

### DELETE /api/employees/:id

Remove employee from the team.

**Access:** Supervisor only

**Headers:**
```
Cookie: token=YOUR_JWT_TOKEN
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | The teamMemberId of the employee |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Employee removed from team successfully."
}
```

**Error Responses:**

```json
// Invalid ID
{
  "success": false,
  "message": "Invalid team member ID."
}

// Not in team
{
  "success": false,
  "message": "Employee not found in team."
}

// Trying to remove yourself
{
  "success": false,
  "message": "Cannot remove yourself from the team."
}
```

---

## Health Check

### GET /api/v1/health

Check API and database status.

**Access:** Public

**Success Response (200):**
```json
{
  "success": true,
  "database": "connected",
  "currentTime": "2026-08-20T17:30:00.000Z",
  "message": "wb-kanban API is running"
}
```

---

## Postman Collection

### Quick Test Flow

```
1. POST /api/auth/login (Supervisor)
2. GET /api/auth/me (verify Supervisor role)
3. POST /api/employees (create employee)
4. GET /api/employees (list all)
5. PATCH /api/employees/:userId (toggle status)
6. DELETE /api/employees/:teamMemberId (remove from team)
```

### Environment Variables

```
base_url = http://localhost:3000
```

### Pre-request Script (Auto-set cookie)

```javascript
pm.test("Cookie is set", function () {
    pm.environment.set("token", pm.response.cookies.get("token"));
});
```

---

## Database Schema

### users table

| Column | Type | Constraints |
|--------|------|-------------|
| userId | INT | PRIMARY KEY, IDENTITY |
| email | NVARCHAR | UNIQUE, NOT NULL |
| password | NVARCHAR | NOT NULL |
| fullName | NVARCHAR | NOT NULL |
| role | NVARCHAR | 'Supervisor' or 'Employee' |
| isActive | BIT | DEFAULT 1 |
| createdAt | DATETIME | DEFAULT GETDATE() |

### teamMembers table

| Column | Type | Constraints |
|--------|------|-------------|
| teamMemberId | INT | PRIMARY KEY, IDENTITY |
| userId | INT | FOREIGN KEY → users.userId |
| joinedAt | DATETIME | DEFAULT GETDATE() |

---

## File Structure

```
server/src/
├── app.js
├── config/
│   ├── db.js
│   └── jwt.js
├── middlewares/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
└── api/
    ├── auth/
    │   ├── authRoute.js
    │   ├── authController.js
    │   └── authServices.js
    └── employees/
        ├── employeesRoute.js
        ├── employeesController.js
        └── employeesServices.js
```
