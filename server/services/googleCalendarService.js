const { google } = require('googleapis');
const moment = require('moment');
require('dotenv').config();

// Configure Google Calendar API with Meet credentials from environment variables
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
let auth = null;

/**
 * Initialize the Google Calendar API client
 */
const initCalendarClient = () => {
  try {
    // Initialize OAuth2 client with Meet credentials from environment variables
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID_MEET,
      process.env.GOOGLE_CLIENT_SECRET_MEET,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );

    // Set credentials using the Meet refresh token from environment variables
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN_MEET
    });

    auth = oauth2Client;
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
    if (!auth) {
      const initialized = initCalendarClient();
      if (!initialized) {
        throw new Error('Failed to initialize Google Calendar client');
      }
    }

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Parse appointment date and time to create start and end times
    const { date, time, doctorInfo, userInfo, reason } = appointmentDetails;
    
    // Combine date and time to create a moment object for start time
    const startTime = moment(`${date} ${time}`, 'DD-MM-YYYY HH:mm');
    
    // End time is 30 minutes after start time (default appointment duration)
    const endTime = moment(startTime).add(30, 'minutes');
    
    // Format date and time for Google Calendar API
    const eventStartTime = startTime.format('YYYY-MM-DDTHH:mm:ss');
    const eventEndTime = endTime.format('YYYY-MM-DDTHH:mm:ss');
    
    // Get timezone from system or default to 'Asia/Kolkata' if not available
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    
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
          requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };
    
    // Insert the event and get the meetingLink
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID_MEET || 'primary',
      resource: event,
      sendUpdates: 'all', // Send emails to attendees
      conferenceDataVersion: 1 // Enable creation of Google Meet link
    });
    
    // Get the Google Meet link from the conference data
    const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri || '';
    const calendarEventId = response.data.id;
    
    return {
      success: true,
      calendarEventId,
      meetingLink,
      eventDetails: response.data
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return {
      success: false,
      error: error.message
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
      calendarId: process.env.GOOGLE_CALENDAR_ID_MEET || 'primary',
      eventId
    });
    
    // Merge current event with updates
    const updatedEvent = {
      ...currentEvent.data,
      ...updates
    };
    
    // Update the event
    const response = await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID_MEET || 'primary',
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
      calendarId: process.env.GOOGLE_CALENDAR_ID_MEET || 'primary',
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