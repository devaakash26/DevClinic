import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaShieldAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

function Register() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [values, setValues] = useState({
        name: '',
        email: '',
        password: '',
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
    }, []);

    const handleChange = (e) => {
        setValues({
            ...values,
            [e.target.id]: e.target.value,
        });
    };
    
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const onRegister = async (e) => {
        e.preventDefault();
        
        // Basic client-side validation
        if (!values.name || !values.email || !values.password) {
            toast.error('Please fill in all fields');
            return;
        }
        
        if (values.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }
        
        if (!isValidEmail(values.email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        
        try {
            setIsRegistering(true);
            dispatch(showLoading());

            const response = await fetch('http://localhost:4000/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            const data = await response.json();
            
            if (data.success) {
                setValues({
                    name: '',
                    email: '',
                    password: '',
                });

                toast.success('Registration successful! Please check your email to verify your account.');
                setShowVerificationMessage(true);
                
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            dispatch(hideLoading());
            setIsRegistering(false);
        }
    };
    
    // Email validation helper
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    if (showVerificationMessage) {
        return (
            
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl bg-white transition-all duration-500 transform ${animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <FaShieldAlt className="text-green-600 text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
                        <p className="text-gray-600 mb-6">
                            We've sent a verification link to <span className="font-semibold">{values.email}</span>. 
                            Please check your inbox and click the link to verify your account.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg text-left mb-6">
                            <h3 className="font-semibold text-blue-800 mb-2">What to do next:</h3>
                            <ul className="text-blue-700 text-sm space-y-2 pl-5 list-disc">
                                <li>Check your email inbox for the verification link</li>
                                <li>Check your spam folder if you don't see it</li>
                                <li>Click the link in the email to verify your account</li>
                                <li>After verification, you can log in to your account</li>
                            </ul>
                        </div>
                        <div className="flex flex-col space-y-3">
                            <Link to="/login" className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg">
                                Go to Login
                            </Link>
                            <button 
                                onClick={() => setShowVerificationMessage(false)} 
                                className="py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
                            >
                                Back to Registration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">

            <nav className="bg-white shadow-md py-4">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-blue-600">DevClinic</div>
                    <div className="flex space-x-4">
                        <Link to="/login" className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors duration-300">Login</Link>
                        <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300">Sign Up</Link>
                    </div>
                </div>
            </nav>
        <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-5xl flex rounded-3xl shadow-2xl overflow-hidden bg-white transition-all duration-700 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* Left Side - Form */}
                <div className="w-full lg:w-1/2 p-8 md:p-12">
                    <div className={`text-center mb-10 transition-all duration-700 delay-150 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
                        <p className="text-gray-600">Join our DevClinic healthcare community today</p>
                    </div>
                    
                    <form onSubmit={onRegister} className="space-y-5">
                        <div className={`transition-all duration-700 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">Full Name</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                    <FaUser />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    placeholder="Enter your full name"
                                    value={values.name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-700 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className={`transition-all duration-700 delay-450 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
                        
                        <div className={`transition-all duration-700 delay-600 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">Password</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200">
                                    <FaLock />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Create a strong password"
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
                            <p className="text-xs text-gray-500 mt-1 ml-1">Password must be at least 6 characters long</p>
                        </div>
                        
                        <div className={`pt-3 transition-all duration-700 delay-750 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <button
                                type="submit"
                                disabled={isRegistering}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isRegistering ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <FaUserPlus className="mr-2" />
                                        Create Account
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <div className={`text-center mt-6 transition-all duration-700 delay-900 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <p className="text-sm text-gray-600">
                                Already have an account? 
                                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 ml-2 transition-colors duration-200">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </form>
                    
                    <div className={`mt-10 pt-6 border-t border-gray-200 text-center transition-all duration-700 delay-1000 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <p className="text-xs text-gray-500">
                            By creating an account, you agree to our{' '}
                            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                            and{' '}
                            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                        </p>
                    </div>
                </div>
                
                {/* Right Side - Image and Benefits */}
                <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-800 to-blue-600 opacity-90"></div>
                    <img 
                        src="https://img.freepik.com/free-photo/doctor-with-stethoscope-hands-hospital-background_1423-1.jpg" 
                        alt="Healthcare Professional" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
                        <div className={`transition-all duration-1000 delay-300 transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <h2 className="text-3xl font-bold mb-6">Join DevClinic Network</h2>
                            <p className="text-lg mb-8 text-blue-100">Get access to top medical professionals and personalized care</p>
                            
                            <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-filter backdrop-blur-sm">
                                <h4 className="text-xl font-semibold text-white mb-4">Why Sign Up?</h4>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Book appointments with top doctors</p>
                                            <p className="text-sm text-blue-100 mt-1">Choose from our network of specialized doctors across multiple disciplines</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Access your medical history anytime</p>
                                            <p className="text-sm text-blue-100 mt-1">View your past appointments, prescriptions, and medical reports</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-30 flex items-center justify-center mr-4 flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">Receive timely health notifications</p>
                                            <p className="text-sm text-blue-100 mt-1">Get reminders for appointments and medication</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}

export default Register;
