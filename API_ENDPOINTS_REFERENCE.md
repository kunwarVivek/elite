# API Endpoints Reference

Quick reference for all API endpoints needed by the new frontend pages.

## ✅ Implemented Endpoints

### SPV Endpoints

#### Get User's SPVs
```http
GET /api/spvs/my-spvs?status=ACTIVE
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "spv_123",
      "name": "Tech Startup SPV",
      "slug": "tech-startup-spv-abc123",
      "targetRaise": 500000,
      "committed": 350000,
      "investorCount": 12,
      "status": "ACTIVE",
      "dealType": "SPV Investment",
      "targetCompany": "TechCo",
      "minimumInvestment": 10000,
      "deadline": "2025-12-31T00:00:00Z",
      "managementFee": 2.0,
      "carriedInterest": 20.0,
      "createdAt": "2025-01-01T00:00:00Z",
      "userRole": "INVESTOR",
      "userCommitment": 25000
    }
  ]
}
```

#### Get SPV Details
```http
GET /api/spvs/:slug
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "spv_123",
    "name": "Tech Startup SPV",
    "slug": "tech-startup-spv-abc123",
    "description": "SPV for TechCo investment",
    "targetRaise": 500000,
    "committed": 350000,
    "minimumInvestment": 10000,
    "status": "ACTIVE",
    "investorCount": 12,
    "leadInvestor": {
      "id": "user_123",
      "name": "Jane Investor",
      "email": "jane@example.com"
    },
    "investors": [...],
    "documents": [...],
    "updates": [...]
  }
}
```

### Search Endpoints

#### Global Search
```http
GET /api/search?q=fintech&type=PITCH
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "pitch_123",
      "type": "PITCH",
      "title": "FinTech Startup Pitch",
      "description": "Revolutionary payment solution",
      "url": "/pitches/fintech-startup-pitch-abc123",
      "metadata": {
        "amount": 250000,
        "status": "ACTIVE",
        "date": "2025-01-01T00:00:00Z"
      }
    }
  ],
  "meta": {
    "query": "fintech",
    "totalResults": 1,
    "types": ["PITCH"]
  }
}
```

## ⏳ Missing Endpoints to Implement

### User Settings Endpoints

#### Get Account Settings
```http
GET /api/users/account-settings
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": true,
    "accountCreatedAt": "2024-01-01T00:00:00Z",
    "privacy": {
      "profileVisibility": "PUBLIC",
      "showInvestmentHistory": true,
      "showPortfolio": true,
      "allowMessaging": true
    }
  }
}
```

#### Update Account Settings
```http
PUT /api/users/account-settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newusername",
  "privacy": {
    "profileVisibility": "INVESTORS_ONLY",
    "showInvestmentHistory": false
  }
}

Expected Response:
{
  "success": true,
  "message": "Account settings updated"
}
```

#### Export User Data
```http
POST /api/users/export-data
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "expiresAt": "2025-11-08T00:00:00Z"
  }
}

Or direct file download with Content-Disposition header
```

#### Delete Account
```http
DELETE /api/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "confirmation": "DELETE MY ACCOUNT"
}

Expected Response:
{
  "success": true,
  "message": "Account deleted successfully"
}
```

#### Upload Avatar
```http
POST /api/users/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
  avatar: [file]

Expected Response:
{
  "success": true,
  "data": {
    "avatarUrl": "https://..."
  }
}
```

### Security Endpoints

#### Get Security Settings
```http
GET /api/users/security-settings
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "data": {
    "twoFactorEnabled": false,
    "twoFactorMethod": null,
    "lastPasswordChange": "2024-01-01T00:00:00Z",
    "activeSessions": [
      {
        "id": "session_123",
        "device": "Chrome on Windows",
        "browser": "Chrome 120",
        "location": "San Francisco, CA",
        "ipAddress": "192.168.1.1",
        "lastActive": "2025-11-07T12:00:00Z",
        "isCurrent": true
      }
    ],
    "loginHistory": [...]
  }
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}

Expected Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### Setup 2FA
```http
POST /api/auth/2fa/setup
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

