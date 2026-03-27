# 🚀 Ephemeral Comms - CI/CD Quick Reference Card

## One-Line Setup
```bash
nix develop && npm install && cd frontend && npm install && cd ../backend && npm install
```

## One-Line to Run Tests
```bash
npm test
```

## Core Commands

| Task | Command |
|------|---------|
| **Setup** | `nix develop` |
| **Install** | `npm install` (in each dir) |
| **Test All** | `npm test` |
| **Test UI** | `npm run test:ui` |
| **Coverage** | `npm run test:coverage` |
| **Lint** | `npm run lint` |
| **Build** | `npm run build` (frontend) |
| **Audit** | `npm audit` |
| **Dev** | `npm run dev` |
| **Deploy** | `git push origin main` |

## Files You Need to Know

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI pipeline |
| `.github/workflows/code-quality.yml` | Quality checks |
| `.github/workflows/deploy.yml` | Deployment |
| `CI_CD_TESTING.md` | Full documentation |
| `dev-reference.sh` | Interactive menu |
| `START_HERE.sh` | Colorful guide |

## Workflow Triggers

- **CI**: Push/PR to main/develop → runs tests, lints, builds
- **Code Quality**: Push/PR to main/develop → eslint, audits, bundle size
- **Deploy**: Push to main → builds package, uploads artifacts

## Test Files Location

```
frontend/src/test/*.test.jsx        # React component tests
backend/tests/*.test.js              # Backend API tests
```

## Add Your Tests

```bash
# Frontend
touch frontend/src/test/MyComponent.test.jsx

# Backend
touch backend/tests/myfeature.test.js
```

## Check Status

View workflows: `https://github.com/YOUR_USERNAME/Ephemeral-Comms/actions`

## Need Help?

1. `bash START_HERE.sh` - Colorful guide
2. `bash dev-reference.sh` - Interactive menu
3. `cat CI_CD_TESTING.md` - Full documentation

## Test Commands by Directory

```bash
# Frontend only
cd frontend && npm test

# Backend only
cd backend && npm test

# Both with UI
npm run test:ui

# Coverage reports
npm run test:coverage
```

## Deployment Setup (Optional)

1. Edit `.github/workflows/deploy.yml`
2. Add your deployment steps
3. Set GitHub Secrets: DEPLOY_KEY, DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH

## CI/CD Status Badges

Add to README.md:
```markdown
[![CI](https://github.com/YOUR_USERNAME/Ephemeral-Comms/actions/workflows/ci.yml/badge.svg)](...)
```

---

**Total Setup Time**: ~5 minutes
**Files Created**: 13
**Dependencies Added**: 12
**Documentation**: 1000+ lines

🎉 **Your CI/CD pipeline is ready!**
