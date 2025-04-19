import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { api } from '../../utils/apiUtils';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Input,
  Card,
  Avatar,
  Timeline,
  Badge,
  Tooltip,
  Select,
  DatePicker,
  Statistic,
  Row,
  Col,
  Tabs,
  Divider,
  Empty,
  Drawer,
  Progress,
  Alert,
  Steps,
  Rate,
  Checkbox,
  Form
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  HeartOutlined,
  AlertOutlined,
  MessageOutlined,
  FilterOutlined,
  SearchOutlined,
  FileTextOutlined,
  ReloadOutlined,
  MedicineBoxOutlined,
  HistoryOutlined,
  PieChartOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  StarOutlined
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import { showLoading, hideLoading } from '../../redux/loader';
import moment from 'moment';
import { useSocket } from '../../context/SocketContext';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const PatientAppointments = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.user);
  const { socket, isConnected, checkConnection } = useSocket();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewDetailsDrawer, setViewDetailsDrawer] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [socketDebugInfo, setSocketDebugInfo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0
  });
  const [feedbackForm] = Form.useForm();
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [appointmentFeedback, setAppointmentFeedback] = useState(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(false);

  // Debug function to check connection
  const checkSocketConnection = async () => {
    try {
      // Force reconnect if not connected
      if (!isConnected) {
        checkConnection();
      }

      const response = await api.get(`debug/socket-status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });

      const debugInfo = {
        serverStatus: response.data,
        clientStatus: {
          socketConnected: isConnected,
          socketId: socket?.id,
          userId: user?._id,
          registeredWithSocket: isConnected && socket?.id
        }
      };

      console.log("Socket debug info:", debugInfo);
      setSocketDebugInfo(debugInfo);

      if (!isConnected) {
        toast.error("Socket not connected. Attempting reconnection...");
      } else if (debugInfo.serverStatus.activeUsers.find(u => u.userId === user?._id)) {
        toast.success("Socket connected and registered properly!");
      } else {
        toast.warning("Socket connected but user not registered with server!");
      }

    } catch (error) {
      console.error("Error checking socket connection:", error);
      toast.error("Could not check socket connection status");
    }
  };

  // Fetch user appointments
  const getAppointmentsData = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());

      const response = await api.get(`user/get-user-appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      dispatch(hideLoading());
      setLoading(false);

      if (response.data.success) {
        setAppointments(response.data.data.appointments);
        setStats(response.data.data.stats);
      } else {
        toast.error(response.data.message || "Failed to fetch appointments");
      }
    } catch (error) {
      dispatch(hideLoading());
      setLoading(false);
      toast.error("Error fetching appointments");
      console.error(error);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    Modal.confirm({
      title: 'Cancel Appointment',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          dispatch(showLoading());

          const response = await api.post(`user/cancel-appointment`,
            { appointmentId },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          dispatch(hideLoading());

          if (response.data.success) {
            toast.success(response.data.message || "Appointment cancelled successfully");
            getAppointmentsData();
          } else {
            toast.error(response.data.message || "Failed to cancel appointment");
          }
        } catch (error) {
          dispatch(hideLoading());
          toast.error("Error cancelling appointment");
          console.error(error);
        }
      },
    });
  };

  const renderStatusTag = (status, feedbackProvided) => {
    const statusConfig = {
      pending: { color: 'gold', icon: <ClockCircleOutlined />, text: 'Pending' },
      approved: { color: 'green', icon: <CheckCircleOutlined />, text: 'Approved' },
      rejected: { color: 'red', icon: <CloseCircleOutlined />, text: 'Rejected' },
      completed: { color: 'blue', icon: <CheckCircleOutlined />, text: 'Completed' },
      cancelled: { color: 'gray', icon: <CloseCircleOutlined />, text: 'Cancelled' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };

    return (
      <div>
        <Tag color={config.color} icon={config.icon}>
          {config.text}
        </Tag>
        {status === 'completed' && (
          <div className="mt-1">
            {feedbackProvided ? (
              <Tag color="green" icon={<StarOutlined />} style={{ marginLeft: 0 }}>
                Feedback Provided
              </Tag>
            ) : (
              <Tag color="orange" icon={<StarOutlined />} style={{ marginLeft: 0 }}>
                Feedback Needed
              </Tag>
            )}
          </div>
        )}
      </div>
    );
  };

  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setViewDetailsDrawer(true);
    if (appointment.status === 'completed') {
      getAppointmentFeedback(appointment._id);
    }
  };

  const getStatusSteps = (status) => {
    const statuses = ['pending', 'approved', 'completed'];
    const currentIndex = statuses.indexOf(status);

    if (status === 'rejected' || status === 'cancelled') {
      return -1; // Special case for rejected/cancelled
    }

    return currentIndex >= 0 ? currentIndex : 0;
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch =
      appointment.doctorInfo?.firstname?.toLowerCase().includes(searchText.toLowerCase()) ||
      appointment.doctorInfo?.lastname?.toLowerCase().includes(searchText.toLowerCase()) ||
      appointment.reason?.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

    const matchesDate = !dateRange || (
      moment(appointment.date, "DD-MM-YYYY").isSameOrAfter(dateRange[0], 'day') &&
      moment(appointment.date, "DD-MM-YYYY").isSameOrBefore(dateRange[1], 'day')
    );

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Group appointments by status for tabbed viewing
  const getAppointmentsByStatus = (status) => {
    return filteredAppointments.filter(
      appointment => status === 'all' ? true : appointment.status === status
    );
  };

  const columns = [
    {
      title: "Doctor",
      dataIndex: "doctorInfo",
      key: "doctor",
      render: (doctorInfo) => (
        <div className="flex items-center">
          <Avatar
            icon={<UserOutlined />}
            className="mr-2"
          />
          <div>
            <div className="font-medium">Dr. {doctorInfo?.firstname} {doctorInfo?.lastname}</div>
            <div className="text-gray-500 text-xs">{(() => {
              const specialization = doctorInfo?.specialization;
              if (!specialization) return 'General Practice';

              // If array, join with commas
              if (Array.isArray(specialization)) {
                return specialization.join(', ');
              }

              // If string but looks like array (has brackets)
              if (typeof specialization === 'string') {
                if (specialization.startsWith('[') && specialization.endsWith(']')) {
                  try {
                    const parsed = JSON.parse(specialization);
                    return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                  } catch (e) {
                    // If can't parse, remove brackets manually
                    return specialization.replace(/^\[|\]$/g, '').replace(/"/g, '');
                  }
                }
                return specialization;
              }

              return 'General Practice';
            })()}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => moment(a.date, "DD-MM-YYYY").unix() - moment(b.date, "DD-MM-YYYY").unix(),
      render: (date, record) => (
        <div>
          <div className="font-medium">{moment(date, "DD-MM-YYYY").format("DD MMM YYYY")}</div>
          <div className="text-gray-500 text-sm">{moment(record.time, "HH:mm").format("h:mm A")}</div>
        </div>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Completed', value: 'completed' },
        { text: 'Rejected', value: 'rejected' },
        { text: 'Cancelled', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status, record) => renderStatusTag(status, record.feedbackProvided),
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => viewAppointmentDetails(record)}
            />
          </Tooltip>

          {record.status === "completed" && !record.feedbackProvided && (
            <Tooltip title="Provide Feedback">
              <Button
                type="primary"
                ghost
                icon={<StarOutlined />}
                onClick={async () => {
                  // Make sure we have the latest appointment data
                  try {
                    // Ensure we refresh the appointment data first
                    await getAppointmentsData();

                    // Find the refreshed appointment in the updated list
                    const refreshedAppointment = appointments.find(a => a._id === record._id);

                    if (refreshedAppointment && refreshedAppointment.status === 'completed') {
                      setSelectedAppointment(refreshedAppointment);
                      getAppointmentFeedback(refreshedAppointment._id);
                      feedbackForm.resetFields();
                      feedbackForm.setFieldsValue({
                        rating: 5,
                        satisfaction: 'Satisfied',
                        comment: '',
                        showAsTestimonial: true
                      });
                      setFeedbackModalVisible(true);
                    } else {
                      toast.error("Couldn't get updated appointment data. Please refresh the page.");
                    }
                  } catch (error) {
                    console.error("Error refreshing appointment data:", error);
                    toast.error("Error preparing feedback form. Please try again.");
                  }
                }}
              >
                Feedback
              </Button>
            </Tooltip>
          )}

          {(record.status === "pending" || record.status === "approved") && (
            <Tooltip title="Cancel Appointment">
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => cancelAppointment(record._id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Load appointments when component mounts
  useEffect(() => {
    if (user?._id) {
      getAppointmentsData();
    }
  }, [user]);

  // Function to get appointment status percentage for dashboard
  const getCompletionPercentage = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  // Get feedback for selected appointment
  const getAppointmentFeedback = async (appointmentId) => {
    try {
      console.log("Getting feedback for appointment:", appointmentId);

      const response = await api.get(`user/get-appointment-feedback?appointmentId=${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Feedback response:", response.data);

      if (response.data.success) {
        setAppointmentFeedback(response.data.data);
      } else {
        console.log("No feedback found or error:", response.data.message);
        setAppointmentFeedback(null);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }
      setAppointmentFeedback(null);
    }
  };

  // Enhanced submitFeedback function with more logging
  const submitFeedback = async (values) => {
    try {
      // Validate required fields before submission
      if (!values.rating) {
        toast.error("Please provide a rating");
        return false;
      }

      if (!values.satisfaction) {
        toast.error("Please select your satisfaction level");
        return false;
      }

      setFeedbackSubmitting(true);

      // Ensure we have a selected appointment
      if (!selectedAppointment || !selectedAppointment._id) {
        console.error("Missing appointment data:", selectedAppointment);
        toast.error("Appointment data is missing");
        setFeedbackSubmitting(false);
        return false;
      }

      // Debug: Log all values being sent
      console.log("Full appointment data:", selectedAppointment);
      console.log("Appointment ID:", selectedAppointment._id);
      console.log("Appointment status:", selectedAppointment.status);
      console.log("User ID:", user?._id);

      const feedbackData = {
        appointmentId: selectedAppointment._id,
        rating: values.rating,
        satisfaction: values.satisfaction,
        comment: values.comment || "",
        showAsTestimonial: values.showAsTestimonial || false,
        patientName: values.showAsTestimonial ? user.name : null
      };

      console.log("Submitting feedback with data:", feedbackData);

      const response = await api.post(`user/submit-feedback`,
        feedbackData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Feedback submission response:", response.data);

      if (response.data.success) {
        toast.success("Feedback submitted successfully");
        await getAppointmentFeedback(selectedAppointment._id);
        await getAppointmentsData(); // Refresh the appointments to update feedback status
        return true; // Return a value to indicate success
      } else {
        toast.error(response.data.message || "Failed to submit feedback");
        return false;
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);
        toast.error(error.response.data.message || "Error submitting feedback");
      } else if (error.request) {
        console.error("Error request:", error.request);
        toast.error("No response received from server. Please try again.");
      } else {
        toast.error("Error preparing feedback submission");
      }
      return false; // Return a value to indicate failure
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // When viewing appointment details, fetch feedback if it's completed
  useEffect(() => {
    if (selectedAppointment && selectedAppointment.status === 'completed') {
      getAppointmentFeedback(selectedAppointment._id);
    } else {
      setAppointmentFeedback(null);
    }
  }, [selectedAppointment]);

  // Add useEffect to make sure form is reset when modal is opened or closed
  useEffect(() => {
    if (feedbackModalVisible && !appointmentFeedback) {
      feedbackForm.resetFields();
    }
  }, [feedbackModalVisible, appointmentFeedback]);

  // Function to fetch medical records for an appointment
  const fetchMedicalRecords = async (appointmentId) => {
    try {
      if (!appointmentId) {
        console.error("Cannot fetch medical records: Appointment ID is missing");
        toast.error("Cannot fetch medical records: Invalid appointment");
        return [];
      }
      
      console.log(`Fetching medical records for appointment: ${appointmentId}`);
      setMedicalRecordsLoading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Authentication token missing");
        toast.error("Authentication error. Please log in again.");
        setMedicalRecordsLoading(false);
        return [];
      }
      
      const response = await api.get(`doctor/medical-records-by-appointment/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setMedicalRecordsLoading(false);
      
      if (response.data.success) {
        const records = response.data.data.medicalRecords || [];
        console.log(`Successfully fetched ${records.length} medical records`);
        setMedicalRecords(records);
        return records;
      } else {
        console.error("Server returned error:", response.data.message);
        toast.error(response.data.message || "Failed to fetch medical records");
        return [];
      }
    } catch (error) {
      setMedicalRecordsLoading(false);
      console.error("Error fetching medical records:", error);
      console.error("Error details:", error.response?.data || "No detailed error information");
      toast.error("Failed to fetch medical records. Please try again later.");
      return [];
    }
  };

  // Open medical record in a new tab
  const openMedicalRecord = (fileUrl) => {
    if (fileUrl) {
      // Check if it's a PDF and format URL correctly
      let url = fileUrl;
      if (url.toLowerCase().endsWith('.pdf')) {
        // Make sure we're using raw upload path instead of image path
        if (url.includes('/image/upload/')) {
          url = url.replace('/image/upload/', '/raw/upload/');
        }
        
        // Add required flags to bypass security restrictions
        if (url.includes('/upload/') && !url.includes('fl_attachment')) {
          url = url.replace('/upload/', '/upload/fl_attachment,fl_no_overflow/');
        }
      }
      
      // Add cache-busting parameter
      const cacheBuster = `cb=${Date.now()}`;
      url = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
      
      // Open in a new tab
      window.open(url, '_blank');
    } else {
      toast.error("No file available for this record");
    }
  };

  // Request email delivery of a medical record
  const requestEmailDelivery = async (recordId) => {
    try {
      if (!recordId) {
        toast.error("Invalid record ID");
        return;
      }
      
      setLoading(true);
      console.log(`Requesting email delivery for record: ${recordId}`);
      
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Authentication token missing");
        toast.error("Authentication error. Please log in again.");
        setLoading(false);
        return;
      }
      
      const response = await api.post(`doctor/email-medical-record/${recordId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setLoading(false);
      
      if (response.data.success) {
        console.log("Email delivery request successful");
        toast.success("Medical record has been sent to your email");
      } else {
        console.error("Server returned error:", response.data.message);
        toast.error(response.data.message || "Failed to send medical record email");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error sending medical record email:", error);
      console.error("Error details:", error.response?.data || "No detailed error information");
      toast.error("Error sending medical record to your email. Please try again later.");
    }
  };

  // Add useEffect to fetch medical records when appointment details drawer opens
  useEffect(() => {
    if (viewDetailsDrawer && selectedAppointment?._id) {
      fetchMedicalRecords(selectedAppointment._id);
    }
  }, [viewDetailsDrawer, selectedAppointment]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
              <p className="text-gray-600">View and manage your appointments</p>
            </div>
            {/* <div className="flex space-x-2">
              <Tooltip title="Check notification connection">
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  onClick={checkSocketConnection}
                >
                  Check Connection
                </Button>
              </Tooltip>

              <Tooltip title="Send a test notification">
                <Button
                  type="primary"
                  icon={<BellOutlined />}
                  onClick={async () => {
                    try {
                      const response = await api.post(`user/test-notification`,
                        { userId: user._id },
                        {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                          },
                        }
                      );

                      if (response.data.success) {
                        toast.success("Test notification sent");
                      }
                    } catch (error) {
                      console.error("Error sending test notification:", error);
                      toast.error("Could not send test notification");
                    }
                  }}
                >
                  Test Notification
                </Button>
              </Tooltip>
            </div> */}
          </div>

          {socketDebugInfo && (
            <Alert
              message="Socket Connection Status"
              description={
                <div>
                  <p><strong>Connected to server:</strong> {socketDebugInfo.clientStatus.socketConnected ? '✅' : '❌'}</p>
                  <p><strong>User registered with socket:</strong> {socketDebugInfo.serverStatus.activeUsers.find(u => u.userId === user?._id) ? '✅' : '❌'}</p>
                  <p><strong>Socket ID:</strong> {socketDebugInfo.clientStatus.socketId || 'Not connected'}</p>
                </div>
              }
              type={socketDebugInfo.clientStatus.socketConnected ? "success" : "error"}
              showIcon
              closable
              className="mt-4"
            />
          )}
        </div>

        {/* Dashboard Cards */}
        <Row gutter={16} className="mb-6">
          <Col span={4}>
            <Card>
              <Statistic
                title="Total Appointments"
                value={stats.total}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Approved"
                value={stats.approved}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                valueStyle={{ color: '#1890ff' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Rejected"
                value={stats.rejected}
                valueStyle={{ color: '#f5222d' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Cancelled"
                value={stats.cancelled}
                valueStyle={{ color: '#8c8c8c' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Health Progress Card */}
        <Card className="mb-6">
          <Row gutter={16} align="middle">
            <Col span={16}>
              <div className="mb-2">
                <h3 className="text-lg font-medium">Treatment Progress</h3>
                <p className="text-gray-500">Appointments completed vs total appointments</p>
              </div>
              <Progress
                percent={getCompletionPercentage()}
                status={getCompletionPercentage() === 100 ? "success" : "active"}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </Col>
            <Col span={8}>
              <Card className="bg-blue-50 border-0">
                <div className="text-center">
                  <Statistic
                    title="Completion Rate"
                    value={getCompletionPercentage()}
                    suffix="%"
                    precision={0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                  <p className="mt-2 text-gray-600">
                    {stats.completed} out of {stats.total} appointments completed
                  </p>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search by doctor name or reason"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="completed">Completed</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 300 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setDateRange(null);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>

        {/* Tabs & Table */}
        <Card className="shadow-lg">
          <Tabs
            defaultActiveKey="1"
            activeKey={activeTab}
            onChange={setActiveTab}
          >
            <TabPane tab="All Appointments" key="1">
              <Table
                columns={columns}
                dataSource={filteredAppointments}
                loading={loading}
                rowKey="_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} appointments`
                }}
              />
            </TabPane>
            <TabPane tab={
              <span>
                <ClockCircleOutlined />
                Pending
                <Tag color="gold" className="ml-1">{getAppointmentsByStatus('pending').length}</Tag>
              </span>
            } key="2">
              <Table
                columns={columns}
                dataSource={getAppointmentsByStatus('pending')}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={
              <span>
                <CheckCircleOutlined />
                Approved
                <Tag color="green" className="ml-1">{getAppointmentsByStatus('approved').length}</Tag>
              </span>
            } key="3">
              <Table
                columns={columns}
                dataSource={getAppointmentsByStatus('approved')}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={
              <span>
                <CheckCircleOutlined />
                Completed
                <Tag color="blue" className="ml-1">{getAppointmentsByStatus('completed').length}</Tag>
              </span>
            } key="4">
              <Table
                columns={columns}
                dataSource={getAppointmentsByStatus('completed')}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={
              <span>
                <CloseCircleOutlined />
                Rejected/Cancelled
                <Tag color="red" className="ml-1">{
                  getAppointmentsByStatus('rejected').length + getAppointmentsByStatus('cancelled').length
                }</Tag>
              </span>
            } key="5">
              <Table
                columns={columns}
                dataSource={[...getAppointmentsByStatus('rejected'), ...getAppointmentsByStatus('cancelled')]}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* Detailed View Drawer */}
        <Drawer
          title="Appointment Details"
          placement="right"
          onClose={() => setViewDetailsDrawer(false)}
          open={viewDetailsDrawer}
          width={600}
        >
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Status Badge and Progress Indicator */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    Appointment Status: {renderStatusTag(selectedAppointment.status, selectedAppointment.feedbackProvided)}
                  </h2>
                  {selectedAppointment.status === 'rejected' && (
                    <Tag color="red">
                      <CloseCircleOutlined /> Rejected
                    </Tag>
                  )}
                  {selectedAppointment.status === 'cancelled' && (
                    <Tag color="gray">
                      <CloseCircleOutlined /> Cancelled
                    </Tag>
                  )}
                </div>

                {selectedAppointment.status !== 'rejected' && selectedAppointment.status !== 'cancelled' && (
                  <div className="mb-4">
                    <Steps
                      current={getStatusSteps(selectedAppointment.status)}
                      items={[
                        {
                          title: 'Pending',
                          description: 'Awaiting confirmation',
                          icon: <ClockCircleOutlined />
                        },
                        {
                          title: 'Approved',
                          description: 'Appointment confirmed',
                          icon: <CheckCircleOutlined />
                        },
                        {
                          title: 'Completed',
                          description: 'Treatment finished',
                          icon: <CheckCircleOutlined />
                        },
                      ]}
                    />
                  </div>
                )}

                {(selectedAppointment.status === 'rejected' && selectedAppointment.rejectionReason) && (
                  <Alert
                    message="Appointment Rejected"
                    description={selectedAppointment.rejectionReason}
                    type="error"
                    showIcon
                    className="mb-4"
                  />
                )}
              </div>

              <Tabs defaultActiveKey="1">
                <TabPane tab="Doctor Information" key="1">
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar
                      size={64}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <h3 className="text-lg font-semibold">
                        Dr. {selectedAppointment.doctorInfo?.firstname} {selectedAppointment.doctorInfo?.lastname}
                      </h3>
                      <div className="text-gray-500">
                        {(() => {
                          const specialization = selectedAppointment.doctorInfo?.specialization;
                          if (!specialization) return 'General Practice';

                          // If array, join with commas
                          if (Array.isArray(specialization)) {
                            return specialization.join(', ');
                          }

                          // If string but looks like array (has brackets)
                          if (typeof specialization === 'string') {
                            if (specialization.startsWith('[') && specialization.endsWith(']')) {
                              try {
                                const parsed = JSON.parse(specialization);
                                return Array.isArray(parsed) ? parsed.join(', ') : parsed;
                              } catch (e) {
                                // If can't parse, remove brackets manually
                                return specialization.replace(/^\[|\]$/g, '').replace(/"/g, '');
                              }
                            }
                            return specialization;
                          }

                          return 'General Practice';
                        })()}
                      </div>
                      {selectedAppointment.doctorInfo?.phone && (
                        <div className="flex items-center text-gray-600">
                          <PhoneOutlined className="mr-2" />
                          {selectedAppointment.doctorInfo?.phone}
                        </div>
                      )}
                      {selectedAppointment.doctorInfo?.email && (
                        <div className="flex items-center text-gray-600">
                          <MailOutlined className="mr-2" />
                          {selectedAppointment.doctorInfo?.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gray-50">
                      <Statistic
                        title="Experience"
                        value={selectedAppointment.doctorInfo?.experience || 'N/A'}
                        suffix="years"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                    <Card className="bg-gray-50">
                      <Statistic
                        title="Fee (per consultation)"
                        value={selectedAppointment.doctorInfo?.feePerConsultation || 'N/A'}
                        prefix="₹"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </div>
                </TabPane>

                <TabPane tab="Appointment Details" key="2">
                  <div className="space-y-4">
                    <Row gutter={16} className="mb-6">
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Appointment Date"
                            value={moment(selectedAppointment.date, "DD-MM-YYYY").format('DD MMM YYYY')}
                            prefix={<CalendarOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card>
                          <Statistic
                            title="Appointment Time"
                            value={moment(selectedAppointment.time, "HH:mm").format("h:mm A")}
                            prefix={<ClockCircleOutlined />}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card title="Reason for Visit" className="mt-4">
                      <p>{selectedAppointment.reason}</p>
                    </Card>

                    {selectedAppointment.symptoms && (
                      <Card title="Symptoms" className="mt-4">
                        <p>{selectedAppointment.symptoms}</p>
                      </Card>
                    )}

                    {selectedAppointment.medicalHistory && (
                      <Card title="Medical History" className="mt-4">
                        <p>{selectedAppointment.medicalHistory}</p>
                      </Card>
                    )}

                    {selectedAppointment.additionalNotes && (
                      <Card title="Additional Notes" className="mt-4">
                        <p>{selectedAppointment.additionalNotes}</p>
                      </Card>
                    )}

                    <Card title="Contact Preferences" className="mt-4">
                      <p><strong>Preferred Communication:</strong> {selectedAppointment.preferredCommunication}</p>
                      {selectedAppointment.emergencyContact && (
                        <p><strong>Emergency Contact:</strong> {selectedAppointment.emergencyContact}</p>
                      )}
                    </Card>
                  </div>
                </TabPane>

                <TabPane tab="Appointment Timeline" key="3">
                  <Timeline>
                    <Timeline.Item
                      color="blue"
                      dot={<HistoryOutlined />}
                    >
                      <p><strong>Appointment Created</strong></p>
                      <p>{moment(selectedAppointment.createdAt).format('MMMM Do YYYY, h:mm a')}</p>
                    </Timeline.Item>

                    {selectedAppointment.status !== 'pending' && (
                      <Timeline.Item
                        color={selectedAppointment.status === 'rejected' ? 'red' : 'green'}
                        dot={selectedAppointment.status === 'rejected' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                      >
                        <p><strong>{selectedAppointment.status === 'rejected' ? 'Appointment Rejected' : 'Appointment Approved'}</strong></p>
                        <p>{moment(selectedAppointment.updatedAt).format('MMMM Do YYYY, h:mm a')}</p>
                        {selectedAppointment.status === 'rejected' && selectedAppointment.rejectionReason && (
                          <p className="text-red-500">Reason: {selectedAppointment.rejectionReason}</p>
                        )}
                      </Timeline.Item>
                    )}

                    {selectedAppointment.status === 'completed' && (
                      <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                        <p><strong>Treatment Completed</strong></p>
                        <p>{moment(selectedAppointment.updatedAt).format('MMMM Do YYYY, h:mm a')}</p>
                      </Timeline.Item>
                    )}
                  </Timeline>
                </TabPane>

                <TabPane tab="Medical Records" key="4">
                  <div className="space-y-4">
                    {medicalRecordsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                        <p>Loading medical records...</p>
                      </div>
                    ) : medicalRecords.length > 0 ? (
                      <>
                        <Alert
                          message="Medical Records"
                          description="These are the medical records associated with this appointment."
                          type="info"
                          showIcon
                          className="mb-4"
                        />
                        
                        {medicalRecords.map((record) => (
                          <Card key={record._id} className="mb-4 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-semibold">{record.title}</h3>
                                <p className="text-gray-500 text-sm">{moment(record.createdAt).format('MMMM Do YYYY, h:mm a')}</p>
                              </div>
                              <Tag color={record.fileUrl && record.fileUrl.toLowerCase().endsWith('.pdf') ? 'red' : 'blue'}>
                                {record.fileUrl && record.fileUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Document'}
                              </Tag>
                            </div>
                            
                            {record.description && (
                              <p className="mt-2 text-gray-700">{record.description}</p>
                            )}
                            
                            <div className="flex justify-end mt-4 space-x-2">
                              <Button 
                                type="primary" 
                                onClick={() => openMedicalRecord(record.fileUrl)}
                                disabled={!record.fileUrl}
                              >
                                View
                              </Button>
                              <Button
                                onClick={() => requestEmailDelivery(record._id)}
                                icon={<MailOutlined />}
                              >
                                Send to my email
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </>
                    ) : (
                      <Empty 
                        description="No medical records found for this appointment"
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      />
                    )}
                  </div>
                </TabPane>
              </Tabs>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-2">
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'approved') && (
                  <Button
                    danger
                    onClick={() => {
                      cancelAppointment(selectedAppointment._id);
                      setViewDetailsDrawer(false);
                    }}
                  >
                    Cancel Appointment
                  </Button>
                )}
                <Button onClick={() => setViewDetailsDrawer(false)}>Close</Button>
              </div>
            </div>
          )}
        </Drawer>

        {/* Feedback Modal */}
        <Modal
          title={
            <div className="flex items-center">
              <StarOutlined className="text-yellow-500 mr-2" />
              <span>Provide Feedback</span>
            </div>
          }
          open={feedbackModalVisible}
          onCancel={() => setFeedbackModalVisible(false)}
          footer={null}
          width={600}
        >
          {selectedAppointment && (
            <div className="mb-4">
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <div className="font-medium">Appointment with Dr. {selectedAppointment.doctorInfo?.firstname} {selectedAppointment.doctorInfo?.lastname}</div>
                <div className="text-gray-500 text-sm">
                  {moment(selectedAppointment.date, "DD-MM-YYYY").format("DD MMM YYYY")} at {moment(selectedAppointment.time, "HH:mm").format("h:mm A")}
                </div>
              </div>

              {appointmentFeedback ? (
                <div className="space-y-4">
                  <Alert
                    message="Thank you for your feedback!"
                    description="Your feedback helps us improve our services and assists other patients in choosing the right healthcare provider."
                    type="success"
                    showIcon
                  />

                  <Card title="Your Feedback">
                    <div className="mb-4">
                      <strong>Rating:</strong> <Rate disabled value={appointmentFeedback.rating} />
                    </div>
                    <div className="mb-4">
                      <strong>Satisfaction:</strong> {appointmentFeedback.satisfaction}
                    </div>
                    {appointmentFeedback.comment && (
                      <div className="mb-4">
                        <strong>Comments:</strong>
                        <p>{appointmentFeedback.comment}</p>
                      </div>
                    )}
                    <div>
                      <Checkbox
                        checked={appointmentFeedback.showAsTestimonial}
                        disabled
                      >
                        Shown as testimonial on doctor's profile
                      </Checkbox>
                    </div>
                  </Card>

                  <div className="flex justify-end mt-4">
                    <Button onClick={() => setFeedbackModalVisible(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <Form
                  form={feedbackForm}
                  layout="vertical"
                  onFinish={async (values) => {
                    const success = await submitFeedback(values);
                    if (success) {
                      // Close modal after successful submission
                      setTimeout(() => {
                        setFeedbackModalVisible(false);
                      }, 1500);
                    }
                  }}
                >
                  <div className="space-y-4">
                    <Form.Item
                      label="How would you rate your overall experience?"
                      name="rating"
                      rules={[{ required: true, message: 'Please rate your experience' }]}
                    >
                      <Rate allowHalf />
                    </Form.Item>

                    <Form.Item
                      label="How satisfied were you with the treatment?"
                      name="satisfaction"
                      rules={[{ required: true, message: 'Please select your satisfaction level' }]}
                    >
                      <Select placeholder="Select your satisfaction level">
                        <Option value="Very Satisfied">Very Satisfied</Option>
                        <Option value="Satisfied">Satisfied</Option>
                        <Option value="Neutral">Neutral</Option>
                        <Option value="Dissatisfied">Dissatisfied</Option>
                        <Option value="Very Dissatisfied">Very Dissatisfied</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      label="Additional Comments"
                      name="comment"
                    >
                      <TextArea rows={4} placeholder="Share your experience or any additional comments" />
                    </Form.Item>

                    <Form.Item
                      name="showAsTestimonial"
                      valuePropName="checked"
                    >
                      <Checkbox>
                        Show my feedback as a testimonial on the doctor's profile
                        <span className="text-gray-500 text-xs block mt-1">
                          Your name ({user?.name}) will be displayed with your feedback
                        </span>
                      </Checkbox>
                    </Form.Item>

                    <Form.Item className="mb-0">
                      <div className="flex justify-end space-x-2">
                        <Button onClick={() => setFeedbackModalVisible(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={feedbackSubmitting}
                        >
                          Submit Feedback
                        </Button>
                      </div>
                    </Form.Item>
                  </div>
                </Form>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default PatientAppointments; 