# Responsive Design Guide

## Overview

This guide documents the responsive design patterns and best practices implemented for the Angel Investing Marketplace frontend application. The design follows a mobile-first approach with progressive enhancement for larger screens.

## Architecture

### Mobile-First Design Philosophy

- **Base styles** target mobile devices (320px+)
- **Progressive enhancement** adds complexity for larger screens
- **Touch-first interactions** with mouse/keyboard fallbacks
- **Performance-optimized** for slower mobile connections

### Breakpoint Strategy

```css
/* Mobile First (320px+) */
base styles

/* Small tablets and large phones (640px+) */
@media (min-width: 640px) { ... }

/* Tablets (768px+) */
@media (min-width: 768px) { ... }

/* Small desktops (1024px+) */
@media (min-width: 1024px) { ... }

/* Large desktops (1280px+) */
@media (min-width: 1280px) { ... }

/* Extra large screens (1536px+) */
@media (min-width: 1536px) { ... }
```

## Layout Components

### Responsive Layout (`responsive-layout.tsx`)

Main layout wrapper that provides consistent structure across all pages.

```tsx
<ResponsiveLayout
  user={user}
  onLogout={logout}
  title="Page Title"
  subtitle="Page description"
>
  <PageContent />
</ResponsiveLayout>
```

**Features:**
- Desktop sidebar navigation (1024px+)
- Mobile bottom tab navigation
- Responsive header with search and user menu
- Automatic padding adjustment for sidebar

### Navigation Components

#### Mobile Navigation (`mobile-nav.tsx`)
- **Hamburger menu** with slide-out drawer
- **Bottom tab bar** for quick navigation
- **Touch-friendly** 44px minimum touch targets
- **Badge notifications** for messages and alerts

#### Desktop Navigation (`desktop-nav.tsx`)
- **Collapsible sidebar** with rich navigation
- **User profile section** with dropdown menu
- **Quick action buttons** for common tasks
- **Keyboard accessible** with proper focus management

## Grid Systems

### Responsive Grid (`responsive-grid.tsx`)

Flexible grid system that adapts to screen size:

```tsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
<ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }}>
  <Card>Content 1</Card>
  <Card>Content 2</Card>
  <Card>Content 3</Card>
  <Card>Content 4</Card>
</ResponsiveGrid>
```

**Predefined variants:**
- `MobileFirstGrid` - 1/2/3/4 columns
- `DashboardGrid` - 1/2/4 columns for stats
- `ListGrid` - 1/2/3/4/5 columns for lists
- `TabletGrid` - 1/2/3 columns for tablet optimization

## Component Patterns

### Touch Buttons (`touch-button.tsx`)

All interactive elements meet WCAG touch target requirements:

```tsx
<TouchButton size="lg" haptic={true}>
  Primary Action
</TouchButton>
```

**Size variants:**
- `sm`: 40px height (minimum touch target)
- `default`: 48px height (comfortable touch)
- `lg`: 56px height (prominent actions)
- `xl`: 64px height (hero actions)

**Features:**
- Haptic feedback on supported devices
- Long-press support for secondary actions
- Visual feedback with scale animation
- Touch and mouse interaction support

### Responsive Cards (`responsive-card.tsx`)

Cards that adapt to different screen sizes:

```tsx
<ResponsiveCard interactive onClick={handleClick}>
  <CardContent>
    <h3>Card Title</h3>
    <p>Card content that adapts to screen size</p>
  </CardContent>
</ResponsiveCard>
```

**Variants:**
- `MobileCard` - Compact spacing, subtle borders
- `TabletCard` - Medium spacing, standard appearance
- `DesktopCard` - Generous spacing, pronounced shadows

### Responsive Forms (`responsive-form.tsx`)

Form components optimized for touch and different screen sizes:

```tsx
<FormGrid cols={{ default: 1, sm: 2 }}>
  <ResponsiveInput
    label="First Name"
    placeholder="Enter first name"
  />
  <ResponsiveInput
    label="Last Name"
    placeholder="Enter last name"
  />
</FormGrid>
```

**Features:**
- Touch-friendly input heights (48px on mobile)
- Responsive text sizing
- Proper error state handling
- Accessible form labels

### Responsive Tables (`responsive-table.tsx`)

Data tables that transform based on screen size:

```tsx
<ResponsiveTable
  data={investments}
  columns={columns}
  keyField="id"
/>
```

**Responsive behavior:**
- **Mobile**: Card-based layout with key information
- **Tablet**: Hybrid grid layout (2-3 columns)
- **Desktop**: Full table layout with sorting

### Responsive Modals (`responsive-modal.tsx`)

Modal dialogs that work across all devices:

```tsx
<ResponsiveModal
  title="Investment Details"
  size="md"
  trigger={<Button>Open Modal</Button>}
>
  <ModalContent />
</ResponsiveModal>
```

**Size variants:**
- `sm`: 384px max width (mobile optimized)
- `md`: 448px max width (standard)
- `lg`: 512px max width (desktop)
- `fullscreen`: Full screen (mobile presentations)

## Typography Scale

### Responsive Text Sizing

