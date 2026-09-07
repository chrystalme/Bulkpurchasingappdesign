#!/bin/bash

# Script to rename /server folder to /backend
# And update all necessary references

echo "🔄 Renaming /server to /backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if server folder exists
if [ ! -d "server" ]; then
    echo "❌ Error: /server folder not found!"
    echo "   Make sure you're running this script from the project root."
    exit 1
fi

# Check if backend folder already exists
if [ -d "backend" ]; then
    echo "⚠️  Warning: /backend folder already exists!"
    echo "   Do you want to replace it? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled."
        exit 0
    fi
    echo "🗑️  Removing existing /backend folder..."
    rm -rf backend
fi

# Rename the folder
echo "📁 Renaming server → backend..."
mv server backend

if [ $? -eq 0 ]; then
    echo "✅ Folder renamed successfully!"
else
    echo "❌ Error renaming folder!"
    exit 1
fi

# Update README or documentation references (optional)
echo ""
echo "📝 Checking for references to update..."

# List files that might reference 'server' folder
files_to_check=(
    "README.md"
    "package.json"
    ".github/workflows/*.yml"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "cd server" "$file" 2>/dev/null; then
            echo "   ⚠️  Found reference in: $file"
            echo "      Please manually update 'cd server' to 'cd backend'"
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. cd backend"
echo "   2. npm run migrate  # Run the new group chat migration"
echo "   3. npm run dev      # Start the backend server"
echo ""
echo "📚 For detailed instructions, see:"
echo "   - SERVER_TO_BACKEND_MIGRATION.md"
echo "   - INSTALLATION_STEPS.md"
echo ""
echo "🎉 Your server is now /backend!"
