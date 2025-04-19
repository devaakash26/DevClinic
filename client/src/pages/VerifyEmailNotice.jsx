import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

function VerifyEmailNotice() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [resendSuccessful, setResendSuccessful] = useState(false);

    useEffect(() => {
        // Get email from localStorage if available
        const storedEmail = localStorage.getItem('pendingVerificationEmail');
        if (storedEmail) {
            setEmail(storedEmail);
        }
    }, []);

    const resendVerificationEmail = async () => {
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        try {
            setIsSending(true);
            dispatch(showLoading());

            const response = await fetch('http://localhost:4000/api/user/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Verification email has been resent');
                setResendSuccessful(true);
            } else {
                toast.error(data.message || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
            toast.error('Something went wrong. Please try again later.');
        } finally {
            setIsSending(false);
            dispatch(hideLoading());
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-md py-4">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <Link to="/" className="text-2xl font-bold text-blue-600">DevClinic</Link>
                    <div className="flex space-x-4">
                        <Link to="/login" className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors duration-300">Login</Link>
                        <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300">Sign Up</Link>
                    </div>
                </div>
            </nav>

            <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-6">
                        {resendSuccessful ? (
                            <FaCheckCircle className="mx-auto text-green-500 text-5xl mb-4" />
                        ) : (
                            <FaExclamationTriangle className="mx-auto text-amber-500 text-5xl mb-4" />
                        )}
                        
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {resendSuccessful ? 'Verification Email Sent!' : 'Email Verification Required'}
                        </h2>
                        
                        {resendSuccessful ? (
                            <p className="text-gray-600">
                                We've sent a new verification link to <span className="font-semibold">{email}</span>.
                                Please check your inbox and click the link to verify your email address.
                            </p>
                        ) : (
                            <p className="text-gray-600">
                                Your account needs to be verified before you can log in.
                                Please check your email inbox for the verification link or request a new one below.
                            </p>
                        )}
                    </div>

                    {!resendSuccessful && (
                        <>
                            <div className="mb-6">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resendVerificationEmail}
                                disabled={isSending}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                            >
                                {isSending ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            {resendSuccessful
                                ? "Didn't receive the email? Check your spam folder or try again in a few minutes."
                                : "Already verified your email?"}
                        </p>
                        
                        <Link
                            to="/login"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VerifyEmailNotice; 