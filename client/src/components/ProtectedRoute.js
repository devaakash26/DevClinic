import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../redux/userInfo';
import { hideLoading, showLoading } from '../redux/loader';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProtectedRoute = (props) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.user);

    const getUser = async () => {
        try {
            dispatch(showLoading());
            const token = localStorage.getItem('token');
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await axios.post("http://localhost:4000/api/user/get-user-info",
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            dispatch(hideLoading());

            if (response.data.success) {
                dispatch(setUser(response.data.data));
            } else {
                toast.error(response.data.message || "Failed to authenticate");
                navigate("/login");
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error("Something went wrong, please login again");
            localStorage.removeItem('token');
            navigate("/login");
        }
    };

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login');
        } else if (!user) {
            getUser();
        }
    }, [navigate, user]);

    if (localStorage.getItem('token') && user) {
        return props.children;
    } else {
        return null;
    }
};

export default ProtectedRoute;
