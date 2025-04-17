import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useDispatch, useSelector } from 'react-redux';
import { Form, message } from 'antd';
import { hideLoading, showLoading } from '../redux/loader';
import Swal from 'sweetalert2';
import axios from 'axios';
import DoctorForm from '../components/DoctorForm';

const ApplyDoctor = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.user);
    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (values) => {
        try {
            setIsSubmitting(true);
            dispatch(showLoading());
            
            console.log("Processing form values:", values);
            
            // Create FormData object
            const formData = new FormData();
            
            // Add user ID to formData
            formData.append('userId', user._id);
            
            // Add all form fields to formData
            Object.keys(values).forEach(key => {
                // Skip image field - it will be handled separately
                if (key === 'image') return;
                
                // Handle array values like timing and specialization
                if (Array.isArray(values[key])) {
                    formData.append(key, JSON.stringify(values[key]));
                } else {
                    formData.append(key, values[key]);
                }
            });
            
            // Handle "Other" degree option
            const medicalDegree = form.getFieldValue('medicalDegree');
            if (medicalDegree === 'Other') {
                const otherDegree = form.getFieldValue('otherMedicalDegree');
                if (otherDegree) {
                    formData.set('medicalDegree', otherDegree);
                }
            }
            
            // Handle "Other" specialization option
            const specializations = form.getFieldValue('specialization');
            if (specializations && specializations.includes('Other')) {
                const otherSpecialization = form.getFieldValue('otherSpecialization');
                if (otherSpecialization) {
                    // Remove "Other" from the array
                    const filteredSpecializations = specializations.filter(s => s !== 'Other');
                    // Add the custom specialization
                    filteredSpecializations.push(otherSpecialization);
                    // Update the formData
                    formData.set('specialization', JSON.stringify(filteredSpecializations));
                }
            }
            
            // Create a blob from the image URL (if it's a URL) and append it as a file
            if (values.image) {
                // Make sure we only use Cloudinary URLs and not base64 data
                if (values.image.startsWith('data:')) {
                    message.error('Please wait for image to finish uploading to Cloudinary');
                    dispatch(hideLoading());
                    setIsSubmitting(false);
                    return;
                } else if (typeof values.image === 'string') {
                    // It's a Cloudinary URL, pass it along
                    formData.append('imageUrl', values.image);
                    console.log("Using Cloudinary URL:", values.image);
                }
            } else {
                message.error('Please upload your profile image');
                dispatch(hideLoading());
                setIsSubmitting(false);
                return;
            }
            
            // Debug log to check the formData contents
            console.log("Form data entries before submission:");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value instanceof File ? value.name : value}`);
            }
            
            const response = await axios.post(
                'http://localhost:4000/api/user/apply-doctor',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );

            dispatch(hideLoading());
            setIsSubmitting(false);

            if (response.data.success) {
                console.log("Application submitted successfully:", response.data);
                Swal.fire({
                    title: response.data.message,
                    text: 'Your application has been submitted successfully.',
                    icon: 'success',
                });
                form.resetFields();
            } else {
                console.error("Application failed:", response.data);
                Swal.fire({
                    icon: 'error',
                    title: 'Application Failed',
                    text: response.data.message || 'Failed to submit doctor application.',
                });
            }
        } catch (error) {
            dispatch(hideLoading());
            setIsSubmitting(false);
            console.error('Error during application submission:', error);
            console.error('Error response:', error.response?.data);
            Swal.fire({
                icon: 'error',
                title: 'Something Went Wrong',
                text: error.response?.data?.message || 'Failed to submit application.',
            });
        }
    };

    return (
        <Layout>
            <div className="apply-doctor p-3">
                <div className="apply-doctor-header">
                    <h1 className="text-4xl font-bold text-slate-600 mb-6">Apply as Doctor</h1>
                    <p className="text-md text-slate-500 mb-6">
                        Fill out the comprehensive form below to apply for a doctor position at our professional clinic. 
                        Please ensure all information is accurate and complete.
                    </p>
                </div>
                <div className="apply-doctor-form bg-white p-6 rounded-lg shadow-md">
                    <DoctorForm 
                        handleSubmit={handleSubmit} 
                        form={form} 
                        isSubmitDisabled={isSubmitting}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default ApplyDoctor;
