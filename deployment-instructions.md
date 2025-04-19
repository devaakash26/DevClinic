# Deployment Instructions for Developer Clinic

## Client Deployment Steps (Frontend)

1. **Prepare Environment Variables**:
   - Ensure `.env.production` file is properly configured with:
     ```
     VITE_SERVER_URL=https://${VERCEL_URL}
     VITE_API_URL=https://${VERCEL_URL}/api
     VITE_GOOGLE_CLIENT_ID="816606116838-rs5rh2bkn77nuqrdf9ksos07p95dc618.apps.googleusercontent.com"
     VITE_OPENCAGE_API_KEY="dac4fa13f8da47b1b8de914d529eb579"
     ```

2. **Build the Client Application**:
   - Run `npm run build` in the client directory
   - This creates the `dist` folder that will be deployed

3. **Vercel-Specific Settings for Client**:
   - Framework preset: Vite
   - Build command: `npm run vercel-build`
   - Output directory: `dist`
   - Install command: `npm install`
   - Development command: `npm run dev`

4. **Client Environment Variables in Vercel**:
   - Add the following environment variables in the Vercel dashboard:
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_OPENCAGE_API_KEY`
     - Vercel will automatically provide the `VERCEL_URL` variable

## Server Deployment Steps (Backend)

1. **Prepare the Server for Deployment**:
   - Ensure CORS settings are properly configured for production:
     ```js
     const option = {
         origin: process.env.NODE_ENV === 'production' 
             ? [process.env.CLIENT_URL, "https://developer-clinic.vercel.app"] 
             : "http://localhost:5173",
         methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
         credentials: true
     }
     ```

2. **Vercel-Specific Settings for Server**:
   - Framework preset: Node.js
   - Build command: none (or `npm install`)
   - Output directory: none
   - Install command: `npm install`
   - Development command: `npm run server`

3. **Server Environment Variables in Vercel**:
   - Add all environment variables from your local `.env` file to Vercel:
     - Database connection strings
     - JWT secrets
     - Any API keys
     - `NODE_ENV=production`
     - `CLIENT_URL` (with the Vercel URL of your client deployment)

4. **Vercel.json Configuration for Server**:
   - Ensure this configuration in `server/vercel.json`:
     ```json
     {
         "installCommand": "npm install --legacy-peer-deps",
         "version": 2,
         "builds": [
             {
                 "src": "index.js",
                 "use": "@vercel/node"
             },
             {
                 "src": "src/**/*",
                 "use": "@vercel/static"
             }
         ],
         "routes": [
             {
                 "src": "/(.*)",
                 "dest": "/"
             }
         ]
     }
     ```

## Monorepo Deployment (Combined Approach)

If deploying as a monorepo (both client and server together):

1. **Root-level Vercel.json Configuration**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "client/package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       },
       {
         "src": "server/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "server/index.js"
       },
       {
         "src": "/(.*)",
         "dest": "client/dist/$1"
       }
     ]
   }
   ```

2. **Environment Variables for Monorepo**:
   - Add all client and server environment variables to the Vercel project

3. **Deploy from GitHub**:
   - Connect your GitHub repository to Vercel
   - Configure the root directory as the project root
   - Deploy the application

## Post-Deployment

1. **Verify Socket.IO Connection**:
   - Test real-time notifications functionality
   - Use the debug endpoint `/api/debug/socket-status` to verify connections

2. **Update CORS if Needed**:
   - If you've added a custom domain, update the CORS configuration with the new domain

3. **Monitor Application Logs**:
   - Check Vercel logs for any errors or issues
   - Monitor server performance and connection issues 