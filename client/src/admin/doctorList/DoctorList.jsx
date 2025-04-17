import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import toast from 'react-hot-toast';
import { Table, Button, Badge, Input, Tag, Card, Space, Modal, Tabs, Descriptions, Image, Row, Col, Spin, Alert } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { AiTwotoneDelete } from "react-icons/ai";
import { FaSearch, FaEye, FaCheckCircle, FaTimesCircle, FaBan, FaEnvelope, FaPhone, FaUser, FaIdCard, FaUserMd, FaCalendarAlt, FaMoneyBillAlt, FaClock, FaFileExcel } from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';
import moment from 'moment';

const { TabPane } = Tabs;

const DoctorList = () => {
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ visible: false, action: null, record: null });
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const { sendNotification } = useSocket();

    
    const ChangedStatus = async (record, status) => {
        try {
            dispatch(showLoading());
            
            // Get the doctor's userId from the record, ensuring it's the doctor's ID and not the admin's
            const doctorUserId = record.userId;
            
            console.log("Doctor userId being sent:", doctorUserId);

            const response = await axios.post(
                `http://localhost:4000/api/admin/changed-doctor-account`,
                { 
                    doctorId: record._id, 
                    userId: doctorUserId, 
                    status: status 
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            dispatch(hideLoading());
            const data = response.data;
            if (data.success) {
                toast.success(data.message);
                
                // Make sure we're sending the notification to the correct doctor's userId
                if (doctorUserId) {
                    // Send real-time notification to the doctor
                    sendNotification(doctorUserId, {
                        message: `Your doctor application has been ${status}`,
                        onClickPath: '/profile',
                        status: status,
                        type: 'doctor',
                        data: {
                            doctorId: record._id
                        }
                    });
                    console.log(`Notification sent to doctor with userId: ${doctorUserId}`);
                } else {
                    console.warn("Could not send notification: doctor userId is missing");
                }

                getDoctorData(false);
                setConfirmAction({ visible: false, action: null, record: null });
            } else {
                console.error("Failed to update status:", data);
                toast.error(data.message || "Failed to update status");
            }
        } catch (error) {
            dispatch(hideLoading());
            console.error("Error updating doctor status:", error);
            console.error("Error response:", error.response?.data);
            toast.error(error.response?.data?.message || "Something went wrong while updating status");
        }
    };

    const deleteDoctorRequest = async (doctorId) => {
        try {
            dispatch(showLoading());
            const response = await axios.delete(`http://localhost:4000/api/admin/delete-doctor-request/${doctorId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            dispatch(hideLoading());
            const data = response.data;
            if (data.success) {
                toast.success(data.message);
                getDoctorData(false);
                setConfirmAction({ visible: false, action: null, record: null });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error("Something went wrong");
        }
    };

    const getDoctorData = async (showToast = true) => {
        try {
            setLoading(true);
            dispatch(showLoading());
            const response = await fetch("http://localhost:4000/api/admin/get-all-doctors", {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
            });
            const data = await response.json();
            dispatch(hideLoading());
            if (data.success) {
                setDoctors(data.data);
                setFilteredDoctors(data.data);
                if (showToast) {
                    toast.success("Fetched successfully");
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error("Failed to fetch doctor data");
        } finally {
            setLoading(false);
        }
    };

    const downloadDoctorsExcel = async () => {
        try {
            dispatch(showLoading());
            const response = await axios({
                url: "http://localhost:4000/api/admin/download-doctors-excel",
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob', // Important: response is a binary blob
            });
            
            dispatch(hideLoading());
            
            // Create a download link for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'doctors.xlsx');
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success("Doctors data downloaded successfully");
        } catch (error) {
            dispatch(hideLoading());
            toast.error('Error downloading doctor data');
        }
    };

    const getDoctorDetails = async (doctorId) => {
        try {
            setModalLoading(true);
            dispatch(showLoading());
            const response = await axios.get(`http://localhost:4000/api/admin/doctor-detail/${doctorId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.data.success) {
                console.log("Doctor details received:", response.data.data);
                
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
                            console.log("Parsed timing data:", doctorData.timing);
                        } catch (e) {
                            console.error("Error parsing timing string:", e);
                        }
                    }
                }
                
                setSelectedDoctor(doctorData);
                setIsModalVisible(true);
            } else {
                toast.error(response.data.message || "Failed to fetch doctor details");
            }
        } catch (error) {
            console.error("Error fetching doctor details:", error);
            toast.error("Something went wrong while fetching doctor details");
        } finally {
            setModalLoading(false);
            dispatch(hideLoading());
        }
    };

    useEffect(() => {
        if (token) {
            getDoctorData();
        }
    }, [token]);

    // Handle search
    useEffect(() => {
        if (searchText) {
            const filtered = doctors.filter(doctor =>
                `${doctor.firstname} ${doctor.lastname}`.toLowerCase().includes(searchText.toLowerCase()) ||
                doctor.email.toLowerCase().includes(searchText.toLowerCase()) ||
                doctor.mobile.includes(searchText) ||
                doctor.department?.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredDoctors(filtered);
        } else {
            setFilteredDoctors(doctors);
        }
    }, [searchText, doctors]);

    const getStatusTag = (status) => {
        switch (status) {
            case 'pending':
                return <Badge status="processing" text="Pending" />;
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

    const showConfirmModal = (action, record) => {
        const actionMap = {
            approve: {
                title: "Approve Doctor Application",
                content: `Are you sure you want to approve ${record.firstname} ${record.lastname}'s application?`,
                okText: "Approve",
                okType: "primary"
            },
            reject: {
                title: "Reject Doctor Application",
                content: `Are you sure you want to reject ${record.firstname} ${record.lastname}'s application?`,
                okText: "Reject",
                okType: "danger"
            },
            block: {
                title: "Block Doctor Account",
                content: `Are you sure you want to block ${record.firstname} ${record.lastname}'s account?`,
                okText: "Block",
                okType: "danger"
            },
            delete: {
                title: "Delete Doctor Application",
                content: `Are you sure you want to delete ${record.firstname} ${record.lastname}'s application? This action cannot be undone.`,
                okText: "Delete",
                okType: "danger"
            },
            pending: {
                title: "Set Doctor Application as Pending",
                content: `Are you sure you want to set ${record.firstname} ${record.lastname}'s application as pending?`,
                okText: "Set as Pending",
                okType: "primary"
            },
            unblock: {
                title: "Unblock Doctor Account",
                content: `Are you sure you want to unblock ${record.firstname} ${record.lastname}'s account?`,
                okText: "Unblock",
                okType: "primary"
            }
        };

        setConfirmAction({
            visible: true,
            action: action,
            record: record,
            ...actionMap[action]
        });
    };

    const handleConfirmAction = () => {
        const { action, record } = confirmAction;

        switch (action) {
            case 'approve':
                ChangedStatus(record, "approved");
                break;
            case 'reject':
                ChangedStatus(record, "rejected");
                break;
            case 'block':
                ChangedStatus(record, "blocked");
                break;
            case 'delete':
                deleteDoctorRequest(record._id);
                break;
            case 'pending':
                ChangedStatus(record, "pending");
                break;
            case 'unblock':
                ChangedStatus(record, "approved");
                break;
        }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src={record.image || "/assets/profile.png"}
                        alt={`${record.firstname} ${record.lastname}`}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/assets/profile.png";
                        }}
                    />
                    <div>
                        <div className="font-medium">{record.firstname} {record.lastname}</div>
                        <div className="text-xs text-gray-500">{record.email}</div>
                    </div>
                </div>
            )
        },
        {
            title: "Department",
            dataIndex: "department",
            key: "department",
            render: (text) => <Tag color="blue">{text || 'N/A'}</Tag>
        },
        {
            title: "Availability",
            dataIndex: "isAvailable",
            key: "isAvailable",
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Tag color={record.isAvailable !== false ? 'green' : 'red'}>
                        {record.isAvailable !== false ? 'Available' : 'Not Available'}
                    </Tag>
                    {record.isAvailable === false && record.unavailableReason && (
                        <div className="text-xs text-gray-500 mt-1">
                            Reason: {record.unavailableReason}
                        </div>
                    )}
                    {record.isAvailable === false && record.unavailableUntil && (
                        <div className="text-xs text-gray-500">
                            Until: {moment(record.unavailableUntil).format('MMM DD, YYYY')}
                        </div>
                    )}
                </div>
            ),
            filters: [
                { text: 'Available', value: true },
                { text: 'Not Available', value: false },
            ],
            onFilter: (value, record) => {
                if (value === true) return record.isAvailable !== false;
                return record.isAvailable === false;
            },
        },
        {
            title: "Experience",
            dataIndex: "experience",
            key: "experience",
            render: (experience) => experience ? <Tag color="green">{experience} years</Tag> : <Tag color="default">N/A</Tag>
        },
        {
            title: "Phone",
            dataIndex: "mobile",
            key: "mobile",
            render: (mobile) => (
                <div className="flex items-center">
                    <FaPhone className="mr-2 text-gray-400" /> {mobile}
                </div>
            )
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => getStatusTag(status),
            filters: [
                { text: 'Pending', value: 'pending' },
                { text: 'Approved', value: 'approved' },
                { text: 'Rejected', value: 'rejected' },
                { text: 'Blocked', value: 'blocked' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: "Actions",
            key: "actions",
            render: (text, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        icon={<FaEye />}
                        onClick={() => getDoctorDetails(record._id)}
                        title="View Details"
                    >
                        Review
                    </Button>

                    {record.status === "pending" && (
                        <Space size="small">
                            <Button
                                type="primary"
                                className="bg-success border-0"
                                icon={<FaCheckCircle />}
                                onClick={() => showConfirmModal('approve', record)}
                                title="Approve"
                            />
                            <Button
                                danger
                                icon={<FaTimesCircle />}
                                onClick={() => showConfirmModal('reject', record)}
                                title="Reject"
                            />
                        </Space>
                    )}

                    {record.status === "approved" && (
                        <Button
                            type="primary"
                            className="bg-orange-500 border-0"
                            icon={<FaTimesCircle />}
                            onClick={() => showConfirmModal('pending', record)}
                            title="Set as Pending"
                        >
                            Pending
                        </Button>
                    )}

                    {record.status === "approved" && (
                        <Button
                            danger
                            icon={<FaBan />}
                            onClick={() => showConfirmModal('block', record)}
                            title="Block"
                        />
                    )}
                    
                    {record.status === "blocked" && (
                        <Button
                            type="primary"
                            className="bg-success border-0"
                            icon={<FaCheckCircle />}
                            onClick={() => showConfirmModal('unblock', record)}
                            title="Unblock"
                        >
                            Unblock
                        </Button>
                    )}

                    <Button
                        danger
                        type="primary"
                        icon={<AiTwotoneDelete />}
                        onClick={() => showConfirmModal('delete', record)}
                        title="Delete"
                    />
                </Space>
            )
        }
    ];

    return (
        <Layout>
            <Card className="shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 m-0">Doctor Applications</h2>
                        <p className="text-gray-500 m-0 mt-1">Manage doctor registrations and credentials</p>
                    </div>
                    <div className="flex items-center">
                        <Button 
                            type="primary" 
                            className="mr-4 flex items-center"
                            onClick={downloadDoctorsExcel}
                            icon={<FaFileExcel className="mr-1" />}
                        >
                            Export to Excel
                        </Button>
                        <div className="w-64">
                            <Input
                                placeholder="Search doctors..."
                                prefix={<FaSearch className="text-gray-400" />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-blue-50 border border-blue-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {doctors.filter(doc => doc.status === 'pending').length}
                                </div>
                                <div className="text-sm text-gray-600">Pending</div>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaUser className="text-blue-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-green-50 border border-green-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-green-600">
                                    {doctors.filter(doc => doc.status === 'approved').length}
                                </div>
                                <div className="text-sm text-gray-600">Approved</div>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <FaCheckCircle className="text-green-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-red-50 border border-red-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-red-600">
                                    {doctors.filter(doc => doc.status === 'rejected').length}
                                </div>
                                <div className="text-sm text-gray-600">Rejected</div>
                            </div>
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <FaTimesCircle className="text-red-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-gray-600">
                                    {doctors.filter(doc => doc.status === 'blocked').length}
                                </div>
                                <div className="text-sm text-gray-600">Blocked</div>
                            </div>
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <FaBan className="text-gray-500" />
                            </div>
                        </div>
                    </Card>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredDoctors}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} doctors`,
                    }}
                    className="shadow-sm rounded-lg overflow-hidden"
                />
            </Card>

            {/* Doctor Details Modal */}
            <Modal
                title={
                    <div className="flex items-center text-xl">
                        <FaUserMd className="mr-2 text-blue-500" />
                        Doctor Application Details
                    </div>
                }
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={1000}
                footer={[
                    <Button key="back" onClick={() => setIsModalVisible(false)}>
                        Close
                    </Button>,
                    selectedDoctor?.status === 'pending' && (
                        <>
                            <Button
                                key="approve"
                                type="primary"
                                className="bg-success border-0"
                                icon={<FaCheckCircle />}
                                onClick={() => showConfirmModal('approve', selectedDoctor)}
                            >
                                Approve
                            </Button>
                            <Button
                                key="reject"
                                danger
                                icon={<FaTimesCircle />}
                                onClick={() => showConfirmModal('reject', selectedDoctor)}
                            >
                                Reject
                            </Button>
                        </>
                    ),
                    selectedDoctor?.status === 'approved' && (
                        <>
                            <Button
                                key="pending"
                                type="primary"
                                className="bg-orange-500 border-0"
                                icon={<FaTimesCircle />}
                                onClick={() => showConfirmModal('pending', selectedDoctor)}
                            >
                                Pending
                            </Button>
                            <Button
                                key="block"
                                danger
                                icon={<FaBan />}
                                onClick={() => showConfirmModal('block', selectedDoctor)}
                            >
                                Block
                            </Button>
                        </>
                    ),
                    selectedDoctor?.status === 'blocked' && (
                        <Button
                            key="unblock"
                            type="primary"
                            className="bg-success border-0"
                            icon={<FaCheckCircle />}
                            onClick={() => showConfirmModal('unblock', selectedDoctor)}
                        >
                            Unblock
                        </Button>
                    )
                ]}
            >
                {modalLoading ? (
                    <div className="text-center py-6">
                        <Spin size="large" />
                        <p className="mt-3 text-gray-500">Loading doctor details...</p>
                    </div>
                ) : selectedDoctor ? (
                    <Tabs defaultActiveKey="profile">
                        <TabPane
                            tab={<span><FaUser className="mr-2" />Profile</span>}
                            key="profile"
                        >
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={8}>
                                    <Card className="text-center shadow-sm h-100">
                                        <Image
                                            src={selectedDoctor.image || "/assets/profile.png"}
                                            alt={`${selectedDoctor.firstname} ${selectedDoctor.lastname}`}
                                            className="rounded-lg mb-4"
                                            style={{ width: '180px', height: '180px', objectFit: 'cover' }}
                                            fallback="/assets/profile.png"
                                        />
                                        <h3 className="text-xl font-bold mb-1">{selectedDoctor.firstname} {selectedDoctor.lastname}</h3>
                                        <div className="mb-3">
                                            <Tag color="blue">{selectedDoctor.department}</Tag>
                                            <Tag color="green">{selectedDoctor.experience} Years Exp.</Tag>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <Button type="default" icon={<FaEnvelope className="mr-2" />} block>
                                                {selectedDoctor.email}
                                            </Button>
                                            <Button type="default" icon={<FaPhone className="mr-2" />} block>
                                                {selectedDoctor.mobile}
                                            </Button>
                                        </div>
                                        <div className="mt-4">
                                            {getStatusTag(selectedDoctor.status)}
                                        </div>
                                    </Card>
                                </Col>

                                <Col xs={24} md={16}>
                                    <Card className="shadow-sm h-100">
                                        <h3 className="text-lg font-bold mb-4 border-b pb-2">Professional Information</h3>
                                        <Descriptions
                                            bordered
                                            column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
                                            layout="vertical"
                                        >
                                            <Descriptions.Item label="Department">
                                                {selectedDoctor.department || 'Not specified'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Specialization">
                                                {(() => {
                                                    // Handle the specialization field which could be in different formats
                                                    if (!selectedDoctor.specialization) {
                                                        return selectedDoctor.department || "Not provided";
                                                    }

                                                    // If it's an array, join with commas
                                                    if (Array.isArray(selectedDoctor.specialization)) {
                                                        return selectedDoctor.specialization.join(', ');
                                                    }

                                                    // If it's a string but looks like JSON, try to parse it
                                                    if (typeof selectedDoctor.specialization === 'string') {
                                                        if (selectedDoctor.specialization.startsWith('[') || selectedDoctor.specialization.startsWith('{')) {
                                                            try {
                                                                const parsed = JSON.parse(selectedDoctor.specialization);
                                                                return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                                                            } catch (error) {
                                                                console.error("Error parsing specialization:", error);
                                                                return selectedDoctor.specialization;
                                                            }
                                                        }
                                                        return selectedDoctor.specialization;
                                                    }

                                                    // If it's an object, convert to string
                                                    return JSON.stringify(selectedDoctor.specialization);
                                                })()}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Experience">
                                                {selectedDoctor.experience} years
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Consultation Fee">
                                                ₹{selectedDoctor.feePerConsultation || 'Not specified'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Qualifications" span={2}>
                                                {selectedDoctor.qualifications || 'Not specified'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Address" span={2}>
                                                {selectedDoctor.address || 'Not specified'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Professional Bio" span={2}>
                                                {selectedDoctor.professionalBio || 'Not provided'}
                                            </Descriptions.Item>
                                        </Descriptions>

                                        <h3 className="text-lg font-bold mt-6 mb-4 border-b pb-2">Application Details</h3>
                                        <Descriptions bordered column={2}>
                                            <Descriptions.Item label="Applied On">
                                                {new Date(selectedDoctor.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                {getStatusTag(selectedDoctor.status)}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>

                        <TabPane
                            tab={<span><FaIdCard className="mr-2" />Documents & Certifications</span>}
                            key="documents"
                        >
                            <Card className="shadow-sm">
                                <h3 className="text-lg font-bold mb-4">Medical Education</h3>
                                <Descriptions bordered column={2}>
                                    <Descriptions.Item label="Medical Degree">
                                        {selectedDoctor.medicalDegree || 'Not specified'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Institution">
                                        {selectedDoctor.institution || 'Not specified'}
                                    </Descriptions.Item>
                                </Descriptions>

                                <h3 className="text-lg font-bold mb-4 mt-6">Qualifications & Certifications</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-700">
                                        {selectedDoctor.qualifications || 'No qualifications information provided'}
                                    </p>
                                </div>

                                <h3 className="text-lg font-bold mb-4 mt-6">Professional Affiliations</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-700">
                                        {selectedDoctor.hospitalAffiliations || 'No hospital affiliations provided'}
                                    </p>
                                </div>

                                <h3 className="text-lg font-bold mb-4 mt-6">Professional Biography</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-700">
                                        {selectedDoctor.professionalBio || 'No professional biography provided'}
                                    </p>
                                </div>
                            </Card>
                        </TabPane>

                        <TabPane
                            tab={<span><FaCalendarAlt className="mr-2" />Availability</span>}
                            key="availability"
                        >
                            <Card className="shadow-sm">
                                <Descriptions 
                                    title={<span className="text-lg font-semibold"><FaCalendarAlt className="mr-2" />Doctor Availability & Fees</span>}
                                    bordered 
                                    column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                                >
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Consultation Hours</span>} 
                                        labelStyle={{ fontWeight: 'bold' }} 
                                        span={3}
                                    >
                                        {(() => {
                                            console.log("Rendering timing value:", selectedDoctor.timing);
                                            
                                            // If timing doesn't exist
                                            if (!selectedDoctor.timing) {
                                                return <span className="text-red-500">Not specified</span>;
                                            }
                                            
                                            // If timing is an array
                                            if (Array.isArray(selectedDoctor.timing)) {
                                                if (selectedDoctor.timing.length === 2) {
                                                    // Handle ISO date strings (they contain 'T' and 'Z')
                                                    if (typeof selectedDoctor.timing[0] === 'string' && selectedDoctor.timing[0].includes('T')) {
                                                        // Format using moment to display in local time
                                                        const startMoment = moment(selectedDoctor.timing[0]);
                                                        const endMoment = moment(selectedDoctor.timing[1]);
                                                        
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
                                                            <span className="text-green-600 font-medium">{selectedDoctor.timing[0]} - {selectedDoctor.timing[1]}</span>
                                                            <Badge status="success" className="ml-2" />
                                                        </div>
                                                    );
                                                }
                                                
                                                // If it's an array but not of length 2
                                                return (
                                                    <div>
                                                        <span className="text-yellow-600">{selectedDoctor.timing.join(', ')}</span>
                                                        <div className="text-sm text-gray-500 mt-1">(Unusual format detected)</div>
                                                    </div>
                                                );
                                            }
                                            
                                            // If timing is a string but might be JSON
                                            if (typeof selectedDoctor.timing === 'string') {
                                                if (selectedDoctor.timing.startsWith('[') || selectedDoctor.timing.startsWith('{')) {
                                                    try {
                                                        const parsed = JSON.parse(selectedDoctor.timing);
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
                                                                <span className="text-yellow-600">{selectedDoctor.timing}</span>
                                                                <div className="text-sm text-gray-500 mt-1">(Invalid format)</div>
                                                            </div>
                                                        );
                                                    }
                                                }
                                                return (
                                                    <div>
                                                        <span className="text-yellow-600">{selectedDoctor.timing}</span>
                                                        <div className="text-sm text-gray-500 mt-1">(String format)</div>
                                                    </div>
                                                );
                                            }
                                            
                                            // Default case - stringify whatever we have
                                            return (
                                                <div>
                                                    <span className="text-yellow-600">{JSON.stringify(selectedDoctor.timing)}</span>
                                                    <div className="text-sm text-gray-500 mt-1">(Unknown format)</div>
                                                </div>
                                            );
                                        })()}
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Consultation Fee</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        <span className="text-blue-600 font-medium">₹{selectedDoctor.feePerConsultation}</span>
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Department</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        {selectedDoctor.department}
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Experience</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                    >
                                        {selectedDoctor.experience} years
                                    </Descriptions.Item>
                                    
                                    <Descriptions.Item 
                                        label={<span className="font-semibold">Address</span>} 
                                        labelStyle={{ fontWeight: 'bold' }}
                                        span={3}
                                    >
                                        {selectedDoctor.address || "Not specified"}
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
                ) : (
                    <div className="text-center py-6">
                        <p className="text-gray-500">No doctor details available</p>
                    </div>
                )}
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                title={confirmAction.title}
                visible={confirmAction.visible}
                onOk={handleConfirmAction}
                onCancel={() => setConfirmAction({ visible: false, action: null, record: null })}
                okText={confirmAction.okText}
                okButtonProps={{ type: confirmAction.okType }}
                cancelText="Cancel"
            >
                <p>{confirmAction.content}</p>
            </Modal>
        </Layout>
    );
};

export default DoctorList;
