import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaCheck, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import { apiFetch } from '../utils/apiUtils';

function ResetPassword() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();
    const location = useLocation();
    
    const [values, setValues] = useState({
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);
    const [animate, setAnimate] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        message: 'Too weak',
        color: 'text-red-500'
    });

    // Get email from query params
    const email = new URLSearchParams(location.search).get('email') || '';

    useEffect(() => {
        setAnimate(true);
        
        // Validate token on component mount
        const validateToken = async () => {
            dispatch(showLoading());
            try {
                const response = await apiFetch(`user/verify-reset-token/${token}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                const data = await response.json();
                if (!data.success) {
                    setTokenValid(false);
                    toast.error('Invalid or expired reset link');
                }
            } catch (error) {
                setTokenValid(false);
                toast.error('Something went wrong. Please try requesting a new reset link.');
            } finally {
                dispatch(hideLoading());
            }
        };
        
        if (token) {
            validateToken();
        } else {
            setTokenValid(false);
        }
    }, [token, dispatch]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setValues({
            ...values,
            [id]: value,
        });
        
        if (id === 'password') {
            checkPasswordStrength(value);
        }
    };

    const checkPasswordStrength = (password) => {
        // Simple password strength checker
        const hasLowerCase = /[a-z]/.test(password);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        const isLongEnough = password.length >= 8;
        
        const strength = [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar, isLongEnough].filter(Boolean).length;
        
        let result = {
            score: 0,
            message: 'Too weak',
            color: 'text-red-500'
        };
        
        if (password.length === 0) {
            result = {
                score: 0,
                message: 'Enter password',
                color: 'text-gray-400'
            };
        } else if (strength <= 1) {
            result = {
                score: 1,
                message: 'Too weak',
                color: 'text-red-500'
            };
        } else if (strength === 2) {
            result = {
                score: 2,
                message: 'Could be stronger',
                color: 'text-orange-500'
            };
        } else if (strength === 3) {
            result = {
                score: 3,
                message: 'Good password',
                color: 'text-yellow-500'
            };
        } else if (strength === 4) {
            result = {
                score: 4,
                message: 'Strong password',
                color: 'text-green-500'
            };
        } else {
            result = {
                score: 5,
                message: 'Very strong',
                color: 'text-emerald-500'
            };
        }
        
        setPasswordStrength(result);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate password
        if (values.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        // Check if passwords match
        if (values.password !== values.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsResetting(true);
        dispatch(showLoading());

        try {
            const response = await apiFetch(`user/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password: values.password,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResetSuccess(true);
                toast.success('Password reset successfully');
            } else {
                toast.error(data.message || 'Failed to reset password');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsResetting(false);
            dispatch(hideLoading());
        }
    };

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl bg-white transition-all duration-500 transform ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <FaExclamationTriangle className="text-red-600 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Reset Link</h2>
                        <p className="text-gray-600 mb-6">
                            This password reset link is invalid or has expired. Please request a new password reset link.
                        </p>
                        <div className="flex flex-col space-y-3">
                            <Link to="/forgot-password" className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg flex items-center justify-center">
                                Request New Reset Link
                            </Link>
                            <Link to="/login" className="py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center">
                                <FaArrowLeft className="mr-2" />
                                Return to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (resetSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl bg-white transition-all duration-700 transform ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <FaCheck className="text-green-600 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful</h2>
                        <p className="text-gray-600 mb-8">
                            Your password has been reset successfully. You can now log in with your new password.
                        </p>
                        <div className="flex flex-col space-y-4">
                            <div className="p-4 rounded-lg bg-blue-50 text-blue-800 text-sm mb-4">
                                <p className="flex items-center">
                                    <FaShieldAlt className="mr-2 text-blue-600" />
                                    <span className="font-semibold">Security tip:</span>
                                </p>
                                <p className="mt-1">Make sure to use a unique password that you don't use on other websites.</p>
                            </div>
                            <Link to="/login" className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl inline-block transition-all duration-200 hover:shadow-lg hover:from-blue-700 hover:to-indigo-800">
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className={`w-full max-w-5xl flex rounded-3xl shadow-2xl overflow-hidden bg-white transition-all duration-700 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* Left Side - Image and Security Tips */}
                <div className="hidden md:block md:w-1/2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-800 to-blue-600 opacity-90"></div>
                    <img 
                        src="https://img.freepik.com/free-photo/hand-touching-security-technology-icon-concept-about-password-login-private-information_53876-129967.jpg" 
                        alt="Password Security" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
                        <div className={`transition-all duration-1000 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div className="w-20 h-20 mx-auto rounded-full bg-white bg-opacity-20 flex items-center justify-center mb-6 backdrop-filter backdrop-blur-sm">
                                <FaShieldAlt className="text-white text-3xl" />
                            </div>
                            <h2 className="text-3xl font-bold mb-6 text-center">Create a Strong Password</h2>
                            <p className="text-lg mb-8 text-blue-100 text-center">A strong password is your first line of defense against unauthorized access</p>
                            
                            <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-filter backdrop-blur-sm">
                                <h4 className="text-xl font-semibold text-white mb-4">Password Security Tips</h4>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <span className="font-bold">1</span>
                                        </div>
                                        <p className="text-sm text-blue-100">Use at least 8 characters with uppercase letters, numbers, and symbols</p>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <span className="font-bold">2</span>
                                        </div>
                                        <p className="text-sm text-blue-100">Avoid using common words, phrases, or personal information</p>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <span className="font-bold">3</span>
                                        </div>
                                        <p className="text-sm text-blue-100">Use a different password for each of your accounts</p>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <span className="font-bold">4</span>
                                        </div>
                                        <p className="text-sm text-blue-100">Consider using a password manager to generate and store secure passwords</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className={`text-center mb-8 transition-all duration-700 delay-150 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
                        <p className="text-gray-600">Create a new password for your DevClinic account</p>
                        {email && (
                            <div className="mt-3 bg-blue-50 py-2 px-4 rounded-lg inline-block">
                                <p className="text-blue-800 text-sm font-medium">{email}</p>
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className={`transition-all duration-700 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">New Password</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                    <FaLock />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Enter new password"
                                    value={values.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 text-gray-700 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                                <button 
                                    type="button" 
                                    onClick={togglePasswordVisibility} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            
                            {/* Password strength meter */}
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">Password strength:</span>
                                    <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.message}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${
                                            passwordStrength.score === 0 ? 'bg-gray-300' : 
                                            passwordStrength.score === 1 ? 'bg-red-500' :
                                            passwordStrength.score === 2 ? 'bg-orange-500' :
                                            passwordStrength.score === 3 ? 'bg-yellow-500' :
                                            passwordStrength.score === 4 ? 'bg-green-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${passwordStrength.score * 20}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 ml-1">Password must be at least 6 characters long</p>
                            </div>
                        </div>
                        
                        <div className={`transition-all duration-700 delay-450 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 block mb-2">Confirm Password</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                    <FaLock />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    placeholder="Confirm new password"
                                    value={values.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 text-gray-700 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                                <button 
                                    type="button" 
                                    onClick={toggleConfirmPasswordVisibility} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {values.password && values.confirmPassword && values.password !== values.confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 ml-1">Passwords do not match</p>
                            )}
                        </div>
                        
                        <div className={`pt-3 transition-all duration-700 delay-600 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <button
                                type="submit"
                                disabled={isResetting}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isResetting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resetting Password...
                                    </>
                                ) : 'Reset Password'}
                            </button>
                        </div>
                        
                        <div className={`text-center mt-6 transition-all duration-700 delay-750 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <Link to="/login" className="flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200">
                                <FaArrowLeft className="mr-2" />
                                Return to Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword; 