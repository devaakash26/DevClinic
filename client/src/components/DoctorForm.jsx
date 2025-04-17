import { Col, Input, Form, Row, TimePicker, Button, Upload, message, InputNumber, Typography, Card, Select, Divider, Alert, notification, Tooltip } from 'antd';
import { UploadOutlined, PlusOutlined, UserOutlined, BankOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, FileDoneOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import './DoctorForm.css';
import axios from 'axios';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Add a list of Indian states
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

const DoctorForm = ({ handleSubmit, form, isSubmitDisabled, onValuesChange, initialValues }) => {
     const { user } = useSelector((state) => state.user);
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [otherDegree, setOtherDegree] = useState(false);
    const [otherSpecialization, setOtherSpecialization] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    
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
    const detectLocation = () => {
        if (navigator.geolocation) {
            setLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        // Use OpenCage Geocoding API with key from environment variables
                        const apiKey = process.env.REACT_APP_OPENCAGE_API_KEY;
                        
                        if (!apiKey) {
                            console.error('OpenCage API key is missing in environment variables');
                            message.error('Location service configuration is missing');
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
                            const zipCode = locationData.postcode || '';
                            
                            // Update form with detected location
                            form.setFieldsValue({
                                city,
                                state,
                                zipCode,
                                coordinates: { lat: latitude, lng: longitude }
                            });
                            
                            // Also update the address field with a formatted address
                            const formattedAddress = response.data.results[0].formatted || '';
                            if (formattedAddress && !form.getFieldValue('address')) {
                                form.setFieldsValue({ address: formattedAddress });
                            }
                            
                            message.success('Location detected successfully');
                        } else {
                            message.error('Could not determine your location details');
                        }
                    } catch (error) {
                        console.error('Error fetching location details:', error);
                        message.error('Failed to get location details');
                    } finally {
                        setLoadingLocation(false);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    message.error('Unable to access your location. Please ensure location access is enabled.');
                    setLoadingLocation(false);
                }
            );
        } else {
            message.error('Geolocation is not supported by your browser');
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

    // Custom upload request to handle the file upload to Cloudinary
    const customUploadRequest = async ({ file, onSuccess, onError }) => {
        // First compress the image before uploading
        try {
            setUploading(true);
            const compressedFile = await compressImage(file);
            
            const formData = new FormData();
            formData.append('doctorImage', compressedFile);
            formData.append('userId', initialValues?.userId || '');
            
            message.loading('Uploading image...', 0);
            
            const response = await axios.post(
                'http://localhost:4000/api/doctor/upload-doctor-image',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            
            message.destroy(); // Remove loading message
            setUploading(false);
            
            if (response.data.success) {
                onSuccess(response.data, file);
                // Update the image URL from the response - this will be a Cloudinary URL
                const imageUrl = response.data.data.url;
                console.log('Cloudinary URL received:', imageUrl);
                setImageUrl(imageUrl);
                form.setFieldsValue({ image: imageUrl });
                message.success('Image uploaded successfully');
            } else {
                onError(new Error(response.data.message || 'Upload failed'));
                message.error(response.data.message || 'Failed to upload image');
            }
        } catch (error) {
            message.destroy(); // Remove loading message
            setUploading(false);
            console.error('Error uploading image:', error);
            onError(error);
            message.error('Something went wrong during upload');
        }
    };

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
        if (!imageUrl.includes("cloudinary")) {
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
        handleSubmit(finalValues);
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
                                >
                                    {imageUrl ? (
                                        <img 
                                            src={imageUrl} 
                                            alt="profile" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center">
                                            <UploadOutlined className="text-2xl text-blue-500 mb-1" />
                                            <div className="text-sm text-gray-600">
                                                {uploading ? 'Uploading...' : 'Upload'}
                                            </div>
                                        </div>
                                    )}
                                </Upload>
                                <Text type="secondary" className="text-xs block mt-2">
                                    {uploading 
                                        ? "Uploading , please wait..." 
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
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="City"
                            name="city"
                            rules={[{ required: true, message: 'Please enter your city' }]}
                        >
                            <Input placeholder="City" prefix={<EnvironmentOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={12} xs={24} sm={12}>
                        <Form.Item
                            label="State"
                            name="state"
                            rules={[{ required: true, message: 'Please enter your state' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Select a state"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {INDIAN_STATES.map(state => (
                                    <Option key={state} value={state}>{state}</Option>
                                ))}
                            </Select>
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
                                    pattern: /^\d{6}$/,
                                    message: 'Zip code must be 6 digits'
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