```css
/* Mobile-first base sizes */
text-xs     /* 12px */
text-sm     /* 14px */
text-base   /* 16px */
text-lg     /* 18px */
text-xl     /* 20px */
text-2xl    /* 24px */
text-3xl    /* 30px */

/* Responsive scaling */
sm:text-sm  /* 14px on small screens */
md:text-base /* 16px on medium screens */
lg:text-lg  /* 18px on large screens */
```

### Line Heights

```css
leading-tight   /* 1.25 */
leading-snug    /* 1.375 */
leading-normal  /* 1.5 */
leading-relaxed /* 1.625 */
leading-loose   /* 2 */
```

## Spacing System

### Consistent Spacing Scale

```css
/* Base scale (4px increments) */
space-1   /* 4px */
space-2   /* 8px */
space-3   /* 12px */
space-4   /* 16px */
space-5   /* 20px */
space-6   /* 24px */
space-8   /* 32px */
space-10  /* 40px */
space-12  /* 48px */
```

### Responsive Spacing

```css
/* Mobile-first with responsive overrides */
p-4              /* 16px base */
sm:p-6           /* 24px on small screens */
md:p-8           /* 32px on medium screens */
lg:p-10          /* 40px on large screens */
```

## Color System

### Responsive Color Usage

```css
/* Ensure sufficient contrast ratios */
text-foreground     /* 4.5:1 minimum ratio */
text-muted-foreground /* 3:1 minimum ratio */
border             /* Subtle but visible */
```

### Dark Mode Support

```css
/* Automatic dark mode adaptation */
bg-background      /* Light/Dark adaptive */
text-foreground    /* Light/Dark adaptive */
border             /* Light/Dark adaptive */
```

## Animation & Performance

### Hardware-Accelerated Animations

```css
/* Use transform and opacity for smooth animations */
transition-transform duration-200 ease-out
active:scale-95
hover:opacity-90
```

### Performance Optimizations

1. **Lazy Loading**: Images load only when needed
2. **Virtual Scrolling**: For long lists
3. **Debounced Inputs**: Prevent excessive API calls
4. **Optimized Re-renders**: Proper React key usage

## Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Touch Targets**: Minimum 44px × 44px
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and structure
- **Focus Management**: Visible focus indicators

### Keyboard Navigation

```tsx
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation'

function MyComponent() {
  useKeyboardNavigation({
    onEscape: () => closeModal(),
    onEnter: () => handleSubmit(),
    onArrowDown: () => focusNext(),
  })
}
```

## Testing Guidelines

### Cross-Device Testing

**Mobile Devices (320px - 768px):**
- iPhone SE (375px × 667px)
- iPhone 14 (390px × 844px)
- Samsung Galaxy S22 (360px × 780px)

**Tablet Devices (768px - 1024px):**
- iPad (768px × 1024px)
- iPad Pro (1024px × 1366px)
- Android tablets (800px × 1280px)

**Desktop Devices (1024px+):**
- Small laptops (1024px × 768px)
- Standard monitors (1920px × 1080px)
- Large displays (2560px × 1440px)

### Browser Testing

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Testing Tools

1. **Browser DevTools**: Device simulation
2. **Responsive Design Mode**: Firefox/Chrome
3. **Physical Devices**: Real device testing
4. **Automated Testing**: Visual regression tests

## Best Practices

### Mobile-First Development

1. **Start with mobile design** and enhance for larger screens
2. **Use progressive enhancement** rather than graceful degradation
3. **Test on real devices** throughout development
4. **Optimize performance** for mobile networks

### Component Design

1. **Consistent touch targets** (44px minimum)
2. **Logical information hierarchy** for each screen size
3. **Appropriate content density** for each device
4. **Smooth transitions** between breakpoints

### Performance Optimization

1. **Optimize images** with responsive sizing and lazy loading
2. **Minimize CSS bundle** size with efficient Tailwind usage
3. **Use hardware acceleration** for animations
4. **Implement proper caching** strategies

## Implementation Checklist

### New Components

- [ ] Mobile-first responsive design
- [ ] Touch-friendly interactions (44px targets)
- [ ] Keyboard accessibility
- [ ] Screen reader compatibility
- [ ] Cross-device testing
- [ ] Performance optimization

### Layout Updates

- [ ] Responsive grid implementation
- [ ] Flexible navigation patterns
- [ ] Adaptive content layouts
- [ ] Consistent spacing system
- [ ] Typography scale compliance

### Testing Requirements

- [ ] Mobile device testing (320px+)
- [ ] Tablet optimization (768px+)
- [ ] Desktop enhancement (1024px+)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Performance benchmarking

## Maintenance

### Regular Updates

1. **Monitor Core Web Vitals** for performance regressions
2. **Test on new devices** as they become available
3. **Update breakpoint values** based on usage analytics
4. **Review accessibility** with each major update

### Team Guidelines

1. **Use established patterns** from this guide
2. **Test responsive behavior** in pull requests
3. **Document new patterns** in this guide
4. **Consider performance impact** of design changes

---

This guide ensures consistent, accessible, and performant responsive design across the entire Angel Investing Marketplace application.