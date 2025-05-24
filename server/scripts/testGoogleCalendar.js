/**
 * DevClinic - Google Calendar Integration Test Script
 * 
 * This script tests the Google Calendar integration for video consultations.
 * Run it with: node scripts/testGoogleCalendar.js
 */

const { google } = require('googleapis');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { googleConfig, isConfigured } = require('../googleCalendarConfig');

// Load environment variables
console.log('Loading environment variables...');
dotenv.config();

// Verify the loaded environment variables
console.log('\n== Google Calendar API Configuration ==');
console.log('GOOGLE_CLIENT_ID_MEET exists:', !!googleConfig.clientId);
console.log('GOOGLE_CLIENT_SECRET_MEET exists:', !!googleConfig.clientSecret);
console.log('GOOGLE_REFRESH_TOKEN_MEET exists:', !!googleConfig.refreshToken);
console.log('GOOGLE_CALENDAR_ID_MEET exists:', !!googleConfig.calendarId);

// Check if configuration is complete
if (!isConfigured()) {
  console.error('\n❌ Google Calendar configuration is incomplete!');
  console.log('\nPlease check your .env file and make sure you have set:');
  console.log('- GOOGLE_CLIENT_ID_MEET (no spaces before or after the "=")');
  console.log('- GOOGLE_CLIENT_SECRET_MEET (no spaces before or after the "=")');
  console.log('- GOOGLE_REFRESH_TOKEN_MEET (no spaces in this value)');
  console.log('- GOOGLE_CALENDAR_ID_MEET (usually "primary")');
  process.exit(1);
}

console.log('\n✅ All required Google Calendar API credentials are present.');

// Initialize OAuth2 client
console.log('\n== Initializing Google Calendar API client ==');
const oauth2Client = new google.auth.OAuth2(
  googleConfig.clientId,
  googleConfig.clientSecret,
  googleConfig.redirectUri
);

// Set credentials
console.log('Setting credentials with refresh token...');
oauth2Client.setCredentials({
  refresh_token: googleConfig.refreshToken
});

