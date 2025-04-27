import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spin } from 'antd';
import { api } from '../utils/apiUtils';
import API_ENDPOINTS from '../services/apiConfig';
import toast from 'react-hot-toast';

const RazorpayCheckout = ({ 
    appointmentId, 
    amount, 
    doctorName, 
    onSuccess, 
    onFailure, 
    buttonText = "Pay Now", 
    userObject = null 
}) => {
    const [loading, setLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);

    // Check if we have a valid appointment ID
    useEffect(() => {
        if (!appointmentId) {
            console.warn('RazorpayCheckout: No appointmentId provided');
            setDisabled(true);
        } else {
            setDisabled(false);
        }
    }, [appointmentId]);

    // Function to load the Razorpay script
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            // First check if the script is already loaded
            if (window.Razorpay) {
                console.log('Razorpay script already loaded');
                resolve(true);
                return;
            }

            // Check for an existing script tag to avoid duplicates
            const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
            if (existingScript) {
                console.log('Razorpay script tag already exists, waiting for it to load');
                existingScript.onload = () => resolve(true);
                existingScript.onerror = () => {
                    console.error('Existing Razorpay script failed to load');
                    resolve(false);
                };
                return;
            }

            // Create and add the script tag
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('Razorpay script loaded successfully');
                resolve(true);
            };
            
            script.onerror = () => {
                // Try one more time with a different approach
                const retryScript = document.createElement('script');
                retryScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
                retryScript.async = true;
                retryScript.crossOrigin = 'anonymous';
                
                retryScript.onload = () => {
                    console.log('Razorpay script loaded successfully on retry');
                    resolve(true);
                };
                
                retryScript.onerror = () => {
                    console.error('Razorpay SDK failed to load even after retry');
                    resolve(false);
                };
                
                // Add to head instead of body for retry
                document.head.appendChild(retryScript);
            };
            
            document.body.appendChild(script);
        });
    };
    
    // Function to create a Razorpay order
    const createOrder = async () => {
        try {
            setLoading(true);
            // Get current user ID from localStorage or from props
            const token = localStorage.getItem('token');
            
            // Try to get user from props first, then fallback to localStorage if needed
            let user = userObject;
            
            if (!user) {
                // Try different ways to get the user from localStorage
                try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        user = JSON.parse(userStr);
                    }
                } catch (err) {
                    console.error('Error parsing user from localStorage:', err);
                }
                
                // If user is not found in 'user', check other possible keys
                if (!user || !user._id) {
                    const possibleKeys = ['userData', 'userInfo', 'currentUser'];
                    for (const key of possibleKeys) {
                        try {
                            const dataStr = localStorage.getItem(key);
                            if (dataStr) {
                                const data = JSON.parse(dataStr);
                                if (data && (data._id || data.id)) {
                                    user = data;
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error(`Error checking ${key} in localStorage:`, err);
                        }
                    }
                }
            }
            
            // Debug logs
            console.log('Token found:', !!token);
            console.log('User found:', !!user);
            console.log('User ID:', user ? (user._id || user.id) : 'Not found');
            console.log('User object:', user);
            
            if (!token || !user || (!user._id && !user.id)) {
                toast.error('You must be logged in to make a payment');
                setLoading(false);
                return;
            }
            
            if (!appointmentId) {
                toast.error('No appointment ID provided');
                setLoading(false);
                return;
            }
            
            const userId = user._id || user.id;
            
            console.log('Creating order with payload:', {
                appointmentId,
                amount,
                userId
            });
            
            try {
                const response = await api.post(API_ENDPOINTS.PAYMENT.CREATE_ORDER, {
                    appointmentId,
                    amount,
                    userId
                });
                
                console.log('Order creation response:', response.data);
                
                if (!response.data.success) {
                    toast.error(response.data.message || 'Failed to create payment order');
                    return null;
                }
                
                return response.data.data;
            } catch (apiError) {
                console.error('API Error creating Razorpay order:', apiError);
                
                // Handle specific error codes
                if (apiError.response) {
                    const statusCode = apiError.response.status;
                    const errorData = apiError.response.data;
                    
                    console.error('API Error status:', statusCode);
                    console.error('API Error data:', errorData);
                    
                    if (statusCode === 401) {
                        toast.error('Authentication failed. Please log in again.');
                    } else if (statusCode === 404) {
                        toast.error('The appointment information could not be found.');
                    } else if (statusCode === 400) {
                        toast.error(errorData.message || 'Invalid request. Please check appointment details.');
                    } else {
                        toast.error(errorData.message || 'Error communicating with payment service');
                    }
                } else if (apiError.request) {
                    console.error('No response received:', apiError.request);
                    toast.error('No response from server. Please check your connection.');
                } else {
                    toast.error('Error setting up payment. Please try again later.');
                }
                
                return null;
            }
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            toast.error('Failed to create payment order. Please try again.');
            setLoading(false);
            return null;
        }
    };
    
    // Function to verify payment
    const verifyPayment = async (paymentData) => {
        try {
            const response = await api.post(API_ENDPOINTS.PAYMENT.VERIFY_PAYMENT, paymentData);
            return response.data;
        } catch (error) {
            console.error('Error verifying payment:', error);
            return { success: false, message: 'Payment verification failed' };
        }
    };
    
    // Main function to handle the payment process
    const handlePayment = async () => {
        
        try {
            setLoading(true);
            
            // 1. Load the Razorpay script if not already loaded
            const isScriptLoaded = await loadRazorpayScript();
            if (!isScriptLoaded) {
                toast.error('Failed to load payment gateway. Please check your internet connection and try again.');
                
                // Show error container if it exists
                const errorContainer = document.getElementById('razorpay-error-container');
                const paymentContainer = document.getElementById('razorpay-payment-container');
                
                if (errorContainer && paymentContainer) {
                    errorContainer.classList.remove('hidden');
                    paymentContainer.classList.add('hidden');
                }
                
                setLoading(false);
                if (onFailure) onFailure();
                return;
            }
            
            // Verify Razorpay is available
            if (!window.Razorpay) {
                toast.error('Payment gateway not initialized correctly. Please refresh the page and try again.');
                
                // Show error container if it exists
                const errorContainer = document.getElementById('razorpay-error-container');
                const paymentContainer = document.getElementById('razorpay-payment-container');
                
                if (errorContainer && paymentContainer) {
                    errorContainer.classList.remove('hidden');
                    paymentContainer.classList.add('hidden');
                }
                
                setLoading(false);
                if (onFailure) onFailure();
                return;
            }
            
            // 2. Create a new order
            console.log('Creating Razorpay order...');
            const orderData = await createOrder();
            if (!orderData) {
                setLoading(false);
                if (onFailure) onFailure();
                return;
            }
            console.log('Order created successfully:', orderData);
            
            // 3. Get user info
            let user = userObject;
            
            if (!user) {
                try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        user = JSON.parse(userStr);
                    }
                } catch (err) {
                    console.error('Error parsing user from localStorage:', err);
                }
                
                // If user is not found in 'user', check other possible keys
                if (!user) {
                    const possibleKeys = ['userData', 'userInfo', 'currentUser'];
                    for (const key of possibleKeys) {
                        try {
                            const dataStr = localStorage.getItem(key);
                            if (dataStr) {
                                const data = JSON.parse(dataStr);
                                if (data) {
                                    user = data;
                                    break;
                                }
                            }
                        } catch (err) {
                            console.error(`Error checking ${key} in localStorage:`, err);
                        }
                    }
                }
            }
            
            if (!user) {
                user = { name: '', email: '', phone: '' };
            }
            
            console.log('User for payment prefill:', user);
            
            // 4. Configure Razorpay options
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Developer Clinic',
                description: `Consultation with ${doctorName}`,
                order_id: orderData.orderId,
                handler: async (response) => {
                    // 5. Verify the payment
                    const verificationData = {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    };
                    
                    const verificationResult = await verifyPayment(verificationData);
                    
                    if (verificationResult.success) {
                        toast.success('Payment successful!');
                        if (onSuccess) onSuccess(verificationResult.data);
                    } else {
                        toast.error('Payment verification failed. Please contact support.');
                        if (onFailure) onFailure();
                    }
                    
                    setLoading(false);
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.phone || ''
                },
                notes: {
                    address: 'Developer Clinic',
                    appointmentId: appointmentId
                },
                theme: {
                    color: '#383838'
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                        if (onFailure) onFailure();
                    }
                }
            };
            
            // 5. Open Razorpay checkout
            const razorpay = new window.Razorpay(options);
            razorpay.open();
            
        } catch (error) {
            console.error('Error during payment process:', error);
            toast.error('Payment process failed. Please try again later.');
            setLoading(false);
            if (onFailure) onFailure();
        }
    };
    
    return (
        <Button 
            type="primary"
            className="bg-blue-600 hover:bg-blue-700 w-full py-1.5 sm:py-2 rounded-lg shadow-md text-sm sm:text-base"
            size="large"
            onClick={handlePayment}
            disabled={loading || disabled}
        >
            {loading ? <Spin size="small" color="#383838" /> : buttonText}
        </Button>
    );
};

RazorpayCheckout.propTypes = {
    appointmentId: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired, 
    doctorName: PropTypes.string.isRequired,
    onSuccess: PropTypes.func,
    onFailure: PropTypes.func,
    buttonText: PropTypes.string,
    userObject: PropTypes.object
};

export default RazorpayCheckout; 