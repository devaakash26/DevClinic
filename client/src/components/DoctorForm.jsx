import { Col, Input, Form, Row, TimePicker, Button, Upload, message, InputNumber, Typography, Card, Select, Divider, Alert, notification, Tooltip } from 'antd';
import { UploadOutlined, PlusOutlined, UserOutlined, BankOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, FileDoneOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './DoctorForm.css';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { fetchCountries, fetchStates, fetchCities, detectUserLocation } from '../utils/locationUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DoctorForm = ({ handleSubmit, form, isSubmitDisabled, onValuesChange, initialValues }) => {
    const { user } = useSelector((state) => state.user);
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [otherDegree, setOtherDegree] = useState(false);
    const [otherSpecialization, setOtherSpecialization] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [showCustomCityInput, setShowCustomCityInput] = useState(false);
    // Always use India as the country
    const selectedCountry = 'India';
    
    // Track when form values change to reset image when form is cleared
    useEffect(() => {
        // If the form has no values (after reset), clear the image
        const formValues = form.getFieldsValue();
        const hasValues = Object.values(formValues).some(val => 
            val !== undefined && val !== null && val !== '' && 
            !(Array.isArray(val) && val.length === 0)
        );
        
        if (!hasValues && imageUrl) {
            console.log("Form appears to be reset, clearing image");
            setImageUrl('');
        }
    }, [form.getFieldsValue()]);

    // This special reset function can be called from outside the component
    // We attach it to the form instance for external access
    form.resetImage = () => {
        setImageUrl('');
        setImageFile(null);
    };
    
    // Fetch states for India on component mount
    useEffect(() => {
        const loadStates = async () => {
            console.log(`Loading states for India`);
            const statesList = await fetchStates('India');
            setStates(statesList);
            
            // If there's an initial state value, load cities for it
            if (initialValues?.state) {
                const initialState = initialValues.state;
                console.log(`Loading cities for initial state: ${initialState}`);
                const citiesList = await fetchCities(initialState, 'India');
                setCities(citiesList);
            }
        };
        loadStates();
    }, [initialValues?.state]);
    
    // Load cities when initialValues changes and has state
    useEffect(() => {
        const loadInitialCities = async () => {
            if (initialValues?.state) {
                const citiesList = await fetchCities(initialValues.state, 'India');
                setCities(citiesList);
                
                // If the initialValues has a city that's not in our predefined list, show custom input
                if (citiesList.length > 0 && initialValues.city && 
                    !citiesList.includes(initialValues.city) && 
                    initialValues.city !== 'other') {
                    setShowCustomCityInput(true);
                }
            }
        };
        
        loadInitialCities();
    }, [initialValues]);
    
    // Handle country change
    const handleCountryChange = (value) => {
        // This function is now unused as we always use India
    };
    
    // Handle state change
    const handleStateChange = async (value) => {
        if (value) {
            // First clear the city selection
            form.setFieldsValue({ city: undefined });
            
            // Then fetch cities for the selected state
            const citiesList = await fetchCities(value, 'India');
            
            // Update the cities list
            setCities(citiesList);
            
            console.log(`Fetched ${citiesList.length} cities for ${value}, India`);
        } else {
            // If no state is selected, clear the cities list
            setCities([]);
        }
    };

    // Handle city selection
    const handleCityChange = (value) => {
        if (value === 'other') {
            // If "Other" is selected, show custom input field
            setShowCustomCityInput(true);
            form.setFieldsValue({ city: undefined }); // Clear the value to force re-entry
        } else {
            setShowCustomCityInput(false);
        }
    };

    // Set the initial imageUrl when initialValues changes
    useEffect(() => {
        console.log("Details: ", user);
        if (initialValues && initialValues.image) {
            setImageUrl(initialValues.image);
        }
        
        // Handle timing data when initialValues loads
        if (initialValues && initialValues.timing && Array.isArray(initialValues.timing)) {
            console.log("Original timing in initialValues:", initialValues.timing);
            
            // Try to create valid moment objects for both start and end times
            try {
                let startTimeStr = initialValues.timing[0];
                let endTimeStr = initialValues.timing[1];
                
                // Make sure we have strings
                if (startTimeStr && endTimeStr) {
                    // Function to convert time to moment object, handling various formats
                    const timeToMoment = (timeStr) => {
                        if (moment.isMoment(timeStr)) {
                            return timeStr;
                        }
                        
                        // Try different time formats
                        const formats = ['HH:mm', 'h:mm A', 'h:mm a', 'HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss'];
                        let timeMoment;
                        
                        // If it's already a valid 24-hour format, use that
                        if (typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr)) {
                            timeMoment = moment(timeStr, 'HH:mm');
                        } else {
                            // Try each format until one works
                            for (const format of formats) {
                                const m = moment(timeStr, format);
                                if (m.isValid()) {
                                    timeMoment = m;
                                    break;
                                }
                            }
                        }
                        
                        return timeMoment || moment(); // Default to current time if all else fails
                    };
                    
                    const startTime = timeToMoment(startTimeStr);
                    const endTime = timeToMoment(endTimeStr);
                    
                    // Only update the form if we have valid times
                    if (startTime.isValid() && endTime.isValid()) {
                        console.log("Setting timing with valid moment objects:", [startTime, endTime]);
                        
                        form.setFieldsValue({ 
                            timing: [startTime, endTime]
                        });
                    } else {
                        console.warn("Invalid time values in initialValues", {
                            startTimeStr, endTimeStr, 
                            startTimeValid: startTime.isValid(), 
                            endTimeValid: endTime.isValid()
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing timing values:", error);
                // Set default time values on error
                const now = moment();
                const timingArray = [now, moment(now).add(1, 'hour')];
                console.log("Setting default timing array:", timingArray);
                
                form.setFieldsValue({ 
                    timing: timingArray 
                });
            }
        }
    }, [initialValues, form]);

    // Function to detect user's current location
    const detectLocation = async () => {
        try {
            setLoadingLocation(true);
            const locationData = await detectUserLocation();
            
            console.log("Detected location:", locationData);
            
            // Update form fields - country is always India
            form.setFieldsValue({
                country: 'India',
                state: locationData.state,
                zipCode: locationData.zipCode,
                coordinates: { lat: locationData.latitude, lng: locationData.longitude }
            });
            
            // Also update the address field with a formatted address
            if (locationData.formattedAddress && !form.getFieldValue('address')) {
                form.setFieldsValue({ address: locationData.formattedAddress });
            }
            
            // Fetch cities for the detected state
            if (locationData.state) {
                const citiesList = await fetchCities(locationData.state, 'India');
                setCities(citiesList);
                
                // Set city to detected city if it's in our list, otherwise show the input
                if (locationData.city && citiesList.includes(locationData.city)) {
                    form.setFieldsValue({ city: locationData.city });
                    setShowCustomCityInput(false);
                } else if (locationData.city) {
                    setShowCustomCityInput(true);
                    form.setFieldsValue({ city: locationData.city });
                }
            }
            
            message.success('Location detected successfully');
        } catch (error) {
            console.error('Geolocation error:', error);
            message.error(error.message || 'Unable to access your location. Please ensure location access is enabled.');
        } finally {
            setLoadingLocation(false);
        }
    };
    
    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG file!');
            return false;
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must be smaller than 2MB!');
            return false;
        }

        return true; // Allow upload to proceed through customRequest
    };

    // Function to compress images before upload
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    
                    // Resize image if it's too large
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert canvas to blob with reduced quality
                    canvas.toBlob(
                        (blob) => {
                            // Create a new file from the blob
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }, 
                        'image/jpeg', 
                        0.7  // quality parameter (0.7 = 70% quality)
                    );
                };
                img.onerror = (error) => {
                    reject(error);
                };
            };
            reader.onerror = (error) => {
                reject(error);
            };
        });
    };

    const dummyRequest = ({ file, onSuccess }) => {
        setTimeout(() => {
            onSuccess("ok");
        }, 0);
    };

    // Function to validate an image URL
    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        
        // Check if it's a URL
        const isUrl = url.startsWith('http://') || url.startsWith('https://');
        
        // Check if it comes from known image hosts
        const isKnownImageHost = 
            url.includes('cloudinary.com') || 
            url.includes('res.cloudinary.com') ||
            url.includes('amazonaws.com') ||
            url.includes('imgur.com') ||
            url.includes('googleusercontent.com');
            
        // Check if it has image file extension
        const hasImageExtension = /\.(jpeg|jpg|png|gif|webp)($|\?)/.test(url.toLowerCase());
        
        return isUrl && (isKnownImageHost || hasImageExtension);
    };

    // Custom upload request to handle the file upload to Cloudinary
    const customUploadRequest = async ({ file, onSuccess, onError }) => {
        // First compress the image before uploading
        try {
            setUploading(true);
            const compressedFile = await compressImage(file);
            
            const formData = new FormData();
            formData.append('doctorImage', compressedFile);
            formData.append('userId', initialValues?.userId || user?._id || '');
            
            // Log upload details for debugging
            console.log("Uploading image with user ID:", initialValues?.userId || user?._id || 'No ID provided');
            
            message.loading('Uploading image...', 0);
            
            try {
                // First attempt: Try server upload
                console.log("Attempting server upload first...");
                const response = await axios.post(
                    'http://localhost:4000/api/doctor/upload-doctor-image',
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        // Adding a timeout to ensure we don't wait forever
                        timeout: 15000
                    }
                );
                
                message.destroy(); // Remove loading message
                
                // Debug log the entire response
                console.log('Server response:', response.data);
                
                // Check for success in response
                if (response.data.success) {
                    // Extract image URL, checking all possible paths from the response
                    let imageUrl = null;
                    
                    if (response.data.data) {
                        if (response.data.data.url) {
                            imageUrl = response.data.data.url;
                        } else if (response.data.data.path) {
                            imageUrl = response.data.data.path;
                        } else if (response.data.data.doctor && response.data.data.doctor.image) {
                            imageUrl = response.data.data.doctor.image;
                        }
                    }
                    
                    // Special handling for the Cloudinary path format seen in the error message
                    if (!imageUrl && response.data.message && response.data.message.includes('File upload details')) {
                        // Extract URL from the log message
                        const match = response.data.message.match(/path: ['"]([^'"]+)['"]/);
                        if (match && match[1]) {
                            imageUrl = match[1];
                            console.log('Extracted image URL from message:', imageUrl);
                        }
                    }
                    
                    // Also try to extract URL directly from the message if it contains a valid URL
                    if (!imageUrl && response.data.message) {
                        const urlMatch = response.data.message.match(/(https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp))/i);
                        if (urlMatch && urlMatch[1]) {
                            imageUrl = urlMatch[1];
                            console.log('Extracted image URL from message text:', imageUrl);
                        }
                    }
                    
                    console.log('Extracted image URL:', imageUrl);
                    
                    if (isValidImageUrl(imageUrl)) {
                        setImageUrl(imageUrl);
                        form.setFieldsValue({ image: imageUrl });
                        message.success('Image uploaded successfully');
                        onSuccess(response.data, file);
                        setUploading(false);
                        return;
                    } else {
                        // This message means the server saved the image, but we couldn't extract the URL
                        // We'll consider this a success case since the upload worked, just the URL extraction failed
                        if (response.data.data && response.data.data.doctor) {
                            // If we get here, the server succeeded but we just couldn't parse the URL
                            // Try one more approach: check the doctor object directly
                            const doctorImage = response.data.data.doctor.image;
                            if (isValidImageUrl(doctorImage)) {
                                setImageUrl(doctorImage);
                                form.setFieldsValue({ image: doctorImage });
                                message.success('Image uploaded successfully');
                                onSuccess(response.data, file);
                                setUploading(false);
                                return;
                            }
                        } else {
                            console.warn('Server upload succeeded but couldn\'t extract image URL');
                            // Fall through to direct upload
                        }
                    }
                } else if (response.data.message && response.data.message.includes('https://res.cloudinary.com')) {
                    // If the URL is in the message itself (common error case)
                    const urlMatch = response.data.message.match(/(https:\/\/res\.cloudinary\.com\/[^"\s]+)/);
                    if (urlMatch && urlMatch[1]) {
                        const cloudinaryUrl = urlMatch[1];
                        if (isValidImageUrl(cloudinaryUrl)) {
                            setImageUrl(cloudinaryUrl);
                            form.setFieldsValue({ image: cloudinaryUrl });
                            message.success('Image uploaded successfully');
                            onSuccess(response.data, file);
                            setUploading(false);
                            return;
                        }
                    }
                }
            } catch (error) {
                message.destroy(); 
                
                if (error.response && error.response.data && error.response.data.message) {
                    const urlMatch = error.response.data.message.match(/(https:\/\/res\.cloudinary\.com\/[^"\s]+)/);
                    if (urlMatch && urlMatch[1]) {
                        const cloudinaryUrl = urlMatch[1];
                        console.log('Found Cloudinary URL in error message:', cloudinaryUrl);
                        
                        if (isValidImageUrl(cloudinaryUrl)) {
                            setImageUrl(cloudinaryUrl);
                            form.setFieldsValue({ image: cloudinaryUrl });
                            message.success('Image uploaded successfully despite error');
                            onSuccess({ success: true, data: { url: cloudinaryUrl } }, file);
                            setUploading(false);
                            return;
                        }
                    }
                }
                
                // Detailed error logging
                if (error.response) {
                    console.error('Server error response:', error.response.data);
                    console.error('Server error status:', error.response.status);
                } else if (error.request) {
                    console.error('No response received from server');
                } else {
                    console.error('Error setting up request:', error.message);
                }
                
            }
            
            // Second attempt: Try direct Cloudinary upload
            try {
                const success = await handleDirectCloudinaryUpload(compressedFile);
                if (success) {
                    onSuccess({ success: true }, file);
                } else {
                    throw new Error("Direct upload failed");
                }
            } catch (cloudinaryError) {
                console.error('Direct Cloudinary upload error:', cloudinaryError);
                message.error('Image upload failed. Please try again later.');
                onError(cloudinaryError || new Error('Upload failed'));
                setUploading(false);
            }
        } catch (compressionError) {
            message.destroy(); // Remove loading message
            setUploading(false);
            console.error('Error compressing image:', compressionError);
            onError(compressionError);
            message.error('Failed to process image for upload. Please try another image.');
        }
    };
    
    // Direct upload to Cloudinary when server route fails
    const handleDirectCloudinaryUpload = async (file) => {
        try {
            // Create a unique public_id based on timestamp and random number
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const filename = file.name.split('.')[0];
            const publicId = `doctor-${filename}-${uniqueSuffix}`;
            
            // Create FormData for direct Cloudinary upload
            // Using a different preset name that exists in your Cloudinary account
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', file);
            cloudinaryFormData.append('upload_preset', 'ml_default'); // Try using ml_default which is often the default preset
            cloudinaryFormData.append('public_id', publicId);
            cloudinaryFormData.append('folder', 'doctor_appointment_system/profile_pictures');
            
            
            // Make direct request to Cloudinary upload API
            const cloudinaryResponse = await axios.post(
                'https://api.cloudinary.com/v1_1/dsjcd7hos/image/upload', // Replace with your cloud name if different
                cloudinaryFormData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    // Adding a timeout
                    timeout: 30000
                }
            );
            
            message.destroy(); // Remove loading message
            
            if (cloudinaryResponse.data && cloudinaryResponse.data.secure_url) {
                const imageUrl = cloudinaryResponse.data.secure_url;
                if (isValidImageUrl(imageUrl)) {
                    setImageUrl(imageUrl);
                    form.setFieldsValue({ image: imageUrl });
                    message.success('Image uploaded successfully');
                    setUploading(false);
                    return true;
                } else {
                    console.error('Invalid image URL returned from Cloudinary');
                    throw new Error('Invalid image URL from Cloudinary');
                }
            } else {
                console.error('No secure URL in Cloudinary response', cloudinaryResponse.data);
                throw new Error('Missing secure URL in Cloudinary response');
            }
        } catch (error) {
            message.destroy(); // Remove loading message
            console.error('Direct Cloudinary upload error:', error);
            
            // More detailed error logging
            if (error.response) {
                console.error('Cloudinary error response:', error.response.data);
                console.error('Cloudinary error status:', error.response.status);
                
                // Check if preset not found error
                if (error.response.data && 
                   (error.response.data.error && error.response.data.error.message === 'Upload preset not found' || 
                    error.response.data.error === 'Upload preset not found')) {
                    
                    // Try one more time with unsigned upload (no preset)
                    try {
                        return await handleUnsignedCloudinaryUpload(file);
                    } catch (unsignedError) {
                        console.error('Unsigned upload also failed:', unsignedError);
                        // Continue with original error handling below
                    }
                }
                
                // Special handling for common Cloudinary errors
                if (error.response.data && error.response.data.error) {
                    const cloudinaryError = error.response.data.error;
                    message.error(`Cloudinary error: ${typeof cloudinaryError === 'string' ? cloudinaryError : cloudinaryError.message || 'Unknown error'}`);
                }
            } else if (error.request) {
                console.error('No response received from Cloudinary');
                message.error('No response from Cloudinary. Please check your internet connection.');
            } else {
                console.error('Error setting up Cloudinary request:', error.message);
                message.error('Error setting up upload request. Please try again.');
            }
            
            setUploading(false);
            throw error;
        }
    };
    
    // Last resort: Try unsigned upload with API credentials
    const handleUnsignedCloudinaryUpload = async (file) => {
        try {
            message.loading('Trying alternate upload method...', 0);
            
            // Create a unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const filename = file.name.split('.')[0];
            const publicId = `doctor-${filename}-${uniqueSuffix}`;
            
            // Create FormData with minimal parameters
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', file);
            cloudinaryFormData.append('public_id', publicId);
            cloudinaryFormData.append('folder', 'doctor_appointment_system/profile_pictures');
            
            // Use the server to perform the upload instead
            console.log('Attempting server-proxy Cloudinary upload');
            
            const response = await axios.post(
                'http://localhost:4000/api/doctor/cloudinary-proxy-upload', // You'll need to create this endpoint
                cloudinaryFormData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    timeout: 30000
                }
            );
            
            message.destroy();
            
            if (response.data && response.data.success && response.data.imageUrl) {
                const imageUrl = response.data.imageUrl;
                console.log('Server proxy upload succeeded:', imageUrl);
                
                setImageUrl(imageUrl);
                form.setFieldsValue({ image: imageUrl });
                message.success('Image uploaded successfully via alternate method');
                setUploading(false);
                return true;
            } else {
                throw new Error('Server proxy upload failed');
            }
        } catch (error) {
            message.destroy();
            console.error('Alternate upload failed:', error);
            
            // Since this is our last resort, we'll throw the error to be handled by the caller
            throw error;
        }
    };

    // Custom handleSubmit function that also resets the image
    const onFinish = (values) => {
        console.log("Form values received:", values);
        
        // Validate that an image is uploaded
        if (!imageUrl) {
            notification.error({
                message: "Please upload an image",
            });
            return;
        }
        
        // Check if the image URL is valid
        if (!isValidImageUrl(imageUrl)) {
            notification.error({
                message: "Please wait for the image to upload completely",
            });
            return;
        }
        
        // Parse and format the timing values correctly
        const timingValues = [];
        
        if (values.timing && values.timing[0] && values.timing[1]) {
            // Clone moment objects to avoid mutation
            const startMoment = values.timing[0].clone();
            const endMoment = values.timing[1].clone();
            
            // Log the original time values
            console.log("Original time values:", {
                start: startMoment.format('h:mm A'),
                end: endMoment.format('h:mm A')
            });
            
            // Format to 24-hour format
            const start = startMoment.format('HH:mm');
            const end = endMoment.format('HH:mm');
            
            console.log("Converted time values (24h):", { start, end });
            
            // Validate that start and end times are different
            if (start === end) {
                notification.warning({
                    message: "Start time and end time cannot be the same. Adjusting end time.",
                });
                // If they're the same, add an hour to the end time
                endMoment.add(1, 'hour');
                timingValues.push(start, endMoment.format('HH:mm'));
            } else {
                timingValues.push(start, end);
            }
        } else {
            notification.error({
                message: "Please select both start and end times",
            });
            return;
        }
        
        // Prepare the final values object with all needed data
        const finalValues = {
            ...values,
            timing: timingValues,
            image: imageUrl,
        };
        
        console.log("Final values being submitted:", finalValues);
        
        // Create a reset function that will clear the image
        const resetFormCompletely = () => {
            console.log("Resetting form completely, including image");
            setImageUrl('');
            setImageFile(null);
            form.resetFields();
        };
        
        // Pass both the values and the reset function to the parent component
        handleSubmit(finalValues, resetFormCompletely);
    };

    return (
        <Form form={form} layout="vertical" className="mt-4" onFinish={onFinish} onValuesChange={(changedValues, allValues) => {
            // Check if degree or specialization is "Other"
            if (changedValues.medicalDegree === 'Other') {
                setOtherDegree(true);
            } else if (changedValues.medicalDegree && changedValues.medicalDegree !== 'Other') {
                setOtherDegree(false);
            }

            // Check for Other in specialization array
            if (changedValues.specialization && Array.isArray(changedValues.specialization)) {
                setOtherSpecialization(changedValues.specialization.includes('Other'));
            }

            // Call the original onValuesChange if provided
            if (onValuesChange) {
                onValuesChange(changedValues, allValues);
            }
        }}>
            <Card className="mb-6 shadow-sm">
                <div className="section-header flex items-center mb-6 pb-2 border-b">
                    <UserOutlined className="mr-2 text-blue-500 text-lg" />
                    <Title level={4} className="m-0 text-gray-700">Personal Information</Title>
                </div>
                <Row gutter={16}>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="First Name"
                            name="firstname"
                            rules={[{ required: true, message: 'Please enter your first name' }]}
                        >
                            <Input placeholder="First Name" prefix={<UserOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Last Name"
                            name="lastname"
                            rules={[{ required: true, message: 'Please enter your last name' }]}
                        >
                            <Input placeholder="Last Name" prefix={<UserOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input placeholder="Email" prefix={<MailOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Mobile Number"
                            name="mobile"
                            rules={[{ required: true, message: 'Please enter your mobile number' }]}
                        >
                            <Input placeholder="Mobile Number" prefix={<PhoneOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Website"
                            name="website"
                            rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
                        >
                            <Input placeholder="Website (If Any)" prefix={<GlobalOutlined className="text-gray-400" />} />
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Profile Image"
                            name="image"
                            rules={[{ required: true, message: 'Please upload your image' }]}
                        >
                            <div className="text-center">
                                <Upload
                                    name="doctorImage"
                                    listType="picture-card"
                                    className="doctor-avatar-uploader"
                                    showUploadList={false}
                                    beforeUpload={beforeUpload}
                                    customRequest={customUploadRequest}
                                    disabled={uploading}
                                    onRemove={() => {
                                        setImageUrl('');
                                        setImageFile(null);
                                        form.setFieldsValue({ image: undefined });
                                    }}
                                >
                                    {imageUrl ? (
                                        <div className="relative w-full h-full">
                                            <img 
                                                src={imageUrl} 
                                                alt="profile" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    console.error('Error loading image from URL:', imageUrl);
                                                    e.target.onerror = null; 
                                                    e.target.src = 'https://via.placeholder.com/200?text=Image+Error';
                                                    message.error('Error loading the uploaded image. URL may be incorrect.');
                                                }}
                                            />
                                            <div className="absolute top-0 right-0 p-1">
                                                <Tooltip title="Change photo">
                                                    <Button 
                                                        size="small" 
                                                        type="primary" 
                                                        shape="circle" 
                                                        icon={<UploadOutlined />} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImageUrl('');
                                                            setImageFile(null);
                                                            form.setFieldsValue({ image: undefined });
                                                        }}
                                                    />
                                                </Tooltip>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center">
                                            {uploading ? (
                                                <>
                                                    <div className="mb-2">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                                    </div>
                                                    <div className="text-sm text-gray-600">Uploading...</div>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadOutlined className="text-2xl text-blue-500 mb-1" />
                                                    <div className="text-sm text-gray-600">Upload</div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </Upload>
                                <Text type="secondary" className="text-xs block mt-2">
                                    {uploading 
                                        ? "Uploading, please wait..." 
                                        : "Professional photo (JPG/PNG, max 2MB)"}
                                </Text>
                            </div>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card className="mb-6 shadow-sm">
                <div className="section-header flex items-center mb-2 pb-2 border-b">
                    <FileDoneOutlined className="mr-2 text-blue-500 text-lg" />
                    <Title level={4} className="m-0 text-gray-700">Educational Qualifications</Title>
                </div>
                
                <Alert 
                    message="Important"
                    description="Please provide accurate information about your educational background. This information will be verified during the application review process."
                    type="info"
                    showIcon
                    className="mb-4"
                />
                
                <Row gutter={16}>
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="Medical Degree"
                            name="medicalDegree"
                            rules={[{ required: true, message: 'Please select your medical degree' }]}
                        >
                            <Select placeholder="Select your degree">
                                <Option value="MBBS">MBBS</Option>
                                <Option value="MD">MD</Option>
                                <Option value="MS">MS</Option>
                                <Option value="BDS">BDS</Option>
                                <Option value="DM">DM</Option>
                                <Option value="DNB">DNB</Option>
                                <Option value="MCh">MCh</Option>
                                <Option value="DO">DO</Option>
                                <Option value="PhD">PhD</Option>
                                <Option value="BAMS">BAMS (Ayurveda)</Option>
                                <Option value="BHMS">BHMS (Homeopathy)</Option>
                                <Option value="BUMS">BUMS (Unani)</Option>
                                <Option value="BNYS">BNYS (Naturopathy)</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                        
                        {otherDegree && (
                            <Form.Item
                                label="Specify Degree"
                                name="otherMedicalDegree"
                                rules={[{ required: true, message: 'Please specify your degree' }]}
                            >
                                <Input placeholder="Enter your medical degree" />
                            </Form.Item>
                        )}
                    </Col>
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="Institution"
                            name="institution"
                            rules={[{ required: true, message: 'Please enter your institution' }]}
                        >
                            <Input placeholder="e.g., AIIMS Delhi" />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="Qualifications"
                            name="qualifications"
                            rules={[{ required: true, message: 'Please enter your qualifications' }]}
                            extra="List all your degrees, certifications, and other qualifications"
                        >
                            <TextArea 
                                rows={3} 
                                placeholder="List your degrees, certifications, and other qualifications (e.g., MBBS - AIIMS Delhi (2010), MD Cardiology - PGI Chandigarh (2014))"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="Specializations"
                            name="specialization"
                            rules={[{ required: true, message: 'Please select your specialization' }]}
                        >
                            <Select placeholder="Select your specialization" mode="multiple">
                                <Option value="Cardiology">Cardiology</Option>
                                <Option value="Neurology">Neurology</Option>
                                <Option value="Dermatology">Dermatology</Option>
                                <Option value="Pediatrics">Pediatrics</Option>
                                <Option value="Orthopedics">Orthopedics</Option>
                                <Option value="Gynecology">Gynecology</Option>
                                <Option value="Ophthalmology">Ophthalmology</Option>
                                <Option value="ENT">ENT (Otolaryngology)</Option>
                                <Option value="Psychiatry">Psychiatry</Option>
                                <Option value="Urology">Urology</Option>
                                <Option value="Gastroenterology">Gastroenterology</Option>
                                <Option value="Endocrinology">Endocrinology</Option>
                                <Option value="Nephrology">Nephrology</Option>
                                <Option value="Pulmonology">Pulmonology</Option>
                                <Option value="Oncology">Oncology</Option>
                                <Option value="Rheumatology">Rheumatology</Option>
                                <Option value="Hematology">Hematology</Option>
                                <Option value="Infectious Disease">Infectious Disease</Option>
                                <Option value="General Medicine">General Medicine</Option>
                                <Option value="General Surgery">General Surgery</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                        
                        {otherSpecialization && (
                            <Form.Item
                                label="Specify Other Specialization(s)"
                                name="otherSpecialization"
                                rules={[{ required: true, message: 'Please specify your specialization' }]}
                            >
                                <Input placeholder="Enter your specialization(s)" />
                            </Form.Item>
                        )}
                    </Col>
                </Row>
            </Card>

            <Card className="mb-6 shadow-sm">
                <div className="section-header flex items-center mb-2 pb-2 border-b">
                    <BankOutlined className="mr-2 text-blue-500 text-lg" />
                    <Title level={4} className="m-0 text-gray-700">Professional Information</Title>
                </div>
                
                <Alert 
                    message="Professional Details"
                    description="Please provide accurate information about your professional experience and practice. This helps patients find the right specialist for their needs."
                    type="info"
                    showIcon
                    className="mb-4"
                />
                
                <Row gutter={16}>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Department"
                            name="department"
                            rules={[{ required: true, message: 'Please select your department' }]}
                        >
                            <Select placeholder="Select Department">
                                <Option value="Cardiology">Cardiology</Option>
                                <Option value="Dermatology">Dermatology</Option>
                                <Option value="Neurology">Neurology</Option>
                                <Option value="Orthopedics">Orthopedics</Option>
                                <Option value="Pediatrics">Pediatrics</Option>
                                <Option value="Psychiatry">Psychiatry</Option>
                                <Option value="Oncology">Oncology</Option>
                                <Option value="Gynecology">Gynecology</Option>
                                <Option value="Ophthalmology">Ophthalmology</Option>
                                <Option value="ENT">ENT</Option>
                                <Option value="Pulmonology">Pulmonology</Option>
                                <Option value="Nephrology">Nephrology</Option>
                                <Option value="Gastroenterology">Gastroenterology</Option>
                                <Option value="Endocrinology">Endocrinology</Option>
                                <Option value="Urology">Urology</Option>
                                <Option value="General Surgery">General Surgery</Option>
                                <Option value="General Medicine">General Medicine</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Profession"
                            name="profession"
                            rules={[{ required: true, message: 'Please select your profession' }]}
                        >
                            <Select placeholder="Select Profession">
                                <Option value="General Physician">General Physician</Option>
                                <Option value="Specialist">Specialist</Option>
                                <Option value="Surgeon">Surgeon</Option>
                                <Option value="Consultant">Consultant</Option>
                                <Option value="Professor">Professor/Academic</Option>
                                <Option value="Researcher">Researcher</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8} xs={24} sm={12} lg={8}>
                        <Form.Item
                            label="Experience (Years)"
                            name="experience"
                            rules={[{ required: true, message: 'Please enter your experience' }]}
                        >
                            <InputNumber
                                min={0}
                                max={50}
                                placeholder="Years of Experience"
                                className="w-full"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="Hospital Affiliations"
                            name="hospitalAffiliations"
                            rules={[{ required: true, message: 'Please enter your hospital affiliations' }]}
                        >
                            <TextArea 
                                rows={2} 
                                placeholder="List hospitals/clinics where you currently practice"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            label="Professional Bio"
                            name="professionalBio"
                            rules={[{ required: true, message: 'Please provide your professional bio' }]}
                        >
                            <TextArea 
                                rows={4} 
                                placeholder="Write a professional summary about your background, expertise, and approach to patient care"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="Address"
                            name="address"
                            rules={[{ required: true, message: 'Please enter your address' }]}
                        >
                            <TextArea 
                                rows={3} 
                                placeholder="Your professional clinic address"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6} xs={24} sm={12} lg={6}>
                        <Form.Item
                            label="Fee Per Visit"
                            name="feePerConsultation"
                            rules={[{ required: true, message: 'Please enter your fee per consultation' }]}
                        >
                            <InputNumber 
                                min={0} 
                                placeholder="Fee Per Visit"
                                addonBefore="₹"
                                className="w-full" 
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6} xs={24} sm={12} lg={6}>
                        <Form.Item
                            label="Consultation Hours"
                            required
                        >
                            <Row gutter={8}>
                                <Col span={12}>
                                    <Form.Item
                                        name={['timing', 0]}
                                        noStyle
                                        rules={[{ required: true, message: 'Start time required' }]}
                                    >
                                        <TimePicker
                                            format="h:mm A"
                                            placeholder="Start Time"
                                            className="w-full"
                                            minuteStep={15}
                                            use12Hours
                                            changeOnBlur
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name={['timing', 1]}
                                        noStyle
                                        rules={[{ required: true, message: 'End time required' }]}
                                    >
                                        <TimePicker
                                            format="h:mm A"
                                            placeholder="End Time"
                                            className="w-full"
                                            minuteStep={15}
                                            use12Hours
                                            changeOnBlur
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card className="mb-6 shadow-sm">
                <div className="section-header flex items-center justify-between mb-2 pb-2 border-b">
                    <div className="flex items-center">
                        <BankOutlined className="mr-2 text-blue-500 text-lg" />
                        <Title level={4} className="m-0 text-gray-700">Location Information</Title>
                    </div>
                    <Tooltip title="Detect your current location">
                        <Button 
                            type="primary" 
                            icon={<AimOutlined />} 
                            onClick={detectLocation}
                            loading={loadingLocation}
                        >
                            Auto-detect Location
                        </Button>
                    </Tooltip>
                </div>
                
                <Alert 
                    message="Location Details"
                    description="Please provide accurate location information for your professional practice."
                    type="info"
                    showIcon
                    className="mb-4"
                />
                
                <Row gutter={16}>
                    <Col span={24} xs={24} sm={24} md={8}>
                        <Form.Item
                            label="Country"
                            name="country"
                            initialValue="India"
                            rules={[{ required: true, message: 'Please select your country' }]}
                        >
                            <Select
                                disabled={true}
                                placeholder="Select a country"
                            >
                                <Option key="india" value="India">India</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={24} xs={24} sm={24} md={8}>
                        <Form.Item
                            label="State/Province"
                            name="state"
                            rules={[{ required: true, message: 'Please select your state' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Select a state"
                                optionFilterProp="children"
                                onChange={(value) => {
                                    handleStateChange(value);
                                    setShowCustomCityInput(false);
                                }}
                                loading={states.length === 0}
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {states.length > 0 ? (
                                    states.map(state => (
                                        <Option key={state} value={state}>{state}</Option>
                                    ))
                                ) : (
                                    <Option value="" disabled>Loading states...</Option>
                                )}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={24} xs={24} sm={24} md={8}>
                        <Form.Item
                            label="City"
                            name="city"
                            rules={[{ required: true, message: 'Please enter your city' }]}
                        >
                            {!showCustomCityInput && cities.length > 0 ? (
                                <Select
                                    showSearch
                                    placeholder="Select your city"
                                    optionFilterProp="children"
                                    onChange={handleCityChange}
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                    }
                                >
                                    {cities.map(city => (
                                        <Option key={city} value={city}>{city}</Option>
                                    ))}
                                    {!cities.includes('-- Please enter your city manually --') && (
                                        <Option key="other" value="other">Other (not in list)</Option>
                                    )}
                                </Select>
                            ) : (
                                <Input 
                                    placeholder="Enter your city" 
                                    prefix={<EnvironmentOutlined />} 
                                    suffix={cities.length > 0 ? (
                                        <Button 
                                            type="link" 
                                            size="small" 
                                            onClick={() => setShowCustomCityInput(false)}
                                        >
                                            Use list
                                        </Button>
                                    ) : null}
                                />
                            )}
                        </Form.Item>
                    </Col>
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="Zip Code"
                            name="zipCode"
                            rules={[
                                { 
                                    required: true, 
                                    message: 'Please enter your zip code' 
                                },
                                {
                                    pattern: /^\d{5,6}$/,
                                    message: 'Zip code must be 5-6 digits'
                                }
                            ]}
                        >
                            <Input placeholder="ZIP Code" maxLength={6} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <div className="form-actions mt-5 mb-3 flex justify-end">
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    disabled={isSubmitDisabled}
                    className="px-8"
                >
                    {user?.isDoctor ? "Update Application" : "Submit Application"}
                </Button>
            </div>
        </Form>
    );
};

export default DoctorForm;
