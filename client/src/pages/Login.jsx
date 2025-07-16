import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { FaEnvelope, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import { getApiUrl } from '../services/apiService';

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [values, setValues] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        // Load Google Sign-In API
        const loadGoogleScript = () => {
            // Check if the script is already loaded
            if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return;

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleSignIn;
            document.body.appendChild(script);
        };

        loadGoogleScript();
    }, []);

    const initializeGoogleSignIn = () => {
        // Check if Google API is loaded
        if (!window.google) {
            console.error('Google API not loaded yet');
            return;
        }

        // Get client ID from environment variables
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
            console.error('Google Client ID not found in environment variables');
            toast.error('Google Sign-In configuration error. Please contact support.');
            return;
        }

        console.log('Initializing Google Sign-In with client ID:', clientId);

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true,
        });

        // Render the button immediately after initialization
        window.google.accounts.id.renderButton(
            document.getElementById('googleOneTap'),
            {
                theme: 'outline',
                size: 'large',
                width: '100%',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
            }
        );
    };

    const handleGoogleSignIn = async (response) => {
        try {
            setIsGoogleLoading(true);
            dispatch(showLoading());

            console.log('Google Sign-In response received:', response);

            if (!response || !response.credential) {
                toast.error('Invalid Google sign-in response');
                setIsGoogleLoading(false);
                dispatch(hideLoading());
                return;
            }

            const googleSignInUrl = getApiUrl('user/google-signin');

            console.log('Sending token to server at:', googleSignInUrl);

            // Send the ID token to your backend
            const serverResponse = await fetch(googleSignInUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                },
                credentials: 'include',
                body: JSON.stringify({ token: response.credential }),
            });

            if (!serverResponse.ok) {
                const errorData = await serverResponse.json().catch(() => ({}));
                console.error('Server error:', {
                    status: serverResponse.status,
                    statusText: serverResponse.statusText,
                    data: errorData
                });
                throw new Error(errorData.message || 'Failed to sign in with Google');
            }

            const data = await serverResponse.json();
            console.log('Server response:', data);

            if (data.success) {
                toast.success('Signed in with Google successfully!');
                localStorage.setItem("token", data.data);
                navigate('/');
            } else {
                toast.error(data.message || 'Google sign-in failed');
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            toast.error(error.message || 'Something went wrong with Google sign-in. Please try again.');
        } finally {
            setIsGoogleLoading(false);
            dispatch(hideLoading());
        }
    };

    const startGoogleSignIn = () => {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            console.error('Google Sign-In API not loaded yet');
            toast.error('Google Sign-In is not available. Please try again later.');
            setIsGoogleLoading(false);
            // Try to reload the script
            const loadGoogleScript = () => {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = initializeGoogleSignIn;
                document.body.appendChild(script);
            };
            loadGoogleScript();
            return;
        }

        // Just prompt directly - don't try to render again
        try {
            console.log('Prompting Google Sign-In');

            // Explicitly prompt the sign-in flow
            window.google.accounts.id.prompt((notification) => {
                console.log('Google prompt notification:', notification);
                if (notification.isNotDisplayed()) {
                    console.log('Google prompt not displayed. Reason:', notification.getNotDisplayedReason());
                    setIsGoogleLoading(false);
                } else if (notification.isSkippedMoment()) {
                    console.log('Google prompt skipped. Reason:', notification.getSkippedReason());
                    setIsGoogleLoading(false);
                } else if (notification.isDismissedMoment()) {
                    console.log('Google prompt dismissed. Reason:', notification.getDismissedReason());
                    setIsGoogleLoading(false);
                }
            });
        } catch (error) {
            console.error('Google Sign-In error:', error);
            toast.error('Failed to start Google Sign-In. Please try again.');
            setIsGoogleLoading(false);
        }
    };

    const handleChange = (e) => {
        setValues({
            ...values,
            [e.target.id]: e.target.value,
        });
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const onLogin = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!values.email || !values.password) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsLoggingIn(true);
            dispatch(showLoading());

            const response = await fetch(getApiUrl('user/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (data.success) {
                setValues({
                    email: '',
                    password: '',
                });

                toast.success(data.message);
                localStorage.setItem("token", data.data);
                navigate('/');
            } else {
                // Special handling for unverified email
                if (data.emailNotVerified) {
                    toast.error(data.message);
                    // Store the email to pre-fill in case they need to request a new verification link
                    localStorage.setItem("pendingVerificationEmail", values.email);
                    // Redirect to a page where they can request a new verification link if needed
                    navigate('/verify-email-notice');
                } else {
                    // Regular error message
                    toast.error(data.message);
                }
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsLoggingIn(false);
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
                <div className={`w-full max-w-5xl flex rounded-3xl shadow-2xl overflow-hidden bg-white transition-all duration-700 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    {/* Left Side - Image */}
                    <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 opacity-90"></div>
                        <img
                            src="https://img.freepik.com/free-photo/medical-workers-covid-19-vaccination-concept-confident-professional-doctor-female-nurse-blue-scrubs-stethoscope-show-thumbs-up-assure-guarantee-quality-service-clinic_1258-57426.jpg"
                            alt="Healthcare professionals"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
                            <div className={`transition-all duration-1000 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <h2 className="text-3xl font-bold mb-6">Welcome to DevClinic</h2>
                                <p className="text-lg mb-8 text-blue-100">Access quality healthcare services from the comfort of your home</p>

                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-white">Book appointments with top doctors</p>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-white">Get 24/7 online consultations</p>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-white">Access your medical records anytime</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="w-full lg:w-1/2 p-8 md:p-12">
                        <div className={`text-center mb-10 transition-all duration-700 delay-150 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
                            <p className="text-gray-600">Sign in to your DevClinic account</p>
                        </div>

                        {/* Add container for Google Sign-In Button */}
                        <div className={`mb-6 transition-all duration-700 delay-200 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            {/* Google Sign-In button will be rendered here by Google's SDK */}
                            <div id="googleOneTap" className="w-full"></div>
                        </div>

                        {/* Divider */}
                        <div className={`flex items-center my-6 transition-all duration-700 delay-250 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div className="flex-grow border-t border-gray-300"></div>
                            <span className="flex-shrink mx-4 text-gray-500 text-sm">or continue with email</span>
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div>

                        <form onSubmit={onLogin} className="space-y-6">
                            <div className={`transition-all duration-700 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                        <FaEnvelope />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="Enter your email"
                                        value={values.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-700 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={`transition-all duration-700 delay-450 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">Password</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                        <FaLock />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        placeholder="Enter your password"
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
                            </div>

                            <div className={`flex items-center justify-between transition-all duration-700 delay-600 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                        Remember me
                                    </label>
                                </div>
                                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200">
                                    Forgot password?
                                </Link>
                            </div>

                            <div className={`transition-all duration-700 delay-750 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <button
                                    type="submit"
                                    disabled={isLoggingIn}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            <FaSignInAlt className="mr-2" />
                                            Sign in
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className={`text-center mt-8 transition-all duration-700 delay-900 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200">
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        </form>

                        <div className={`mt-10 pt-6 border-t border-gray-200 text-center transition-all duration-700 delay-1000 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <p className="text-xs text-gray-500">
                                By signing in, you agree to our{' '}
                                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                                and{' '}
                                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
