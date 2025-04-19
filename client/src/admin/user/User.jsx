import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import { Table, Button, Badge, Input, Tag, Card, Space, Modal, Avatar, Spin } from 'antd';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaSearch, FaUser, FaEnvelope, FaBan, FaLock, FaUnlock, FaInfoCircle, FaFileExcel } from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';
import '../../styles/tableResponsive.css';

const User = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ visible: false, action: null, record: null });
    const dispatch = useDispatch();
    const token = localStorage.getItem("token");
    const { sendNotification } = useSocket();

    const getUserData = async () => {
        try {
            setLoading(true);
            dispatch(showLoading());
            const response = await axios.get("http://localhost:4000/api/admin/get-all-user", {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            dispatch(hideLoading());
            if (response.data.success) {
                const userData = response.data.data;
                setUsers(userData);
                setFilteredUsers(userData);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const downloadUsersExcel = async () => {
        try {
            dispatch(showLoading());
            const response = await axios({
                url: "http://localhost:4000/api/admin/download-users-excel",
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
            link.setAttribute('download', 'users.xlsx');
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success("Users data downloaded successfully");
        } catch (error) {
            dispatch(hideLoading());
            toast.error('Error downloading user data');
        }
    };

    useEffect(() => {
        if (token) {
            getUserData();
        }
    }, [token]);

    // Handle search
    useEffect(() => {
        if (searchText) {
            const filtered = users.filter(user => 
                user.name.toLowerCase().includes(searchText.toLowerCase()) ||
                user.email.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchText, users]);

    const updateUserStatus = async (userId, status) => {
        try {
            dispatch(showLoading());
            const response = await axios.post(
                `http://localhost:4000/api/admin/update-user-status`,
                { userId, status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            dispatch(hideLoading());
            if (response.data.success) {
                toast.success(response.data.message);
                
                // Send notification to user
                sendNotification(userId, {
                    message: `Your account has been ${status === 'blocked' ? 'blocked' : 'activated'} by an administrator`,
                    onClickPath: '/profile'
                });
                
                getUserData();
                setConfirmAction({ visible: false, action: null, record: null });
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error('Something went wrong');
        }
    };

    const resetUserPassword = async (userId) => {
        try {
            dispatch(showLoading());
            const response = await axios.post(
                `http://localhost:4000/api/admin/admin-reset-password`,
                { userId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            dispatch(hideLoading());
            if (response.data.success) {
                toast.success("Password reset email sent successfully");
                
                // Send notification to user
                sendNotification(userId, {
                    message: "An administrator has initiated a password reset for your account",
                    onClickPath: '/profile'
                });
                
                setConfirmAction({ visible: false, action: null, record: null });
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error('Failed to send password reset email');
        }
    };

    const showConfirmModal = (action, record) => {
        const actionMap = {
            block: {
                title: "Block User Account",
                content: `Are you sure you want to block ${record.name}'s account?`,
                okText: "Block",
                okType: "danger"
            },
            unblock: {
                title: "Unblock User Account",
                content: `Are you sure you want to unblock ${record.name}'s account?`,
                okText: "Unblock",
                okType: "primary"
            },
            reset: {
                title: "Reset User Password",
                content: `Are you sure you want to reset password for ${record.name}?`,
                okText: "Reset Password",
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
        
        switch(action) {
            case 'block':
                updateUserStatus(record._id, 'blocked');
                break;
            case 'unblock':
                updateUserStatus(record._id, 'active');
                break;
            case 'reset':
                resetUserPassword(record._id);
                break;
        }
    };

    const getUserDetails = (record) => {
        setSelectedUser(record);
        setIsModalVisible(true);
    };

    const getStatusTag = (status) => {
        switch(status) {
            case 'active':
                return <Badge status="success" text="Active" />;
            case 'blocked':
                return <Badge status="error" text="Blocked" />;
            default:
                return <Badge status="default" text={status} />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const columns = [
        {
            title: "User",
            key: "user",
            render: (text, record) => (
                <div className="flex items-center">
                    <Avatar 
                        src={record.profilePicture} 
                        size={40} 
                        icon={<FaUser />}
                        className="mr-3"
                    />
                    <div>
                        <div className="font-medium">{record.name}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                            <FaEnvelope className="mr-1" /> {record.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Role",
            key: "role",
            render: (text, record) => (
                <div>
                    {record.isAdmin ? (
                        <Tag color="purple">Admin</Tag>
                    ) : record.isDoctor ? (
                        <Tag color="blue">Doctor</Tag>
                    ) : (
                        <Tag color="green">Patient</Tag>
                    )}
                </div>
            ),
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'Doctor', value: 'doctor' },
                { text: 'Patient', value: 'patient' },
            ],
            onFilter: (value, record) => {
                if (value === 'admin') return record.isAdmin;
                if (value === 'doctor') return record.isDoctor;
                if (value === 'patient') return !record.isAdmin && !record.isDoctor;
                return true;
            },
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (text) => formatDate(text),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => getStatusTag(status || 'active'),
            filters: [
                { text: 'Active', value: 'active' },
                { text: 'Blocked', value: 'blocked' },
            ],
            onFilter: (value, record) => (record.status || 'active') === value,
        },
        {
            title: "Actions",
            key: "actions",
            className: "action-buttons-cell",
            render: (text, record) => (
                <Space size="small" wrap>
                    <Button
                        type="primary"
                        icon={<FaInfoCircle />}
                        onClick={() => getUserDetails(record)}
                        title="View Details"
                    >
                        Details
                    </Button>
                    
                    {record.status === 'blocked' || !record.status ? (
                        <Button
                            type="primary"
                            className="bg-success border-0"
                            icon={<FaUnlock />}
                            onClick={() => showConfirmModal('unblock', record)}
                            title="Unblock User"
                        >
                            Unblock
                        </Button>
                    ) : (
                        <Button
                            danger
                            icon={<FaBan />}
                            onClick={() => showConfirmModal('block', record)}
                            title="Block User"
                        >
                            Block
                        </Button>
                    )}
                    
                    <Button
                        type="primary"
                        className="bg-warning border-0"
                        icon={<FaLock />}
                        onClick={() => showConfirmModal('reset', record)}
                        title="Reset Password"
                    >
                        Reset
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Layout>
            <Card className="shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 m-0">User Management</h2>
                        <p className="text-gray-500 m-0 mt-1">Manage system users and their access</p>
                    </div>
                    <div className="flex items-center">
                        <Button 
                            type="primary" 
                            className="mr-4 flex items-center"
                            onClick={downloadUsersExcel}
                            icon={<FaFileExcel className="mr-1" />}
                        >
                            Export to Excel
                        </Button>
                        <div className="w-64">
                            <Input
                                placeholder="Search users..."
                                prefix={<FaSearch className="text-gray-400" />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="rounded-lg"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-blue-50 border border-blue-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {users.filter(user => !user.isAdmin && !user.isDoctor).length}
                                </div>
                                <div className="text-sm text-gray-600">Patients</div>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaUser className="text-blue-500" />
                            </div>
                        </div>
                    </Card>
                    
                    <Card className="bg-indigo-50 border border-indigo-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-indigo-600">
                                    {users.filter(user => user.isDoctor).length}
                                </div>
                                <div className="text-sm text-gray-600">Doctors</div>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <FaUser className="text-indigo-500" />
                            </div>
                        </div>
                    </Card>
                    
                    <Card className="bg-purple-50 border border-purple-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold text-purple-600">
                                    {users.filter(user => user.isAdmin).length}
                                </div>
                                <div className="text-sm text-gray-600">Admins</div>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <FaUser className="text-purple-500" />
                            </div>
                        </div>
                    </Card>
                </div>
                
                <div className="responsive-table-container">
                    <Table
                        columns={columns}
                        dataSource={filteredUsers}
                        rowKey="_id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
                        }}
                        className="shadow-sm rounded-lg overflow-hidden"
                        scroll={{ x: 'max-content' }}
                    />
                    <div className="scroll-indicator">Scroll →</div>
                </div>
            </Card>
            
            {/* User Details Modal */}
            <Modal
                title={
                    <div className="flex items-center text-xl">
                        <FaUser className="mr-2 text-blue-500" />
                        User Details
                    </div>
                }
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsModalVisible(false)}>
                        Close
                    </Button>,
                    selectedUser && selectedUser.status === 'blocked' && (
                        <Button
                            key="unblock"
                            type="primary"
                            icon={<FaUnlock />}
                            onClick={() => showConfirmModal('unblock', selectedUser)}
                        >
                            Unblock User
                        </Button>
                    ),
                    selectedUser && selectedUser.status === 'active' && (
                        <Button
                            key="block"
                            danger
                            icon={<FaBan />}
                            onClick={() => showConfirmModal('block', selectedUser)}
                        >
                            Block User
                        </Button>
                    )
                ]}
            >
                {selectedUser ? (
                    <div className="user-detail-content">
                        <div className="flex flex-col md:flex-row items-center md:items-start mb-6">
                            <Avatar 
                                src={selectedUser.profilePicture} 
                                size={100} 
                                icon={<FaUser />}
                                className="mb-4 md:mb-0 md:mr-6"
                            />
                            <div className="text-center md:text-left">
                                <h3 className="text-xl font-bold mb-1">{selectedUser.name}</h3>
                                <p className="text-gray-500 mb-2">{selectedUser.email}</p>
                                <div className="mb-2">
                                    {selectedUser.isAdmin ? (
                                        <Tag color="purple">Admin</Tag>
                                    ) : selectedUser.isDoctor ? (
                                        <Tag color="blue">Doctor</Tag>
                                    ) : (
                                        <Tag color="green">Patient</Tag>
                                    )}
                                    {getStatusTag(selectedUser.status || 'active')}
                                </div>
                                <p className="text-sm text-gray-500">
                                    Member since: {formatDate(selectedUser.createdAt)}
                                </p>
                            </div>
                        </div>
                        
                        <Card title="User Information" className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-500 mb-1">Full Name</p>
                                    <p className="font-medium">{selectedUser.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Email Address</p>
                                    <p className="font-medium">{selectedUser.email}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Phone</p>
                                    <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Address</p>
                                    <p className="font-medium">{selectedUser.address || 'Not provided'}</p>
                                </div>
                            </div>
                        </Card>
                        
                        {selectedUser.isDoctor && (
                            <Card title="Doctor Information" className="mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-gray-500 mb-1">Department</p>
                                        <p className="font-medium">{selectedUser.department || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 mb-1">Experience</p>
                                        <p className="font-medium">{selectedUser.experience ? `${selectedUser.experience} years` : 'Not specified'}</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        
                        <Card title="Account Activity">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-500 mb-1">Last Login</p>
                                    <p className="font-medium">{selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Not available'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Status</p>
                                    <p className="font-medium">{getStatusTag(selectedUser.status || 'active')}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Spin size="large" />
                        <p className="mt-3 text-gray-500">Loading user details...</p>
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

export default User;
