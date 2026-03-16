#!/bin/bash
set -e

VERSION_TYPE="${1:-skip}"

echo "📦 Publishing upag-js locally"
echo "=============================="

# Validate version type
if [[ "$VERSION_TYPE" != "skip" && "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
  echo "❌ Invalid version type: $VERSION_TYPE"
  echo "Usage: ./scripts/publish.sh [skip|patch|minor|major]"
  exit 1
fi

# Check if logged in to npm
if ! npm whoami &>/dev/null; then
  echo "❌ Not logged in to npm. Run 'npm login' first."
  exit 1
fi

echo "✅ Logged in as: $(npm whoami)"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm ci

# Build
echo ""
echo "🔨 Building..."
npm run build

# # Run tests
# echo ""
# echo "🧪 Running tests..."
# npm test

# Bump version if requested
if [[ "$VERSION_TYPE" != "skip" ]]; then
  echo ""
  echo "📝 Bumping version ($VERSION_TYPE)..."
  npm version "$VERSION_TYPE" --no-git-tag-version
  echo "New version: $(node -p "require('./package.json').version")"
fi

# Show current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "📦 Publishing version $CURRENT_VERSION..."

# Confirm before publishing
read -p "Proceed with publish? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Publish cancelled"
  exit 1
fi

# Publish
npm publish --access public

echo ""
echo "✅ Successfully published upag-js@$CURRENT_VERSION"
