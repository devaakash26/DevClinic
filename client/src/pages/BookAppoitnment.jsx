import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { Button, DatePicker, Steps, Form, Input, Card, Radio, Alert, Spin, Divider, Modal, Badge, Calendar, Tag, Rate, Avatar, List, Typography, Empty, Tooltip } from 'antd';
import Swal from 'sweetalert2';
import moment from "moment";
import { 
    UserOutlined, 
    CalendarOutlined, 
    ClockCircleOutlined, 
    CheckCircleOutlined, 
    MedicineBoxOutlined, 
    PhoneOutlined, 
    MessageOutlined,
    CheckOutlined,
    CloseOutlined,
    InfoCircleOutlined,
    ArrowLeftOutlined,
    StarOutlined,
    LikeOutlined
} from '@ant-design/icons';

const { Step } = Steps;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

// Update the Simple Date Selector to handle more dates
const SimpleDateSelector = ({ selectedDate, onDateSelect }) => {
    const dates = [];
    const today = moment().startOf('day');
    
    // Generate next 30 days (more range for selection)
    for (let i = 0; i < 30; i++) {
        dates.push(moment(today).add(i, 'days'));
    }
    
    // Group dates by month for better organization
    const datesByMonth = {};
    dates.forEach(date => {
        const monthKey = date.format('MMMM YYYY');
        if (!datesByMonth[monthKey]) {
            datesByMonth[monthKey] = [];
        }
        datesByMonth[monthKey].push(date);
    });
    
    return (
        <div className="simple-date-selector mb-4">
            {Object.keys(datesByMonth).map(monthKey => (
                <div key={monthKey} className="month-section mb-4">
                    <h4 className="mb-2 text-gray-600 font-medium">{monthKey}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {datesByMonth[monthKey].map((date, index) => {
                            const isSelected = selectedDate && date.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');
                            const isToday = date.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
                            
                            return (
                                <Button
                                    key={index}
                                    type={isSelected ? 'primary' : 'default'}
                                    className={`date-button ${isToday ? 'today-button' : ''} w-full text-center px-1 py-2`}
                                    onClick={() => onDateSelect(date)}
                                    style={{ 
                                        position: 'relative',
                                        borderColor: isToday ? '#52c41a' : undefined,
                                        borderWidth: isToday ? '2px' : '1px',
                                        height: 'auto'
                                    }}
                                >
                                    <div className="text-center">
                                        <div className="text-xs sm:text-sm">{date.format('ddd')}</div>
                                        <div className="font-bold text-sm sm:text-base">{date.format('D')}</div>
                                        <div className="text-xs hidden xs:block">{date.format('MMM')}</div>
                                    </div>
                                    {isToday && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '-8px', 
                                            right: '-8px', 
                                            background: '#52c41a', 
                                            borderRadius: '50%',
                                            width: '34px',
                                            height: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '9px',
                                            color: 'white'
                                        }}>
                                            <div>Today</div>
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Add a utility function to properly format time display
const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    
    try {
        // Handle ISO date strings (containing 'T')
        if (typeof timeStr === 'string' && timeStr.includes('T')) {
            return moment(timeStr).format('hh:mm A');
        }
        
        // Handle HH:mm format
        if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}$/)) {
            // Direct parsing without conversion to ensure original time is preserved
            return moment(timeStr, 'HH:mm').format('hh:mm A');
        }
        
        // Fallback - try to parse whatever format it is
        const parsed = moment(timeStr);
        if (parsed.isValid()) {
            return parsed.format('hh:mm A');
        }
        
        return timeStr; // Return as is if nothing else works
    } catch (error) {
        console.error("Error formatting time:", error, timeStr);
        return String(timeStr); // Convert to string as a last resort
    }
};

// Create a custom TestimonialItem component to use instead of Comment
const TestimonialItem = ({ author, content, datetime, avatar }) => {
  return (
    <div className="flex items-start space-x-4 mb-4">
      <div className="flex-shrink-0">
        {avatar || (
          <Avatar size={40}>
            {author && author !== 'Anonymous Patient' 
              ? author.charAt(0).toUpperCase() 
              : 'A'}
          </Avatar>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <Typography.Text strong className="text-gray-800">
            {author || 'Anonymous Patient'}
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {datetime}
          </Typography.Text>
        </div>
        <div>{content}</div>
      </div>
    </div>
  );
};

// Helper function to extract actual timing values from potentially nested arrays/strings
const extractTimingValues = (timing) => {
  console.log("Extracting timing from:", timing);
  
  if (!timing) return null;
  
  try {
    // If timing is a string that looks like JSON array
    if (typeof timing === 'string' && (timing.startsWith('[') || timing.startsWith('\"['))) {
      // Parse once or twice as needed
      let parsedTiming = timing;
      
      // First parse if it's a JSON string
      try {
        parsedTiming = JSON.parse(timing);
        console.log("First level parse:", parsedTiming);
      } catch (e) {
        console.log("First level parse failed:", e.message);
      }
      
      // If it's still a string that looks like an array, parse again
      if (typeof parsedTiming === 'string' && parsedTiming.startsWith('[')) {
        try {
          parsedTiming = JSON.parse(parsedTiming);
          console.log("Second level parse:", parsedTiming);
        } catch (e) {
          console.log("Second level parse failed:", e.message);
        }
      }
      
      // Now we should have an array
      if (Array.isArray(parsedTiming) && parsedTiming.length >= 2) {
        return [parsedTiming[0], parsedTiming[1]];
      } else if (Array.isArray(parsedTiming) && parsedTiming.length === 1 && Array.isArray(parsedTiming[0])) {
        // Handle nested array case: ["[\"12:30\",\"16:30\"]"] -> extract ["12:30","16:30"]
        return extractTimingValues(parsedTiming[0]);
      }
    }
    
    // If timing is already an array
    if (Array.isArray(timing)) {
      if (timing.length >= 2) {
        return [timing[0], timing[1]];
      } else if (timing.length === 1) {
        // If it's a single-element array, check if that element needs processing
        return extractTimingValues(timing[0]);
      }
    }
  } catch (error) {
    console.error("Error extracting timing values:", error);
  }
  
  return null;
}

function BookAppointment() {
    const { user } = useSelector((state) => state.user);
    const { doctorId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();
    const [appointmentDetails, setAppointmentDetails] = useState({
        reason: '',
        symptoms: '',
        medicalHistory: '',
        preferredCommunication: 'phone',
        emergencyContact: '',
        additionalNotes: '',
        date: null
    });
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [suggestedSlots, setSuggestedSlots] = useState([]);
    const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [testimonials, setTestimonials] = useState([]);
    const [testimonialStats, setTestimonialStats] = useState({ average: 0, total: 0 });
    const [loadingTestimonials, setLoadingTestimonials] = useState(false);

    // Process doctor consultation hours to get start and end times
    const doctorHours = useMemo(() => {
        if (!doctor) {
            console.log("No doctor data available for doctorHours");
            return null;
        }
        
        console.log("Processing doctor hours from timing:", doctor.timing);
        
        try {
            // Extract the actual timing values using our helper function
            const timingValues = extractTimingValues(doctor.timing);
            
            if (!timingValues || !Array.isArray(timingValues) || timingValues.length < 2) {
                console.log("Invalid doctor timing data after extraction", timingValues);
                return null;
            }
            
            let startTimeStr = timingValues[0];
            let endTimeStr = timingValues[1];
            
            console.log("Original doctor hours after extraction:", { startTimeStr, endTimeStr });
            
            // Handle ISO date strings (containing 'T')
            if (typeof startTimeStr === 'string' && startTimeStr.includes('T')) {
                startTimeStr = startTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
            }
            
            if (typeof endTimeStr === 'string' && endTimeStr.includes('T')) {
                endTimeStr = endTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
            }
            
            // Remove any quotes around the time strings
            startTimeStr = typeof startTimeStr === 'string' ? startTimeStr.replace(/"/g, '') : startTimeStr;
            endTimeStr = typeof endTimeStr === 'string' ? endTimeStr.replace(/"/g, '') : endTimeStr;
            
            console.log("Processed time strings:", { startTimeStr, endTimeStr });
            
            // Create moment objects with strict parsing
            const startTime = moment(startTimeStr, 'HH:mm', true);
            const endTime = moment(endTimeStr, 'HH:mm', true);
            
            if (!startTime.isValid() || !endTime.isValid()) {
                console.error("Invalid time format in doctor timing", { startTimeStr, endTimeStr });
                return null;
            }
            
            // Log the exact hours and minutes to verify no shifting
            console.log("Processed doctor hours:", { 
                startTime: startTime.format('HH:mm'),
                startHour: startTime.hours(),
                startMinute: startTime.minutes(),
                endTime: endTime.format('HH:mm'),
                endHour: endTime.hours(),
                endMinute: endTime.minutes()
            });
            
            return { 
                startTime, 
                endTime, 
                // Also store the original strings for reference
                startTimeStr, 
                endTimeStr 
            };
        } catch (error) {
            console.error("Error processing doctor hours:", error);
            return null;
        }
    }, [doctor]);

    // Generate all possible 30-minute slots for the doctor's hours
    const generateTimeSlots = (selectedDay) => {
        console.log("Generating time slots for:", selectedDay?.format('YYYY-MM-DD'));
        console.log("Doctor object:", doctor);
        
        if (!doctor) {
            console.log("No doctor available, cannot generate time slots");
            return [];
        }
        
        console.log("Doctor timing data available:", doctor.timing);
        
        // Extract the actual timing values
        const timingValues = extractTimingValues(doctor.timing);
        console.log("Extracted timing values for slots:", timingValues);
        
        // Only proceed if we have valid timing values
        if (timingValues && Array.isArray(timingValues) && timingValues.length >= 2) {
            try {
                // Get doctor hours from the extracted values
                let startTimeStr = timingValues[0];
                let endTimeStr = timingValues[1];
                
                console.log("Original timing strings from doctor:", { startTimeStr, endTimeStr });
                
                // Handle ISO date strings (containing 'T')
                if (typeof startTimeStr === 'string' && startTimeStr.includes('T')) {
                    startTimeStr = startTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
                }
                
                if (typeof endTimeStr === 'string' && endTimeStr.includes('T')) {
                    endTimeStr = endTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
                }
                
                // Remove any quotes around the time strings
                startTimeStr = typeof startTimeStr === 'string' ? startTimeStr.replace(/"/g, '') : startTimeStr;
                endTimeStr = typeof endTimeStr === 'string' ? endTimeStr.replace(/"/g, '') : endTimeStr;
                
                // Handle empty or invalid time strings
                if (!startTimeStr || startTimeStr === 'null' || startTimeStr === 'undefined') {
                    console.log("Invalid start time in database");
                    return [];
                }
                
                if (!endTimeStr || endTimeStr === 'null' || endTimeStr === 'undefined') {
                    console.log("Invalid end time in database");
                    return [];
                }
                
                console.log("Using timing strings after processing:", { startTimeStr, endTimeStr });
                
                // Create moment objects with strict parsing to ensure they're valid
                const startTime = moment(startTimeStr, 'HH:mm', true);
                const endTime = moment(endTimeStr, 'HH:mm', true);
                
                console.log("Parsed doctor timing:", {
                    startTime: startTime.format('HH:mm'),
                    startTimeValid: startTime.isValid(),
                    endTime: endTime.format('HH:mm'),
                    endTimeValid: endTime.isValid()
                });
                
                if (startTime.isValid() && endTime.isValid()) {
                    console.log("Using doctor's actual timing:", startTime.format('HH:mm'), "to", endTime.format('HH:mm'));
                    return generateSlotsFromTimes(startTime, endTime, selectedDay);
                }
                
                // If we get here, there was a problem with the doctor's timing
                console.log("Invalid doctor timing format in database");
                return [];
            } catch (error) {
                console.error("Error processing doctor's timing:", error);
                return [];
            }
        } else {
            console.log("Doctor timing data is missing or invalid:", doctor.timing);
            return [];
        }
    };

    // Update the generateSlotsFromTimes function to enforce the time constraint rule
    const generateSlotsFromTimes = (startTime, endTime, selectedDay) => {
        console.log("Start time:", startTime.format('HH:mm'));
        console.log("End time:", endTime.format('HH:mm'));
        
        const slots = [];
        
        // Check if selectedDay is today
        const isToday = selectedDay && moment().isSame(selectedDay, 'day');
        const isTomorrow = selectedDay && moment().add(1, 'day').isSame(selectedDay, 'day');
        
        // Create a new moment object for iteration but preserve original hour/minute values
        let currentSlot = moment().hours(startTime.hours()).minutes(startTime.minutes());
        const endTimeFormatted = endTime.format('HH:mm');
        
        console.log("Starting iteration at:", currentSlot.format('HH:mm'));
        console.log("Will end at:", endTimeFormatted);
        
        // Safety counter to prevent infinite loops
        let iterationCount = 0;
        const maxIterations = 50;
        
        while (currentSlot.format('HH:mm') !== endTimeFormatted && iterationCount < maxIterations) {
            iterationCount++;
            
            const slotTime = moment(currentSlot);
            const currentHour = parseInt(slotTime.format('HH'), 10);
            const currentMinute = parseInt(slotTime.format('mm'), 10);
            
            // Get current time
            const now = moment();
            
            // For today's slots, apply time constraint rule
            if (isToday) {
                // Calculate hours difference between current time and slot time
                const slotTimeObj = moment().set('hour', currentHour).set('minute', currentMinute);
                const hoursDifference = slotTimeObj.diff(now, 'hours', true);
                
                console.log(`Slot ${slotTime.format('HH:mm')} - Hours difference: ${hoursDifference.toFixed(2)}`);
                
                // Rule: For same-day bookings, slot must be at least 12 hours in advance
                if (hoursDifference < 12) {
                    console.log(`Slot ${slotTime.format('HH:mm')} excluded - less than 12 hours advance notice`);
                    currentSlot = moment(currentSlot).add(30, 'minutes');
                    continue;
                }
            }
            
            // For next day slots, ensure they're at least 24 hours in advance if they're in first half of day
            if (isTomorrow && currentHour < 12) {
                // Calculate total hours difference between now and slot time
                const slotDateTime = moment().add(1, 'day').set('hour', currentHour).set('minute', currentMinute);
                const hoursDifference = slotDateTime.diff(now, 'hours', true);
                
                // If slot is less than 24 hours away, don't include it
                if (hoursDifference < 24) {
                    console.log(`Tomorrow's morning slot ${slotTime.format('HH:mm')} excluded - less than 24 hours advance notice`);
                    currentSlot = moment(currentSlot).add(30, 'minutes');
                    continue;
                }
            }
            
            // Add the slot
            slots.push(moment(slotTime));
            
            // Move to next slot ensuring we preserve hour/minute exactness
            currentSlot = moment(currentSlot).add(30, 'minutes');
            
            console.log(`Added slot: ${slots[slots.length-1].format('HH:mm')}, Next: ${currentSlot.format('HH:mm')}`);
        }
        
        console.log(`Generated ${slots.length} slots:`, slots.map(s => s.format('HH:mm')));
        return slots;
    };

    // Function to check which slots are available on the selected date
    const checkAvailableSlots = async (date) => {
        if (!doctor) {
            console.log("No doctor information available yet");
            setSlotsLoading(false);
            return;
        }

        if (!doctor.userId) {
            console.log("Missing doctor userId. Doctor object:", doctor);
            // Try to use doctorId from URL if available
            if (doctorId) {
                console.log("Using doctorId from URL instead:", doctorId);
            } else {
                toast.error("Invalid doctor information. Please refresh the page.");
                setSlotsLoading(false);
                return;
            }
        }
        
        console.log("Checking slots for date:", date.format('YYYY-MM-DD'));
        setSlotsLoading(true);
        const formattedDate = moment(date).format("DD-MM-YYYY");
        
        try {
            // Get all possible time slots for the doctor, applying time constraint rules
            const allSlots = generateTimeSlots(date);
            console.log("All possible slots (after time constraint):", allSlots.length);
            
            if (allSlots.length === 0) {
                console.log("No slots available for this date after applying time constraints");
                setAvailableTimes([]);
                setSlotsLoading(false);
                
                toast.info("No appointment slots available for this date due to advance booking requirements. Please select another date.");
                
                // Find the closest available date with slots
                const nextAvailableSlots = await findNextAvailableSlots(date, 7);
                setSuggestedSlots(nextAvailableSlots);
                if (nextAvailableSlots.length > 0) {
                    setShowSuggestionsModal(true);
                }
                return;
            }
            
            // Create an array to collect all available slots for batch processing
            const slotCheckPayloads = allSlots.map(slot => ({
                time: slot.format("HH:mm"),
                moment: slot,
                available: null // We'll fill this in after checking
            }));
            
            // Get already booked slots for the given date - more efficient than checking one by one
            try {
                const effectiveDoctorId = doctor.userId || doctorId;
                const bookedResponse = await axios.post(
                    'http://localhost:4000/api/user/check-booked-slots',
                    {
                        doctorId: effectiveDoctorId,
                        date: date.format('YYYY-MM-DD')
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                console.log("Booked slots response:", bookedResponse.data);
                
                if (bookedResponse.data.success) {
                    const bookedSlots = bookedResponse.data.bookedSlots || [];
                    // console.log("Retrieved booked slots:", bookedSlots);
                    
                    // Mark slots as available or not
                    slotCheckPayloads.forEach(slot => {
                        // Check if this slot is in the booked slots
                        const isBooked = bookedSlots.includes(slot.time);
                        slot.available = !isBooked;
                    });
                    
                    // Only keep available slots for the UI
                    const availableSlots = slotCheckPayloads.filter(slot => slot.available);
                    // console.log("Available slots after checking bookings:", availableSlots.length);
                    
                    setAvailableTimes(availableSlots);
                    
                    // If there are no available slots, generate suggestions
                    if (availableSlots.length === 0 && allSlots.length > 0) {
                        toast.info("All slots are booked for this date. Check our suggested alternatives.");
                        
                        // Find the closest available date with slots
                        const nextAvailableSlots = await findNextAvailableSlots(date, 7);
                        setSuggestedSlots(nextAvailableSlots);
                        if (nextAvailableSlots.length > 0) {
                            setShowSuggestionsModal(true);
                        }
                    }
                } else {
                    console.error("Failed to get booked slots:", bookedResponse.data.message);
                    
                    // Fall back to individual slot checking if batch check fails
                    await checkSlotsIndividually(allSlots, formattedDate);
                }
            } catch (error) {
                console.error("Error checking booked slots in batch:", error);
                // Fall back to individual slot checking
                await checkSlotsIndividually(allSlots, formattedDate);
            }
        } catch (error) {
            console.error('Error checking slot availability:', error);
            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
            } else if (error.request) {
                console.error("No response received:", error.request);
            } else {
                console.error("Error setting up request:", error.message);
            }
            
            // toast.error('Error checking appointment availability. Please try again.');
        } finally {
            setSlotsLoading(false);
        }
    };

    // Helper function to check slots individually if batch method fails
    const checkSlotsIndividually = async (allSlots, formattedDate) => {
        console.log("Falling back to individual slot checking");
        let availableSlots = [];
        let bookedSlots = [];
        
        for (const slot of allSlots) {
            const timeString = slot.format("HH:mm");
            console.log("Checking availability for time:", timeString);
            
            try {
                // Create the request payload
                const payload = {
                    doctorId: doctor.userId || doctorId,
                    date: formattedDate,
                    time: timeString,
                };

                console.log("Sending availability check with payload:", payload);
                
                const response = await axios.post(
                    'http://localhost:4000/api/user/check-book-availability', 
                    payload,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                
                console.log("Availability response for", timeString, ":", response.data);
                
                if (response.data.success) {
                    console.log("Slot available:", timeString);
                    availableSlots.push({
                        time: timeString,
                        moment: moment(timeString, 'HH:mm'),
                        available: true
                    });
                } else {
                    console.log("Slot booked:", timeString, "Reason:", response.data.message);
                    bookedSlots.push({
                        time: timeString,
                        moment: moment(timeString, 'HH:mm'),
                        available: false,
                        reason: response.data.message
                    });
                }
            } catch (error) {
                console.error("Error checking slot:", timeString, error);
                if (error.response) {
                    console.error("Response data:", error.response.data);
                    console.error("Response status:", error.response.status);
                }
                
                // Don't interrupt the loop, continue checking other slots
                bookedSlots.push({
                    time: timeString,
                    moment: moment(timeString, 'HH:mm'),
                    available: false,
                    error: error.message
                });
            }
        }
        
        console.log("Available slots:", availableSlots.length);
        console.log("Booked slots:", bookedSlots.length);
        
        setAvailableTimes([...availableSlots]);
        
        // If there are no available slots, generate suggestions
        if (availableSlots.length === 0 && allSlots.length > 0) {
            toast.info("All slots are booked for this date. Check our suggested alternatives.");
            
            // Find the closest available date with slots
            const nextAvailableSlots = await findNextAvailableSlots(date, 7);
            setSuggestedSlots(nextAvailableSlots);
            if (nextAvailableSlots.length > 0) {
                setShowSuggestionsModal(true);
            }
        }
    };

    // Function to find the next available slots within the given number of days
    const findNextAvailableSlots = async (startDate, daysToCheck) => {
        if (!doctor && !doctorId) {
            console.log("Missing doctor information for finding available slots");
            return [];
        }
        
        // Use doctorId from URL if doctor object doesn't have userId
        const effectiveDoctorId = doctor?.userId || doctorId;
        
        // Don't show global loader for this operation - we already have slotsLoading active
        // We'll keep using the existing slot loading indicator from the parent function
        
        const suggestions = [];
        
        try {
            for (let i = 1; i <= daysToCheck; i++) {
                const checkDate = moment(startDate).add(i, 'days');
                const formattedDate = checkDate.format("DD-MM-YYYY");
                
                // Get all possible time slots for the doctor
                const allSlots = generateTimeSlots(checkDate);
                
                if (allSlots.length === 0) {
                    console.log(`No slots available for date ${formattedDate}`);
                    continue;
                }
                
                // Check a few slots to see if any are available (not checking all to save API calls)
                const slotsToCheck = allSlots.filter((_, index) => index % 3 === 0); // Check every 3rd slot
                
                for (const slot of slotsToCheck) {
                    const timeString = slot.format("HH:mm");
                    
                    try {
                        // Create the request payload
                        const payload = {
                            doctorId: effectiveDoctorId,
                            date: formattedDate,
                            time: timeString,
                        };
                        
                        console.log(`Checking future slot on ${formattedDate} at ${timeString}`);
                        
                        const response = await axios.post(
                            'http://localhost:4000/api/user/check-book-availability', 
                            payload,
                            {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                },
                                timeout: 8000 // 8 second timeout
                            }
                        );
                        
                        console.log(`Availability response for future slot on ${formattedDate} at ${timeString}:`, response.data);
                        
                        if (response.data.success) {
                            console.log(`Found available slot on ${formattedDate} at ${timeString}`);
                            suggestions.push({
                                date: checkDate,
                                time: timeString,
                                formattedDate: formattedDate,
                                formattedTime: moment(timeString, 'HH:mm').format('hh:mm A')
                            });
                            
                            // If we found 3 suggestions, stop looking
                            if (suggestions.length >= 3) {
                                return suggestions;
                            }
                        } else {
                            console.log(`Slot not available on ${formattedDate} at ${timeString}: ${response.data.message}`);
                        }
                    } catch (error) {
                        console.error(`Error checking future slot on ${formattedDate} at ${timeString}:`, error);
                        if (error.response) {
                            console.error("Response data:", error.response.data);
                            console.error("Response status:", error.response.status);
                        } else if (error.request) {
                            console.error("No response received:", error.request);
                        } else {
                            console.error("Error setting up request:", error.message);
                        }
                        
                        // Don't break the entire function, just continue to next slot
                        continue;
                    }
                }
            }
            
            return suggestions;
        } catch (error) {
            console.error('Error finding next available slots:', error);
            return []; // Return empty array on error
        }
    };

    const getDoctorInfo = async () => {
        try {
            setLoadingError(false);
            setErrorMessage("");
            dispatch(showLoading());
            console.log("Fetching doctor info for ID:", doctorId);
            
            if (!doctorId) {
                setLoadingError(true);
                setErrorMessage("No doctor ID provided");
                toast.error("No doctor ID provided");
                dispatch(hideLoading());
                return false;
            }
            
            // More robust approach using params
            const encodedDoctorId = encodeURIComponent(doctorId);
            console.log("Encoded doctorId:", encodedDoctorId);
            
            const response = await axios({
                method: 'get',
                url: 'http://localhost:4000/api/doctor/get-doctor-info-by-id',
                params: { doctorId: encodedDoctorId },
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000 // 15 second timeout
            });
            
            console.log("API Response:", response.data);
            dispatch(hideLoading());

            if (response.data.success && response.data.data) {
                const doctorData = response.data.data;
                console.log("Doctor data received:", doctorData);
                
                // Validate the timing data format and ensure it's correctly handled
                if (doctorData.timing && Array.isArray(doctorData.timing)) {
                    console.log("Original timing data:", doctorData.timing);
                    
                    // Make a deep copy to avoid mutating the response data directly
                    const processedDoctor = { ...doctorData };
                    
                    // Ensure timing data is consistently formatted
                    if (processedDoctor.timing.length >= 2) {
                        processedDoctor.timing = processedDoctor.timing.map(time => {
                            if (typeof time === 'string' && time.includes('T')) {
                                return time.split('T')[1].substring(0, 5); // Extract HH:mm
                            }
                            return time;
                        });
                        
                        console.log("Processed timing data:", processedDoctor.timing);
                    }
                    
                    setDoctor(processedDoctor);
                    return true;
            } else {
                    console.log("Setting doctor with original data");
                    setDoctor(doctorData);
                    return true;
                }
            } else {
                setLoadingError(true);
                setErrorMessage(response.data.message || "Failed to get doctor information");
                console.error("Failed to get doctor info:", response.data);
                toast.error(response.data.message || "Failed to get doctor information");
                return false;
            }
        } catch (error) {
            setLoadingError(true);
            setErrorMessage("Network error. Please try again later.");
            dispatch(hideLoading());
            console.error('Error fetching doctor information:', error);
            
            // More detailed error logging
            if (error.response) {
                console.error("Response status:", error.response.status);
                console.error("Response data:", error.response.data);
                setErrorMessage(`Server error: ${error.response.data?.message || error.response.statusText}`);
            } else if (error.request) {
                console.error("No response received:", error.request);
                setErrorMessage("No response from server. Please check your connection.");
            } else {
                console.error("Error setting up request:", error.message);
                setErrorMessage(`Error: ${error.message}`);
            }
            
            toast.error('Failed to load doctor information. Please refresh the page.');
            return false;
        }
    };

    const bookAppointment = async () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Please select a date and time');
            return;
        }
        
        // Check if we have either doctor.userId or doctorId from URL
        if (!doctor?.userId && !doctorId) {
            toast.error('Doctor information is not available. Please try again later.');
            return;
        }
        
        // Get the current form values synchronously to ensure we have the latest values
        const formData = form.getFieldsValue(true);
        console.log("Current form values:", formData);
        
        // Log the selected date and time for debugging
        console.log("Selected Date (moment object):", selectedDate);
        console.log("Selected Date (formatted):", selectedDate.format("DD-MM-YYYY"));
        console.log("Selected Time:", selectedTime.format("HH:mm"));
        
        // Explicitly check for the reason field
        if (!formData.reason || formData.reason.trim() === '') {
            toast.error('Please provide a reason for your visit');
            try {
                await form.validateFields(['reason']);
            } catch (error) {
                console.error('Form validation error:', error);
            }
            return;
        }
        
        // Continue with form validation for all fields
        try {
            await form.validateFields();
        } catch (error) {
            console.error('Form validation error:', error);
            toast.error('Please fill in all required fields');
            return;
        }
        
        setLoading(true);
        dispatch(showLoading());
        
        try {
            // Format the date in DD-MM-YYYY format
            const formattedDate = selectedDate.format("DD-MM-YYYY");
            const formattedTime = selectedTime.format("HH:mm");
            
            // Log the final payload before sending
            console.log("Final payload date:", formattedDate);
            
            // Use the effective doctorId (from doctor object or URL param)
            const effectiveDoctorId = doctor?.userId || doctorId;
                
            // Create payload and log it for debugging
            const payload = {
                doctorId: effectiveDoctorId,
                userId: user._id,
                doctorInfo: doctor || { userId: effectiveDoctorId },
                userInfo: user,
                date: formattedDate,
                time: formattedTime,
                reason: formData.reason.trim(),
                symptoms: formData.symptoms || "",
                medicalHistory: formData.medicalHistory || "",
                preferredCommunication: formData.preferredCommunication || "phone",
                emergencyContact: formData.emergencyContact || "",
                additionalNotes: formData.additionalNotes || ""
            };
            
            console.log('Sending appointment booking request with payload:', payload);
            
            const response = await axios.post(
                'http://localhost:4000/api/user/book-appointment', 
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            dispatch(hideLoading());
            setLoading(false);
            
            console.log('Appointment booking response:', response.data);

            if (response.data.success) {
                Swal.fire({
                    title: 'Appointment Booked!',
                    text: 'Your appointment has been successfully scheduled',
                    icon: 'success',
                    confirmButtonText: 'View My Appointments',
                    showCancelButton: true,
                    cancelButtonText: 'Stay Here'
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigate('/appointments');
                    } else {
                        // Reset the form and go back to step 1
                        form.resetFields();
                        setSelectedTime(null);
                        setCurrentStep(0);
                        checkAvailableSlots(selectedDate);
                    }
                });
            } else {
                Swal.fire({
                    title: 'Booking Failed',
                    text: response.data.message,
                    icon: 'error',
                });
            }
        } catch (error) {
            dispatch(hideLoading());
            setLoading(false);
            
            // Enhanced error logging
            console.error('Error booking appointment:', error);
            
            let errorMessage = 'Something went wrong while booking your appointment';
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Server error response:', error.response.data);
                console.error('Status code:', error.response.status);
                
                errorMessage = error.response.data.message || 
                              `Server error (${error.response.status}): ${error.response.statusText}`;
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Request setup error:', error.message);
                errorMessage = `Error: ${error.message}`;
            }
            
            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error',
            });
        }
    };

    // Update the handleDateSelect function to be more robust
    const handleDateSelect = (date) => {
        // Clone the date to prevent any reference issues
        const safeDate = date ? moment(date) : null;
        
        // Log the incoming date and processed date
        console.log("Incoming date:", date);
        console.log("Processed safeDate:", safeDate?.format("DD-MM-YYYY"));
        
        // Make sure the date is not in the past and is valid
        if (!safeDate || !safeDate.isValid()) {
            toast.error('Invalid date selection');
            return;
        }
        
        if (safeDate.isBefore(moment().startOf('day'))) {
            toast.error('Cannot select a past date');
            return;
        }

        // Set the selected date with proper time preservation
        setSelectedDate(safeDate);
        setSelectedTime(null);
        
        // Log the state update
        console.log("Updated selectedDate state:", safeDate.format("DD-MM-YYYY"));
        
        // Reset the form's date field to ensure it matches the selected date
        form.setFieldsValue({
            date: safeDate.format('YYYY-MM-DD')
        });
        
        // Only show the slot-specific loading indicator for this operation
        setSlotsLoading(true);
        checkAvailableSlots(safeDate);
    };

    // When a time slot is selected
    const handleTimeSelect = (time) => {
        setSelectedTime(time);
    };

    // Handle moving to the next step
    const nextStep = () => {
        if (currentStep === 0 && !selectedTime) {
            toast.error('Please select a time slot');
            return;
        }
        
        // When moving from patient details to confirmation
        if (currentStep === 1) {
            // Save current form values to state before validation
            const currentValues = form.getFieldsValue(true);
            setAppointmentDetails(prev => ({...prev, ...currentValues}));
            
            // Get the current reason value directly from the form
            const reasonValue = currentValues.reason;
            
            // Check if reason is empty or undefined
            if (!reasonValue || reasonValue.trim() === '') {
                // Trigger validation on the reason field
                form.validateFields(['reason'])
                    .catch(error => {
                        console.error('Form validation error:', error);
                        toast.error('Please provide a reason for your visit');
                    });
                return;
            }
            
            // Continue with form validation for all other fields
            form.validateFields()
                .then(() => {
                    console.log("Form validated successfully, current values:", currentValues);
                    setCurrentStep(currentStep + 1);
                })
                .catch(error => {
                    console.error('Form validation error:', error);
                    toast.error('Please fill in all required fields');
                });
            return;
        }
        
        setCurrentStep(currentStep + 1);
    };

    // Handle moving to the previous step
    const prevStep = () => {
        // When going back from confirmation to details, ensure form values are preserved
        if (currentStep === 2) {
            // Re-apply the saved appointmentDetails to the form
            form.setFieldsValue(appointmentDetails);
        }
        
        setCurrentStep(currentStep - 1);
    };

    // Handle form changes
    const handleFormChange = (changedValues) => {
        console.log("Form values changed:", changedValues);
        const updatedDetails = {
            ...appointmentDetails,
            ...changedValues
        };
        console.log("Updated appointment details:", updatedDetails);
        setAppointmentDetails(updatedDetails);
    };

    // Handle selecting a suggested slot
    const handleSelectSuggestion = (suggestion) => {
        setSelectedDate(suggestion.date);
        setSelectedTime(moment(suggestion.time, 'HH:mm'));
        setShowSuggestionsModal(false);
        // Also check other available slots on this suggested date
        checkAvailableSlots(suggestion.date);
    };

    // Test function to directly check API health
    const testDoctorAPI = async () => {
        try {
            console.log("Testing direct API access...");
            if (!doctorId) {
                console.error("Cannot test API - no doctorId available");
                return;
            }
            
            // Make a direct request with minimal wrapping
            const testResponse = await fetch(
                `http://localhost:4000/api/doctor/get-doctor-info-by-id?doctorId=${encodeURIComponent(doctorId)}`, 
                {
                    method: 'GET',
                headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            
            const testData = await testResponse.json();
            console.log("Direct API test result:", {
                status: testResponse.status,
                ok: testResponse.ok,
                data: testData
            });
            
        } catch (error) {
            console.error("Direct API test failed:", error);
        }
    }

    // Add the test call to the useEffect
    useEffect(() => {
        // Test the API health directly when component mounts
        testDoctorAPI();
    }, [doctorId]);

    // Fix the useEffect to properly handle the doctor state
    useEffect(() => {
        let isMounted = true;
        let retryTimeout = null;
        
        console.log("BookAppointment component mounted with doctorId:", doctorId);
        
        // Track loading attempts
        const loadDoctorInfo = async (retryCount = 0) => {
            if (!isMounted) return;
            
            if (retryCount > 3) {
                setLoadingError(true);
                setErrorMessage("Failed to load doctor information after multiple attempts");
                toast.error("Failed to load doctor information after multiple attempts");
                dispatch(hideLoading()); // Make sure to hide the loader if we fail
                return;
            }
            
            try {
                console.log(`Attempting to load doctor info (attempt ${retryCount + 1})`);
                const success = await getDoctorInfo();
                
                if (success) {
                    console.log("Doctor info loaded successfully");
            dispatch(hideLoading());
                    
                    // Check for doctor state after a short delay to ensure state update
                    setTimeout(() => {
                        if (!isMounted) return;
                        
                        console.log("Current doctor state:", doctor);
                        
                        // Check available slots without waiting for doctor state check
                        // Instead, we'll use the response directly
                        console.log("Checking available slots for today");
                        checkAvailableSlots(moment());
                        
                    }, 100);
            } else {
                    console.log("Failed to load doctor data, will retry");
                    if (isMounted && retryCount < 3) {
                        const delay = 1500 * (retryCount + 1);
                        console.log(`Will retry in ${delay/1000}s (attempt ${retryCount + 2})`);
                        retryTimeout = setTimeout(() => loadDoctorInfo(retryCount + 1), delay);
                    } else {
                        setLoadingError(true);
                        setErrorMessage("Failed to load doctor after multiple attempts");
                        dispatch(hideLoading());
                    }
            }
        } catch (error) {
                console.error("Error in retry mechanism:", error);
                if (isMounted && doctorId && retryCount < 3) {
                    const delay = 1500 * (retryCount + 1);
                    retryTimeout = setTimeout(() => loadDoctorInfo(retryCount + 1), delay);
                } else {
                    setLoadingError(true);
                    setErrorMessage("Maximum retry attempts reached");
                    dispatch(hideLoading()); // Make sure to hide the loader if we fail
                }
            }
        };
        
        if (doctorId) {
            dispatch(showLoading()); // Show the global loader for initial doctor data fetch
            // Immediate attempt without delay
            loadDoctorInfo(0);
        } else {
            setLoadingError(true);
            setErrorMessage("No doctor ID provided");
            console.error("No doctorId provided to BookAppointment component");
        }
        
        // Cleanup function to prevent memory leaks and state updates after unmount
        return () => {
            console.log("BookAppointment component unmounting, cleaning up");
            isMounted = false;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }
            dispatch(hideLoading()); // Make sure to hide the loader on unmount
        };
    }, [doctorId]);

    // Update the initialValues and form initialization to ensure it's properly linked
    useEffect(() => {
        if (selectedDate) {
            form.setFieldsValue({
                date: selectedDate.format('YYYY-MM-DD')
            });
        }
    }, [selectedDate, form]);

    // Render time slots with availability indicators
    const renderTimeSlots = () => {
        if (slotsLoading) {
            return (
                <div className="py-8 flex justify-center">
                    <Spin size="large" tip="Loading available slots..." />
                </div>
            );
        }

        if (!selectedDate) {
            return (
                <div className="text-center py-8">
                    <Alert
                        message="Select a Date"
                        description="Please select a date to see available appointment slots."
                        type="info"
                        showIcon
                    />
                </div>
            );
        }

        if (availableTimes.length === 0) {
            return (
                <div className="text-center py-4">
                    <Alert
                        message="No Available Slots"
                        description={
                            <div>
                                <p className="mb-3">No appointment slots available for the selected date.</p>
                                <Button
                                    type="primary"
                                    onClick={() => setShowSuggestionsModal(true)}
                                    className="mt-3"
                                    disabled={suggestedSlots.length === 0}
                                >
                                    View Suggested Slots
                                </Button>
                            </div>
                        }
                        type="info"
                        showIcon
                    />
                </div>
            );
        }

        return (
            <div className="time-slots-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2 mt-4">
                {availableTimes.map((slot, index) => (
                    <Button
                        key={index}
                        type={selectedTime && selectedTime.format('HH:mm') === slot.time ? 'primary' : 'default'}
                        className={`time-slot-button ${slot.available ? 'available' : 'unavailable'} text-xs sm:text-sm py-1 h-auto`}
                        onClick={() => handleTimeSelect(slot.moment)}
                        disabled={!slot.available}
                    >
                        {moment(slot.time, 'HH:mm').format('hh:mm A')}
                    </Button>
                ))}
            </div>
        );
    };

    // Content for each step
    const steps = [
        {
            title: 'Date & Time',
            content: (
                <div className="date-time-selection">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="calendar-container">
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <CalendarOutlined className="mr-2 text-blue-500" />
                                Select Date
                            </h3>
                            <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
                                {/* Only use SimpleDateSelector for reliability */}
                                <SimpleDateSelector 
                                    selectedDate={selectedDate}
                                    onDateSelect={handleDateSelect}
                                />
                                
                                <div className="mt-3">
                                    <Alert
                                        message="Note on Appointment Booking"
                                        description="Please select a date. For same-day appointments, only future time slots will be available."
                                        type="info"
                                        showIcon
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="time-selection mt-4 lg:mt-0">
                            <h3 className="text-lg font-semibold mb-3 flex items-center">
                                <ClockCircleOutlined className="mr-2 text-blue-500" />
                                Available Time Slots
                                {selectedDate && (
                                    <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                                        {selectedDate?.format('MMMM D, YYYY')}
                                    </span>
                                )}
                            </h3>
                            
                            <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
                                {/* Show only actual doctor's consulting hours, no defaults */}
                                <div className="consulting-hours mb-3">
                                    <p className="text-sm text-gray-500">Doctor's Consulting Hours</p>
                                    <p className="font-medium text-gray-700">
                                        {(() => {
                                            // First check if doctor exists
                                            if (!doctor) return 'Consultation hours not available';
                                            
                                            // Extract the actual timing values using our helper function
                                            const timingValues = extractTimingValues(doctor.timing);
                                            
                                            console.log("Extracted timing values:", timingValues);
                                            
                                            // If we couldn't extract valid timing values
                                            if (!timingValues || !Array.isArray(timingValues) || timingValues.length < 2) {
                                                return 'Consultation hours not specified';
                                            }
                                            
                                            // Extract and format times properly
                                            let startTimeStr = timingValues[0];
                                            let endTimeStr = timingValues[1];
                                            
                                            // Handle ISO date strings (containing 'T')
                                            if (typeof startTimeStr === 'string' && startTimeStr.includes('T')) {
                                                startTimeStr = startTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
                                            }
                                            
                                            if (typeof endTimeStr === 'string' && endTimeStr.includes('T')) {
                                                endTimeStr = endTimeStr.split('T')[1].substring(0, 5); // Extract HH:mm
                                            }
                                            
                                            // Handle empty or invalid time strings
                                            if (!startTimeStr || startTimeStr === 'null' || startTimeStr === 'undefined' ||
                                                !endTimeStr || endTimeStr === 'null' || endTimeStr === 'undefined') {
                                                return 'Consultation hours not available';
                                            }
                                            
                                            // Remove any quotes around the time strings
                                            startTimeStr = startTimeStr.replace(/"/g, '');
                                            endTimeStr = endTimeStr.replace(/"/g, '');
                                            
                                            console.log("Final timing strings:", { startTimeStr, endTimeStr });
                                            
                                            // Create moment objects with strict parsing to ensure they're valid
                                            const startTime = moment(startTimeStr, 'HH:mm', true);
                                            const endTime = moment(endTimeStr, 'HH:mm', true);
                                            
                                            // Format for display
                                            if (startTime.isValid() && endTime.isValid()) {
                                                return `${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`;
                                            }
                                            
                                            // If all else fails
                                            return 'Consultation hours not available';
                                        })()}
                                    </p>
                                </div>
                                
                                <Divider className="my-2" />
                                
                                {renderTimeSlots()}
                                
                                {selectedTime && (
                                    <div className="selected-slot mt-4">
                                        <Alert
                                            message="Selected Time Slot"
                                            description={
                                                <div className="font-medium">
                                                    {selectedDate?.format('MMMM D, YYYY')} at {selectedTime.format('hh:mm A')}
                                                </div>
                                            }
                                            type="success"
                                            showIcon
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Patient Details',
            content: (
                <div className="patient-details">
                    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <UserOutlined className="mr-2 text-blue-500" />
                            Appointment Details
                        </h3>
                        
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={appointmentDetails}
                            onValuesChange={handleFormChange}
                            requiredMark={true}
                            className="max-w-full"
                        >
                            <Form.Item
                                name="reason"
                                label="Reason for Visit"
                                rules={[{ required: true, message: 'Please provide a reason for your visit' }]}
                            >
                                <Input 
                                    placeholder="E.g., Annual checkup, Follow-up, New symptoms, etc." 
                                    size="large"
                                />
                            </Form.Item>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <Form.Item
                                    name="symptoms"
                                    label="Current Symptoms (if any)"
                                >
                                    <TextArea 
                                        rows={4} 
                                        placeholder="Please describe any symptoms you're experiencing" 
                                    />
                                </Form.Item>
                                
                                <Form.Item
                                    name="medicalHistory"
                                    label="Relevant Medical History"
                                >
                                    <TextArea 
                                        rows={4} 
                                        placeholder="Any relevant medical history, medications, allergies, etc." 
                                    />
                                </Form.Item>
                            </div>
                            
                            <Divider className="my-2 md:my-4">Communication Preferences</Divider>
                            
                            <Form.Item
                                name="preferredCommunication"
                                label="Preferred Communication Method"
                            >
                                <Radio.Group size="large" className="flex flex-wrap">
                                    <Radio value="phone" className="min-w-[120px] mb-2">
                                        <PhoneOutlined className="mr-1" /> Phone
                                    </Radio>
                                    <Radio value="email" className="min-w-[120px] mb-2">
                                        <MessageOutlined className="mr-1" /> Email
                                    </Radio>
                                </Radio.Group>
                            </Form.Item>
                            
                            <Form.Item
                                name="emergencyContact"
                                label="Emergency Contact Number"
                                tooltip="Please provide a contact number that can be used in case of emergency"
                            >
                                <Input 
                                    placeholder="Emergency contact number" 
                                    prefix={<PhoneOutlined />}
                                    size="large"
                                />
                            </Form.Item>
                            
                            <Form.Item
                                name="additionalNotes"
                                label="Additional Notes for the Doctor"
                            >
                                <TextArea 
                                    rows={3} 
                                    placeholder="Any other information you'd like the doctor to know before your appointment" 
                                />
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            ),
        },
        {
            title: 'Confirmation',
            content: (
                <div className="confirmation">
                    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <CheckCircleOutlined className="mr-2 text-green-500" />
                            Appointment Summary
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <Card title="Doctor Information" className="mb-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4">
                                        <img 
                                            src={doctor?.image || "https://via.placeholder.com/100x100"} 
                                            alt={`Dr. ${doctor?.firstname || 'Unknown'} ${doctor?.lastname || ''}`}
                                            className="w-16 h-16 object-cover rounded-full mr-4 mb-2 sm:mb-0"
                                        />
                                        <div>
                                            <h4 className="text-base font-medium">Dr. {doctor?.firstname || 'Unknown'} {doctor?.lastname || ''}</h4>
                                            <p className="text-sm text-gray-500">{doctor?.specialization || doctor?.department || 'Specialist'}</p>
                                            <div className="mt-1 text-sm">{doctor?.experience || '0'} years experience</div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm">
                                        <p><strong>Consultation Fee:</strong> ₹{doctor?.feePerConsultation || 'Not specified'}</p>
                                        <p><strong>Location:</strong> {doctor?.address || 'Not specified'}</p>
                                    </div>
                                </Card>
                                
                                <Card title="Appointment Details" className="mb-4 md:mb-0">
                                    <div className="flex items-center mb-3">
                                        <CalendarOutlined className="text-blue-500 mr-2" />
                                        <span className="font-medium">{selectedDate?.format('dddd, MMMM D, YYYY')}</span>
                                    </div>
                                    
                                    <div className="flex items-center mb-3">
                                        <ClockCircleOutlined className="text-blue-500 mr-2" />
                                        <span className="font-medium">{selectedTime?.format('hh:mm A')}</span>
                                    </div>
                                    
                                    <Alert
                                        message="Payment Information"
                                        description={
                                            <div className="text-sm">
                                                <p>Payment will be collected at the clinic.</p>
                                                <p className="font-medium mt-1">Amount: ₹{doctor?.feePerConsultation || 'Consultation fee'}</p>
                                            </div>
                                        }
                                        type="info"
                                        showIcon
                                        className="mt-3"
                                    />
                                </Card>
                            </div>
                            
                            <div>
                                <Card title="Patient Information" className="mb-4">
                                    <div className="mb-3">
                                        <div className="text-sm text-gray-500">Patient Name</div>
                                        <div className="font-medium">{user?.name}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-sm text-gray-500">Contact</div>
                                            <div className="font-medium">{user?.phone || user?.mobile || 'Not provided'}</div>
                                        </div>
                                        
                                        <div>
                                            <div className="text-sm text-gray-500">Email</div>
                                            <div className="font-medium">{user?.email}</div>
                                        </div>
                                    </div>
                                </Card>
                                
                                <Card title="Reason for Visit">
                                    <div className="mb-3">
                                        <div className="text-sm text-gray-500">Primary Reason</div>
                                        <div className="font-medium">{appointmentDetails.reason || 'Not specified'}</div>
                                    </div>
                                    
                                    {appointmentDetails.symptoms && (
                                        <div className="mb-3">
                                            <div className="text-sm text-gray-500">Symptoms</div>
                                            <div>{appointmentDetails.symptoms}</div>
                                        </div>
                                    )}
                                    
                                    {appointmentDetails.additionalNotes && (
                                        <div>
                                            <div className="text-sm text-gray-500">Additional Notes</div>
                                            <div>{appointmentDetails.additionalNotes}</div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                        
                        <Alert
                            message="Almost There!"
                            description="Please review all details carefully before confirming your appointment. Once confirmed, a notification will be sent to the doctor."
                            type="warning"
                            showIcon
                            className="mt-4"
                        />
                    </div>
                </div>
            ),
        },
    ];

    // Add custom CSS
    const styles = document.createElement('style');
    styles.textContent = `
    .time-slot-button {
      min-width: 90px;
      transition: all 0.3s;
    }
    .time-slot-button:hover:not(:disabled) {
      background-color: #f0f7ff;
      border-color: #1890ff;
    }
    .time-slot-button:disabled {
      opacity: 0.6;
      text-decoration: line-through;
      background-color: #f5f5f5;
    }

    .suggested-slot:hover {
      border-color: #1890ff;
    }

    .steps-content {
      min-height: 350px;
    }

    .doctor-image img {
      border: 3px solid #f0f0f0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .date-button {
      height: auto !important;
      padding: 8px 2px !important;
      width: 100%;
      transition: all 0.3s ease;
    }

    .date-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .today-button {
      position: relative;
    }

    .simple-date-selector .ant-btn-primary {
      background-color: #1890ff;
      border-color: #1890ff;
    }

    .simple-date-selector .ant-btn-primary:hover {
      background-color: #40a9ff;
      border-color: #40a9ff;
    }

    /* Fix Ant Design DatePicker focus issue */
    .ant-picker-dropdown {
      z-index: 1050 !important;
    }

    .ant-picker-focused {
      border-color: #1890ff !important;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
    }
    `;
    document.head.appendChild(styles);

    // Add a function to fetch doctor testimonials
    const fetchDoctorTestimonials = async (doctorId) => {
        if (!doctorId) {
            console.log("No doctor ID available for testimonials");
            return;
        }
        
        setLoadingTestimonials(true);
        
        try {
            console.log("Fetching testimonials for doctor:", doctorId);
            
            const response = await axios.get(
                `http://localhost:4000/api/doctor/get-doctor-testimonials`,
                {
                    params: { doctorId },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            
            console.log("Testimonials response:", response.data);
            
            if (response.data.success) {
                // Get testimonials and fetch patient names for each
                const testimonialData = response.data.data.testimonials || [];
                
                // Fetch patient details for testimonials if needed
                const enhancedTestimonials = await Promise.all(
                    testimonialData.map(async (testimonial) => {
                        // If patientName is already in the testimonial, use it
                        if (testimonial.patientName) {
                            return testimonial;
                        }
                        
                        // Otherwise, try to fetch patient details
                        try {
                            if (testimonial.patientId) {
                                const patientResponse = await axios.get(
                                    `http://localhost:4000/api/user/get-patient-info`,
                                    {
                                        params: { userId: testimonial.patientId },
                                        headers: {
                                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                                        },
                                    }
                                );
                                
                                if (patientResponse.data.success) {
                                    // Add patient name to testimonial if showAsTestimonial is true
                                    if (testimonial.showAsTestimonial) {
                                        return {
                                            ...testimonial,
                                            patientName: patientResponse.data.data.name
                                        };
                                    }
                                }
                            }
                            return testimonial;
                        } catch (error) {
                            console.error("Error fetching patient info:", error);
                            return testimonial;
                        }
                    })
                );
                
                // Only keep testimonials with showAsTestimonial=true
                const filteredTestimonials = enhancedTestimonials.filter(
                    testimonial => testimonial.showAsTestimonial
                );
                
                setTestimonials(filteredTestimonials);
                
                // Get the average rating from all ratings (not just testimonials)
                const { averageRating, totalReviews } = response.data.data;
                setTestimonialStats({
                    average: averageRating || "0.0",
                    total: totalReviews || 0
                });
            } else {
                console.log("Failed to fetch testimonials:", response.data.message);
                setTestimonials([]);
                setTestimonialStats({ average: 0, total: 0 });
            }
        } catch (error) {
            console.error("Error fetching testimonials:", error);
            setTestimonials([]);
            setTestimonialStats({ average: 0, total: 0 });
        } finally {
            setLoadingTestimonials(false);
        }
    };
    
    // Update the useEffect to fetch testimonials along with doctor info
    useEffect(() => {
        if (doctorId) {
            getDoctorInfo();
            fetchDoctorTestimonials(doctorId);
        }
    }, [doctorId]);

    return (
        <Layout>
            {loadingError ? (
                <div className="flex flex-col items-center justify-center h-96 p-4 sm:p-6 max-w-4xl mx-auto">
                    <div className="text-center bg-red-50 p-4 sm:p-8 rounded-lg shadow-md border border-red-200 mb-6 w-full">
                        <div className="text-red-500 text-4xl sm:text-6xl mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 sm:h-24 sm:w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Doctor Information Not Available</h2>
                        <p className="text-gray-600 mb-4">{errorMessage || "We couldn't load the doctor's information. This could be due to a network issue or the doctor may not exist."}</p>
                        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => navigate('/doctors')}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Back to Doctors
                            </button>
                        </div>
                        <div className="mt-6 text-sm text-gray-500">
                            <p>Doctor ID: {doctorId}</p>
                            <p>If this problem persists, please contact support.</p>
                        </div>
                    </div>
                </div>
            ) : doctor ? (
                <div className='p-3 sm:p-4 max-w-6xl mx-auto'>
                    {/* Enhanced Hero Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-3 sm:p-6 mb-4 sm:mb-8">
                        <div className="flex flex-col md:flex-row md:items-center">
                            <Button
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate(-1)}
                                className="self-start mb-4 md:mb-0 md:mr-6 bg-white hover:bg-gray-50"
                            >
                                Back
                            </Button>
                            
                            <div className="flex flex-col md:flex-row items-start md:items-center">
                                <div className="doctor-image mr-6 mb-4 md:mb-0 relative">
                                    <img 
                                        src={doctor.image || "https://via.placeholder.com/100x100"}
                                        alt={`Dr. ${doctor.firstname} ${doctor.lastname}`}
                                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover rounded-full border-4 border-white shadow-md"
                                    />
                                    {doctor.status === "approved" && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                            <CheckOutlined className="mr-1" /> Verified
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1'>
                                        Dr. {doctor.firstname} {doctor.lastname}
                                    </h1>
                                    <div className="flex flex-wrap items-center mb-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs sm:text-sm px-3 py-1 rounded-full mr-2 mb-2">
                                            {doctor.department || 'Specialist'}
                                        </span>
                                        <span className="bg-indigo-100 text-indigo-800 text-xs sm:text-sm px-3 py-1 rounded-full mr-2 mb-2">
                                            {doctor.experience || '0'} yrs exp
                                        </span>
                                        {doctor.qualifications && (
                                            <span className="bg-purple-100 text-purple-800 text-xs sm:text-sm px-3 py-1 rounded-full mb-2">
                                                {doctor.qualifications}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-xs sm:text-sm max-w-2xl">
                                        {doctor.professionalBio || `Dr. ${doctor.firstname} ${doctor.lastname} is a dedicated healthcare professional with ${doctor.experience || 'several'} years of experience, providing quality medical care in ${doctor.department || 'their specialty'}.`}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                            <div className="flex items-center">
                                <div className="p-2 sm:p-3 rounded-full bg-blue-50 mr-3">
                                    <ClockCircleOutlined className="text-blue-500 text-base sm:text-xl" />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-500">Consulting Hours</p>
                                    <p className="font-medium text-sm sm:text-base text-gray-700">
                                        {(() => {
                                            // (existing code to get consultation hours)
                                            if (!doctor) return 'Consultation hours not available';
                                            
                                            const timingValues = extractTimingValues(doctor.timing);
                                            
                                            if (!timingValues || !Array.isArray(timingValues) || timingValues.length < 2) {
                                                return 'Consultation hours not specified';
                                            }
                                            
                                            let startTimeStr = timingValues[0];
                                            let endTimeStr = timingValues[1];
                                            
                                            if (typeof startTimeStr === 'string' && startTimeStr.includes('T')) {
                                                startTimeStr = startTimeStr.split('T')[1].substring(0, 5);
                                            }
                                            
                                            if (typeof endTimeStr === 'string' && endTimeStr.includes('T')) {
                                                endTimeStr = endTimeStr.split('T')[1].substring(0, 5);
                                            }
                                            
                                            // Handle empty or invalid time strings
                                            if (!startTimeStr || startTimeStr === 'null' || startTimeStr === 'undefined' ||
                                                !endTimeStr || endTimeStr === 'null' || endTimeStr === 'undefined') {
                                                return 'Consultation hours not available';
                                            }
                                            
                                            // Remove any quotes around the time strings
                                            startTimeStr = startTimeStr.replace(/"/g, '');
                                            endTimeStr = endTimeStr.replace(/"/g, '');
                                            
                                            // Create moment objects with strict parsing to ensure they're valid
                                            const startTime = moment(startTimeStr, 'HH:mm', true);
                                            const endTime = moment(endTimeStr, 'HH:mm', true);
                                            
                                            // Format for display
                                            if (startTime.isValid() && endTime.isValid()) {
                                                return `${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`;
                                            }
                                            
                                            // If all else fails
                                            return 'Consultation hours not available';
                                        })()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-50 mr-3">
                                    <MedicineBoxOutlined className="text-green-500 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Consultation Fee</p>
                                    <p className="font-medium text-green-600">₹{doctor?.feePerConsultation || 'Consultation fee'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-red-50 mr-3">
                                    <PhoneOutlined className="text-red-500 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Emergency Contact</p>
                                    {doctor?.mobile ? (
                                        <a href={`tel:${doctor?.mobile}`} className="font-medium text-blue-600 hover:underline">
                                            {doctor?.mobile}
                                        </a>
                                    ) : (
                                        <p className="font-medium">Not available</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Doctor Details Section */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <UserOutlined className="mr-2 text-blue-500" />
                            Doctor Information
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Specialization</p>
                                    <p className="font-medium">
                                        {(() => {
                                            // First check if doctor exists
                                            if (!doctor) return 'General Practice';
                                            
                                            // Handle various specialization formats
                                            if (!doctor.specialization) return doctor.department || 'General Practice';
                                            
                                            // If array, join with commas
                                            if (Array.isArray(doctor.specialization)) {
                                                return doctor.specialization.join(', ');
                                            }
                                            
                                            // If string but looks like array (has brackets)
                                            if (typeof doctor.specialization === 'string') {
                                                if (doctor.specialization.startsWith('[') && doctor.specialization.endsWith(']')) {
                                                    try {
                                                        const parsed = JSON.parse(doctor.specialization);
                                                        return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                                                    } catch (e) {
                                                        // If can't parse, remove brackets manually
                                                        return doctor.specialization.replace(/^\[|\]$/g, '').replace(/"/g, '');
                                                    }
                                                }
                                                return doctor.specialization;
                                            }
                                            
                                            return 'General Practice';
                                        })()}
                                    </p>
                                </div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Qualifications</p>
                                    <p className="font-medium">{doctor.qualifications || doctor.medicalDegree || 'MBBS'}</p>
                                </div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Languages</p>
                                    <p className="font-medium">{doctor.languages || 'English, Hindi'}</p>
                                </div>
                            </div>
                            
                            <div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Location</p>
                                    <p className="font-medium">{doctor.address || 'Contact for details'}</p>
                                </div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Experience</p>
                                    <p className="font-medium">{doctor.experience} years</p>
                                </div>
                                <div className="mb-4">
                                    <p className="text-gray-500 text-sm mb-1">Available for</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <Tag color="blue">Consultation</Tag>
                                        <Tag color="green">Follow-up</Tag>
                                        <Tag color="purple">Emergency Care</Tag>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Add Testimonials Section */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <StarOutlined className="mr-2 text-yellow-500" />
                            Patient Testimonials
                        </h3>
                        
                        <div className="bg-white p-6 rounded-lg shadow">
                            {loadingTestimonials ? (
                                <div className="flex justify-center py-8">
                                    <Spin size="large" tip="Loading testimonials..." />
                                </div>
                            ) : testimonials.length > 0 ? (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <div className="flex items-center">
                                                <Rate disabled defaultValue={parseFloat(testimonialStats.average)} allowHalf />
                                                <span className="ml-2 text-lg font-semibold">{testimonialStats.average}/5</span>
                                            </div>
                                            <div className="text-gray-500">
                                                Based on {testimonialStats.total} patient {testimonialStats.total === 1 ? 'review' : 'reviews'}
                                            </div>
                                        </div>
                                    </div>

                                    <Divider />

                                    <List
                                        className="testimonial-list"
                                        itemLayout="horizontal"
                                        dataSource={testimonials}
                                        renderItem={item => (
                                            <List.Item>
                                                <TestimonialItem
                                                    author={item.patientName || 'Anonymous Patient'}
                                                    avatar={<Avatar>{(item.patientName || 'A')[0].toUpperCase()}</Avatar>}
                                                    content={
                                                        <div>
                                                            <Rate disabled defaultValue={item.rating} />
                                                            <p className="mt-1 text-sm">{item.comment || 'Great experience with the doctor.'}</p>
                                                        </div>
                                                    }
                                                    datetime={moment(item.createdAt).fromNow()}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            ) : (
                                <Empty
                                    description={
                                        <div className="text-center">
                                            <p className="mb-2">No testimonials available yet</p>
                                            <p className="text-gray-500">Be the first to share your experience with Dr. {doctor?.firstname || 'Unknown'} {doctor?.lastname || ''}</p>
                                        </div>
                                    }
                                />
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <Steps current={currentStep} className="mb-8">
                            <Step title="Select Date & Time" icon={<CalendarOutlined />} />
                            <Step title="Patient Details" icon={<UserOutlined />} />
                            <Step title="Confirmation" icon={<CheckCircleOutlined />} />
                        </Steps>
                        
                        <div className="steps-content p-4">
                            {steps[currentStep].content}
                        </div>
                        
                        <div className="steps-action mt-8 flex justify-between">
                            {currentStep > 0 && (
                                <Button onClick={prevStep} size="large">
                                    Previous
                                </Button>
                            )}
                            
                            {currentStep < steps.length - 1 && (
                                <Button type="primary" onClick={nextStep} size="large">
                                    Next
                                </Button>
                            )}
                            
                            {currentStep === steps.length - 1 && (
                                <Button
                                    type="primary" 
                                    onClick={bookAppointment}
                                    loading={loading}
                                    size="large"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Confirm Appointment
                                </Button>
                            )}
                            </div>
                        </div>

                    {/* Suggested Slots Modal */}
                    <Modal
                        title="Suggested Available Slots"
                        visible={showSuggestionsModal}
                        onCancel={() => setShowSuggestionsModal(false)}
                        footer={null}
                    >
                        <div>
                            <p className="mb-4">No slots are available on your selected date. Here are some other available options:</p>
                            
                            {suggestedSlots.length > 0 ? (
                                <div className="suggested-slots">
                                    {suggestedSlots.map((slot, index) => (
                                        <div 
                                            key={index} 
                                            className="suggested-slot p-3 mb-3 border rounded-md hover:bg-blue-50 cursor-pointer"
                                            onClick={() => handleSelectSuggestion(slot)}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Badge status="success" />
                                                    <span className="ml-2 font-medium">{slot.date.format('dddd, MMMM D, YYYY')}</span>
                                                    <p className="ml-5 text-gray-600">{slot.formattedTime}</p>
                        </div>
                                                <Button type="primary" size="small">Select</Button>
                    </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Alert
                                    message="No available slots found"
                                    description="We couldn't find any available slots in the next 7 days. Please try selecting a date further in the future."
                                    type="info"
                                    showIcon
                                />
                            )}
                        </div>
                    </Modal>
                    </div>
            ) : (
                <div className="flex flex-col justify-center items-center h-96">
                    <Spin size="large" />
                    <p className="ml-3 text-gray-600 mt-4">Loading doctor information...</p>
                    <p className="text-gray-500 text-sm mt-2">Doctor ID: {doctorId}</p>
                </div>
            )}
        </Layout>
    );
}

export default BookAppointment;

// Helper function for debugging - can be called from browser console
window.testBatchSlotCheck = async (doctorId, date) => {
    try {
        console.log(`Testing batch slot check for doctor: ${doctorId}, date: ${date}`);
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error("No auth token available");
            return { success: false, error: "No auth token" };
        }
        
        // For a raw date string, ensure it's in YYYY-MM-DD format
        let formattedDate = date;
        
        // If it's in DD-MM-YYYY format, convert it to YYYY-MM-DD
        if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [day, month, year] = date.split('-');
            formattedDate = `${year}-${month}-${day}`;
            console.log("Converted date format from DD-MM-YYYY to YYYY-MM-DD:", formattedDate);
        }
        
        const response = await fetch('http://localhost:4000/api/user/check-booked-slots', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                doctorId: doctorId,
                date: formattedDate // format: YYYY-MM-DD
            })
        });
        
        const data = await response.json();
        console.log("API Response:", data);
        return data;
    } catch (error) {
        console.error("Error in batch slot check test:", error);
        return { success: false, error: error.message };
    }
};