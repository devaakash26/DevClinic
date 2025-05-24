const { google } = require('googleapis');
const moment = require('moment');
const { googleConfig, isConfigured } = require('../googleCalendarConfig');

// At the top of the file, add console logs to check the environment variables
console.log('Checking Google Calendar environment variables...');
console.log('GOOGLE_CLIENT_ID_MEET exists:', !!googleConfig.clientId);
console.log('GOOGLE_CLIENT_SECRET_MEET exists:', !!googleConfig.clientSecret);
console.log('GOOGLE_REFRESH_TOKEN_MEET exists:', !!googleConfig.refreshToken);
console.log('GOOGLE_CALENDAR_ID_MEET exists:', !!googleConfig.calendarId);

// Configure Google Calendar API with Meet credentials
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
let auth = null;

/**
 * Initialize the Google Calendar API client
 */
const initCalendarClient = () => {
  try {
    // Check if the required configuration is available
    console.log('Checking Google Calendar credentials...');
    if (!isConfigured()) {
      console.error('Google Calendar credentials not properly configured');
      return false;
    }
    
    console.log('Google Calendar credentials found, initializing client...');

    // Initialize OAuth2 client with Meet credentials
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    // Set credentials using the Meet refresh token
    oauth2Client.setCredentials({
      refresh_token: googleConfig.refreshToken
    });

    auth = oauth2Client;
    console.log('Google Calendar client initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google Calendar client:', error);
    return false;
  }
};

/**
 * Create a Google Calendar event with Google Meet link for video consultation
 * @param {Object} appointmentDetails - Appointment details
 * @returns {Object} Calendar event details including meetingLink
 */
const createVideoConsultation = async (appointmentDetails) => {
  try {
    console.log('Starting video consultation creation process...');
    
    // Force initialization every time to ensure fresh credentials
    console.log('Initializing Google Calendar client...');
    const initialized = initCalendarClient();
    if (!initialized) {
      console.error('Failed to initialize Google Calendar client, aborting...');
      throw new Error('Failed to initialize Google Calendar client');
    }

    console.log('Creating Google Calendar meeting with the following details:');
    console.log('- Doctor:', appointmentDetails.doctorInfo.firstname, appointmentDetails.doctorInfo.lastname);
    console.log('- Patient:', appointmentDetails.userInfo.name);
    console.log('- Date/Time:', appointmentDetails.date, appointmentDetails.time);
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Parse appointment date and time to create start and end times
    const { date, time, doctorInfo, userInfo, reason } = appointmentDetails;
    
    // Combine date and time to create a moment object for start time
    const startTime = moment(`${date} ${time}`, 'DD-MM-YYYY HH:mm');
    console.log('Parsed start time:', startTime.format());
    
    // End time is 30 minutes after start time (default appointment duration)
    const endTime = moment(startTime).add(30, 'minutes');
    
    // Format date and time for Google Calendar API
    const eventStartTime = startTime.format('YYYY-MM-DDTHH:mm:ss');
    const eventEndTime = endTime.format('YYYY-MM-DDTHH:mm:ss');
    
    // Get timezone from system or default to 'Asia/Kolkata' if not available
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    console.log('Using timezone:', timeZone);
    
    // Create a unique ID for the conference
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log('Generated requestId for conference:', requestId);
    
    // Create event details
    const event = {
      summary: `Video Consultation: Dr. ${doctorInfo.firstname} ${doctorInfo.lastname} with ${userInfo.name}`,
      description: `Video consultation appointment for ${reason}. This is an automated appointment created by DevClinic.`,
      start: {
        dateTime: eventStartTime,
        timeZone
      },
      end: {
        dateTime: eventEndTime,
        timeZone
      },
      attendees: [
        { email: doctorInfo.email },
        { email: userInfo.email }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 }
        ]
      },
      // Enable Google Meet for this event
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    console.log('Calling Google Calendar API to create event...');
    console.log('Calendar ID being used:', googleConfig.calendarId);
    
    // Insert the event and get the meetingLink
    const response = await calendar.events.insert({
      calendarId: googleConfig.calendarId,
      resource: event,
      sendUpdates: 'all', // Send emails to attendees
      conferenceDataVersion: 1 // Enable creation of Google Meet link
    });
    
    console.log('Google Calendar API response received:', response.status);
    console.log('Full conference data:', JSON.stringify(response.data.conferenceData, null, 2));
    
    // Get the Google Meet link from the conference data
    const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri || '';
    const calendarEventId = response.data.id;
    
    console.log('Meeting link created:', meetingLink);
    console.log('Calendar event ID:', calendarEventId);
    
    if (!meetingLink) {
      console.error('No meeting link was generated in the response. Conference data:', response.data.conferenceData);
      throw new Error('No meeting link was generated by Google Calendar API');
    }
    
    return {
      success: true,
      calendarEventId,
      meetingLink,
      eventDetails: response.data
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    return {
      success: false,
      error: error.message,
      meetingLink: "", // Return empty string to avoid undefined errors
      calendarEventId: "" // Return empty string to avoid undefined errors
    };
  }
};

/**
 * Update an existing Google Calendar event
 * @param {String} eventId - The Google Calendar event ID to update
 * @param {Object} updates - Object containing the updates to make
 * @returns {Object} Updated calendar event details
 */
const updateCalendarEvent = async (eventId, updates) => {
  try {
    if (!auth) {
      const initialized = initCalendarClient();
      if (!initialized) {
        throw new Error('Failed to initialize Google Calendar client');
      }
    }

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get the current event
    const currentEvent = await calendar.events.get({
      calendarId: googleConfig.calendarId || 'primary',
      eventId
    });
    
    // Merge current event with updates
    const updatedEvent = {
      ...currentEvent.data,
      ...updates
    };
    
    // Update the event
    const response = await calendar.events.update({
      calendarId: googleConfig.calendarId || 'primary',
      eventId,
      resource: updatedEvent,
      sendUpdates: 'all' // Send emails to attendees
    });
    
    return {
      success: true,
      eventDetails: response.data
    };
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a Google Calendar event
 * @param {String} eventId - The Google Calendar event ID to delete
 * @returns {Object} Result of the delete operation
 */
const deleteCalendarEvent = async (eventId) => {
  try {
    if (!auth) {
      const initialized = initCalendarClient();
      if (!initialized) {
        throw new Error('Failed to initialize Google Calendar client');
      }
    }

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Delete the event
    await calendar.events.delete({
      calendarId: googleConfig.calendarId || 'primary',
      eventId,
      sendUpdates: 'all' // Send cancellation emails to attendees
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createVideoConsultation,
  updateCalendarEvent,
  deleteCalendarEvent
}; 