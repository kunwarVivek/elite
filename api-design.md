# RESTful API Design Specification

## API Overview

### Base URL
```
Production: https://api.angelinvesting.com/v1
Staging: https://api-staging.angelinvesting.com/v1
Development: http://localhost:3001/api/v1
```

### Authentication
All API endpoints (except public ones) require authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "errors": null,
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1",
    "request_id": "req_12345"
  }
}
```

### Error Format
```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1",
    "request_id": "req_12345"
  }
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "INVESTOR",
  "profile_data": {
    "bio": "Experienced angel investor",
    "location": "San Francisco, CA"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "INVESTOR"
    },
    "requires_verification": true
  }
}
```

### POST /auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "INVESTOR"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## User Management Endpoints

### GET /users/me
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "INVESTOR",
    "avatar_url": "https://cdn.example.com/avatars/user_123.jpg",
    "profile_data": {
      "bio": "Experienced angel investor",
      "location": "San Francisco, CA",
      "investment_range_min": 10000,
      "investment_range_max": 100000
    },
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /users/me
Update current user profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "profile_data": {
    "bio": "Updated bio",
    "linkedin_url": "https://linkedin.com/in/johnsmith"
  }
}
```

### GET /users/{id}
Get public user profile (for founders to view investors, etc.).

