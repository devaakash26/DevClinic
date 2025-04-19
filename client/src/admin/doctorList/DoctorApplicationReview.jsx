import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Badge, Descriptions, Image, Divider, Skeleton, Modal, Tabs, Alert, Tag } from 'antd';
import { FaCheckCircle, FaTimesCircle, FaBan, FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaIdCard, FaHospital, FaStethoscope, FaMedkit } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import { useSocket } from '../../context/SocketContext';
import moment from 'moment';
import { api } from '../../utils/apiUtils';

const { TabPane } = Tabs;

const DoctorApplicationReview = () => {
    const { doctorId } = useParams();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [statusAction, setStatusAction] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { sendNotification } = useSocket();

    useEffect(() => {
        fetchDoctorDetails();
    }, [doctorId]);

    const fetchDoctorDetails = async () => {
        try {
            dispatch(showLoading());
            setLoading(true);
            const response = await api.get(`admin/doctor-detail/${doctorId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            
            if (response.data.success) {
                console.log("Doctor data received:", response.data.data);
                
                // Process the doctor data
                const doctorData = { ...response.data.data };
                
                // Log timing information specifically
                console.log("Timing data:", {
                    timing: doctorData.timing,
                    type: doctorData.timing ? typeof doctorData.timing : 'undefined',
                    isArray: doctorData.timing ? Array.isArray(doctorData.timing) : false,
                    length: doctorData.timing && Array.isArray(doctorData.timing) ? doctorData.timing.length : 0
                });
                
                // Ensure timing data is consistently formatted for display
                if (doctorData.timing) {
                    // If timing is a string, try to parse it
                    if (typeof doctorData.timing === 'string') {
                        try {
                            doctorData.timing = JSON.parse(doctorData.timing);
                        } catch (e) {
                            console.error("Error parsing timing string:", e);
                        }
                    }
                    
                    console.log("Processed timing:", doctorData.timing);
                }
                
                setDoctor(doctorData);
            } else {
                toast.error(response.data.message || "Failed to fetch doctor details");
                navigate('/admin/doctor-list');
            }
        } catch (error) {
            console.error("Error fetching doctor details:", error);
            toast.error("Something went wrong while fetching doctor details");
            navigate('/admin/doctor-list');
        } finally {
            setLoading(false);
            dispatch(hideLoading());
        }
    };

    const handleStatusChange = async () => {
        try {
            dispatch(showLoading());
            
            // Ensure we're using the correct doctor userId
            const doctorUserId = doctor.userId;
            
            console.log("Doctor record:", {
                _id: doctor._id,
                firstname: doctor.firstname,
                lastname: doctor.lastname,
                userId: doctorUserId,
                typeof_userId: typeof doctorUserId
            });
            
            console.log("Changing doctor status:", {
                doctorId: doctor._id,
                userId: doctorUserId,
                status: statusAction,
                reason: rejectReason
            });
            
            const response = await api.post(
                `admin/changed-doctor-account`,
                {
                    doctorId: doctor._id, 
                    userId: doctorUserId, 
                    status: statusAction,
                    reason: rejectReason
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            
            if (response.data.success) {
                toast.success(response.data.message);
                console.log("Doctor status changed successfully");
                
                // Optionally send client-side notification if needed
                if (doctorUserId && sendNotification) {
                    sendNotification(doctorUserId, {
                        message: `Your doctor application has been ${statusAction}`,
                        onClickPath: '/profile',
                        status: statusAction,
                        type: 'doctor',
                        data: {
                            doctorId: doctor._id
                        }
                    });
                    console.log(`Notification sent to doctor with userId: ${doctorUserId}`);
                }
                
                fetchDoctorDetails();
                setModalVisible(false);
            } else {
                console.error("Failed to update status:", response.data);
                toast.error(response.data.message || "Failed to update status");
            }
        } catch (error) {
            console.error("Error updating doctor status:", error);
            console.error("Error response:", error.response?.data);
            toast.error(error.response?.data?.message || "Something went wrong while updating status");
        } finally {
            dispatch(hideLoading());
        }
    };

    const showStatusModal = (status) => {
        setStatusAction(status);
        setModalVisible(true);
    };
    
    const getStatusBadge = (status) => {
        switch(status) {
            case 'pending':
                return <Badge status="processing" text="Pending Review" />;
            case 'approved':
                return <Badge status="success" text="Approved" />;
            case 'rejected':
                return <Badge status="error" text="Rejected" />;
            case 'blocked':
                return <Badge status="default" text="Blocked" />;
            default:
                return <Badge status="default" text={status} />;
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="container">
                    <Skeleton active avatar paragraph={{ rows: 10 }} />
                </div>
            </Layout>
        );
    }

    if (!doctor) {
        return (
            <Layout>
                <div className="container">
                    <h2>Doctor not found</h2>
                    <Button type="primary" onClick={() => navigate('/admin/doctor-list')}>
                        Back to Doctor List
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Button 
                        type="default" 
                        onClick={() => navigate('/admin/doctor-list')}
                        icon={<FaArrowLeft />}
                    >
                        Back to Doctor List
                    </Button>
                    
                    <div>
                        {getStatusBadge(doctor.status)}
                    </div>
                </div>
                
                <Card 
                    className="shadow-lg"
                    title={
                        <div className="d-flex align-items-center">
                            <FaUser className="text-primary me-2" /> 
                            <span className="fs-4">Doctor Application Review</span>
                        </div>
                    }
                >
                    <Tabs defaultActiveKey="profile">
                        <TabPane 
                            tab={<span><FaUser className="me-2" />Profile</span>} 
                            key="profile"
                        >
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={6}>
                                    <Card className="text-center shadow-sm h-100">
                                        <Image 
                                            src={doctor.image || "/assets/profile.png"} 
                                            alt={`${doctor.firstname} ${doctor.lastname}`}
                                            className="img-fluid rounded-circle mb-3"
                                            style={{ width: '180px', height: '180px', objectFit: 'cover' }}
                                            fallback="/assets/profile.png"
                                            onError={(e) => {
                                                console.error("Image load error:", e);
                                                e.target.src = "/assets/profile.png";
                                            }}
                                        />
                                        <h3 className="mb-0">{doctor.firstname} {doctor.lastname}</h3>
                                        <p className="text-muted">{doctor.department}</p>
                                        <div className="mt-2 mb-2">
                                            <Tag color={doctor.isAvailable !== false ? 'green' : 'red'} className="px-2 py-1">
                                                {doctor.isAvailable !== false ? 'Available' : 'Not Available'}
                                            </Tag>
                                        </div>
                                        {doctor.isAvailable === false && (
                                            <div className="mt-2">
                                                <p className="text-sm text-muted mb-0">
                                                    <strong>Reason:</strong> {doctor.unavailableReason || 'Not specified'}
                                                </p>
                                                {doctor.unavailableUntil && (
                                                    <p className="text-sm text-muted">
                                                        <strong>Until:</strong> {moment(doctor.unavailableUntil).format('MMM DD, YYYY')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-3">
                                            <Button className="me-2" icon={<FaEnvelope />}>
                                                {doctor.email}
                                            </Button>
                                            <Button icon={<FaPhone />}>
                                                {doctor.mobile}
                                            </Button>
                                        </div>
                                    </Card>
                                </Col>
                                
                                <Col xs={24} md={18}>
                                    <Card className="shadow-sm h-100">
                                        <Descriptions 
                                            title="Doctor Information" 
                                            bordered 
                                            layout="vertical"
                                            column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                                        >
                                            <Descriptions.Item label="Experience" labelStyle={{ fontWeight: 'bold' }}>
                                                {doctor.experience} years
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Department" labelStyle={{ fontWeight: 'bold' }}>
                                                {doctor.department}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Fee" labelStyle={{ fontWeight: 'bold' }}>
                                                ₹{doctor.feePerConsultation}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Email" labelStyle={{ fontWeight: 'bold' }}>
                                                {doctor.email}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Mobile" labelStyle={{ fontWeight: 'bold' }}>
                                                {doctor.mobile}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Applied On" labelStyle={{ fontWeight: 'bold' }}>
                                                {new Date(doctor.createdAt).toLocaleDateString()}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Address" labelStyle={{ fontWeight: 'bold' }} span={3}>
                                                {doctor.address}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Professional Bio" labelStyle={{ fontWeight: 'bold' }} span={3}>
                                                {doctor.professionalBio || "No professional bio provided"}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>
                        
                        <TabPane 
                            tab={<span><FaIdCard className="me-2" />Qualifications</span>} 
                            key="qualifications"
                        >
                            <Card className="shadow-sm">
                                <Descriptions 
                                    title="Professional Details" 
                                    bordered 
                                    column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
                                >
                                    <Descriptions.Item label="Medical Degree" labelStyle={{ fontWeight: 'bold' }}>
                                        {doctor.medicalDegree || "Not provided"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Institution" labelStyle={{ fontWeight: 'bold' }}>
                                        {doctor.institution || "Not provided"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Qualifications" labelStyle={{ fontWeight: 'bold' }} span={2}>
                                        {doctor.qualifications || "Not provided"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Specialization" labelStyle={{ fontWeight: 'bold' }} span={2}>
                                        {(() => {
                                            // Handle the specialization field which could be in different formats
                                            if (!doctor.specialization) {
                                                return doctor.department || "Not provided";
                                            }
                                            
                                            // If it's an array, join with commas
                                            if (Array.isArray(doctor.specialization)) {
                                                return doctor.specialization.join(', ');
                                            }
                                            
                                            // If it's a string but looks like JSON, try to parse it
                                            if (typeof doctor.specialization === 'string') {
                                                if (doctor.specialization.startsWith('[') || doctor.specialization.startsWith('{')) {
                                                    try {
                                                        const parsed = JSON.parse(doctor.specialization);
                                                        return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                                                    } catch (error) {
                                                        console.error("Error parsing specialization:", error);
                                                        return doctor.specialization;
                                                    }
                                                }
                                                return doctor.specialization;
                                            }
                                            
                                            // If it's an object, convert to string
                                            return JSON.stringify(doctor.specialization);
                                        })()}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Experience" labelStyle={{ fontWeight: 'bold' }}>
                                        {doctor.experience} years
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Hospital Affiliations" labelStyle={{ fontWeight: 'bold' }}>
                                        {doctor.hospitalAffiliations || "Not provided"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Professional Bio" labelStyle={{ fontWeight: 'bold' }} span={2}>
                                        {doctor.professionalBio || "No professional bio provided"}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </TabPane>
                        
                        <TabPane 
                            tab={<span><FaCalendarAlt className="me-2" />Availability</span>} 
                            key="availability"
                        >
                            <Card className="shadow-sm">
                                <Descriptions 
                                    title={<span className="text-lg font-semibold"><FaCalendarAlt className="me-2" />Doctor Availability & Fees</span>}
                                    bordered 
                                    column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                                >
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Consultation Hours</span>} 
                                        labelStyle={{ fontWeight: 'bold' }} 
                                        span={3}
                                    >
                                        {(() => {
                                            console.log("Rendering timing value:", doctor.timing);
                                            
                                            // If timing doesn't exist
                                            if (!doctor.timing) {
                                                return <span className="text-red-500">Not specified</span>;
                                            }
                                            
                                            // If timing is an array
                                            if (Array.isArray(doctor.timing)) {
                                                if (doctor.timing.length === 2) {
                                                    // Handle ISO date strings (they contain 'T' and 'Z')
                                                    if (typeof doctor.timing[0] === 'string' && doctor.timing[0].includes('T')) {
                                                        // Format using moment to display in local time
                                                        const startMoment = moment(doctor.timing[0]);
                                                        const endMoment = moment(doctor.timing[1]);
                                                        
                                                        // Format as 12-hour time with AM/PM
                                                        const startTime = startMoment.format('hh:mm A');
                                                        const endTime = endMoment.format('hh:mm A');
                                                        
                                                        return (
                                                            <div className="flex items-center">
                                                                <span className="text-green-600 font-medium">{startTime} - {endTime}</span>
                                                                <Badge status="success" className="ml-2" />
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    // Handle regular time strings (HH:mm)
                                                    return (
                                                        <div className="flex items-center">
                                                            <span className="text-green-600 font-medium">{doctor.timing[0]} - {doctor.timing[1]}</span>
                                                            <Badge status="success" className="ml-2" />
                                                        </div>
                                                    );
                                                }
                                                
                                                // If it's an array but not of length 2
                                                return (
                                                    <div>
                                                        <span className="text-yellow-600">{doctor.timing.join(', ')}</span>
                                                        <div className="text-sm text-gray-500 mt-1">(Unusual format detected)</div>
                                                    </div>
                                                );
                                            }
                                            
                                            // If timing is a string but might be JSON
                                            if (typeof doctor.timing === 'string') {
                                                if (doctor.timing.startsWith('[') || doctor.timing.startsWith('{')) {
                                                    try {
                                                        const parsed = JSON.parse(doctor.timing);
                                                        if (Array.isArray(parsed)) {
                                                            if (parsed.length === 2) {
                                                                // Handle ISO date strings in parsed array
                                                                if (typeof parsed[0] === 'string' && parsed[0].includes('T')) {
                                                                    const startTime = moment(parsed[0]).format('hh:mm A');
                                                                    const endTime = moment(parsed[1]).format('hh:mm A');
                                                                    return (
                                                                        <div className="flex items-center">
                                                                            <span className="text-green-600 font-medium">{startTime} - {endTime}</span>
                                                                            <Badge status="success" className="ml-2" />
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div className="flex items-center">
                                                                        <span className="text-green-600 font-medium">{parsed[0]} - {parsed[1]}</span>
                                                                        <Badge status="success" className="ml-2" />
                                                                    </div>
                                                                );
                                                            }
                                                            return parsed.join(', ');
                                                        }
                                                        return JSON.stringify(parsed);
                                                    } catch (e) {
                                                        return (
                                                            <div>
                                                                <span className="text-yellow-600">{doctor.timing}</span>
                                                                <div className="text-sm text-gray-500 mt-1">(Invalid format)</div>
                                                            </div>
                                                        );
                                                    }
                                                }
                                                return (
                                                    <div>
                                                        <span className="text-yellow-600">{doctor.timing}</span>
                                                        <div className="text-sm text-gray-500 mt-1">(String format)</div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Default case - stringify whatever we have
                                            return (
                                                <div>
                                                    <span className="text-yellow-600">{JSON.stringify(doctor.timing)}</span>
                                                    <div className="text-sm text-gray-500 mt-1">(Unknown format)</div>
                                                </div>
                                            );
                                        })()}
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Consultation Fee</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        <span className="text-blue-600 font-medium">₹{doctor.feePerConsultation}</span>
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Department</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        {doctor.department}
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Experience</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        {doctor.experience} years
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Address</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                        span={3}
                                    >
                                        {doctor.address || "Not specified"}
                                    </Descriptions.Item>
                                </Descriptions>
                                
                                <Alert
                                    message="Consultation Hours Information"
                                    description="The consultation hours indicate when the doctor is generally available for appointments. Patients can book appointments during these hours subject to availability."
                                    type="info"
                                    showIcon
                                    className="mt-4"
                                />
                            </Card>
                        </TabPane>
                    </Tabs>

                    <Divider />
                    
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        {doctor.status === "pending" && (
                            <>
                                <Button 
                                    type="primary" 
                                    icon={<FaCheckCircle />} 
                                    onClick={() => showStatusModal("approved")}
                                    className="bg-success border-0"
                                >
                                    Approve Application
                                </Button>
                                <Button 
                                    danger 
                                    icon={<FaTimesCircle />} 
                                    onClick={() => showStatusModal("rejected")}
                                >
                                    Reject Application
                                </Button>
                            </>
                        )}
                        
                        {doctor.status === "approved" && (
                            <Button 
                                danger 
                                icon={<FaBan />} 
                                onClick={() => showStatusModal("blocked")}
                            >
                                Block Doctor
                            </Button>
                        )}
                        
                        {doctor.status === "rejected" && (
                            <Button 
                                type="primary" 
                                icon={<FaCheckCircle />} 
                                onClick={() => showStatusModal("approved")}
                                className="bg-success border-0"
                            >
                                Approve Application
                            </Button>
                        )}
                        
                        {doctor.status === "blocked" && (
                            <Button 
                                type="primary" 
                                icon={<FaCheckCircle />} 
                                onClick={() => showStatusModal("approved")}
                                className="bg-success border-0"
                            >
                                Unblock Doctor
                            </Button>
                        )}
                    </div>
                </Card>
                
                <Modal
                    title={`Confirm ${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)}`}
                    visible={modalVisible}
                    onCancel={() => setModalVisible(false)}
                    footer={[
                        <Button key="back" onClick={() => setModalVisible(false)}>
                            Cancel
                        </Button>,
                        <Button 
                            key="submit" 
                            type={statusAction === "approved" ? "primary" : "danger"}
                            onClick={handleStatusChange}
                        >
                            Confirm
                        </Button>,
                    ]}
                >
                    <p>Are you sure you want to <strong>{statusAction}</strong> doctor {doctor.firstname} {doctor.lastname}?</p>
                    
                    {statusAction === "rejected" && (
                        <div className="mb-3">
                            <label htmlFor="rejectReason" className="form-label">Reason for rejection:</label>
                            <textarea
                                className="form-control"
                                id="rejectReason"
                                rows="3"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Please provide a reason for rejection"
                            ></textarea>
                        </div>
                    )}
                </Modal>
            </div>
        </Layout>
    );
};

export default DoctorApplicationReview; 