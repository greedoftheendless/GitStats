#!/bin/bash

# Ephemeral Comms - Development Quick Reference
# This script provides quick commands for common development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_section() {
  echo -e "\n${YELLOW}📌 $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Main menu
show_menu() {
  print_header "Ephemeral Comms Development Menu"

  echo "1. Setup & Install"
  echo "2. Run Tests"
  echo "3. Run Linters"
  echo "4. Build"
  echo "5. Development Servers"
  echo "6. Git Operations"
  echo "7. Deployment"
  echo "8. Documentation"
  echo "9. Clean & Reset"
  echo "0. Exit"
  echo ""
}

# 1. Setup & Install
setup_menu() {
  print_header "Setup & Installation"

  echo "1. Full setup (Nix + npm install)"
  echo "2. npm install only"
  echo "3. Install frontend dependencies"
  echo "4. Install backend dependencies"
  echo "5. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Setting up development environment"
      nix develop --command bash -c "npm install && cd frontend && npm install && cd ../backend && npm install && cd .."
      print_success "Setup complete!"
      ;;
    2)
      print_section "Installing npm dependencies"
      npm install
      cd frontend && npm install && cd ..
      cd backend && npm install && cd ..
      print_success "npm install complete!"
      ;;
    3)
      print_section "Installing frontend dependencies"
      cd frontend && npm install && cd ..
      print_success "Frontend dependencies installed!"
      ;;
    4)
      print_section "Installing backend dependencies"
      cd backend && npm install && cd ..
      print_success "Backend dependencies installed!"
      ;;
    5)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 2. Run Tests
test_menu() {
  print_header "Testing"

  echo "1. Run all tests"
  echo "2. Frontend tests (watch mode)"
  echo "3. Backend tests (watch mode)"
  echo "4. Frontend tests with UI"
  echo "5. Backend tests with UI"
  echo "6. Frontend coverage"
  echo "7. Backend coverage"
  echo "8. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Running all tests"
      cd frontend && npm test && cd ..
      cd backend && npm test && cd ..
      print_success "All tests completed!"
      ;;
    2)
      print_section "Running frontend tests (watch mode)"
      cd frontend && npm test -- --watch
      ;;
    3)
      print_section "Running backend tests (watch mode)"
      cd backend && npm test -- --watch
      ;;
    4)
      print_section "Running frontend tests with UI"
      cd frontend && npm run test:ui
      ;;
    5)
      print_section "Running backend tests with UI"
      cd backend && npm run test:ui
      ;;
    6)
      print_section "Generating frontend coverage"
      cd frontend && npm run test:coverage
      echo -e "${GREEN}Coverage report: frontend/coverage/index.html${NC}"
      ;;
    7)
      print_section "Generating backend coverage"
      cd backend && npm run test:coverage
      echo -e "${GREEN}Coverage report: backend/coverage/index.html${NC}"
      ;;
    8)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 3. Run Linters
lint_menu() {
  print_header "Code Quality & Linting"

  echo "1. Lint frontend"
  echo "2. Lint backend"
  echo "3. Audit frontend dependencies"
  echo "4. Audit backend dependencies"
  echo "5. Fix linting issues (frontend)"
  echo "6. Fix linting issues (backend)"
  echo "7. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Linting frontend"
      cd frontend && npm run lint
      ;;
    2)
      print_section "Linting backend"
      cd backend && npm run lint
      ;;
    3)
      print_section "Auditing frontend dependencies"
      cd frontend && npm audit
      ;;
    4)
      print_section "Auditing backend dependencies"
      cd backend && npm audit
      ;;
    5)
      print_section "Fixing frontend linting issues"
      cd frontend && npm run lint -- --fix
      print_success "Frontend linting issues fixed!"
      ;;
    6)
      print_section "Fixing backend linting issues"
      cd backend && npm run lint -- --fix
      print_success "Backend linting issues fixed!"
      ;;
    7)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 4. Build
build_menu() {
  print_header "Building"

  echo "1. Build frontend"
  echo "2. Build frontend + preview"
  echo "3. Validate backend syntax"
  echo "4. Full build (frontend + backend validation)"
  echo "5. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Building frontend"
      cd frontend && npm run build
      print_success "Frontend build complete!"
      echo -e "${GREEN}Output: frontend/dist${NC}"
      ;;
    2)
      print_section "Building and previewing frontend"
      cd frontend && npm run build && npm run preview
      ;;
    3)
      print_section "Validating backend syntax"
      node --check backend/server.js
      print_success "Backend syntax is valid!"
      ;;
    4)
      print_section "Building frontend"
      cd frontend && npm run build
      print_success "Frontend build complete!"
      print_section "Validating backend"
      node --check backend/server.js
      print_success "Backend syntax valid!"
      ;;
    5)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 5. Development Servers
