import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { FaSearch, FaFilter, FaStethoscope , FaRegHospital, FaMapMarkerAlt, FaStar, FaArrowDown, FaArrowUp, FaChevronDown, FaTimes, FaSlidersH, FaSort, FaCalendarCheck, FaUserMd, FaRupeeSign, FaLocationArrow } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [sortBy, setSortBy] = useState(''); // rating, experience, fee
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [experienceRange, setExperienceRange] = useState([0, 30]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const navigate = useNavigate();

  // Location filtering states
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Refs for animation
  const headerRef = useRef(null);
  const filtersRef = useRef(null);
  const resultsRef = useRef(null);

  // Animation effect
  useEffect(() => {
    const tl = gsap.timeline();
    
    if (headerRef.current && filtersRef.current && resultsRef.current) {
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      )
      .fromTo(
        filtersRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        "-=0.4"
      )
      .fromTo(
        resultsRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.2"
      );
    }
  }, []);

  // Detect user's location
  const detectUserLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Use the OpenCage Geocoding API with the key from environment variables
            const apiKey = process.env.REACT_APP_OPENCAGE_API_KEY;
            
            if (!apiKey) {
              console.error('OpenCage API key is missing in environment variables');
              toast.error('Location service configuration is missing');
              setLoadingLocation(false);
              return;
            }
            
            const response = await axios.get(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`
            );
            
            if (response.data && response.data.results && response.data.results.length > 0) {
              const locationData = response.data.results[0].components;
              const city = locationData.city || locationData.town || locationData.village || '';
              const state = locationData.state || '';
              
              setUserLocation({
                city,
                state,
                latitude,
                longitude
              });
              
              // Auto-set city and state filters
              if (city) setSelectedCity(city);
              if (state) setSelectedState(state);
              setLocationEnabled(true);
              
              toast.success(`Location detected: ${city}, ${state}`);
            } else {
              toast.error('Unable to determine your location details');
            }
          } catch (error) {
            console.error('Error fetching location details:', error);
            toast.error('Failed to get location details');
          } finally {
            setLoadingLocation(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to access your location. Please allow location access or select manually.');
          setLoadingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setLoadingLocation(false);
    }
  };

  // Fetch all approved doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:4000/api/user/get-all-aproved-doctor', {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      });

      if (response.data.success) {
        const approvedDoctors = response.data.data.filter(doc => doc.status === "approved");
        setDoctors(approvedDoctors);
        setFilteredDoctors(approvedDoctors);
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(approvedDoctors.map(doc => doc.department).filter(Boolean))];
        setDepartments(uniqueDepartments);

        // Extract unique cities and states from doctor addresses
        extractLocationsFromDoctors(approvedDoctors);

        // Set price range based on actual data
        const fees = approvedDoctors.map(doc => doc.feePerConsultation || 0);
        if (fees.length > 0) {
          const minFee = Math.min(...fees);
          const maxFee = Math.max(...fees);
          setPriceRange([minFee, maxFee]);
        }

        // Set experience range based on actual data
        const experiences = approvedDoctors.map(doc => {
          const exp = doc.experience || "0";
          return parseInt(exp.toString().replace(/\D/g, "")) || 0;
        });
        if (experiences.length > 0) {
          const minExp = Math.min(...experiences);
          const maxExp = Math.max(...experiences);
          setExperienceRange([minExp, maxExp]);
        }
      } else {
        toast.error(response.data.message || 'Failed to fetch doctors');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Extract city and state from doctor addresses
  const extractLocationsFromDoctors = (doctors) => {
    const citiesSet = new Set();
    const statesSet = new Set();

    doctors.forEach(doctor => {
      if (doctor.address) {
        // Try to parse address into components
        const addressParts = doctor.address.split(',').map(part => part.trim());
        
        // Naive approach: assume last part might be state and second to last might be city
        // This is just an example - in a real app, you'd use a better parsing strategy
        if (addressParts.length >= 2) {
          const potentialCity = addressParts[addressParts.length - 2];
          const potentialState = addressParts[addressParts.length - 1];
          
          if (potentialCity && potentialCity.length > 2) citiesSet.add(potentialCity);
          if (potentialState && potentialState.length > 2) statesSet.add(potentialState);
        }
      }
    });

    setCities(Array.from(citiesSet).sort());
    setStates(Array.from(statesSet).sort());
  };

  useEffect(() => {
    fetchDoctors();
    // Ask for location permission when the component mounts
    const locationPermissionStatus = localStorage.getItem('locationPermissionAsked');
    if (!locationPermissionStatus) {
      // Delay the prompt slightly to improve user experience
      setTimeout(() => {
        if (confirm('Would you like to enable location-based doctor search?')) {
          detectUserLocation();
        }
        localStorage.setItem('locationPermissionAsked', 'true');
      }, 1000);
    }
  }, []);

  // Filter and sort doctors
  useEffect(() => {
    let filtered = doctors.filter(doctor => {
      // Name search
      const nameMatch = `${doctor.firstname || ''} ${doctor.lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Department filter
      const departmentMatch = selectedDepartment ? doctor.department === selectedDepartment : true;
      
      // Specialty search
      const specialization = typeof doctor.specialization === 'string' 
        ? doctor.specialization.toLowerCase() 
        : Array.isArray(doctor.specialization)
          ? doctor.specialization.join(', ').toLowerCase()
          : '';
      const specializationMatch = specialization.includes(searchTerm.toLowerCase());
      
      // Price range filter
      const fee = doctor.feePerConsultation || 0;
      const feeMatch = fee >= priceRange[0] && fee <= priceRange[1];
      
      // Experience filter
      const exp = doctor.experience ? parseInt(doctor.experience.toString().replace(/\D/g, "")) || 0 : 0;
      const expMatch = exp >= experienceRange[0] && exp <= experienceRange[1];
      
      // Availability filter
      const availabilityMatch = availableOnly ? doctor.isAvailable !== false : true;
      
      // Location filter
      let locationMatch = true;
      if (locationEnabled && (selectedCity || selectedState)) {
        const address = doctor.address ? doctor.address.toLowerCase() : '';
        
        if (selectedCity && selectedState) {
          locationMatch = address.includes(selectedCity.toLowerCase()) && address.includes(selectedState.toLowerCase());
        } else if (selectedCity) {
          locationMatch = address.includes(selectedCity.toLowerCase());
        } else if (selectedState) {
          locationMatch = address.includes(selectedState.toLowerCase());
        }
      }
      
      return (nameMatch || specializationMatch) && 
             departmentMatch && 
             feeMatch && 
             expMatch && 
             availabilityMatch &&
             locationMatch;
    });
    
    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let valA, valB;
        
        if (sortBy === 'rating') {
          valA = a.rating || 0;
          valB = b.rating || 0;
        } else if (sortBy === 'experience') {
          valA = a.experience ? parseInt(a.experience.toString().replace(/\D/g, "")) || 0 : 0;
          valB = b.experience ? parseInt(b.experience.toString().replace(/\D/g, "")) || 0 : 0;
        } else if (sortBy === 'fee') {
          valA = a.feePerConsultation || 0;
          valB = b.feePerConsultation || 0;
        } else {
          valA = a.firstname || '';
          valB = b.firstname || '';
        }
        
        if (sortDirection === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
    }
    
    setFilteredDoctors(filtered);
  }, [searchTerm, selectedDepartment, doctors, sortBy, sortDirection, priceRange, experienceRange, availableOnly, selectedCity, selectedState, locationEnabled]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSortBy('');
    setSortDirection('asc');
    setAvailableOnly(false);
    setSelectedCity('');
    setSelectedState('');
    setLocationEnabled(false);
    
    // Reset price and experience ranges to their initial values based on data
    const fees = doctors.map(doc => doc.feePerConsultation || 0);
    if (fees.length > 0) {
      const minFee = Math.min(...fees);
      const maxFee = Math.max(...fees);
      setPriceRange([minFee, maxFee]);
    }
    
    const experiences = doctors.map(doc => {
      const exp = doc.experience || "0";
      return parseInt(exp.toString().replace(/\D/g, "")) || 0;
    });
    if (experiences.length > 0) {
      const minExp = Math.min(...experiences);
      const maxExp = Math.max(...experiences);
      setExperienceRange([minExp, maxExp]);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handlePriceRangeChange = (e, index) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(e.target.value);
    setPriceRange(newRange);
  };

  const handleExperienceRangeChange = (e, index) => {
    const newRange = [...experienceRange];
    newRange[index] = parseInt(e.target.value);
    setExperienceRange(newRange);
  };

  const renderSortArrow = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? <FaArrowUp className="ml-1 text-xs" /> : <FaArrowDown className="ml-1 text-xs" />;
  };

  return (
    <Layout>
      <div className="doctors-page">
        {/* Header */}
        <div 
          className="page-header py-12 text-white relative overflow-hidden" 
          style={{ background: 'linear-gradient(135deg, #3494E6 0%, #EC6EAD 100%)' }}
          ref={headerRef}
        >
          <div className="absolute inset-0 bg-pattern opacity-10"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start">
                  <div className="p-2 bg-white bg-opacity-20 rounded-full mr-3">
                    <FaStethoscope  className="text-black text-xl" />
                  </div>
                  <span className="text-blue-100 font-medium">HEALTHCARE PROFESSIONALS</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-3">Find Your Doctor</h1>
                <p className="text-xl text-blue-100 max-w-xl">
                  Browse our network of certified medical professionals and book your appointment today
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="p-4 bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm rounded-lg border border-white border-opacity-20">
                  <FaRegHospital size={100} className="text-white opacity-80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="container mx-auto px-4 py-4 relative">
          <div 
            className="bg-white rounded-xl shadow-lg p-6 mb-8 relative -mt-16"
            ref={filtersRef}
          >
            {/* Location detection banner */}
            {!userLocation && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="text-blue-500 mr-2" />
                  <span className="text-sm text-blue-800">
                    Enable location to find doctors near you
                  </span>
                </div>
                <button 
                  onClick={detectUserLocation}
                  disabled={loadingLocation}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${loadingLocation ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'} transition-all duration-200 flex items-center`}
                >
                  {loadingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-2 border-white rounded-full animate-spin mr-1"></div>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <FaLocationArrow className="mr-1" /> Detect Location
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Current location display */}
            {userLocation && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="text-green-500 mr-2" />
                  <span className="text-sm text-green-800">
                    {locationEnabled ? (
                      <>Showing doctors near {userLocation.city}, {userLocation.state}</>
                    ) : (
                      <>Location detected: {userLocation.city}, {userLocation.state}</>
                    )}
                  </span>
                </div>
                <button 
                  onClick={() => setLocationEnabled(!locationEnabled)}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${locationEnabled ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-600 text-white hover:bg-green-700'} transition-all duration-200`}
                >
                  {locationEnabled ? 'Disable' : 'Enable'} Location Filter
                </button>
              </div>
            )}

            {/* Main search bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="w-full md:w-1/3 relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, specialty or keyword..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  />
                  <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-1/5">
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="appearance-none w-full px-4 py-3 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept, index) => (
                      <option key={index} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <FaFilter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <FaChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Location filters */}
              <div className="w-full md:w-1/5">
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      if (e.target.value) setLocationEnabled(true);
                    }}
                    className="appearance-none w-full px-4 py-3 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    disabled={!locationEnabled && selectedCity === ''}
                  >
                    <option value="">All Cities</option>
                    {cities.map((city, index) => (
                      <option key={index} value={city}>{city}</option>
                    ))}
                  </select>
                  <FaMapMarkerAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <FaChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-1/5">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 px-3 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-all duration-300 flex items-center justify-center text-sm"
                >
                  <FaSlidersH className="mr-2" /> {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
                <button 
                  onClick={clearFilters}
                  className="px-3 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300 text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {/* Advanced filters */}
            {showFilters && (
              <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Filters</h3>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Location Filter */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-gray-700 font-medium mb-2 flex items-center text-sm">
                      <FaMapMarkerAlt className="mr-2 text-blue-500" /> Location
                    </h3>
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 mb-1 block">State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          if (e.target.value) setLocationEnabled(true);
                        }}
                        className="w-full p-2 text-sm border border-gray-200 rounded-md"
                      >
                        <option value="">All States</option>
                        {states.map((state, index) => (
                          <option key={index} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">City</label>
                      <select
                        value={selectedCity}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          if (e.target.value) setLocationEnabled(true);
                        }}
                        className="w-full p-2 text-sm border border-gray-200 rounded-md"
                      >
                        <option value="">All Cities</option>
                        {cities.map((city, index) => (
                          <option key={index} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={locationEnabled}
                          onChange={() => setLocationEnabled(!locationEnabled)}
                          className="form-checkbox h-4 w-4 text-blue-500 rounded"
                        />
                        <span className="ml-2 text-gray-700 text-sm">Enable location filter</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Price Range Filter */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-gray-700 font-medium mb-2 flex items-center text-sm">
                      <FaRupeeSign className="mr-2 text-blue-500" /> Consultation Fee
                    </h3>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">₹{priceRange[0]}</span>
                      <span className="text-xs text-gray-500">₹{priceRange[1]}</span>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="range"
                        min={0}
                        max={5000}
                        value={priceRange[0]}
                        onChange={(e) => handlePriceRangeChange(e, 0)}
                        className="w-full accent-blue-500"
                      />
                      <input
                        type="range"
                        min={0}
                        max={5000}
                        value={priceRange[1]}
                        onChange={(e) => handlePriceRangeChange(e, 1)}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Experience Range Filter */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-gray-700 font-medium mb-2 flex items-center text-sm">
                      <FaUserMd className="mr-2 text-blue-500" /> Experience (Years)
                    </h3>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{experienceRange[0]} years</span>
                      <span className="text-xs text-gray-500">{experienceRange[1]} years</span>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={experienceRange[0]}
                        onChange={(e) => handleExperienceRangeChange(e, 0)}
                        className="w-full accent-blue-500"
                      />
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={experienceRange[1]}
                        onChange={(e) => handleExperienceRangeChange(e, 1)}
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Availability Filter */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <h3 className="text-gray-700 font-medium mb-2 flex items-center text-sm">
                      <FaCalendarCheck className="mr-2 text-blue-500" /> Availability
                    </h3>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availableOnly}
                        onChange={() => setAvailableOnly(!availableOnly)}
                        className="form-checkbox h-4 w-4 text-blue-500 rounded"
                      />
                      <span className="ml-2 text-gray-700 text-sm">Show only available doctors</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="mb-10" ref={resultsRef}>
            {/* Results header with sorting */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div className="mb-4 md:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                  <span className="text-blue-600">{filteredDoctors.length}</span> Doctors Found
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {Math.min(filteredDoctors.length, doctors.length)} of {doctors.length} doctors
                  {selectedCity && <span> in {selectedCity}</span>}
                  {selectedState && <span>{selectedCity ? ', ' : ' in '}{selectedState}</span>}
                </p>
              </div>
              
              <div className="w-full md:w-auto flex flex-col md:flex-row items-start md:items-center">
                <span className="text-sm text-gray-500 mb-2 md:mb-0 md:mr-3">Sort by:</span>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => toggleSort('rating')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${sortBy === 'rating' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all duration-200 flex items-center`}
                  >
                    Rating {renderSortArrow('rating')}
                  </button>
                  <button 
                    onClick={() => toggleSort('experience')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${sortBy === 'experience' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all duration-200 flex items-center`}
                  >
                    Experience {renderSortArrow('experience')}
                  </button>
                  <button 
                    onClick={() => toggleSort('fee')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${sortBy === 'fee' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all duration-200 flex items-center`}
                  >
                    Price {renderSortArrow('fee')}
                  </button>
                </div>
              </div>
            </div>

            {/* Doctor Listing */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-md">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 font-medium">Looking for the best doctors for you...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-md">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                  <FaSearch size={40} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No doctors found</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  We couldn't find any doctors matching your search criteria.
                  Please try adjusting your filters or search term.
                </p>
                <button 
                  onClick={clearFilters}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-300 shadow hover:shadow-lg"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map((doctor) => (
                  <div key={doctor._id} className="doctor-card-wrapper transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                    <DoctorCard doctor={doctor} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations and styles */}
      <style jsx="true">{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .bg-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </Layout>
  );
};

export default Doctors;