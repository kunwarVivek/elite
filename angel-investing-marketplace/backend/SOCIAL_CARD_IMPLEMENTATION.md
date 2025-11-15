# Social Card Generation - Implementation Guide

## Overview

This document provides a comprehensive guide to the Social Card Generation feature (FR-4.2) implemented for the Angel Investing Marketplace.

## Feature Requirements (PRD/FRD)

### FR-4.2: Social Card Generation
- ✅ **FR-4.2.1**: Auto-generate cards from update content
- ✅ **FR-4.2.2**: Multiple card templates (milestone, growth, funding)
- ✅ **FR-4.2.3**: Custom branding with company colors/logos
- ✅ **FR-4.2.4**: One-click sharing to social platforms
- ✅ **FR-4.2.5**: Track social engagement metrics
- ✅ **FR-4.2.6**: Generate cards in multiple languages

## Architecture

### Components

```
backend/
├── src/
│   ├── controllers/
│   │   ├── social-card.controller.ts        # Main controller
│   │   └── company-update.controller.ts     # Updated with social methods
│   ├── services/
│   │   └── social-card.service.ts           # Core business logic
│   ├── routes/
│   │   ├── social-card.routes.ts            # Global routes
│   │   └── update-social-card.routes.ts     # Update-specific routes
│   ├── validations/
│   │   └── social-card.validation.ts        # Zod schemas
│   └── types/
│       └── social-card.types.ts             # TypeScript types
└── prisma/
    ├── migrations/
    │   └── add_social_card_support.sql      # Database migration
    └── SOCIAL_CARD_SCHEMA.md                # Schema documentation
```

## API Endpoints

### Update-Specific Endpoints

All update-specific endpoints are prefixed with `/api/updates/:updateId`

#### 1. Generate Social Card
```http
POST /api/updates/:updateId/social-card
Authorization: Bearer {token}
Content-Type: application/json

{
  "template": "MILESTONE",              # Optional: MILESTONE, GROWTH, FUNDING, PRODUCT, TEAM, GENERAL
  "size": "TWITTER",                    # Optional: TWITTER, INSTAGRAM, LINKEDIN, FACEBOOK
  "language": "en",                     # Optional: en, es, fr, de, it, pt, zh, ja, ko, ar, he
  "customization": {                    # Optional
    "primaryColor": "#10B981",
    "secondaryColor": "#059669",
    "fontFamily": "Inter",
    "layout": "centered"
  },
  "metrics": [                          # For GROWTH template
    {
      "metricName": "Revenue",
      "currentValue": 100000,
      "previousValue": 50000,
      "unit": "$",
      "trend": "up"
    }
  ],
  "format": "PNG",                      # Optional: PNG, JPEG, WEBP
  "quality": 90                         # Optional: 1-100
}

Response:
{
  "success": true,
  "message": "Social card generated successfully",
  "data": {
    "card": {
      "id": "upd_123",
      "updateId": "upd_123",
      "imageUrl": "https://cdn.example.com/social-cards/...",
      "imageKey": "social-cards/upd_123/MILESTONE_TWITTER_en_1699123456.png",
      "template": "MILESTONE",
      "size": "TWITTER",
      "language": "en",
      "dimensions": { "width": 1200, "height": 630 },
      "metadata": { ... },
      "createdAt": "2025-11-15T10:00:00.000Z"
    },
    "shareUrls": {
      "twitter": "https://twitter.com/intent/tweet?...",
      "linkedin": "https://www.linkedin.com/sharing/...",
      "facebook": "https://www.facebook.com/sharer/...",
      "whatsapp": "https://wa.me/?text=...",
      "copyLink": "https://app.angelinvest.com/updates/upd_123"
    }
  }
}
```

#### 2. Get Social Card
```http
GET /api/updates/:updateId/social-card?size=TWITTER&language=en
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "upd_123",
    "imageUrl": "https://...",
    "template": "MILESTONE",
    ...
  }
}
```

#### 3. Regenerate Social Card
```http
PUT /api/updates/:updateId/social-card
Authorization: Bearer {token}
Content-Type: application/json

{
  "template": "GROWTH",
  "size": "INSTAGRAM"
}
```

