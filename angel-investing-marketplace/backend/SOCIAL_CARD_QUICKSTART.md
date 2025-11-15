# Social Card Generation - Quick Start Guide

## Getting Started

This guide provides quick examples to test the Social Card Generation API.

## Prerequisites

1. Running backend server
2. Valid authentication token
3. Existing company update (updateId)

## Quick Examples

### 1. Generate Your First Social Card

```bash
# Set your variables
export TOKEN="your_jwt_token_here"
export UPDATE_ID="upd_123456"
export API_URL="http://localhost:3000/api"

# Generate a milestone card
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "MILESTONE",
    "size": "TWITTER",
    "language": "en"
  }'
```

### 2. Generate a Growth Card with Metrics

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "GROWTH",
    "size": "TWITTER",
    "language": "en",
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
        "metricName": "Users",
        "currentValue": 50000,
        "previousValue": 30000,
        "unit": "users",
        "trend": "up"
      }
    ]
  }'
```

### 3. Generate with Custom Branding

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "FUNDING",
    "size": "LINKEDIN",
    "language": "en",
    "customization": {
      "primaryColor": "#8B5CF6",
      "secondaryColor": "#7C3AED",
      "fontFamily": "Montserrat",
      "layout": "centered",
      "showLogo": true,
      "useGradient": true,
      "gradientDirection": "diagonal"
    }
  }'
```

### 4. Get Existing Social Card

```bash
curl -X GET "${API_URL}/updates/${UPDATE_ID}/social-card?size=TWITTER&language=en" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Get Share URLs

```bash
curl -X GET "${API_URL}/updates/${UPDATE_ID}/share-urls" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 6. Track a Social Share

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-share" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "TWITTER",
    "shareUrl": "https://twitter.com/user/status/123456789",
    "metadata": {
      "campaign": "product_launch_2025",
      "source": "webapp"
    }
  }'
```

### 7. Get Share Statistics

```bash
# All platforms
curl -X GET "${API_URL}/updates/${UPDATE_ID}/social-stats" \
  -H "Authorization: Bearer ${TOKEN}"

# Specific platform
curl -X GET "${API_URL}/updates/${UPDATE_ID}/social-stats?platform=TWITTER" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8. Preview a Card (Without Saving)

```bash
curl -X POST "${API_URL}/social-cards/preview" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "PRODUCT",
    "size": "INSTAGRAM",
    "language": "en",
    "title": "New Feature Launch",
    "content": "Introducing our revolutionary analytics dashboard",
    "companyName": "StartupXYZ",
    "logoUrl": "https://example.com/logo.png"
  }'
```

### 9. Get Available Templates

```bash
# All templates
curl -X GET "${API_URL}/social-cards/templates" \
  -H "Authorization: Bearer ${TOKEN}"

# Specific type
curl -X GET "${API_URL}/social-cards/templates?type=GROWTH" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 10. Create Custom Template

```bash
curl -X POST "${API_URL}/social-cards/templates" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Brand Template",
    "description": "Custom template with our brand colors",
    "baseTemplate": "MILESTONE",
    "customization": {
      "primaryColor": "#FF5733",
      "secondaryColor": "#C70039",
      "fontFamily": "Poppins",
      "layout": "split",
      "useGradient": true,
      "gradientDirection": "vertical"
    },
    "isDefault": true,
    "isPublic": false
  }'
```

### 11. Batch Generate Cards

```bash
curl -X POST "${API_URL}/social-cards/batch" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "updateIds": ["upd_1", "upd_2", "upd_3"],
    "template": "GENERAL",
    "size": "TWITTER",
    "language": "en",
    "customization": {
      "primaryColor": "#6366F1"
    }
  }'