dev_menu() {
  print_header "Development Servers"

  echo "1. Start frontend dev server"
  echo "2. Start backend dev server"
  echo "3. Start both (requires two terminals)"
  echo "4. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Starting frontend dev server"
      print_info "Frontend will open at http://localhost:5173"
      cd frontend && npm run dev
      ;;
    2)
      print_section "Starting backend dev server"
      print_info "Backend will run at http://localhost:3001"
      cd backend && npm run dev
      ;;
    3)
      print_section "To start both:"
      echo "Terminal 1: cd frontend && npm run dev"
      echo "Terminal 2: cd backend && npm run dev"
      ;;
    4)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 6. Git Operations
git_menu() {
  print_header "Git Operations"

  echo "1. Status"
  echo "2. Add all and status"
  echo "3. View recent commits"
  echo "4. Create feature branch"
  echo "5. Switch branch"
  echo "6. Pull latest"
  echo "7. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      git status
      ;;
    2)
      git add .
      git status
      ;;
    3)
      git log --oneline -10
      ;;
    4)
      read -p "Enter feature name: " feature_name
      git checkout -b "feature/$feature_name"
      print_success "Created branch: feature/$feature_name"
      ;;
    5)
      git branch -a
      read -p "Enter branch name: " branch_name
      git checkout "$branch_name"
      print_success "Switched to: $branch_name"
      ;;
    6)
      git pull origin develop
      print_success "Latest pulled from develop"
      ;;
    7)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 7. Deployment
deploy_menu() {
  print_header "Deployment"

  echo "1. Build production package"
  echo "2. View deployment docs"
  echo "3. Check GitHub Actions status"
  echo "4. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Building production package"
      mkdir -p deploy-package
      cd frontend && npm run build && cd ..
      cp -r frontend/dist deploy-package/public
      cp -r backend deploy-package/server
      cd deploy-package/server && npm ci --production && cd ../..
      print_success "Production package ready in: deploy-package/"
      du -sh deploy-package
      ;;
    2)
      print_section "Deployment Documentation"
      if [ -f "CI_CD_TESTING.md" ]; then
        echo "View: CI_CD_TESTING.md"
      fi
      ;;
    3)
      print_info "GitHub Actions: https://github.com/YOUR_USERNAME/Ephemeral-Comms/actions"
      ;;
    4)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 8. Documentation
docs_menu() {
  print_header "Documentation"

  echo "1. View CI/CD & Testing guide"
  echo "2. View CI/CD Setup summary"
  echo "3. View main README"
  echo "4. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      if [ -f "CI_CD_TESTING.md" ]; then
        less CI_CD_TESTING.md
      else
        echo "CI_CD_TESTING.md not found"
      fi
      ;;
    2)
      if [ -f "CICD_SETUP.md" ]; then
        less CICD_SETUP.md
      else
        echo "CICD_SETUP.md not found"
      fi
      ;;
    3)
      if [ -f "README.md" ]; then
        less README.md
      else
        echo "README.md not found"
      fi
      ;;
    4)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# 9. Clean & Reset
clean_menu() {
  print_header "Clean & Reset"

  echo "1. Clear node_modules and reinstall"
  echo "2. Clear build artifacts"
  echo "3. Clear test cache"
  echo "4. Full clean (everything)"
  echo "5. Back to main menu"
  echo ""
  read -p "Select option: " choice

  case $choice in
    1)
      print_section "Clearing node_modules and reinstalling"
      rm -rf node_modules frontend/node_modules backend/node_modules
      npm install
      cd frontend && npm install && cd ..
      cd backend && npm install && cd ..
      print_success "Clean install complete!"
      ;;
    2)
      print_section "Clearing build artifacts"
      rm -rf frontend/dist backend/dist deploy-package
      print_success "Build artifacts cleared!"
      ;;
    3)
      print_section "Clearing test cache"
      rm -rf .vitest frontend/.vitest backend/.vitest
      rm -rf coverage frontend/coverage backend/coverage
      print_success "Test cache cleared!"
      ;;
    4)
      print_section "WARNING: This will clear everything!"
      read -p "Type 'yes' to confirm: " confirm
      if [ "$confirm" = "yes" ]; then
        rm -rf node_modules frontend/node_modules backend/node_modules
        rm -rf frontend/dist backend/dist deploy-package
        rm -rf .vitest frontend/.vitest backend/.vitest
        rm -rf coverage frontend/coverage backend/coverage
        npm install
        cd frontend && npm install && cd ..
        cd backend && npm install && cd ..
        print_success "Full clean complete!"
      fi
      ;;
    5)
      return
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
}

# Main loop
while true; do
  show_menu
  read -p "Select option: " choice

  case $choice in
    1)
      setup_menu
      ;;
    2)
      test_menu
      ;;
    3)
      lint_menu
      ;;
    4)
      build_menu
      ;;
    5)
      dev_menu
      ;;
    6)
      git_menu
      ;;
    7)
      deploy_menu
      ;;
    8)
      docs_menu
      ;;
    9)
      clean_menu
      ;;
    0)
      print_header "Thanks for using Ephemeral Comms!"
      exit 0
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
done
