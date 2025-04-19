#!/bin/bash

echo "Vercel Build Script Starting..."

# Navigate to client directory and build
echo "Building client..."
cd client
npm install
npm run build
ls -la dist

echo "Client build complete!"

# Return to root directory
cd ..

echo "Vercel Build Script Complete!" 