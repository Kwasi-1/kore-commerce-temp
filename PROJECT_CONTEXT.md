# 🚀 HeadlessPOS Admin & Vysion Tech Commerce — Quick Context

> See full master documentation at [../PROJECT_CONTEXT.md](file:///c:/Users/kwasi/OneDrive/Desktop/business/vysion%20labs/vysion-tech%20commerce/PROJECT_CONTEXT.md).

### Quick Start Commands:
```bash
# 1. Install frontend dependencies
npm install

# 2. Run local frontend dev server
npm run dev

# 3. Validate TypeScript type safety
npx tsc --noEmit
```

### Key Conventions:
- **Mobile Design Standard**: Follow `PageLayout` with `headerVariant="action-bridge"`, `MobileDashboardWrapper`, `MobileActionCapsuleBar`, `MobileActivitySheet`, and `hidden md:flex` for desktop tables.
- **Backend API Base**: Default points to `http://localhost:5000/api/v1` via Axios client in `src/api/client.ts`.
