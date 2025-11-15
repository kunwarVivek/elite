# Social Card Schema Documentation

## Overview
This document describes the schema structure for Social Card Generation (FR-4.2) in the Angel Investing Marketplace.

## Storage Strategy
Social card data is stored in the existing `CompanyUpdate.metadata` JSON field to avoid schema changes. This approach provides flexibility while maintaining data integrity.

## Metadata Structure

### CompanyUpdate.metadata Format

```json
{
  "socialCard": {
    "imageUrl": "string",           // Public URL to the generated card image
    "imageKey": "string",            // Storage key for the image (e.g., Cloudflare R2 key)
    "template": "MILESTONE | GROWTH | FUNDING | PRODUCT | TEAM | GENERAL",
    "size": "TWITTER | INSTAGRAM | LINKEDIN | FACEBOOK | CUSTOM",
    "language": "en | es | fr | de | it | pt | zh | ja | ko | ar | he",
    "customization": {
      "primaryColor": "#10B981",
      "secondaryColor": "#059669",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1F2937",
      "fontFamily": "Inter",
      "fontSize": "medium",
      "layout": "centered | left | right | split",
      "logoUrl": "string?",
      "logoPosition": "top-left | top-right | bottom-left | bottom-right | center",
      "showLogo": true,
      "backgroundImage": "string?",
      "useGradient": true,
      "gradientDirection": "horizontal | vertical | diagonal"
    },
    "format": "PNG | JPEG | WEBP",
    "quality": 90,
    "fileSize": 123456,              // In bytes
    "generationTimeMs": 1500         // Time taken to generate the image
  },
  "socialShares": {
    "TWITTER": {
      "count": 10,
      "shares": [
        {
          "userId": "user_123",
          "sharedAt": "2025-11-15T10:00:00.000Z",
          "metadata": {
            "userAgent": "string?",
            "referrer": "string?",
            "campaignId": "string?"
          }
        }
      ]
    },
    "LINKEDIN": { /* same structure */ },
    "FACEBOOK": { /* same structure */ },
    "INSTAGRAM": { /* same structure */ },
    "WHATSAPP": { /* same structure */ }
  }
}
```

## Field Descriptions

### socialCard Object
Stores information about the generated social media card.

- **imageUrl**: Public URL to access the generated card image
- **imageKey**: Internal storage key (e.g., `social-cards/{updateId}/{template}_{size}_{language}_{timestamp}.png`)
- **template**: Template type used for generation (FR-4.2.2)
- **size**: Card dimensions preset for different platforms
- **language**: Language of the card content (FR-4.2.6)
- **customization**: Brand customization settings (FR-4.2.3)
- **format**: Image format (PNG recommended for transparency)
- **quality**: Image quality (1-100)
- **fileSize**: Size of generated image in bytes
- **generationTimeMs**: Performance metric for generation time

### socialShares Object
Tracks social media sharing activity (FR-4.2.5).

- **Platform Keys**: TWITTER, LINKEDIN, FACEBOOK, INSTAGRAM, WHATSAPP
- **count**: Total number of shares on this platform
- **shares**: Array of share events (last 100 kept)
  - **userId**: User who shared (if authenticated)
  - **sharedAt**: ISO 8601 timestamp
  - **metadata**: Additional tracking data

## Template Types (FR-4.2.2)

