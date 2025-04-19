# Separate Deployment Instructions for Developer Clinic

## Step 1: Deploy the Server (Backend)

1. **Create a new Vercel project for your server**:
   - Go to Vercel dashboard and click "Add New Project"
   - Import your GitHub repository
   - In the configuration screen:
     - Set Framework Preset: "Other"
     - Set Root Directory: `server`
     - Build Command: `npm install`
     - Output Directory: (leave empty)

2. **Set Environment Variables**:
   - Add all environment variables from your `.env` file
   - Add `NODE_ENV=production`
   - Add `CLIENT_URL=https://developer-clinic.vercel.app` (your client URL)

3. **Deploy the Server**:
   - Click "Deploy"
   - Note the deployment URL (e.g., https://developer-clinic-server.vercel.app)

## Step 2: Deploy the Client (Frontend)

1. **Update Client Environment Variables**:
   - Make sure `client/.env.production` points to your server URL:
     ```
     VITE_SERVER_URL=https://developer-clinic-server.vercel.app
     VITE_API_URL=https://developer-clinic-server.vercel.app/api
     VITE_GOOGLE_CLIENT_ID="816606116838-rs5rh2bkn77nuqrdf9ksos07p95dc618.apps.googleusercontent.com"
     VITE_OPENCAGE_API_KEY="dac4fa13f8da47b1b8de914d529eb579"
     ```

2. **Create a new Vercel project for your client**:
   - Go to Vercel dashboard and click "Add New Project"
   - Import your GitHub repository
   - In the configuration screen:
     - Set Framework Preset: "Vite"
     - Set Root Directory: `client`
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Set Client Environment Variables**:
   - Add your client environment variables:
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_OPENCAGE_API_KEY`
     - `VITE_SERVER_URL`
     - `VITE_API_URL`

4. **Deploy the Client**:
   - Click "Deploy"

## Step 3: Update CORS Configuration

1. **Update the server's CORS configuration**:
   - Make sure `server/cors-config.js` includes your client domain:
     ```js
     const ALLOWED_ORIGINS = [
       // Development origins
       "http://localhost:5173",
       // Production client origins
       "https://developer-clinic.vercel.app",
       // Add any other client domains here
     ];
     ```

2. **Redeploy the server** to apply the CORS changes

## Step 4: Test Your Deployed Application

1. **Visit your client URL** (e.g., https://developer-clinic.vercel.app)
2. **Test all functionality**, especially features that require server communication
3. **Test Socket.IO functionality** to ensure real-time features work

## Troubleshooting

If you encounter issues:

1. **Check CORS errors** in the browser console
2. **Verify environment variables** are set correctly in both deployments
3. **Check server logs** in the Vercel dashboard for any backend errors
4. **Test API endpoints directly** by visiting server URLs directly
5. **Ensure Socket.IO is properly configured** with the correct origins 