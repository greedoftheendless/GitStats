# CI/CD & Testing Guide for Ephemeral Comms

This document outlines the complete CI/CD pipeline and testing setup for the Ephemeral Comms project.

## Overview

The project uses GitHub Actions for continuous integration and deployment, with Vitest for unit testing on both frontend and backend. The setup is optimized for Nix Flake development environments.

## Table of Contents

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Testing Framework](#testing-framework)
3. [Running Tests Locally](#running-tests-locally)
4. [Writing Tests](#writing-tests)
5. [Deployment](#deployment)
6. [Environment Setup](#environment-setup)

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: Push to `main` or `develop`, Pull Requests

**Jobs**:
- **test-frontend**: Runs linting and tests for React frontend
- **test-backend**: Validates syntax and runs backend tests
- **lint**: Linting checks for both frontend and backend
- **security-check**: Dependency audits using `npm audit`
- **build**: Final build verification

**Key Features**:
- Caches npm dependencies for faster builds
- Runs on Node.js 20.x
- Generates GitHub Step Summary with build status
- Uploads frontend build artifacts

### 2. Code Quality Workflow (`.github/workflows/code-quality.yml`)

**Trigger**: Push to `main` or `develop`, Pull Requests

**Jobs**:
- **lint-frontend**: ESLint checks for React code
- **lint-backend**: ESLint checks for Node.js code
- **security-audit**: Comprehensive dependency scanning
- **bundle-size**: Reports frontend bundle size metrics

**Output**: GitHub Step Summary with code quality metrics

### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Trigger**: Push to `main` branch or manual workflow dispatch

**Jobs**:
- **deploy**: Builds frontend, validates backend, creates deployment package
- Uploads production-ready artifacts to GitHub

**Output**: Deployment package with frontend and backend ready for deployment

## Testing Framework

### Vitest Setup

Both frontend and backend use **Vitest** for unit testing:

```bash
# Install dependencies
npm install

# Frontend testing
cd frontend && npm test
cd frontend && npm run test:ui        # Interactive UI
cd frontend && npm run test:coverage  # Coverage report

# Backend testing
cd backend && npm test
cd backend && npm run test:ui         # Interactive UI
cd backend && npm run test:coverage   # Coverage report
```

### Configuration Files

**Frontend**: `frontend/vitest.config.js`
- Environment: jsdom (browser-like)
- Setup: `frontend/src/test/setup.js`
- Coverage: Includes all source files except tests and config

**Backend**: `backend/vitest.config.js`
- Environment: node (server-like)
- Coverage: Includes all source files except tests and config

## Running Tests Locally

### Prerequisites

Ensure you're in the Nix Flake environment:

```bash
nix develop
npm install
```

### Frontend Tests

```bash
cd frontend

# Run tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Backend Tests

```bash
cd backend

# Run tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Lint Code

```bash
# Frontend linting
cd frontend && npm run lint

# Backend linting
cd backend && npm run lint
```

## Writing Tests

### Frontend Tests (Vitest + React Testing Library)

Location: `frontend/src/test/`

Example test file:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<YourComponent />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

### Backend Tests (Vitest + Supertest)

Location: `backend/tests/`

Example test file:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  it('should return health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
```

### Test File Naming Convention

- Frontend: `ComponentName.test.jsx` (in `src/test/`)
- Backend: `feature.test.js` (in `tests/`)

### Mocking

**Frontend** (`frontend/src/test/setup.js`):
- Socket.IO client is pre-mocked
- window.matchMedia is mocked

**Backend**: Use Vitest's `vi.mock()` for module mocking

```javascript
import { vi } from 'vitest';

vi.mock('../utils/someModule', () => ({
  someFunction: vi.fn(() => 'mocked value'),
}));
```

## Linting & Code Style

### ESLint Configuration

**Frontend**: `frontend/eslint.config.js`
- Includes React best practices
- React Hooks rules enforcement
- Tailwind CSS compatibility

**Backend**: `backend/eslint.config.js`
- Node.js specific rules
- ES2022 features support

### Code Style Rules

Both enforce:
- Single quotes
- 2-space indentation
- Semicolons required
- No trailing spaces
- Proper spacing in objects and arrays
- Prefer const/let over var

## Deployment

### Build Artifacts

The CI pipeline creates two main artifacts:

1. **frontend-build**: Development frontend dist folder
2. **production-build**: Complete production-ready package

### Deployment Steps

1. Ensure all tests pass on `main` branch
2. GitHub Actions automatically builds frontend and backend
3. Download **production-build** artifact from Actions
4. Deploy according to your platform:

**Example deployment** (to be customized):

```bash
# Download and extract artifact
unzip production-build.zip

# Deploy frontend
cd public && npm install -g serve && serve -s . -l 3000 &

# Deploy backend
cd ../server && npm install --production && npm start
```

## Environment Setup

### Nix Flake Development

```bash
# Enter dev environment
nix develop

# Verify setup
node --version
npm --version

# Start dev servers
npm run dev        # Both frontend and backend in watch mode
```

### GitHub Secrets

For deployment workflows, configure these secrets in your repository:

- `DEPLOY_KEY`: SSH private key for your server
- `DEPLOY_HOST`: Server hostname/IP
- `DEPLOY_USER`: SSH username
- `DEPLOY_PATH`: Deployment directory path

## Workflow Status

Check workflow status at: `https://github.com/your-username/Ephemeral-Comms/actions`

### Status Badges

Add to your README:

```markdown
[![CI](https://github.com/your-username/Ephemeral-Comms/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/Ephemeral-Comms/actions/workflows/ci.yml)
[![Code Quality](https://github.com/your-username/Ephemeral-Comms/actions/workflows/code-quality.yml/badge.svg)](https://github.com/your-username/Ephemeral-Comms/actions/workflows/code-quality.yml)
[![Deploy](https://github.com/your-username/Ephemeral-Comms/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/Ephemeral-Comms/actions/workflows/deploy.yml)
```

## Troubleshooting

### Tests Fail Locally but Pass in CI

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vitest cache: `npx vitest --clearCache`
- Ensure you're using the correct Node.js version: `node --version`

### Import Errors in Frontend Tests

- Ensure `frontend/src/test/setup.js` is properly configured
- Check that `jsdom` is installed: `npm list jsdom`
- Verify vitest config includes `setupFiles`

### Backend Tests Timeout

- Increase timeout in test: `it('test', async () => {...}, 10000)`
- Check for unresolved promises in your code
- Verify all async operations complete properly

### Linting Errors

- Run formatter: `npm run lint -- --fix`
- Check ESLint config for conflicts with your code style
- Verify all required ESLint plugins are installed

## CI/CD Best Practices

1. **Always run tests before pushing**
   ```bash
   npm test
   ```

2. **Keep tests focused and independent**
   - One test per behavior
   - No interdependencies between tests

3. **Mock external services**
   - Don't hit real APIs in tests
   - Mock Socket.IO connections

4. **Commit often, deploy regularly**
   - Small, focused commits are easier to debug
   - Regular deployments catch issues early

5. **Monitor deployment artifacts**
   - Check artifact sizes don't grow unexpectedly
   - Review bundle size reports after each build

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest for HTTP Testing](https://github.com/visionmedia/supertest)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure)

## Support

For issues or questions about the CI/CD pipeline:
1. Check the GitHub Actions logs
2. Review this documentation
3. Run tests locally to reproduce issues
4. Check ESLint and Vitest documentation

---

**Last Updated**: 2024
**Node.js Version**: 20.x
**Package Manager**: npm
**Development Environment**: Nix Flake