// Create Calendar API client
console.log('Creating Calendar API client...');
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Create a test event
async function createTestEvent() {
  console.log('\n== Creating Test Calendar Event ==');
  
  try {
    // Create a meeting 1 hour from now
    const startTime = moment().add(1, 'hours');
    const endTime = moment(startTime).add(30, 'minutes');
    
    // Format dates for Google Calendar API
    const eventStartTime = startTime.format('YYYY-MM-DDTHH:mm:ss');
    const eventEndTime = endTime.format('YYYY-MM-DDTHH:mm:ss');
    
    // Get timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    console.log('Using timezone:', timeZone);
    
    // Create a unique ID for the conference
    const requestId = `devClinic-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log('Using conference request ID:', requestId);
    
    // Create event payload
    const event = {
      summary: 'DevClinic Test Video Consultation',
      description: 'This is a test event created by the DevClinic test script.',
      start: {
        dateTime: eventStartTime,
        timeZone
      },
      end: {
        dateTime: eventEndTime,
        timeZone
      },
      attendees: [
        { email: process.env.EMAIL_FROM || 'test@example.com' }
      ],
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    console.log('Creating event...');
    console.log('Calendar ID being used:', googleConfig.calendarId);
    
    // Insert the event
    const response = await calendar.events.insert({
      calendarId: googleConfig.calendarId,
      resource: event,
      conferenceDataVersion: 1 // Enable creation of Google Meet link
    });
    
    console.log('\n✅ TEST EVENT CREATED SUCCESSFULLY!');
    console.log('\nEvent details:');
    console.log('- Event ID:', response.data.id);
    console.log('- Event summary:', response.data.summary);
    console.log('- Event start time:', response.data.start.dateTime);
    
    // Check if conference data exists
    if (response.data.conferenceData && response.data.conferenceData.entryPoints) {
      console.log('\n✅ GOOGLE MEET LINK CREATED SUCCESSFULLY!');
      console.log('- Meet link:', response.data.conferenceData.entryPoints[0].uri);
      
      // Save the successful configuration to a file
      saveSuccessLog(response.data);
    } else {
      console.error('\n❌ No Google Meet link was created!');
      console.log('Conference data:', JSON.stringify(response.data.conferenceData, null, 2));
    }
    
    return response.data;
  } catch (error) {
    console.error('\n❌ ERROR CREATING TEST EVENT:');
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    
    if (error.response) {
      console.error('- API response error:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Check common issues
    checkCommonIssues(error);
    
    return null;
  }
}

// Save successful configuration
function saveSuccessLog(eventData) {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      message: 'Google Calendar integration test succeeded',
      eventId: eventData.id,
      meetingLink: eventData.conferenceData?.entryPoints?.[0]?.uri || 'No meeting link',
      googleConfig: {
        clientId: googleConfig.clientId ? `${googleConfig.clientId.substring(0, 10)}...` : null,
        clientSecret: googleConfig.clientSecret ? `${googleConfig.clientSecret.substring(0, 5)}...` : null,
        refreshToken: googleConfig.refreshToken ? `${googleConfig.refreshToken.substring(0, 10)}...` : null,
        calendarId: googleConfig.calendarId
      }
    };
    
    const logPath = path.join(__dirname, 'calendar-test-success.json');
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`\nSuccess log saved to: ${logPath}`);
  } catch (err) {
    console.error('Error saving success log:', err);
  }
}

// Check for common issues with Google Calendar API
function checkCommonIssues(error) {
  console.log('\n== Troubleshooting Common Issues ==');
  
  if (error.message.includes('invalid_grant')) {
    console.log('❌ ISSUE: Invalid grant or refresh token.');
    console.log('Your refresh token may be expired or invalid.');
    console.log('Solution: Generate a new refresh token following these steps:');
    console.log('1. Visit https://developers.google.com/oauthplayground/');
    console.log('2. Set up the OAuth2 configuration (gear icon) with your client ID and secret');
    console.log('3. Select the https://www.googleapis.com/auth/calendar scope');
    console.log('4. Click "Authorize APIs" and follow the prompts');
    console.log('5. Exchange the authorization code for tokens');
    console.log('6. Copy the refresh token to your .env file as GOOGLE_REFRESH_TOKEN_MEET');
  } else if (error.message.includes('invalid_client')) {
    console.log('❌ ISSUE: Invalid client ID or client secret.');
    console.log('Solution: Verify your client ID and client secret in the Google Cloud Console:');
    console.log('1. Visit https://console.cloud.google.com/apis/credentials');
    console.log('2. Find your OAuth 2.0 Client ID');
    console.log('3. Copy the correct client ID and client secret to your .env file');
  } else if (error.message.includes('accessNotConfigured') || error.message.includes('not enabled')) {
    console.log('❌ ISSUE: Google Calendar API is not enabled for your project.');
    console.log('Solution:');
    console.log('1. Visit https://console.cloud.google.com/apis/library/calendar-json.googleapis.com');
    console.log('2. Enable the Google Calendar API for your project');
    console.log('3. Visit https://console.cloud.google.com/apis/library/meet.googleapis.com');
    console.log('4. Enable the Google Meet API for your project');
  } else {
    console.log('❌ Unknown issue. Please check the error message and Google Calendar API documentation.');
  }
  
  console.log('\nFor more information, visit:');
  console.log('- https://developers.google.com/calendar/api/guides/auth');
  console.log('- https://developers.google.com/meet/api/guides/auth');
}

// Run the test
async function runTest() {
  console.log('\n=======================================');
  console.log('DevClinic - Google Calendar API Test');
  console.log('=======================================\n');
  
  await createTestEvent();
  
  console.log('\n=======================================');
  console.log('Test completed. See results above.');
  console.log('=======================================');
}

// Execute the test
runTest().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
}); 