import Layout from "../components/Layout";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../redux/loader";
import toast from "react-hot-toast";
import moment from "moment";
import { api } from '../utils/apiUtils';
import { getApiUrl } from '../services/apiService';
import { 
  Table, Card, Row, Col, Statistic, Tag, Avatar, 
  Timeline, Modal, Button, Tooltip, Badge, Divider,
  Tabs, Input, Select, DatePicker, Spin, Empty, Progress,
  Space, Typography, Collapse, Descriptions, Rate, Alert,
  Timeline as AntTimeline, Popover, Drawer, List
} from "antd";
import { 
  UserOutlined, ClockCircleOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, FileTextOutlined, BarChartOutlined, 
  CalendarOutlined, MedicineBoxOutlined, SearchOutlined,
  PhoneOutlined, MailOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, HistoryOutlined, TeamOutlined, 
  PieChartOutlined, HeartOutlined, HeartFilled, MessageOutlined,
  StarOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CheckOutlined, CloseOutlined, WarningOutlined, BellOutlined,
  ScheduleOutlined, DollarOutlined, FileDoneOutlined,
  UserAddOutlined, TeamOutlined as TeamIcon, BarChartOutlined as ChartIcon,
  FileAddOutlined
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';
import { FaFileExcel } from 'react-icons/fa';
import MedicalRecordUpload from '../components/MedicalRecordUpload';
import MedicalRecordsList from '../components/MedicalRecordsList';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

function Patient() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState(null);
    const [activeTab, setActiveTab] = useState('1');
    const [statistics, setStatistics] = useState({
        totalPatients: 0,
        activeAppointments: 0,
        completedAppointments: 0,
        pendingAppointments: 0
    });
    const token = localStorage.getItem("token");
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [selectedPatientForUpload, setSelectedPatientForUpload] = useState(null);

    const ChangedStatus = async (record, status) => {
        try {
            dispatch(showLoading());
            const response = await api.post(`doctor/update-appointment-status`,
                { appointmentId: record._id, patientId: record.userId, status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            dispatch(hideLoading());
            if (response.data.success) {
                toast.success(response.data.message);
                getPatientData(false);
            } else {
                toast.error(response.data.message || "Failed to update status");
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    const getPatientData = async (showToast = true) => {
        try {
            dispatch(showLoading());
            setLoading(true);
            const response = await api.get(`doctor/get-patient-list`, {
                params: { doctorId: id },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            dispatch(hideLoading());
            setLoading(false);
            if (response.data.success) {
                setPatients(response.data.patients);
                if (showToast) {
                    toast.success("Fetched successfully");
                }
            } else {
                toast.error(response.data.message || "Failed to fetch patient data");
            }
        } catch (error) {
            dispatch(hideLoading());
            setLoading(false);
            toast.error(error.response?.data?.message || "Failed to fetch patient data");
        }
    };

    const downloadPatientsExcel = async () => {
        try {
            dispatch(showLoading());
            setLoading(true);
            
            console.log("Starting Excel download, userId:", id);
            
            // Check if we have a valid userId
            if (!id) {
                toast.error("User ID not found");
                console.error("Missing userId for Excel download");
                dispatch(hideLoading());
                setLoading(false);
                return;
            }
            
            // First, find the doctor ID by userId
            const doctorResponse = await api.get(`doctor/get-doctor-info`, {
                params: { userId: id },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (!doctorResponse.data.success || !doctorResponse.data.data) {
                toast.error("Doctor information not found");
                console.error("Doctor not found with userId:", id);
                dispatch(hideLoading());
                setLoading(false);
                return;
            }
            
            // Extract the actual doctorId (_id) from the response
            const doctorId = doctorResponse.data.data._id;
            console.log("Found doctor _id:", doctorId);
            
            // Proceed with Excel download using the actual doctorId
            const response = await axios({
                url: getApiUrl(`doctor/download-patients-excel`),
                method: "GET",
                params: { doctorId: doctorId },
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob', // Important: response is a binary blob
                timeout: 30000 // 30 second timeout
            });
            
            console.log("Excel download response received:", {
                status: response.status,
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length'],
                dataSize: response.data?.size
            });
            
            // Check if we got a valid blob response
            if (response.data && response.data.size > 0) {
                // Create a download link for the blob
                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `patients-${moment().format('YYYY-MM-DD')}.xlsx`);
                
                // Append to the document body, click, and then clean up
                document.body.appendChild(link);
                link.click();
                
                // Clean up after a delay to ensure download has started
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 500);
                
                toast.success("Patient data downloaded successfully");
            } else {
                // If the response is empty or invalid
                console.error("Invalid Excel response:", response.data);
                
                // Check if the response is actually JSON (error message)
                if (response.data.size < 1000) { // Small enough to be likely an error message
                    const reader = new FileReader();
                    reader.onload = function() {
                        try {
                            const jsonResponse = JSON.parse(reader.result);
                            toast.error(jsonResponse.message || "Failed to generate Excel file");
                            console.error("Server returned error:", jsonResponse);
                        } catch (e) {
                            // Not JSON, could be empty or corrupt data
                            toast.error("Error downloading patient data - empty or invalid file received");
                        }
                    };
                    reader.readAsText(response.data);
                } else {
                    toast.error("Error downloading patient data");
                }
            }
        } catch (error) {
            console.error("Excel download error:", error);
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Error response:", {
                    status: error.response.status,
                    data: error.response.data
                });
                
                toast.error(error.response.data?.message || "Failed to download patient data");
            } else if (error.request) {
                // The request was made but no response was received
                console.error("No response received:", error.request);
                toast.error("Server did not respond to download request");
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error("Request setup error:", error.message);
                toast.error("Error preparing download request");
            }
        } finally {
            dispatch(hideLoading());
            setLoading(false);
        }
    };

    const deleteDoctorRequest = async (appointmentId) => {
        try {
            dispatch(showLoading());
            const response = await api.delete(`doctor/delete-appointment`,
                {
                    data: { appointmentId },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            dispatch(hideLoading());
            if (response.data.success) {
                toast.success(response.data.message);
                getPatientData(false);
            } else {
                toast.error(response.data.message || "Failed to delete appointment");
            }
        } catch (error) {
            dispatch(hideLoading());
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    const getStatusColor = (status) => {
        switch(status.toLowerCase()) {
            case 'pending': return 'gold';
            case 'approved': return 'green';
            case 'completed': return 'blue';
            case 'rejected': return 'red';
            case 'cancelled': return 'gray';
            default: return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch(status.toLowerCase()) {
            case 'pending': return <ClockCircleOutlined />;
            case 'approved': return <CheckCircleOutlined />;
            case 'completed': return <CheckCircleOutlined />;
            case 'rejected': return <CloseCircleOutlined />;
            case 'cancelled': return <CloseCircleOutlined />;
            default: return <InfoCircleOutlined />;
        }
    };

    const formatDate = (date) => {
        return moment(date).format('MMM D, YYYY [at] h:mm A');
    };

    const calculateStatistics = (patients) => {
        const stats = {
            totalPatients: patients.length,
            activeAppointments: patients.filter(p => p.status === 'approved').length,
            completedAppointments: patients.filter(p => p.status === 'completed').length,
            pendingAppointments: patients.filter(p => p.status === 'pending').length
        };
        setStatistics(stats);
    };

    const fetchMedicalRecords = async (patientId) => {
        if (!patientId) return;
        
        setMedicalRecordsLoading(true);
        try {
            const response = await api.get(`doctor/patient-medical-records`, {
                params: { 
                    patientId,
                    doctorId: id 
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (response.data.success) {
                setMedicalRecords(response.data.data);
            } else {
                toast.error(response.data.message || 'Failed to fetch medical records');
            }
        } catch (error) {
            console.error('Error fetching medical records:', error);
            toast.error('Failed to load medical records');
        } finally {
            setMedicalRecordsLoading(false);
        }
    };
    
    const handleShowUploadModal = (patient) => {
        setSelectedPatientForUpload(patient);
        setUploadModalVisible(true);
    };
    
    const handleUploadSuccess = (newRecord) => {
        // Close the modal
        setUploadModalVisible(false);
        
        // Refresh the medical records for the currently selected patient
        if (selectedPatient?.userId) {
            fetchMedicalRecords(selectedPatient.userId);
        }
        
        toast.success('Medical record uploaded successfully');
    };
    
    const handleDeleteRecord = (recordId) => {
        setMedicalRecords(prev => prev.filter(record => record._id !== recordId));
        toast.success('Medical record deleted successfully');
    };

    const filteredPatients = useMemo(() => {
        let result = [...patients];

        // Apply search filter
        if (searchText) {
            result = result.filter(patient => 
                patient.userInfo.name.toLowerCase().includes(searchText.toLowerCase()) ||
                patient.userInfo.email.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(patient => patient.status === statusFilter);
        }

        // Apply date range filter
        if (dateRange && dateRange[0] && dateRange[1]) {
            result = result.filter(patient => {
                const appointmentDate = moment(patient.date);
                return appointmentDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
            });
        }

        return result;
    }, [patients, searchText, statusFilter, dateRange]);

    const appointmentTrendData = useMemo(() => {
        const data = {};
        patients.forEach(patient => {
            // Properly parse the date using the correct format (DD-MM-YYYY)
            const momentDate = moment(patient.date, "DD-MM-YYYY");
            
            // Check if the date is valid before using it
            if (momentDate.isValid()) {
                const date = momentDate.format('MMM YYYY');
                if (!data[date]) {
                    data[date] = 0;
                }
                data[date]++;
            } else {
                console.warn(`Invalid date found: ${patient.date}`);
            }
        });
        
        // Convert to array and sort by date chronologically
        return Object.entries(data)
            .map(([date, count]) => ({
                date,
                count,
                // Add a sortDate for proper sorting
                sortDate: moment(date, 'MMM YYYY').valueOf()
            }))
            .sort((a, b) => a.sortDate - b.sortDate)
            .map(({ date, count }) => ({ date, count })); // Remove the sortDate from final result
    }, [patients]);

    const statusDistributionData = useMemo(() => {
        const data = {};
        patients.forEach(patient => {
            if (!data[patient.status]) {
                data[patient.status] = 0;
            }
            data[patient.status]++;
        });
        return Object.entries(data).map(([status, count]) => ({
            status,
            count
        }));
    }, [patients]);

    const columns = [
        {
            title: "Patient",
            dataIndex: "userInfo",
            key: "patient",
            render: (userInfo) => (
                <div className="flex items-center">
                    <Avatar 
                        size={40} 
                        icon={<UserOutlined />} 
                        src={userInfo?.image}
                    />
                    <div className="ml-3">
                        <div className="font-medium">{userInfo?.name}</div>
                        <div className="text-gray-500 text-sm">{userInfo?.email}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Appointment Date",
            dataIndex: "date",
            key: "date",
            render: (date) => moment(date, "DD-MM-YYYY").format("DD MMM YYYY"),
        },
        {
            title: "Time",
            dataIndex: "time",
            key: "time",
            render: (time) => moment(time, "HH:mm").format("h:mm A"),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button 
                            type="primary" 
                            icon={<EyeOutlined />}
                            onClick={() => {
                                setSelectedPatient(record);
                                setDetailVisible(true);
                                fetchMedicalRecords(record.userId);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Upload Medical Record">
                        <Button
                            type="primary"
                            ghost
                            icon={<FileTextOutlined />}
                            onClick={() => handleShowUploadModal(record)}
                        />
                    </Tooltip>
                    {record.status === "pending" && (
                        <>
                            <Tooltip title="Approve">
                                <Button 
                                    type="primary" 
                                    ghost
                                    icon={<CheckOutlined />}
                                    onClick={() => ChangedStatus(record, "approved")}
                                />
                            </Tooltip>
                            <Tooltip title="Reject">
                                <Button 
                                    danger
                                    icon={<CloseOutlined />}
                                    onClick={() => ChangedStatus(record, "rejected")}
                                />
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Delete">
                        <Button 
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteDoctorRequest(record._id)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    useEffect(() => {
        if (token) {
            getPatientData();
        }
    }, [token]);

    useEffect(() => {
        calculateStatistics(patients);
    }, [patients]);

    return (
        <Layout>
            <div className="patient-records-container p-6">
                <div className="header mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <Title level={2} className="mb-2">Patient Records</Title>
                            <Text type="secondary">Manage and track your patients' appointments</Text>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Button 
                                type="primary"
                                icon={<FaFileExcel />} 
                                onClick={downloadPatientsExcel}
                            >
                                Export to Excel
                            </Button>
                            <Search
                                placeholder="Search patients"
                                allowClear
                                onSearch={value => setSearchText(value)}
                                style={{ width: 200 }}
                            />
                            <Select
                                style={{ width: 120 }}
                                placeholder="Status"
                                onChange={value => setStatusFilter(value)}
                            >
                                <Option value="all">All</Option>
                                <Option value="pending">Pending</Option>
                                <Option value="approved">Approved</Option>
                                <Option value="completed">Completed</Option>
                                <Option value="rejected">Rejected</Option>
                            </Select>
                            <RangePicker onChange={dates => setDateRange(dates)} />
                        </div>
                    </div>
                </div>

                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Total Patients"
                                value={statistics.totalPatients}
                                prefix={<TeamIcon />}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Active Appointments"
                                value={statistics.activeAppointments}
                                prefix={<ScheduleOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Completed"
                                value={statistics.completedAppointments}
                                prefix={<FileDoneOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Pending"
                                value={statistics.pendingAppointments}
                                prefix={<ClockCircleOutlined />}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={24} md={12}>
                        <Card title="Appointment Trends">
                            <div style={{ height: 300 }}>
                                <Line
                                    data={appointmentTrendData}
                                    xField="date"
                                    yField="count"
                                    point={{ size: 5, shape: 'diamond' }}
                                    label={{ style: { fill: '#aaa' } }}
                                    smooth
                                    animation={{
                                        appear: {
                                            animation: 'path-in',
                                            duration: 1000,
                                        },
                                    }}
                                />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Status Distribution">
                            <div style={{ height: 300 }}>
                                <Pie
                                    data={statusDistributionData}
                                    angleField="count"
                                    colorField="status"
                                    radius={0.8}
                                    label={{
                                        type: 'outer',
                                        content: '{name} {percentage}'
                                    }}
                                    animation={{
                                        appear: {
                                            animation: 'wave-in',
                                            duration: 1000,
                                        },
                                    }}
                                />
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={filteredPatients}
                        rowKey="_id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true
                        }}
                    />
                </Card>

                <Drawer
                    title="Patient Details"
                    placement="right"
                    width={720}
                    onClose={() => setDetailVisible(false)}
                    open={detailVisible}
                    extra={
                        <Space>
                            <Button onClick={() => setDetailVisible(false)}>Close</Button>
                            <Button 
                                type="primary" 
                                icon={<MailOutlined />}
                                onClick={() => {
                                    if (selectedPatient?.userInfo?.email) {
                                        const email = selectedPatient.userInfo.email;
                                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
                                    } else {
                                        toast.error("Patient email not available");
                                    }
                                }}
                            >
                                Send Email
                            </Button>
                        </Space>
                    }
                >
                    {selectedPatient ? (
                        <div className="patient-details">
                            <div className="basic-info mb-6">
                                <div className="flex items-center mb-4">
                                    <Avatar 
                                        size={64} 
                                        icon={<UserOutlined />} 
                                        src={selectedPatient.userInfo?.image}
                                    />
                                    <div className="ml-4">
                                        <Title level={3}>{selectedPatient.userInfo?.name}</Title>
                                        <Space direction="vertical">
                                            <Text type="secondary">
                                                <MailOutlined /> {selectedPatient.userInfo?.email}
                                            </Text>
                                            {selectedPatient.emergencyContact && (
                                                <Text type="secondary">
                                                    <PhoneOutlined /> {selectedPatient.emergencyContact}
                                                </Text>
                                            )}
                                        </Space>
                                    </div>
                                </div>
                                
                                <Row gutter={16} className="mb-6">
                                    <Col span={8}>
                                        <Card>
                                            <Statistic 
                                                title="Appointment Date" 
                                                value={moment(selectedPatient.date, "DD-MM-YYYY").format('DD MMM YYYY')}
                                                prefix={<CalendarOutlined />} 
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card>
                                            <Statistic 
                                                title="Appointment Time" 
                                                value={moment(selectedPatient.time, "HH:mm").format("h:mm A")}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card>
                                            <Statistic 
                                                title="Status" 
                                                value={selectedPatient.status.toUpperCase()} 
                                                valueStyle={{ 
                                                    color: getStatusColor(selectedPatient.status)
                                                }}
                                                prefix={getStatusIcon(selectedPatient.status)}
                                            />
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                            
                            <Tabs defaultActiveKey="appointment" className="mb-6">
                                <TabPane 
                                    tab={<span><CalendarOutlined /> Appointment Details</span>} 
                                    key="appointment"
                                >
                                    <Card>
                                        <Descriptions column={1}>
                                            <Descriptions.Item label="Reason for Visit">
                                                {selectedPatient.reason || 'Not specified'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Created On">
                                                {formatDate(selectedPatient.createdAt)}
                                            </Descriptions.Item>
                                            {selectedPatient.status === 'rejected' && selectedPatient.rejectionReason && (
                                                <Descriptions.Item label="Rejection Reason">
                                                    {selectedPatient.rejectionReason}
                                                </Descriptions.Item>
                                            )}
                                        </Descriptions>
                                    </Card>
                                </TabPane>
                                
                                <TabPane 
                                    tab={<span><HistoryOutlined /> Appointment History</span>} 
                                    key="history"
                                >
                                    <AntTimeline>
                                        {patients
                                            .filter(p => p.userId === selectedPatient.userId)
                                            .map(appointment => (
                                                <AntTimeline.Item
                                                    key={appointment._id}
                                                    color={getStatusColor(appointment.status)}
                                                    dot={getStatusIcon(appointment.status)}
                                                >
                                                    <p><strong>Date:</strong> {moment(appointment.date, "DD-MM-YYYY").format('DD MMM YYYY')}</p>
                                                    <p><strong>Time:</strong> {moment(appointment.time, "HH:mm").format("h:mm A")}</p>
                                                    <p><strong>Status:</strong> {appointment.status.toUpperCase()}</p>
                                                </AntTimeline.Item>
                                            ))}
                                    </AntTimeline>
                                </TabPane>
                                
                                <TabPane 
                                    tab={<span><FileTextOutlined /> Medical Records</span>} 
                                    key="records"
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <Title level={5} className="m-0">Patient Medical Records</Title>
                                        <Button 
                                            type="primary" 
                                            icon={<FileAddOutlined />}
                                            onClick={() => handleShowUploadModal(selectedPatient)}
                                        >
                                            Upload Record
                                        </Button>
                                    </div>
                                    
                                    <MedicalRecordsList 
                                        records={medicalRecords}
                                        loading={medicalRecordsLoading}
                                        onDelete={handleDeleteRecord}
                                        isDoctor={true}
                                    />
                                </TabPane>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-full">
                            <Spin size="large" />
                        </div>
                    )}
                </Drawer>
            </div>
            
            {/* Wrap the MedicalRecordUpload in a Modal instead of rendering it directly */}
            <Modal
                title={
                    <div className="flex items-center">
                        <FileAddOutlined className="text-blue-500 mr-2" />
                        <span>Upload Medical Record{selectedPatientForUpload?.userInfo?.name ? ` for ${selectedPatientForUpload.userInfo.name}` : ''}</span>
                    </div>
                }
                open={uploadModalVisible}
                onCancel={() => setUploadModalVisible(false)}
                footer={null}
                width={600}
                destroyOnClose={true}
            >
                {selectedPatientForUpload && (
                    <MedicalRecordUpload
                        patientId={selectedPatientForUpload?.userId}
                        doctorId={id}
                        patientName={selectedPatientForUpload?.userInfo?.name}
                        onSuccess={handleUploadSuccess}
                        onCancel={() => setUploadModalVisible(false)}
                    />
                )}
            </Modal>
        </Layout>
    );
}

export default Patient;