#### 4. Track Social Share
```http
POST /api/updates/:updateId/social-share
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform": "TWITTER",
  "shareUrl": "https://twitter.com/user/status/123",
  "metadata": {
    "campaignId": "launch_2025"
  }
}

Response:
{
  "success": true,
  "message": "Social share tracked successfully"
}
```

#### 5. Get Share Statistics
```http
GET /api/updates/:updateId/social-stats?platform=TWITTER
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "updateId": "upd_123",
    "totalShares": 45,
    "sharesByPlatform": {
      "TWITTER": 20,
      "LINKEDIN": 15,
      "FACEBOOK": 10,
      "INSTAGRAM": 0,
      "WHATSAPP": 0
    },
    "uniqueSharers": 38,
    "topPlatform": "TWITTER",
    "recentShares": [
      {
        "userId": "user_123",
        "platform": "TWITTER",
        "sharedAt": "2025-11-15T10:00:00.000Z"
      }
    ]
  }
}
```

#### 6. Get Share URLs
```http
GET /api/updates/:updateId/share-urls
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "twitter": "https://twitter.com/intent/tweet?...",
    "linkedin": "https://www.linkedin.com/sharing/...",
    "facebook": "https://www.facebook.com/sharer/...",
    "instagram": "https://cdn.example.com/...",
    "whatsapp": "https://wa.me/?text=...",
    "copyLink": "https://app.angelinvest.com/updates/upd_123"
  }
}
```

### Global Endpoints

#### 1. Get Templates
```http
GET /api/social-cards/templates?type=MILESTONE
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "templates": [
      {
        "type": "MILESTONE",
        "name": "Milestone Achievement",
        "description": "Celebrate company milestones and achievements",
        "defaultCustomization": { ... },
        "supportsMetrics": false,
        "requiredFields": ["title", "content"]
      }
    ]
  }
}
```

#### 2. Preview Social Card
```http
POST /api/social-cards/preview
Authorization: Bearer {token}
Content-Type: application/json

{
  "template": "GROWTH",
  "size": "TWITTER",
  "language": "en",
  "title": "Amazing Growth!",
  "content": "We've doubled our revenue this quarter",
  "companyName": "StartupXYZ",
  "logoUrl": "https://...",
  "metrics": [
    {
      "metricName": "Revenue",
      "currentValue": 200000,
      "previousValue": 100000,
      "unit": "$",
      "trend": "up"
    }
  ]
}
```

#### 3. Create Custom Template
```http
POST /api/social-cards/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Custom Template",
  "description": "Custom branded template for my company",
  "baseTemplate": "MILESTONE",
  "customization": {
    "primaryColor": "#FF5733",
    "secondaryColor": "#C70039",
    "fontFamily": "Montserrat",
    "layout": "split",
    "useGradient": true
  },
  "isDefault": true,
  "isPublic": false
}
```

#### 4. Batch Generate Cards
```http
POST /api/social-cards/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "updateIds": ["upd_1", "upd_2", "upd_3"],
  "template": "GENERAL",
  "size": "TWITTER",
  "language": "en"
}

Response:
{
  "success": true,
  "message": "Batch generation completed: 3 successful, 0 failed",
  "data": {
    "successful": 3,
    "failed": 0,
    "cards": [ ... ],
    "errors": []
  }
}
```

## Template Types

### 1. MILESTONE
**Use Case**: Company anniversaries, user milestones, achievements

