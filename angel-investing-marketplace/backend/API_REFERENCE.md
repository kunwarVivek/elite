# Angel Investing Marketplace - API Reference

Complete API documentation for investment instruments and deal management backend.

**Base URL**: `http://localhost:5000/api` (development)

**Authentication**: All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [SAFE Agreements](#safe-agreements)
2. [Convertible Notes](#convertible-notes)
3. [Cap Tables](#cap-tables)
4. [Equity Rounds](#equity-rounds)
5. [Term Sheets](#term-sheets)
6. [Investor Rights](#investor-rights)
7. [Exit Events](#exit-events)
8. [Data Models](#data-models)
9. [Error Handling](#error-handling)

---

## SAFE Agreements

### Create SAFE Agreement
**POST** `/safes`

Create a new Simple Agreement for Future Equity.

**Request Body**:
```json
{
  "investmentId": "string (cuid)",
  "type": "POST_MONEY | PRE_MONEY",
  "investmentAmount": number,
  "valuationCap": number (optional),
  "discountRate": number (optional, 0-100),
  "proRataRight": boolean (optional),
  "mfnProvision": boolean (optional),
  "qualifiedFinancingThreshold": number (optional),
  "documentUrl": "string (URL, optional)"
}
```

**Response**: SAFE object with relations

**Access**: Investor, Admin

---

### Get SAFE by ID
**GET** `/safes/:id`

Retrieve a specific SAFE agreement.

**Response**: SAFE object with investment, investor, and startup details

**Access**: Investor (own), Founder (startup), Admin

---

### Get SAFEs by Startup
**GET** `/safes/startup/:startupId`

Get all SAFE agreements for a startup.

**Response**: Array of SAFE objects

**Access**: Founder (own startup), Admin

---

### Get SAFEs by Investor
**GET** `/safes/investor/:investorId`

Get all SAFE agreements for an investor.

**Response**: Array of SAFE objects

**Access**: Investor (own), Admin

---

### Update SAFE
**PUT** `/safes/:id`

Update SAFE agreement details.

**Request Body**: Partial SAFE object

**Access**: Investor (own), Founder (startup), Admin

---

### Convert SAFE
**POST** `/safes/:id/convert`

Convert SAFE to equity.

**Request Body**:
```json
{
  "roundId": "string (cuid)",
  "pricePerShare": number,
  "roundValuation": number
}
```

**Response**: Conversion details with shares issued

**Access**: Founder, Admin

---

### Calculate Conversion
**POST** `/safes/:id/calculate-conversion`

Calculate potential conversion without executing.

**Request Body**:
```json
{
  "roundValuation": number,
  "pricePerShare": number
}
```

**Response**: Calculated conversion price and shares

**Access**: All authenticated users

---

### Dissolve SAFE
**POST** `/safes/:id/dissolve`

Dissolve a SAFE agreement.

**Request Body**:
```json
{
  "reason": "string (10-500 chars)"
}
```

**Access**: Founder, Admin

---

### Check Conversion Triggers
**GET** `/safes/startup/:startupId/triggers`

Check if any SAFEs should be converted based on recent rounds.

**Query Params**: `roundAmount` (optional)

**Response**: Array of conversion triggers

**Access**: Founder, Admin

---

## Convertible Notes

### Create Convertible Note
**POST** `/notes`

Create a new convertible note.

**Request Body**:
```json
{
  "investmentId": "string (cuid)",
  "principalAmount": number,
  "interestRate": number (0-100),
  "maturityDate": "ISO 8601 date",
  "discountRate": number (optional, 0-100),
  "valuationCap": number (optional),
  "autoConversion": boolean (optional, default: true),
  "qualifiedFinancingThreshold": number (optional),
  "securityType": "string (optional, default: 'Preferred')",
  "compounding": "SIMPLE | COMPOUND (optional, default: SIMPLE)",
  "documentUrl": "string (URL, optional)"
}
```

**Response**: Convertible note object

**Access**: Investor, Admin

---

### Get Note by ID
**GET** `/notes/:id`

**Response**: Note object with investment and startup details

---

### Get Notes by Startup
**GET** `/notes/startup/:startupId`

**Response**: Array of note objects

---

### Get Notes by Investor
**GET** `/notes/investor/:investorId`

**Response**: Array of note objects

**Access**: Investor (own), Admin

---

### Get Maturing Notes
**GET** `/notes/maturing`

Get notes maturing within 30 days.

**Query Params**: `days` (optional, default: 30)

**Response**: Array of maturing notes

**Access**: Admin

---

### Accrue Interest
**POST** `/notes/:id/accrue`

Manually accrue interest on a note.

**Response**: Updated note with accrued interest

**Access**: Founder, Admin

---

### Calculate Interest
**GET** `/notes/:id/interest`

Calculate current accrued interest (read-only).

**Response**:
```json
{
  "accruedInterest": number
}
```

---

### Convert Note
**POST** `/notes/:id/convert`

Convert note to equity.

**Request Body**:
```json
{
  "pricePerShare": number,
  "roundValuation": number (optional)
}
```

**Response**: Conversion details with shares

**Access**: Founder, Admin

---

### Repay Note
**POST** `/notes/:id/repay`

Repay note at maturity.

**Request Body**:
```json
{
  "repaymentAmount": number
}
```

**Response**: Repayment confirmation

**Access**: Founder, Admin

---

### Calculate Conversion
**POST** `/notes/:id/calculate-conversion`

Calculate potential conversion (read-only).

**Request Body**:
```json
{
  "pricePerShare": number
}
```

**Response**: Conversion calculation details

---

### Check Qualified Financing
**POST** `/notes/:id/check-qualified-financing`

Check if a round qualifies for conversion.

**Request Body**:
```json
{
  "roundAmount": number
}
```

**Response**:
```json
{
  "isQualified": boolean,
  "roundAmount": number
}
```

---

## Cap Tables

### Create Cap Table
**POST** `/cap-tables`

Create a new cap table snapshot.

**Request Body**:
```json
{
  "startupId": "string (cuid)",
  "asOfDate": "ISO 8601 date (optional)"
}
```

**Response**: Cap table object with calculated totals

**Access**: Founder, Admin

---

### Get Cap Table by ID
**GET** `/cap-tables/:id`

**Response**: Cap table with share classes, stakeholders, and events

---

### Get Latest Cap Table
**GET** `/cap-tables/startup/:startupId/latest`

Get the most recent cap table for a startup.

**Response**: Latest cap table object

---

### Get Cap Table History
**GET** `/cap-tables/startup/:startupId/history`

Get all historical cap table versions.

**Query Params**: `limit`, `offset`

**Response**: Array of cap table objects

---

### Add Stakeholder
**POST** `/cap-tables/:id/stakeholders`

Add a stakeholder to the cap table.

**Request Body**:
```json
{
  "stakeholderType": "FOUNDER | EMPLOYEE | INVESTOR | ADVISOR | CONSULTANT",
  "userId": "string (cuid, optional)",
  "entityName": "string",
  "commonShares": number (optional),
  "preferredShares": {
    "Series A": number,
    "Series B": number
  } (optional),
  "options": number (optional),
  "warrants": number (optional),
  "boardSeat": boolean (optional),
  "observer": boolean (optional),
  "proRataRights": boolean (optional)
}
```

**Response**: Stakeholder object with ownership percentages

**Access**: Founder, Admin

---

### Calculate Dilution
**POST** `/cap-tables/startup/:startupId/dilution`

Calculate dilution from a new funding round.

**Request Body**:
```json
{
  "newInvestmentAmount": number,
  "preMoneyValuation": number
}
```

**Response**:
```json
{
  "preMoneyValuation": number,
  "newInvestmentAmount": number,
  "postMoneyValuation": number,
  "currentShares": number,
  "newShares": number,
  "totalSharesAfter": number,
  "pricePerShare": number,
  "dilutionImpact": [
    {
      "stakeholderId": "string",
      "entityName": "string",
      "currentOwnership": number,
      "newOwnership": number,
      "dilution": number,
      "dilutionPercentage": number
    }
  ]
}
```

---

### Calculate Waterfall
**POST** `/cap-tables/startup/:startupId/waterfall`

Calculate exit distribution waterfall.

**Request Body**:
```json
{
  "exitProceeds": number,
  "exitType": "ACQUISITION | IPO | MERGER | LIQUIDATION (optional)"
}
```

**Response**:
```json
{
  "exitProceeds": number,
  "totalDistributed": number,
  "distributions": [
    {
      "stakeholderId": "string",
      "entityName": "string",
      "stakeholderType": "string",
      "investment": number,
      "distribution": number,
      "returnMultiple": number,
      "ownership": number
    }
  ]
}
```

---

### Export to Carta Format
**GET** `/cap-tables/:id/export`

Export cap table in Carta-compatible format.

**Query Params**: `format=json|csv`

**Response**: Carta-formatted cap table data

**Access**: Founder, Admin

---

### Record Event
**POST** `/cap-tables/:id/events`

Record a cap table event.

**Request Body**:
```json
{
  "eventType": "FUNDING | CONVERSION | OPTION_GRANT | OPTION_EXERCISE | TRANSFER | REPURCHASE | CANCELLATION",
  "description": "string",
  "sharesBefore": {},
  "sharesAfter": {},
  "roundId": "string (optional)",
  "transactionId": "string (optional)"
}
```

**Access**: Founder, Admin

---

## Equity Rounds

### Create Equity Round
**POST** `/equity-rounds`

Create a new equity financing round.

**Request Body**:
```json
{
  "startupId": "string (cuid)",
  "roundType": "PRE_SEED | SEED | SERIES_A | SERIES_B | SERIES_C | SERIES_D | BRIDGE",
  "leadInvestorId": "string (cuid, optional)",
  "targetAmount": number,
  "minimumInvestment": number (optional),
  "maximumInvestment": number (optional),
  "pricePerShare": number (optional),
  "preMoneyValuation": number (optional),
  "postMoneyValuation": number (optional),
  "shareClassId": "string (cuid, optional)",
  "closingDate": "ISO 8601 date (optional)",
  "terms": {} (optional),
  "documents": ["URL"] (optional)
}
```

**Response**: Equity round object

**Access**: Founder, Admin

---

### Get Equity Round by ID
**GET** `/equity-rounds/:id`

**Response**: Round with startup, lead investor, share class, and investments

---

### Get Rounds by Startup
**GET** `/equity-rounds/startup/:startupId`

**Response**: Array of equity rounds

---

### Get Active Rounds
**GET** `/equity-rounds/active`

Get all currently active funding rounds.

**Response**: Array of active rounds

---

### Update Equity Round
**PUT** `/equity-rounds/:id`

**Request Body**: Partial equity round object

**Access**: Founder, Admin

---

### Close Equity Round
**POST** `/equity-rounds/:id/close`

Close a funding round.

**Request Body**:
```json
{
  "finalTerms": {} (optional)
}
```

**Response**: Closed round with final details

**Access**: Founder, Admin

---

### Get Round Metrics
**GET** `/equity-rounds/:id/metrics`

**Response**:
```json
{
  "totalRaised": number,
  "targetAmount": number,
  "percentageRaised": number,
  "remainingAmount": number,
  "investorCount": number,
  "averageInvestment": number,
  "status": "string",
  "pricePerShare": number,
  "preMoneyValuation": number,
  "postMoneyValuation": number
}
```

---

### Record Investment
**POST** `/equity-rounds/:id/investments`

Record an investment in the round.

**Request Body**:
```json
{
  "investmentId": "string (cuid)",
  "amount": number
}
```

**Access**: Founder, Admin

---

## Term Sheets

### Create Term Sheet
**POST** `/term-sheets`

Create a new term sheet.

**Request Body**:
```json
{
  "equityRoundId": "string (cuid)",
  "investorId": "string (cuid)",
  "version": number (optional, default: 1),
  "investmentAmount": number,
  "valuation": number,
  "pricePerShare": number,
  "boardSeats": number (optional),
  "proRataRights": boolean (optional),
  "liquidationPreference": number (optional, default: 1),
  "dividendRate": number (optional),
  "antidilutionProvision": "FULL_RATCHET | WEIGHTED_AVERAGE | NONE (optional)",
  "votingRights": {} (optional),
  "dragAlongRights": boolean (optional),
  "tagAlongRights": boolean (optional),
  "redemptionRights": boolean (optional),
  "conversionRights": {} (optional),
  "informationRights": {} (optional),
  "preemptiveRights": boolean (optional),
  "coSaleRights": boolean (optional),
  "noShopClause": boolean (optional),
  "exclusivityPeriod": number (optional, days),
  "closingConditions": ["string"] (optional),
  "otherTerms": {} (optional),
  "expiryDate": "ISO 8601 date (optional)"
}
```

**Response**: Term sheet object

**Access**: Investor, Admin

---

### Get Term Sheet by ID
**GET** `/term-sheets/:id`

**Response**: Term sheet with round, investor, and negotiation history

---

### Get Term Sheets by Round
**GET** `/term-sheets/round/:roundId`

**Response**: Array of term sheets

---

### Get Term Sheets by Investor
**GET** `/term-sheets/investor/:investorId`

**Response**: Array of term sheets

**Access**: Investor (own), Admin

---

### Update Term Sheet
**PUT** `/term-sheets/:id`

**Request Body**: Partial term sheet object

**Access**: Investor (own), Founder, Admin

---

### Propose Term Sheet
**POST** `/term-sheets/:id/propose`

Move term sheet to PROPOSED status.

**Response**: Proposed term sheet

**Access**: Investor (own), Admin

---

### Accept Term Sheet
**POST** `/term-sheets/:id/accept`

Accept a proposed term sheet.

**Response**: Accepted term sheet

**Access**: Founder, Admin

---

### Reject Term Sheet
**POST** `/term-sheets/:id/reject`

Reject a term sheet.

**Request Body**:
```json
{
  "reason": "string (optional)"
}
```

**Access**: Investor, Founder, Admin

---

### Create New Version
**POST** `/term-sheets/:id/version`

Create a new version of term sheet with changes.

**Request Body**: Partial term sheet object with desired changes

**Response**: New term sheet version

**Access**: Investor, Founder, Admin

---

## Investor Rights

### Create Investor Rights
**POST** `/investor-rights`

Create investor rights for an investment.

**Request Body**:
```json
{
  "investmentId": "string (cuid)",
  "proRataRights": boolean (optional),
  "proRataPercentage": number (optional),
  "rightOfFirstRefusal": boolean (optional),
  "rofrDuration": number (optional, days),
  "coSaleRights": boolean (optional),
  "dragAlongRights": boolean (optional),
  "tagAlongRights": boolean (optional),
  "informationRights": boolean (optional),
  "informationFrequency": "MONTHLY | QUARTERLY | ANNUALLY (optional)",
  "boardObserverRights": boolean (optional),
  "boardSeatRights": boolean (optional),
  "antiDilutionRights": boolean (optional),
  "antiDilutionType": "FULL_RATCHET | WEIGHTED_AVERAGE | NARROW_BASED | BROAD_BASED (optional)",
  "redemptionRights": boolean (optional),
  "redemptionPeriod": number (optional, months),
  "conversionRights": boolean (optional),
  "votingRights": {} (optional),
  "participationRights": boolean (optional),
  "preemptiveRights": boolean (optional),
  "registrationRights": {} (optional),
  "customRights": {} (optional),
  "expiryDate": "ISO 8601 date (optional)"
}
```

**Response**: Investor rights object

**Access**: Founder, Admin

---

### Get Investor Rights by ID
**GET** `/investor-rights/:id`

**Response**: Rights object with exercise history

---

### Get Rights by Investment
**GET** `/investor-rights/investment/:investmentId`

**Response**: Investor rights for specific investment

---

### Get Rights by Investor
**GET** `/investor-rights/investor/:investorId`

**Response**: Array of all rights for investor

**Access**: Investor (own), Admin

---

### Get Rights by Startup
**GET** `/investor-rights/startup/:startupId`

**Response**: Array of all investor rights for startup

**Access**: Founder, Admin

---

### Get Rights Summary
**GET** `/investor-rights/investor/:investorId/summary`

Get summary of all rights across investments.

**Response**:
```json
{
  "totalInvestments": number,
  "activeRights": number,
  "byRightType": {
    "proRata": number,
    "rofr": number,
    "coSale": number,
    "dragAlong": number,
    "tagAlong": number,
    "information": number,
    "boardObserver": number,
    "boardSeat": number
  },
  "investments": [...]
}
```

**Access**: Investor (own), Admin

---

### Update Investor Rights
**PUT** `/investor-rights/:id`

**Request Body**: Partial investor rights object

**Access**: Founder, Admin

---

### Exercise Pro-Rata Right
**POST** `/investor-rights/:id/exercise-pro-rata`

Exercise pro-rata investment right.

**Request Body**:
```json
{
  "roundId": "string (cuid)",
  "investmentAmount": number
}
```

**Response**: Exercise record

**Access**: Investor (own), Admin

---

### Waive Right
**POST** `/investor-rights/:id/waive`

Waive a specific right.

**Request Body**:
```json
{
  "rightType": "string",
  "reason": "string (optional)"
}
```

**Response**: Waiver record

**Access**: Investor (own), Admin

---

### Check Right
**GET** `/investor-rights/:id/check/:rightType`

Check if investor has specific right.

**Response**:
```json
{
  "hasRight": boolean,
  "rightType": "string"
}
```

---

## Exit Events

### Create Exit Event
**POST** `/exit-events`

Create a new exit event.

**Request Body**:
```json
{
  "startupId": "string (cuid)",
  "exitType": "ACQUISITION | IPO | MERGER | LIQUIDATION | SECONDARY_SALE | BUYBACK",
  "exitDate": "ISO 8601 date",
  "exitAmount": number,
  "acquirerName": "string (optional)",
  "acquirerType": "string (optional)",
  "stockSymbol": "string (optional)",
  "stockExchange": "string (optional)",
  "sharePrice": number (optional),
  "terms": {} (optional),
  "documentUrls": ["URL"] (optional)
}
```

**Response**: Exit event object

**Access**: Founder, Admin

---

### Get Exit Event by ID
**GET** `/exit-events/:id`

**Response**: Exit event with distributions

---

### Get Exit Events by Startup
**GET** `/exit-events/startup/:startupId`

**Response**: Array of exit events

---

### Get All Exit Events
**GET** `/exit-events`

**Query Params**: `status` (optional)

**Response**: Array of exit events

---

### Get Exit Metrics
**GET** `/exit-events/startup/:startupId/metrics`

**Response**:
```json
{
  "totalExits": number,
  "completedExits": number,
  "totalExitValue": number,
  "exitsByType": {
    "acquisition": number,
    "ipo": number,
    "merger": number,
    "liquidation": number,
    "secondarySale": number,
    "buyback": number
  },
  "latestExit": {}
}
```

---

### Update Exit Event
**PUT** `/exit-events/:id`

**Request Body**: Partial exit event object

**Access**: Founder, Admin

---

### Calculate Distributions
**GET** `/exit-events/:id/calculate-distributions`

Calculate waterfall distributions for exit.

**Response**: Waterfall analysis with stakeholder distributions

---

### Create Distribution
**POST** `/exit-events/:id/distributions`

Create distribution to investor.

**Request Body**:
```json
{
  "investorId": "string (cuid)",
  "distributionAmount": number,
  "distributionDate": "ISO 8601 date",
  "distributionMethod": "WIRE | CHECK | STOCK | CRYPTO (optional)",
  "taxWithheld": number (optional),
  "notes": "string (optional)"
}
```

**Response**: Distribution object

**Access**: Founder, Admin

---

### Get Distributions by Exit Event
**GET** `/exit-events/:id/distributions`

**Response**: Array of distributions

---

### Get Distributions by Investor
**GET** `/exit-events/investor/:investorId/distributions`

**Response**: Array of investor's distributions

**Access**: Investor (own), Admin

---

### Process Distribution
**POST** `/exit-events/distributions/:distributionId/process`

Mark distribution as processing.

**Response**: Updated distribution

**Access**: Admin only

---

### Complete Distribution
**POST** `/exit-events/distributions/:distributionId/complete`

Mark distribution as completed.

**Request Body**:
```json
{
  "transactionRef": "string (optional)"
}
```

**Response**: Completed distribution

**Access**: Admin only

---

## Data Models

### SAFE Agreement
```typescript
{
  id: string;
  investmentId: string;
  type: 'POST_MONEY' | 'PRE_MONEY';
  investmentAmount: Decimal;
  valuationCap?: Decimal;
  discountRate?: Decimal;
  proRataRight: boolean;
  mfnProvision: boolean;
  qualifiedFinancingThreshold?: Decimal;
  autoConversion: boolean;
  conversionPrice?: Decimal;
  status: 'ACTIVE' | 'CONVERTED' | 'DISSOLVED';
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Convertible Note
```typescript
{
  id: string;
  investmentId: string;
  principalAmount: Decimal;
  interestRate: Decimal;
  maturityDate: Date;
  discountRate?: Decimal;
  valuationCap?: Decimal;
  autoConversion: boolean;
  qualifiedFinancingThreshold?: Decimal;
  securityType: string;
  compounding: 'SIMPLE' | 'COMPOUND';
  accruedInterest: Decimal;
  lastAccrualDate: Date;
  status: 'ACTIVE' | 'CONVERTED' | 'REPAID' | 'DEFAULTED';
  conversionPrice?: Decimal;
  createdAt: Date;
  updatedAt: Date;
}
```

### Cap Table
```typescript
{
  id: string;
  startupId: string;
  asOfDate: Date;
  version: number;
  fullyDilutedShares: Decimal;
  totalCommon: Decimal;
  totalPreferred: Decimal;
  totalOptions: Decimal;
  optionPool: Decimal;
  shareClasses: ShareClass[];
  stakeholders: CapTableStakeholder[];
  events: CapTableEvent[];
  createdAt: Date;
}
```

### Equity Round
```typescript
{
  id: string;
  startupId: string;
  roundType: 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'BRIDGE';
  leadInvestorId?: string;
  targetAmount: Decimal;
  totalRaised: Decimal;
  minimumInvestment?: Decimal;
  maximumInvestment?: Decimal;
  pricePerShare?: Decimal;
  preMoneyValuation?: Decimal;
  postMoneyValuation?: Decimal;
  status: 'PLANNING' | 'OPEN' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  closingDate?: Date;
  terms: object;
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Term Sheet
```typescript
{
  id: string;
  equityRoundId: string;
  investorId: string;
  version: number;
  investmentAmount: Decimal;
  valuation: Decimal;
  pricePerShare: Decimal;
  boardSeats: number;
  proRataRights: boolean;
  liquidationPreference: Decimal;
  dividendRate?: Decimal;
  antidilutionProvision: string;
  // ... more rights fields
  status: 'DRAFT' | 'PROPOSED' | 'UNDER_NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}
```

### Investor Rights
```typescript
{
  id: string;
  investmentId: string;
  proRataRights: boolean;
  proRataPercentage?: number;
  rightOfFirstRefusal: boolean;
  rofrDuration?: number;
  coSaleRights: boolean;
  dragAlongRights: boolean;
  tagAlongRights: boolean;
  informationRights: boolean;
  informationFrequency?: string;
  boardObserverRights: boolean;
  boardSeatRights: boolean;
  antiDilutionRights: boolean;
  antiDilutionType?: string;
  // ... more rights fields
  status: 'ACTIVE' | 'EXERCISED' | 'WAIVED' | 'EXPIRED';
  expiryDate?: Date;
  createdAt: Date;
}
```

### Exit Event
```typescript
{
  id: string;
  startupId: string;
  exitType: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION' | 'SECONDARY_SALE' | 'BUYBACK';
  exitDate: Date;
  exitAmount: Decimal;
  acquirerName?: string;
  acquirerType?: string;
  stockSymbol?: string;
  stockExchange?: string;
  sharePrice?: Decimal;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  terms: object;
  documentUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [] // Optional validation errors
}
```

### HTTP Status Codes

- `200 OK`: Successful GET/PUT request
- `201 Created`: Successful POST request creating resource
- `400 Bad Request`: Validation error or invalid request
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Common Error Codes

- `NOT_AUTHENTICATED`: User not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INVALID_STATUS_TRANSITION`: Invalid status change
- `MISSING_REQUIRED_FIELDS`: Required fields missing

---

## Authentication

All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are obtained through the authentication endpoints (not documented here).

### User Roles

- **INVESTOR**: Can create investments, view own data
- **FOUNDER**: Can manage startup data, approve/reject term sheets
- **ADMIN**: Full access to all operations

---

## Rate Limiting

- General rate limit: 100 requests per 15 minutes
- Burst limit: 20 requests per second

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Pagination

List endpoints support pagination via query parameters:

- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Webhooks

(To be implemented)

Future support for webhook notifications on:
- SAFE conversions
- Note maturities
- Term sheet status changes
- Exit distributions

---

## Support

For API support, please contact: api-support@angelmarketplace.com

**API Version**: v1
**Last Updated**: 2025-11-10