#### Verify 2FA
```http
POST /api/auth/2fa/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "123456"
}

Expected Response:
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": ["abc-def-ghi", "jkl-mno-pqr"]
  }
}
```

#### Disable 2FA
```http
POST /api/auth/2fa/disable
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

#### Revoke Session
```http
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "Session revoked successfully"
}
```

#### Revoke All Sessions
```http
POST /api/auth/sessions/revoke-all
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "All sessions revoked except current"
}
```

### Payment Methods Endpoints

#### Add Bank Account
```http
POST /api/payment-methods/bank
Authorization: Bearer {token}
Content-Type: application/json

{
  "routingNumber": "123456789",
  "accountNumber": "9876543210",
  "accountType": "CHECKING"
}

Expected Response:
{
  "success": true,
  "data": {
    "id": "pm_bank_123",
    "type": "BANK_ACCOUNT",
    "bankName": "Chase Bank",
    "accountType": "CHECKING",
    "last4": "3210",
    "isDefault": false,
    "isVerified": false,
    "addedAt": "2025-11-07T12:00:00Z"
  }
}
```

#### Add Card
```http
POST /api/payment-methods/card
Authorization: Bearer {token}
Content-Type: application/json

{
  "cardNumber": "4242424242424242",
  "expiryMonth": "12",
  "expiryYear": "2028",
  "cvv": "123",
  "zipCode": "94102"
}

Expected Response:
{
  "success": true,
  "data": {
    "id": "pm_card_123",
    "type": "CARD",
    "brand": "VISA",
    "last4": "4242",
    "expiryMonth": 12,
    "expiryYear": 2028,
    "isDefault": false,
    "addedAt": "2025-11-07T12:00:00Z"
  }
}
```

#### Set Default Payment Method
```http
POST /api/payment-methods/:id/set-default
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "Default payment method updated"
}
```

#### Delete Payment Method
```http
DELETE /api/payment-methods/:id
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "Payment method deleted"
}
```

### Syndicate Endpoints

#### Apply to Join Syndicate
```http
POST /api/syndicates/:id/apply
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "message": "Application submitted",
  "data": {
    "applicationId": "app_123",
    "status": "PENDING"
  }
}
```

#### Commit to Syndicate
```http
POST /api/syndicates/:id/commit
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 50000
}

Expected Response:
{
  "success": true,
  "data": {
    "commitmentId": "commit_123",
    "amount": 50000,
    "setupFee": 500,
    "managementFee": 1000,
    "totalDue": 51500
  }
}
```

#### Get Commitment Payment Info
```http
GET /api/syndicates/commitments/:commitmentId/payment-info
Authorization: Bearer {token}

Expected Response:
{
  "success": true,
  "data": {
    "commitment": {
      "id": "commit_123",
      "amount": 50000,
      "setupFee": 500,
      "managementFee": 1000,
      "totalDue": 51500
    },
    "syndicate": {
      "id": "syn_123",
      "name": "Tech Angels Syndicate",
      "slug": "tech-angels-syndicate"
    },
    "paymentMethods": [...]
  }
}
```

#### Process Syndicate Payment
```http
POST /api/syndicates/commitments/:commitmentId/pay
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentMethodId": "pm_123"
}

Expected Response:
{
  "success": true,
  "data": {
    "paymentId": "pay_123",
    "status": "PROCESSING",
    "message": "Payment initiated successfully"
  }
}
```

## 🔒 Authentication

All endpoints require Bearer token authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚨 Error Responses

All endpoints follow consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 📝 Implementation Notes

### Stripe Integration
Payment methods endpoints should integrate with Stripe:
- Use Stripe.js for client-side tokenization
- Store Stripe payment method IDs
- Never store raw card numbers or account details

### 2FA Implementation
Recommended libraries:
- `speakeasy` - TOTP generation
- `qrcode` - QR code generation
- Store encrypted 2FA secrets

### Session Management
Recommended approach:
- Use Redis for session storage
- Store session metadata (device, location, IP)
- Implement session expiration
- Track last activity timestamp

### File Uploads
Avatar uploads:
- Use `multer` middleware
- Store in S3 or equivalent
- Validate file types and sizes
- Generate thumbnails if needed

---

**Last Updated**: 2025-11-07