**Features**:
- Centered layout
- Celebration-focused design
- Green color scheme (#10B981)
- No metrics support

**Example**:
```json
{
  "template": "MILESTONE",
  "title": "🎉 1 Million Users Milestone!",
  "content": "We're thrilled to announce that we've reached 1 million active users!"
}
```

### 2. GROWTH
**Use Case**: Revenue growth, user growth, KPI achievements

**Features**:
- Split layout (metrics on side)
- Supports up to 4 metrics
- Blue color scheme (#3B82F6)
- Trend indicators (up/down/neutral)

**Example**:
```json
{
  "template": "GROWTH",
  "title": "Q4 2025 Growth Report",
  "metrics": [
    {
      "metricName": "MRR",
      "currentValue": 250000,
      "previousValue": 150000,
      "unit": "$",
      "trend": "up",
      "changePercentage": 66.7
    },
    {
      "metricName": "Active Users",
      "currentValue": 50000,
      "previousValue": 30000,
      "unit": "users",
      "trend": "up",
      "changePercentage": 66.7
    }
  ]
}
```

### 3. FUNDING
**Use Case**: Investment rounds, fundraising completion

**Features**:
- Centered layout with emphasis
- Purple color scheme (#8B5CF6)
- Professional, confident design
- Optional metrics for funding details

**Example**:
```json
{
  "template": "FUNDING",
  "title": "Series A Funding - $10M Raised",
  "content": "Led by Acme Ventures with participation from top angel investors",
  "metrics": [
    {
      "metricName": "Total Raised",
      "currentValue": 10000000,
      "unit": "$"
    }
  ]
}
```

### 4. PRODUCT
**Use Case**: New features, product releases

**Features**:
- Left-aligned layout
- Space for product imagery
- Amber color scheme (#F59E0B)
- Action-oriented design

**Example**:
```json
{
  "template": "PRODUCT",
  "title": "Introducing Advanced Analytics",
  "content": "Get deeper insights into your portfolio performance with our new analytics dashboard"
}
```

### 5. TEAM
**Use Case**: New hires, team announcements

**Features**:
- Centered layout
- Warm, welcoming design
- Pink color scheme (#EC4899)
- People-focused

**Example**:
```json
{
  "template": "TEAM",
  "title": "Welcome Jane Doe!",
  "content": "We're excited to welcome Jane as our new VP of Engineering"
}
```

### 6. GENERAL
**Use Case**: Any other update type

**Features**:
- Versatile centered layout
- Indigo color scheme (#6366F1)
- Works for all content types

**Example**:
```json
{
  "template": "GENERAL",
  "title": "Important Update",
  "content": "We have some exciting news to share with our community"
}
```

## Language Support

### Supported Languages

**LTR (Left-to-Right)**:
- English (en) - Inter
- Spanish (es) - Inter
- French (fr) - Inter
- German (de) - Inter
- Italian (it) - Inter
- Portuguese (pt) - Inter
- Chinese (zh) - Noto Sans SC
- Japanese (ja) - Noto Sans JP
- Korean (ko) - Noto Sans KR

**RTL (Right-to-Left)**:
- Arabic (ar) - Noto Sans Arabic
- Hebrew (he) - Noto Sans Hebrew

### Multi-language Example

```javascript
// Generate card in Spanish
const spanishCard = await socialCardService.generateCard(updateId, {
  template: 'MILESTONE',
  language: 'es',
  content: {
    title: '¡Hemos alcanzado 1 millón de usuarios!',
    content: 'Gracias a toda nuestra comunidad por este increíble logro',
    companyName: 'MiStartup'
  }
});

// Generate card in Arabic (RTL)
const arabicCard = await socialCardService.generateCard(updateId, {
  template: 'FUNDING',
  language: 'ar',
  content: {
    title: 'جمعنا 10 مليون دولار',
    content: 'الجولة الأولى من التمويل',
    companyName: 'شركتي'
  }
});
```

## Customization

### Brand Colors

```json
{
  "customization": {
    "primaryColor": "#FF5733",      // Main brand color
    "secondaryColor": "#C70039",    // Secondary/accent color
    "backgroundColor": "#FFFFFF",    // Card background
    "textColor": "#1F2937"          // Text color
  }
}
```

### Typography

```json
{
  "customization": {
    "fontFamily": "Montserrat",     // Inter, Roboto, Open Sans, Montserrat, Poppins, Lato
    "fontSize": "large"             // small, medium, large
  }
}
```

### Layout

```json
{
  "customization": {
    "layout": "split",              // centered, left, right, split
    "logoPosition": "top-left",     // top-left, top-right, bottom-left, bottom-right, center
    "showLogo": true
  }
}
```

### Background

```json
{
  "customization": {
    "useGradient": true,
    "gradientDirection": "diagonal", // horizontal, vertical, diagonal
    "backgroundImage": "https://..."  // Custom background image URL
  }
}
```

## Integration Example

### Frontend Integration

```typescript
// React/TypeScript example
import { useState } from 'react';

const SocialCardGenerator = ({ updateId }) => {
  const [card, setCard] = useState(null);
  const [shareUrls, setShareUrls] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateCard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/updates/${updateId}/social-card`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template: 'MILESTONE',
          size: 'TWITTER',
          language: 'en',
          customization: {
            primaryColor: companyBrandColor,
            showLogo: true
          }
        })
      });

      const data = await response.json();
      setCard(data.data.card);
      setShareUrls(data.data.shareUrls);
    } catch (error) {
      console.error('Failed to generate card:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackShare = async (platform) => {
    await fetch(`/api/updates/${updateId}/social-share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ platform })
    });
  };

  const shareOnTwitter = () => {
    trackShare('TWITTER');
    window.open(shareUrls.twitter, '_blank');
  };

  return (
    <div>
      <button onClick={generateCard} disabled={loading}>
        Generate Social Card
      </button>

      {card && (
        <div>
          <img src={card.imageUrl} alt="Social Card" />
          <div>
            <button onClick={shareOnTwitter}>Share on Twitter</button>
            <button onClick={() => { trackShare('LINKEDIN'); window.open(shareUrls.linkedin); }}>
              Share on LinkedIn
            </button>
            <button onClick={() => { trackShare('FACEBOOK'); window.open(shareUrls.facebook); }}>
              Share on Facebook
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

## TODO: Image Generation Implementation

The current implementation uses **mock image generation** (SVG placeholders). For production, implement actual image generation using one of these approaches:

### Option 1: node-canvas (Recommended)

```bash
npm install canvas
```

```typescript
import { createCanvas, loadImage, registerFont } from 'canvas';

async function generateCardImage(options: SocialCardGenerationOptions): Promise<Buffer> {
  const dimensions = CARD_DIMENSIONS[options.size];
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
  gradient.addColorStop(0, options.customization.primaryColor);
  gradient.addColorStop(1, options.customization.secondaryColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  // Load and draw logo
  if (options.content.logoUrl) {
    const logo = await loadImage(options.content.logoUrl);
    ctx.drawImage(logo, 50, 50, 100, 100);
  }

  // Draw title
  ctx.fillStyle = options.customization.textColor;
  ctx.font = 'bold 48px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(options.content.title, dimensions.width / 2, dimensions.height / 2);

  // Draw company name
  ctx.font = '24px Inter';
  ctx.fillText(options.content.companyName, dimensions.width / 2, dimensions.height / 2 + 60);

  return canvas.toBuffer('image/png', { quality: options.quality / 100 });
}
```

### Option 2: Puppeteer (HTML to Image)

```bash
npm install puppeteer
```

```typescript
import puppeteer from 'puppeteer';

async function generateCardImage(options: SocialCardGenerationOptions): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const html = generateHTMLTemplate(options);
  await page.setContent(html);
  await page.setViewport(CARD_DIMENSIONS[options.size]);

  const screenshot = await page.screenshot({
    type: 'png',
    quality: options.quality
  });

  await browser.close();
  return screenshot;
}
```

### Option 3: External Service

Use services like:
- **Cloudinary** - Image transformation API
- **Imgix** - Real-time image processing
- **Bannerbear** - Automated image generation API

## Performance Considerations

1. **Async Generation**: Generate cards asynchronously in background jobs
2. **Caching**: Cache generated cards, regenerate only when update changes
3. **CDN**: Serve images via CDN (Cloudflare R2 includes CDN)
4. **Compression**: Use appropriate quality settings (90 recommended)
5. **Rate Limiting**: Implement rate limits on generation endpoints

## Security

1. **Authentication**: All endpoints require valid JWT token
2. **Input Validation**: All inputs validated via Zod schemas
3. **XSS Prevention**: User input escaped in generated cards
4. **Storage Security**: Images stored with proper access controls
5. **Rate Limiting**: Prevent abuse of generation endpoints

## Monitoring

Track these metrics:
- Card generation success/failure rate
- Average generation time
- Storage usage
- Share tracking by platform
- API endpoint usage

## Next Steps

1. **Implement actual image generation** (currently mock)
2. **Add Redis caching** for generated cards
3. **Set up background jobs** for async generation
4. **Implement rate limiting**
5. **Add analytics integration**
6. **Create frontend components**
7. **Add A/B testing** for card variants
8. **Implement video cards** (future enhancement)

## Support

For questions or issues:
- Check the schema documentation: `prisma/SOCIAL_CARD_SCHEMA.md`
- Review the code in `src/services/social-card.service.ts`
- See example implementations in this guide