**Path Parameters:**
- `id`: User ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "avatar_url": "https://cdn.example.com/avatars/user_123.jpg",
    "role": "INVESTOR",
    "public_profile": {
      "bio": "Experienced angel investor",
      "location": "San Francisco, CA",
      "investment_focus": ["SaaS", "Fintech", "Healthcare"]
    },
    "portfolio_summary": {
      "total_investments": 15,
      "total_amount_invested": 750000
    }
  }
}
```

## Startup Management Endpoints

### POST /startups
Create a new startup profile.

**Request Body:**
```json
{
  "name": "TechCorp Inc",
  "description": "Revolutionary SaaS platform",
  "industry": "SaaS",
  "stage": "MVP",
  "funding_goal": 500000,
  "website_url": "https://techcorp.com",
  "team_size": 8,
  "founded_date": "2023-06-15",
  "business_model": "Subscription-based SaaS",
  "target_market": "SMBs in healthcare",
  "competitive_advantage": "AI-powered automation"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "startup_123",
    "name": "TechCorp Inc",
    "slug": "techcorp-inc",
    "founder_id": "user_123",
    "is_verified": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /startups/{id}
Get startup details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "startup_123",
    "name": "TechCorp Inc",
    "description": "Revolutionary SaaS platform",
    "industry": "SaaS",
    "stage": "MVP",
    "funding_goal": 500000,
    "current_funding": 150000,
    "founder": {
      "id": "user_123",
      "name": "Jane Founder",
      "avatar_url": "https://cdn.example.com/avatars/user_123.jpg"
    },
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Pitch Management Endpoints

### POST /pitches
Create a new investment pitch.

**Request Body:**
```json
{
  "startup_id": "startup_123",
  "title": "Revolutionary Healthcare SaaS Platform",
  "summary": "AI-powered platform transforming healthcare operations",
  "problem_statement": "Healthcare providers struggle with manual processes",
  "solution": "Automated workflow platform using AI",
  "market_opportunity": "$50B market opportunity in healthcare SaaS",
  "funding_amount": 500000,
  "equity_offered": 10,
  "minimum_investment": 10000,
  "financial_projections": {
    "year1_revenue": 100000,
    "year2_revenue": 500000,
    "year3_revenue": 2000000
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "pitch_123",
    "startup_id": "startup_123",
    "title": "Revolutionary Healthcare SaaS Platform",
    "status": "UNDER_REVIEW",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /pitches
List pitches with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (ACTIVE, FUNDED, etc.)
- `industry`: Filter by industry
- `stage`: Filter by startup stage
- `min_amount`: Minimum funding amount
- `max_amount`: Maximum funding amount
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort_by`: Sort field (created_at, funding_amount, etc.)
- `sort_order`: Sort order (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pitches": [
      {
        "id": "pitch_123",
        "title": "Revolutionary Healthcare SaaS Platform",
        "startup": {
          "id": "startup_123",
          "name": "TechCorp Inc",
          "logo_url": "https://cdn.example.com/logos/startup_123.jpg"
        },
        "funding_amount": 500000,
        "current_funding": 150000,
        "equity_offered": 10,
        "status": "ACTIVE",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### GET /pitches/{id}
Get detailed pitch information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pitch_123",
    "title": "Revolutionary Healthcare SaaS Platform",
    "summary": "AI-powered platform transforming healthcare operations",
    "startup": {
      "id": "startup_123",
      "name": "TechCorp Inc",
      "description": "Healthcare technology company",
      "founder": {
        "id": "user_123",
        "name": "Jane Founder"
      }
    },
    "financial_projections": {
      "year1_revenue": 100000,
      "year2_revenue": 500000
    },
    "comments": [
      {
        "id": "comment_123",
        "user": {"id": "user_456", "name": "Investor Name"},
        "content": "Great pitch! Love the market opportunity.",
        "created_at": "2024-01-02T00:00:00Z"
      }
    ],
    "documents": [
      {
        "id": "doc_123",
        "name": "Pitch Deck.pdf",
        "file_type": "PITCH_DECK",
        "file_url": "https://cdn.example.com/pitch_decks/pitch_123.pdf"
      }
    ]
  }
}
```

## Investment Management Endpoints

### POST /investments
Make an investment in a pitch.

**Request Body:**
```json
{
  "pitch_id": "pitch_123",
  "amount": 25000,
  "equity_percentage": 0.5,
  "payment_method": "BANK_TRANSFER",
  "terms": {
    "vesting_period": 48,
    "cliff_period": 12
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "investment_123",
    "pitch_id": "pitch_123",
    "investor_id": "user_456",
    "amount": 25000,
    "status": "PENDING",
    "escrow_reference": "escrow_789",
    "payment_instructions": {
      "bank_account": "****1234",
      "routing_number": "****5678",
      "reference": "INV_123_456"
    },
    "next_steps": [
      "Complete bank transfer to escrow account",
      "Upload investment agreement",
      "Complete KYC verification"
    ]
  }
}
```

### GET /investments
Get user's investments with filtering.

**Query Parameters:**
- `status`: Filter by status
- `type`: DIRECT or SYNDICATE
- `page`: Page number
- `limit`: Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "investments": [
      {
        "id": "investment_123",
        "pitch": {
          "id": "pitch_123",
          "title": "Healthcare SaaS Platform",
          "startup": {"name": "TechCorp Inc"}
        },
        "amount": 25000,
        "equity_percentage": 0.5,
        "status": "ESCROW",
        "investment_date": "2024-01-15T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

## Portfolio Management Endpoints

### GET /portfolios
Get user's investment portfolios.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolios": [
      {
        "id": "portfolio_123",
        "name": "Tech Investments",
        "description": "Early-stage technology investments",
        "total_value": 150000,
        "total_invested": 125000,
        "investment_count": 8,
        "performance": {
          "total_return": 20000,
          "percentage_return": 16.0
        },
        "investments": [
          {
            "id": "investment_123",
            "startup_name": "TechCorp Inc",
            "amount_invested": 25000,
            "current_value": 30000,
            "status": "ACTIVE"
          }
        ]
      }
    ]
  }
}
```

## Communication Endpoints

### GET /messages
Get user's messages with pagination.

**Query Parameters:**
- `pitch_id`: Filter by pitch
- `user_id`: Filter by specific user
- `page`: Page number
- `limit`: Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "sender": {
          "id": "user_456",
          "name": "Jane Founder",
          "avatar_url": "https://cdn.example.com/avatars/user_456.jpg"
        },
        "subject": "Investment Discussion",
        "content": "Thank you for your interest in our startup...",
        "is_read": false,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

### POST /messages
Send a message.

**Request Body:**
```json
{
  "receiver_id": "user_456",
  "pitch_id": "pitch_123",
  "subject": "Investment Interest",
  "content": "I'm very interested in your healthcare platform...",
  "message_type": "PITCH_INQUIRY"
}
```

### POST /pitches/{id}/comments
Add a comment to a pitch.

**Request Body:**
```json
{
  "content": "This is a great opportunity! The market potential is huge."
}
```

## Document Management Endpoints

### POST /documents/upload
Upload a document (pitch deck, business plan, etc.).

**Request Body (multipart/form-data):**
```
file: <file_data>
startup_id: "startup_123"
file_type: "PITCH_DECK"
is_public: true
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "doc_123",
    "name": "Pitch_Deck_v2.pdf",
    "file_url": "https://cdn.example.com/documents/pitch_123_v2.pdf",
    "file_type": "PITCH_DECK",
    "file_size": 2048576,
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /pitches/{id}/documents
Get all documents for a pitch.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123",
        "name": "Pitch Deck.pdf",
        "file_type": "PITCH_DECK",
        "file_url": "https://cdn.example.com/documents/pitch_123.pdf",
        "file_size": 2048576,
        "download_count": 15,
        "uploaded_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Notification Endpoints

### GET /notifications
Get user's notifications.

**Query Parameters:**
- `is_read`: Filter by read status
- `type`: Filter by notification type
- `page`: Page number
- `limit`: Items per page

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "INVESTMENT_UPDATE",
        "title": "Investment Completed",
        "content": "Your investment in TechCorp Inc has been completed",
        "is_read": false,
        "action_url": "/investments/investment_123",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "total_pages": 1
    }
  }
}
```

### PUT /notifications/{id}/read
Mark notification as read.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "notif_123",
    "is_read": true,
    "read_at": "2024-01-01T00:00:00Z"
  }
}
```

## Admin Endpoints

### GET /admin/users
Get all users (admin only).

**Query Parameters:**
- `role`: Filter by user role
- `is_verified`: Filter by verification status
- `page`: Page number
- `limit`: Items per page

### PUT /admin/startups/{id}/verify
Verify a startup (admin only).

**Request Body:**
```json
{
  "is_verified": true,
  "verification_notes": "Verified after due diligence"
}
```

### GET /admin/analytics
Get platform analytics (admin only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 15420,
      "total_startups": 1250,
      "total_pitches": 890,
      "total_investments": 2340,
      "total_funding": 45670000
    },
    "growth": {
      "users_this_month": 450,
      "startups_this_month": 35,
      "investments_this_month": 67
    }
  }
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute
- File upload endpoints: 10 requests per minute
- Admin endpoints: 60 requests per minute

## Pagination

All list endpoints support pagination with the following parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort_by`: Field to sort by
- `sort_order`: Sort order (asc/desc)

## Filtering and Search

Most list endpoints support filtering through query parameters. Common filters include:
- Date ranges (created_after, created_before)
- Status filters (status, is_verified, etc.)
- Text search (search, query)
- Numeric ranges (min_amount, max_amount)

## WebSocket Events

For real-time features, the API supports WebSocket connections:

### Connection
```
ws://api.angelinvesting.com/v1/ws?token=<jwt_token>
```

### Events

#### Investment Updates
```json
{
  "type": "investment_update",
  "data": {
    "investment_id": "investment_123",
    "status": "COMPLETED",
    "amount": 25000
  }
}
```

#### New Messages
```json
{
  "type": "new_message",
  "data": {
    "message_id": "msg_123",
    "sender_id": "user_456",
    "pitch_id": "pitch_123"
  }
}
```

#### Pitch Updates
```json
{
  "type": "pitch_update",
  "data": {
    "pitch_id": "pitch_123",
    "status": "FUNDED",
    "current_funding": 500000
  }
}
```

This API design provides a comprehensive foundation for the angel investing platform, supporting all core features while maintaining scalability and security best practices.