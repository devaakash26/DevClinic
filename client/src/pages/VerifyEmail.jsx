import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

function VerifyEmail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();
    
    const [verificationStatus, setVerificationStatus] = useState({
        loading: true,
        success: false,
        error: null
    });

    useEffect(() => {
        const verifyEmail = async () => {
            dispatch(showLoading());
            
            try {
                const response = await apiFetch(`user/verify-email/${token}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                const data = await response.json();
                
                if (data.success) {
                    setVerificationStatus({
                        loading: false,
                        success: true,
                        error: null
                    });
                    toast.success('Email verified successfully!');
                } else {
                    setVerificationStatus({
                        loading: false,
                        success: false,
                        error: data.message || 'Verification failed'
                    });
                    toast.error(data.message || 'Verification failed');
                }
            } catch (error) {
                setVerificationStatus({
                    loading: false,
                    success: false,
                    error: 'Something went wrong. Please try again.'
                });
                toast.error('Something went wrong. Please try again.');
            } finally {
                dispatch(hideLoading());
            }
        };
        
        if (token) {
            verifyEmail();
        } else {
            setVerificationStatus({
                loading: false,
                success: false,
                error: 'Invalid verification link'
            });
        }
    }, [token, dispatch]);

    const renderContent = () => {
        if (verificationStatus.loading) {
            return (
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
                        <FaSpinner className="text-blue-600 text-3xl animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Verifying Your Email</h2>
                    <p className="text-gray-600 mb-6">
                        Please wait while we verify your email address...
                    </p>
                </div>
            );
        }

        if (verificationStatus.success) {
            return (
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <FaCheckCircle className="text-green-600 text-4xl" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Email Verified Successfully!</h2>
                    <p className="text-gray-600 mb-8">
                        Thank you for verifying your email address. Your account is now active and you can log in to access all features.
                    </p>
                    <div className="flex justify-center">
                        <Link 
                            to="/login" 
                            className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <FaTimesCircle className="text-red-600 text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Verification Failed</h2>
                <p className="text-gray-600 mb-6">
                    {verificationStatus.error || 'There was a problem verifying your email address.'}
                </p>
                <div className="flex flex-col space-y-3">
                    <Link 
                        to="/login" 
                        className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl"
                    >
                        Go to Login
                    </Link>
                    <Link 
                        to="/register" 
                        className="py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                    >
                        Register Again
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 p-4">
            <div className="max-w-md w-full p-8 rounded-2xl shadow-xl bg-white">
                {renderContent()}
            </div>
        </div>
    );
}

export default VerifyEmail; 