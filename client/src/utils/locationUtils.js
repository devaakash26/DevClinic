import axios from 'axios';

// Indian states list (synchronized with the list in DoctorForm.jsx)
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Map of major cities by state (for India)
export const INDIAN_CITIES_BY_STATE = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Tirupati', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Arrah', 'Begusarai', 'Chhapra'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'],
  'Haryana': ['Gurugram', 'Faridabad', 'Rohtak', 'Panipat',"Kaithal","Kurukshetra", "Karnal", 'Hisar', 'Sonipat', 'Ambala'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Dharamshala', 'Solan', 'Kullu', 'Manali', 'Chamba'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Ramgarh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari', 'Tumakuru'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati'],
  'Manipur': ['Imphal', 'Thoubal', 'Ukhrul', 'Churachandpur', 'Senapati'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Williamnagar'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Saiha', 'Kolasib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bhilwara'],
  'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing', 'Singtam'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Secunderabad'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Gorakhpur', 'Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Mussoorie', 'Haldwani', 'Roorkee'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Mayabunder', 'Car Nicobar', 'Diglipur'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Delhi': ['New Delhi', 'Delhi', 'Noida', 'Faridabad', 'Gurgaon', 'Ghaziabad'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti', 'Andrott', 'Minicoy', 'Agatti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
};

/**
 * Fetches the list of countries from the OpenCage API
 * @returns {Promise<Array>} Array of country objects with name and code
 */
export const fetchCountries = async () => {
  try {
    // OpenCage API doesn't have a direct endpoint for country lists
    // Returning a static list of common countries
    return [
      { name: 'United States', code: 'us' },
      { name: 'Canada', code: 'ca' },
      { name: 'United Kingdom', code: 'gb' },
      { name: 'Australia', code: 'au' },
      { name: 'India', code: 'in' },
      { name: 'Germany', code: 'de' },
      { name: 'France', code: 'fr' },
      { name: 'Italy', code: 'it' },
      { name: 'Spain', code: 'es' },
      { name: 'Japan', code: 'jp' },
      // Add more countries as needed
    ];
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

/**
 * Fetches states/provinces for a given country using OpenCage API
 * @param {string} country - Country name or code 
 * @returns {Promise<Array>} Array of state names
 */
export const fetchStates = async (country = 'United States') => {
  try {
    // For India, return the predefined list
    if (country === 'India' || country === 'in') {
      return INDIAN_STATES;
    }
    
    // For US, we can use a predefined list as OpenCage doesn't have a direct endpoint
    if (country === 'United States' || country === 'us') {
      return [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
        'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
        'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
        'Wisconsin', 'Wyoming', 'District of Columbia'
      ];
    }
    
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    
    if (!apiKey) {
      console.error('OpenCage API key is missing in environment variables');
      return [];
    }
    
    // For other countries, we could use a forward geocoding query to OpenCage
    // but this is a simplified approach and might not be accurate for all countries
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(country)}&key=${apiKey}&limit=1`
    );
    
    // This is a simplified approach and may not work for all countries
    return response.data.results && response.data.results.length > 0 
      ? ['-- State list not available --'] 
      : [];
    
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
};

/**
 * Fetches cities for a given state and country using OpenCage API
 * @param {string} state - State/province name 
 * @param {string} country - Country name or code
 * @returns {Promise<Array>} Array of city names
 */
export const fetchCities = async (state, country = 'United States') => {
  try {
    // For India, return the predefined cities for the selected state
    if (country === 'India' || country === 'in') {
      return INDIAN_CITIES_BY_STATE[state] || ['-- Please enter your city manually --'];
    }
    
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    
    if (!apiKey) {
      console.error('OpenCage API key is missing in environment variables');
      return [];
    }
    
    // OpenCage doesn't provide a direct endpoint for fetching cities
    // This is a simplified approach using forward geocoding
    const query = `${state}, ${country}`;
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=10`
    );
    
    // Extract cities from results (this is a simplified approach)
    const cities = [];
    if (response.data.results && response.data.results.length > 0) {
      // Since OpenCage doesn't have a direct city list endpoint,
      // we return a message to the user
      return ['-- Please enter your city manually --'];
    }
    
    return cities;
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
};

/**
 * Detects the user's current location using browser geolocation and OpenCage API
 * @returns {Promise<Object>} Location object with coordinates, city, state, etc.
 */
export const detectUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
          
          if (!apiKey) {
            reject(new Error('OpenCage API key is missing in environment variables'));
            return;
          }
          
          const response = await axios.get(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`
          );
          
          if (response.data && response.data.results && response.data.results.length > 0) {
            const locationData = response.data.results[0].components;
            const formattedAddress = response.data.results[0].formatted || '';
            
            resolve({
              latitude,
              longitude,
              formattedAddress,
              city: locationData.city || locationData.town || locationData.village || '',
              state: locationData.state || '',
              country: locationData.country || '',
              zipCode: locationData.postcode || '',
              components: locationData
            });
          } else {
            reject(new Error('Could not determine your location details'));
          }
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}; 