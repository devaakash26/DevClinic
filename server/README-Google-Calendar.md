# Setting Up Google Calendar Integration for Video Consultations

This guide will help you set up Google Calendar integration for video consultations in DevClinic.

## Prerequisites

1. A Google account
2. A Google Cloud project with Google Calendar API and Google Meet API enabled
3. OAuth 2.0 credentials for your Google Cloud project

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Required APIs

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Google Calendar API
   - Google Meet API

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Set the application type to "Web application"
4. Add "https://developers.google.com/oauthplayground" to the Authorized redirect URIs
5. Click "Create"
6. Note your Client ID and Client Secret

## Step 4: Generate a Refresh Token

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right corner
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 3
5. Close the settings dialog
6. In the left panel, scroll down and select "Google Calendar API v3" > "https://www.googleapis.com/auth/calendar"
7. Click "Authorize APIs"
8. Sign in with the Google account you want to use for calendar integration
9. Grant the requested permissions
10. Click "Exchange authorization code for tokens"
11. Note the Refresh token that appears in the response

## Step 5: Configure Your Environment Variables

Add the following to your `.env` file:

```
# Google Calendar API for Video Consultations
GOOGLE_CLIENT_ID_MEET=your_client_id_here
GOOGLE_CLIENT_SECRET_MEET=your_client_secret_here
GOOGLE_REFRESH_TOKEN_MEET=your_refresh_token_here
GOOGLE_CALENDAR_ID_MEET=primary
```

**IMPORTANT:** 
- Ensure there are NO SPACES before or after the equals sign (=)
- The refresh token should be a single line with no line breaks
- For GOOGLE_CALENDAR_ID_MEET, use "primary" to use the primary calendar of the authenticated user, or specify a particular calendar ID

## Step 6: Test Your Integration

Run the test script to verify your Google Calendar integration:

```
node server/scripts/testGoogleCalendar.js
```

This script will:
1. Check your configuration
2. Try to create a test event with a Google Meet link
3. Report any issues and provide troubleshooting advice

## Troubleshooting

### Invalid Grant Error

If you see an "invalid_grant" error, your refresh token may have expired. Generate a new refresh token by repeating Step 4.

### Invalid Client Error

If you see an "invalid_client" error, double-check your Client ID and Client Secret. Make sure there are no extra spaces or characters.

### API Not Enabled Error

If you see an error about the API not being enabled, make sure you've enabled both the Google Calendar API and Google Meet API in your Google Cloud project.

### Google Meet Link Not Created

If an event is created but no Google Meet link is generated, make sure:

1. Your Google account has access to Google Meet
2. You've enabled the Google Meet API in your Google Cloud project
3. You're using the correct conferenceDataVersion (should be 1)

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google Meet API Documentation](https://developers.google.com/meet/api/guides/overview)
- [OAuth 2.0 Playground Documentation](https://developers.google.com/oauthplayground/) 