1. **MILESTONE**: Achievement/milestone cards
   - Use case: Company anniversaries, user milestones, achievements
   - Colors: Green (#10B981)
   - Layout: Centered

2. **GROWTH**: Growth metrics cards
   - Use case: Revenue growth, user growth, KPI achievements
   - Colors: Blue (#3B82F6)
   - Layout: Split (metrics on one side)
   - Supports: Up to 4 metrics with trend indicators

3. **FUNDING**: Funding announcement cards
   - Use case: Investment rounds, fundraising completion
   - Colors: Purple (#8B5CF6)
   - Layout: Centered with emphasis

4. **PRODUCT**: Product launch cards
   - Use case: New features, product releases
   - Colors: Amber (#F59E0B)
   - Layout: Left-aligned with imagery space

5. **TEAM**: Team update cards
   - Use case: New hires, team announcements
   - Colors: Pink (#EC4899)
   - Layout: Centered

6. **GENERAL**: Generic update cards
   - Use case: Any other update type
   - Colors: Indigo (#6366F1)
   - Layout: Centered

## Card Dimensions

Standard sizes for different platforms:
- **TWITTER**: 1200x630px (recommended for Twitter/X)
- **INSTAGRAM**: 1200x1200px (square format)
- **LINKEDIN**: 1200x627px
- **FACEBOOK**: 1200x630px
- **CUSTOM**: Configurable dimensions

## Languages Supported (FR-4.2.6)

### LTR (Left-to-Right) Languages
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Chinese (zh) - uses Noto Sans SC
- Japanese (ja) - uses Noto Sans JP
- Korean (ko) - uses Noto Sans KR

### RTL (Right-to-Left) Languages
- Arabic (ar) - uses Noto Sans Arabic
- Hebrew (he) - uses Noto Sans Hebrew

## Database Indexes

Two GIN indexes are created for efficient queries:

```sql
-- Index for social card queries
CREATE INDEX idx_company_update_metadata_social_card
ON "CompanyUpdate" USING GIN ((metadata->'socialCard'))
WHERE metadata->'socialCard' IS NOT NULL;

-- Index for social shares queries
CREATE INDEX idx_company_update_metadata_social_shares
ON "CompanyUpdate" USING GIN ((metadata->'socialShares'))
WHERE metadata->'socialShares' IS NOT NULL;
```

## Storage Integration

Generated images are stored in Cloudflare R2 (or AWS S3) with the following structure:

```
social-cards/
  {updateId}/
    {template}_{size}_{language}_{timestamp}.png
```

Example:
```
social-cards/upd_abc123/MILESTONE_TWITTER_en_1699123456789.png
```

## API Endpoints

### Update-specific Endpoints
- `POST /api/updates/:updateId/social-card` - Generate card
- `GET /api/updates/:updateId/social-card` - Get existing card
- `PUT /api/updates/:updateId/social-card` - Regenerate card
- `POST /api/updates/:updateId/social-share` - Track share
- `GET /api/updates/:updateId/social-stats` - Get stats
- `GET /api/updates/:updateId/share-urls` - Get share URLs

### Global Endpoints
- `GET /api/social-cards/templates` - List templates
- `POST /api/social-cards/templates` - Create custom template
- `POST /api/social-cards/preview` - Preview card
- `POST /api/social-cards/batch` - Batch generate cards

## Migration Notes

No schema changes are required as we're using the existing `metadata` JSON field. The migration file (`add_social_card_support.sql`) adds:

1. GIN indexes for efficient queries
2. Documentation via SQL comments
3. Validation that the metadata field exists

## Future Enhancements

Consider these potential enhancements:

1. **Separate SocialCard Table**: If social cards become more complex, consider creating a dedicated table:
   ```prisma
   model SocialCard {
     id         String   @id @default(cuid())
     updateId   String
     template   String
     imageUrl   String
     metadata   Json
     createdAt  DateTime @default(now())

     update CompanyUpdate @relation(fields: [updateId], references: [id])
     @@index([updateId])
   }
   ```

2. **Analytics Integration**: Connect to analytics platforms for deeper tracking

3. **A/B Testing**: Support multiple card variants for testing

4. **Video Cards**: Generate animated or video social cards

5. **AI-Generated Content**: Use AI to suggest card text and layouts

## Best Practices

1. **Card Generation**: Generate cards asynchronously for better performance
2. **Caching**: Cache generated cards and only regenerate on update changes
3. **Compression**: Use appropriate quality settings to balance file size and visual quality
4. **Tracking**: Always track shares but don't fail requests if tracking fails
5. **Multi-language**: Generate cards in the user's preferred language when available
6. **Cleanup**: Periodically clean up old share tracking data (keep last 100 shares per platform)

## Performance Considerations

- **Image Generation**: Currently using mock generation. In production:
  - Use node-canvas for server-side rendering
  - Or use puppeteer for HTML-to-image conversion
  - Or use external services like Cloudinary

- **Storage**: Images are stored in Cloudflare R2 for:
  - Fast global delivery via CDN
  - Cost-effective storage
  - No egress fees

- **Database**: JSON queries on PostgreSQL are efficient with GIN indexes

## Security Considerations

1. **Authentication**: All generation endpoints require authentication
2. **Rate Limiting**: Implement rate limits on card generation
3. **Input Validation**: All inputs are validated via Zod schemas
4. **File Storage**: Generated images are stored securely with access control
5. **XSS Prevention**: All user input is escaped in generated cards

## Compliance

- **GDPR**: Social share tracking includes user consent mechanisms
- **Data Retention**: Share data is automatically limited to last 100 entries
- **Privacy**: User IDs in share tracking are optional and respect privacy settings
