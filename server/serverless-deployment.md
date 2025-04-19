# Serverless Deployment Instructions for Vercel

## Server Setup Overview

The server is now configured to work with Vercel's serverless architecture using the `serverless-http` package. This approach is more efficient for Vercel deployment compared to running a full Express server.

## Key Changes

1. **Serverless Handler**:
   - Added `serverless-http` package
   - Exported app as `module.exports.handler = serverless(app)`
   - Modified server startup logic to work in both serverless and local environments

2. **Route Configuration**:
   - Simplified vercel.json to route all traffic to index.js
   - Added `/api/test` endpoint for easy verification

3. **Socket.IO Configuration**:
   - Socket.IO is initialized conditionally
   - Added safeguards around Socket.IO usage in serverless environment

## Deployment Steps

1. **Push your changes** to GitHub

2. **Create a new Vercel project** for your server:
   - Go to Vercel dashboard
   - Create new project and import your GitHub repository
   - Set the root directory to `server`
   - Configure the following settings:
     - Build Command: (leave empty)
     - Output Directory: (leave empty)
     - Install Command: `npm install --legacy-peer-deps`

3. **Configure Environment Variables**:
   - Add all the variables from your .env file
   - Make sure to set `NODE_ENV=production`
   - Set `CLIENT_URL` to your client's Vercel URL

4. **Deploy the Server**:
   - Click "Deploy"
   - After deployment, verify the API works by visiting `/api/test`

5. **Update Client Configuration**:
   - Ensure client is using the correct server URL
   - Redeploy the client if needed

## Testing

1. **Verify API Functionality**:
   - Test `/api/test` endpoint (should return JSON with status message)
   - Test authentication and other API endpoints

2. **Monitor Logs**:
   - Check Vercel function logs for any errors
   - Use the custom error handlers to diagnose issues

## Troubleshooting

1. **Function Size Limits**:
   - If you encounter size limit errors, you may need to adjust the maxLambdaSize in vercel.json

2. **CORS Issues**:
   - If you encounter CORS errors, verify the corsOptions configuration
   - Ensure CORS middleware is applied before routes

3. **Socket.IO Issues**:
   - Socket.IO may require additional configuration in serverless environments
   - Consider removing Socket.IO if not critical for your application

4. **Database Connection Issues**:
   - Ensure your MongoDB connection string is correct
   - Check that your database allows connections from Vercel's IP ranges 