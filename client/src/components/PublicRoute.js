import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function PublicRoute(props) {
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('token')) {
            navigate('/'); 
        }
    }, [navigate]);

    if (localStorage.getItem('token')) {
        return null;
    } else {
        return props.children;
    }
}

export default PublicRoute;
