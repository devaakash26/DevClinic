import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';

function ForgotPassword() {
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        dispatch(showLoading());

        try {
            const response = await fetch('http://localhost:4000/api/user/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                setEmailSent(true);
                toast.success('Password reset instructions sent to your email');
            } else {
                toast.error(data.message || 'Failed to send reset email');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
            dispatch(hideLoading());
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-lg bg-white transition-all duration-500 transform ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Check Your Email</h2>
                        <p className="text-gray-600 mb-6">
                            We've sent a password reset link to <span className="font-semibold">{email}</span>
                        </p>
                        <div className="bg-blue-50 p-5 rounded-lg text-left mb-6 border-l-4 border-blue-500">
                            <h3 className="font-semibold text-blue-800 mb-2">What to do next:</h3>
                            <ul className="text-blue-700 text-sm space-y-2 pl-5 list-disc">
                                <li>Check your email inbox for the reset link</li>
                                <li>Check your spam folder if you don't see it</li>
                                <li>Click the link in the email to reset your password</li>
                                <li>The link will expire in 10 minutes for security</li>
                            </ul>
                        </div>
                        <div className="flex flex-col space-y-3">
                            <Link to="/login" className="py-3 px-4 bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 hover:bg-blue-700 hover:shadow-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Return to Login
                            </Link>
                            <button 
                                onClick={() => setEmailSent(false)} 
                                className="py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
                            >
                                Try a different email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className={`w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="p-8">
                    <div className={`text-center mb-8 transition-all duration-500 delay-150 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Forgot Your Password?</h2>
                        <p className="text-gray-600">No worries! Enter your email and we'll send you a reset link.</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className={`transition-all duration-500 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">We'll send a password reset link to this email</p>
                        </div>
                        
                        <div className={`pt-3 transition-all duration-500 delay-400 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending Reset Link...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>
                        
                        <div className={`text-center mt-6 transition-all duration-500 delay-500 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Login
                            </Link>
                        </div>
                    </form>
                    
                    <div className={`mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 transition-all duration-500 delay-600 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        Need help? Contact 
                        <a href="mailto:support@devclinic.com" className="text-blue-600 hover:underline ml-1">
                            support@devclinic.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword; 