```

## Response Examples

### Success Response - Generate Card

```json
{
  "success": true,
  "message": "Social card generated successfully",
  "data": {
    "card": {
      "id": "upd_abc123",
      "updateId": "upd_abc123",
      "imageUrl": "https://cdn.example.com/social-cards/upd_abc123/MILESTONE_TWITTER_en_1699123456789.png",
      "imageKey": "social-cards/upd_abc123/MILESTONE_TWITTER_en_1699123456789.png",
      "template": "MILESTONE",
      "size": "TWITTER",
      "language": "en",
      "dimensions": {
        "width": 1200,
        "height": 630
      },
      "metadata": {
        "template": "MILESTONE",
        "size": "TWITTER",
        "language": "en",
        "customization": {
          "primaryColor": "#10B981",
          "secondaryColor": "#059669",
          "backgroundColor": "#FFFFFF",
          "textColor": "#1F2937",
          "fontFamily": "Inter",
          "fontSize": "medium",
          "layout": "centered",
          "showLogo": true,
          "logoPosition": "top-left",
          "useGradient": true,
          "gradientDirection": "diagonal"
        },
        "format": "PNG",
        "quality": 90,
        "fileSize": 234567,
        "generationTimeMs": 1543
      },
      "createdAt": "2025-11-15T10:00:00.000Z"
    },
    "shareUrls": {
      "twitter": "https://twitter.com/intent/tweet?text=Amazing%20Milestone&url=https%3A%2F%2Fapp.angelinvest.com%2Fupdates%2Fupd_abc123",
      "linkedin": "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fapp.angelinvest.com%2Fupdates%2Fupd_abc123",
      "facebook": "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fapp.angelinvest.com%2Fupdates%2Fupd_abc123",
      "instagram": "https://cdn.example.com/social-cards/upd_abc123/MILESTONE_TWITTER_en_1699123456789.png",
      "whatsapp": "https://wa.me/?text=Amazing%20Milestone%20https%3A%2F%2Fapp.angelinvest.com%2Fupdates%2Fupd_abc123",
      "copyLink": "https://app.angelinvest.com/updates/upd_abc123"
    }
  }
}
```

### Success Response - Share Stats

```json
{
  "success": true,
  "message": "Share statistics retrieved successfully",
  "data": {
    "updateId": "upd_abc123",
    "totalShares": 127,
    "sharesByPlatform": {
      "TWITTER": 52,
      "LINKEDIN": 38,
      "FACEBOOK": 25,
      "INSTAGRAM": 8,
      "WHATSAPP": 4
    },
    "uniqueSharers": 98,
    "topPlatform": "TWITTER",
    "recentShares": [
      {
        "userId": "user_xyz",
        "platform": "TWITTER",
        "sharedAt": "2025-11-15T09:45:00.000Z",
        "metadata": {
          "campaign": "product_launch"
        }
      }
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "body.template",
      "message": "Invalid enum value. Expected 'MILESTONE' | 'GROWTH' | 'FUNDING' | 'PRODUCT' | 'TEAM' | 'GENERAL'"
    }
  ]
}
```

## Testing Different Scenarios

### Multi-Language Cards

```bash
# Spanish
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "MILESTONE",
    "language": "es",
    "titleOverride": "¡Hemos alcanzado 1 millón de usuarios!",
    "contentOverride": "Gracias a toda nuestra comunidad"
  }'

# Arabic (RTL)
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "FUNDING",
    "language": "ar",
    "titleOverride": "جمعنا 10 مليون دولار",
    "contentOverride": "الجولة الأولى من التمويل"
  }'
```

### Different Card Sizes

```bash
# Twitter card
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"template": "GENERAL", "size": "TWITTER"}'

# Instagram card (square)
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"template": "GENERAL", "size": "INSTAGRAM"}'

# LinkedIn card
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"template": "GENERAL", "size": "LINKEDIN"}'
```

## Common Use Cases

### 1. Startup Funding Announcement

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "FUNDING",
    "size": "TWITTER",
    "customization": {
      "primaryColor": "#8B5CF6",
      "secondaryColor": "#7C3AED"
    },
    "metrics": [
      {
        "metricName": "Round",
        "currentValue": 10000000,
        "unit": "$"
      }
    ],
    "includeCTA": true,
    "ctaText": "Learn More"
  }'
```

### 2. Product Launch

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "PRODUCT",
    "size": "LINKEDIN",
    "customization": {
      "primaryColor": "#F59E0B",
      "layout": "left"
    },
    "includeCTA": true,
    "ctaText": "Try It Now"
  }'
```

### 3. Monthly Growth Report

```bash
curl -X POST "${API_URL}/updates/${UPDATE_ID}/social-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "GROWTH",
    "size": "TWITTER",
    "metrics": [
      {
        "metricName": "Revenue",
        "currentValue": 250000,
        "previousValue": 150000,
        "unit": "$",
        "trend": "up",
        "changePercentage": 66.7
      },
      {
        "metricName": "Users",
        "currentValue": 50000,
        "previousValue": 35000,
        "unit": "",
        "trend": "up",
        "changePercentage": 42.9
      },
      {
        "metricName": "Retention",
        "currentValue": 92,
        "previousValue": 88,
        "unit": "%",
        "trend": "up",
        "changePercentage": 4.5
      }
    ]
  }'
```

## Troubleshooting

### Card Not Found
```bash
# Check if update exists
curl -X GET "${API_URL}/updates/${UPDATE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Invalid Template
Valid templates: `MILESTONE`, `GROWTH`, `FUNDING`, `PRODUCT`, `TEAM`, `GENERAL`

### Invalid Size
Valid sizes: `TWITTER`, `INSTAGRAM`, `LINKEDIN`, `FACEBOOK`, `CUSTOM`

### Invalid Language
Valid languages: `en`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`, `ar`, `he`

### Storage Not Configured
Ensure environment variables are set:
```bash
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=angel-investing-files
```

## Performance Tips

1. **Cache Cards**: Store the card URL on the frontend to avoid regenerating
2. **Async Generation**: For batch operations, use the batch endpoint
3. **Preview First**: Use the preview endpoint to test designs before generating
4. **Track Selectively**: Only track shares when actually shared, not on URL generation

## Next Steps

1. See full documentation: `SOCIAL_CARD_IMPLEMENTATION.md`
2. Check schema details: `prisma/SOCIAL_CARD_SCHEMA.md`
3. Review service code: `src/services/social-card.service.ts`
4. Integrate with frontend: See examples in implementation guide

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify authentication token is valid
- Ensure update exists and you have permission
- Review validation schemas in `src/validations/social-card.validation.ts`
