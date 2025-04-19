import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { hideLoading, showLoading } from '../../redux/loader';
import axios from 'axios';
import { Table, Tag, Space, Button, Input, DatePicker, Select, Modal, message, Card, Statistic, Row, Col, Tooltip, Badge } from 'antd';
import { 
  SyncOutlined, SearchOutlined, FilterOutlined, CalendarOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, 
  UserOutlined, MedicineBoxOutlined, PieChartOutlined
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import moment from 'moment';
import '../../styles/tableResponsive.css';
import { api } from '../../utils/apiUtils';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

function AppointmentsManagement() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0
  });
  const dispatch = useDispatch();

  // Fetch all appointments
  const getAppointments = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      const response = await api.get(`admin/appointments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      dispatch(hideLoading());
      if (response.data.success) {
        setAppointments(response.data.data);
        calculateStats(response.data.data);
      }
    } catch (error) {
      dispatch(hideLoading());
      message.error('Something went wrong while fetching appointments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from appointments data
  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0
    };
    
    data.forEach(appointment => {
      stats[appointment.status]++;
    });
    
    setStats(stats);
  };

  useEffect(() => {
    getAppointments();
  }, []);

  // Status tag renderer
  const renderStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'gold', icon: <ClockCircleOutlined /> },
      approved: { color: 'green', icon: <CheckCircleOutlined /> },
      rejected: { color: 'red', icon: <CloseCircleOutlined /> },
      completed: { color: 'blue', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'gray', icon: <CloseCircleOutlined /> },
    };
    
    return (
      <Tag color={statusConfig[status].color} icon={statusConfig[status].icon}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  // Filter appointments based on search, date range, and status
  const filteredAppointments = appointments.filter(appointment => {
    // Search filter
    const searchMatches = 
      (appointment.userInfo?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (appointment.doctorInfo?.firstname || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (appointment.doctorInfo?.lastname || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (appointment.reason || '').toLowerCase().includes(searchText.toLowerCase());
    
    // Date filter
    let dateMatches = true;
    if (dateRange[0] && dateRange[1]) {
      const appointmentDate = moment(appointment.date, 'DD-MM-YYYY');
      dateMatches = appointmentDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
    }
    
    // Status filter
    const statusMatches = statusFilter === 'all' || appointment.status === statusFilter;
    
    return searchMatches && dateMatches && statusMatches;
  });

  // Table columns
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'userInfo',
      key: 'patient',
      render: (userInfo) => (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          {userInfo?.name || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorInfo',
      key: 'doctor',
      render: (doctorInfo) => (
        <span>
          <MedicineBoxOutlined style={{ marginRight: 8 }} />
          Dr. {doctorInfo?.firstname} {doctorInfo?.lastname}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (
        <span>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {date}
        </span>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'action-buttons-cell',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => viewAppointmentDetails(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  // View appointment details
  const viewAppointmentDetails = (appointment) => {
    Modal.info({
      title: 'Appointment Details',
      width: 600,
      content: (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <h3>Patient Information</h3>
              <p><strong>Name:</strong> {appointment.userInfo?.name}</p>
              <p><strong>Email:</strong> {appointment.userInfo?.email}</p>
              <p><strong>Phone:</strong> {appointment.emergencyContact || 'Not provided'}</p>
            </div>
            <div style={{ flex: 1 }}>
              <h3>Doctor Information</h3>
              <p><strong>Name:</strong> Dr. {appointment.doctorInfo?.firstname} {appointment.doctorInfo?.lastname}</p>
              <p><strong>Specialty:</strong> {appointment.doctorInfo?.specialization || 'Not specified'}</p>
            </div>
          </div>
          
          <h3>Appointment Details</h3>
          <p><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</p>
          <p><strong>Status:</strong> {renderStatusTag(appointment.status)} 
            {appointment.status === 'rejected' && appointment.rejectionReason && (
              <span style={{ marginLeft: 10 }}>
                - Reason: {appointment.rejectionReason}
              </span>
            )}
          </p>
          <p><strong>Reason for Visit:</strong> {appointment.reason}</p>
          
          {appointment.symptoms && (
            <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
          )}
          
          {appointment.medicalHistory && (
            <p><strong>Medical History:</strong> {appointment.medicalHistory}</p>
          )}
          
          {appointment.additionalNotes && (
            <p><strong>Additional Notes:</strong> {appointment.additionalNotes}</p>
          )}
          
          <p><strong>Preferred Communication:</strong> {appointment.preferredCommunication}</p>
          <p><strong>Created:</strong> {moment(appointment.createdAt).format('DD/MM/YYYY HH:mm')}</p>
          {appointment.updatedAt && (
            <p><strong>Last Updated:</strong> {moment(appointment.updatedAt).format('DD/MM/YYYY HH:mm')}</p>
          )}
        </div>
      ),
      onOk() {},
    });
  };

  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Appointments Management</h1>
        
        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic 
                title="Total Appointments" 
                value={stats.total} 
                prefix={<PieChartOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic 
                title="Pending" 
                value={stats.pending} 
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic 
                title="Approved" 
                value={stats.approved} 
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic 
                title="Rejected" 
                value={stats.rejected} 
                valueStyle={{ color: '#f5222d' }}
                prefix={<CloseCircleOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic 
                title="Completed" 
                value={stats.completed} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<CheckCircleOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
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
        
        {/* Filters */}
        <Card className="mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="search-filter flex-1">
              <Search
                placeholder="Search by patient, doctor, or reason"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={(value) => setSearchText(value)}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            
            <div className="date-filter">
              <RangePicker 
                size="large"
                onChange={(dates) => setDateRange(dates)}
                style={{ width: '100%' }}
                placeholder={['Start Date', 'End Date']}
              />
            </div>
            
            <div className="status-filter">
              <Select
                size="large"
                placeholder="Filter by status"
                style={{ width: 160 }}
                onChange={(value) => setStatusFilter(value)}
                defaultValue="all"
              >
                <Option value="all">All Statuses</Option>
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </div>
          </div>
        </Card>
        
        {/* Results info */}
        <div className="results-info mb-2">
          <p className="text-gray-600">
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </p>
        </div>
        
        {/* Table */}
        <Card>
          <div className="responsive-table-container">
            <Table 
              columns={columns} 
              dataSource={filteredAppointments}
              loading={loading}
              rowKey="_id"
              pagination={{ 
                pageSize: 10,
                showTotal: (total) => `Total ${total} appointments`
              }}
              scroll={{ x: 'max-content' }}
            />
            <div className="scroll-indicator">Scroll →</div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default AppointmentsManagement; 