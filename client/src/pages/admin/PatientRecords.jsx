import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { showLoading, hideLoading } from '../../redux/loader';
import Layout from '../../components/Layout';
import { 
  Table, Tag, Card, Row, Col, Statistic, Input, Button, Select, 
  Tabs, Timeline, Modal, Avatar, List, Badge, Tooltip, Empty, 
  Divider, Progress, message, Drawer, Spin, DatePicker
} from 'antd';
import { 
  UserOutlined, ClockCircleOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, FileTextOutlined, BarChartOutlined, 
  CalendarOutlined, MedicineBoxOutlined, SearchOutlined,
  PhoneOutlined, MailOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, HistoryOutlined, TeamOutlined, 
  PieChartOutlined, HeartOutlined, HeartFilled
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { Line, Pie } from '@ant-design/plots';
import '../../styles/tableResponsive.css';

const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PatientRecords = () => {
  const dispatch = useDispatch();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [statistics, setStatistics] = useState({
    totalPatients: 0,
    activePatients: 0,
    newPatientsThisMonth: 0,
    appointmentsPerPatient: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    favoritePatients: 0
  });
  const [favoritePatients, setFavoritePatients] = useState([]);

  // Fetch patient records
  const fetchPatientRecords = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      const response = await axios.get('http://localhost:4000/api/admin/patient-records', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      dispatch(hideLoading());
      setLoading(false);
      
      if (response.data.success) {
        // Get the stored favorites from local storage
        const storedFavorites = JSON.parse(localStorage.getItem('favoritePatients') || '[]');
        setFavoritePatients(storedFavorites);
        
        const patientData = response.data.data.map(patient => ({
          ...patient,
          isFavorite: storedFavorites.includes(patient._id)
        }));
        
        setPatients(patientData);
        setFilteredPatients(patientData);
        calculateStatistics(patientData);
        message.success('Patient records loaded successfully');
      } else {
        message.error(response.data.message || 'Failed to load patient records');
      }
    } catch (error) {
      dispatch(hideLoading());
      setLoading(false);
      message.error('Error loading patient records');
      console.error(error);
    }
  };

  // Calculate statistics from patient data
  const calculateStatistics = (data) => {
    const now = moment();
    const thisMonthStart = moment().startOf('month');
    
    // Calculate new patients this month
    const newPatientsThisMonth = data.filter(patient => 
      moment(patient.createdAt).isAfter(thisMonthStart)
    ).length;
    
    // Calculate active patients (had appointment in last 3 months)
    const threeMonthsAgo = moment().subtract(3, 'months');
    const activePatients = data.filter(patient => {
      return patient.appointments.some(appointment => 
        moment(appointment.createdAt).isAfter(threeMonthsAgo)
      );
    }).length;
    
    // Calculate total appointments
    const allAppointments = data.reduce((total, patient) => 
      total + patient.appointments.length, 0
    );
    
    // Calculate average appointments per patient
    const appointmentsPerPatient = data.length > 0 
      ? (allAppointments / data.length).toFixed(1) 
      : 0;
    
    // Count completed and pending appointments
    let completedAppointments = 0;
    let pendingAppointments = 0;
    
    data.forEach(patient => {
      patient.appointments.forEach(appointment => {
        if (appointment.status === 'completed') completedAppointments++;
        if (appointment.status === 'pending') pendingAppointments++;
      });
    });
    
    setStatistics({
      totalPatients: data.length,
      activePatients,
      newPatientsThisMonth,
      appointmentsPerPatient,
      completedAppointments,
      pendingAppointments,
      favoritePatients: favoritePatients.length
    });
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value) {
      setFilteredPatients(patients);
      return;
    }
    
    const filtered = patients.filter(patient => 
      patient.name.toLowerCase().includes(value.toLowerCase()) ||
      patient.email.toLowerCase().includes(value.toLowerCase())
    );
    
    setFilteredPatients(filtered);
  };

  // Toggle favorite status
  const toggleFavorite = (patientId) => {
    // Find the patient to toggle
    const patient = patients.find(p => p._id === patientId);
    const newFavoriteStatus = !patient.isFavorite;
    
    // Create updated patients array with toggled favorite status
    const updatedPatients = patients.map(patient => {
      if (patient._id === patientId) {
        return { ...patient, isFavorite: newFavoriteStatus };
      }
      return patient;
    });
    
    // Update patients state
    setPatients(updatedPatients);
    setFilteredPatients(updatedPatients.filter(p => {
      // Maintain current filters when updating
      if (searchText) {
        return p.name.toLowerCase().includes(searchText.toLowerCase()) || 
               p.email.toLowerCase().includes(searchText.toLowerCase());
      }
      return true;
    }));
    
    // Create new favorites list based on updated patients
    const updatedFavorites = updatedPatients
      .filter(p => p.isFavorite)
      .map(p => p._id);
    
    // Update favorites state and localStorage
    setFavoritePatients(updatedFavorites);
    localStorage.setItem('favoritePatients', JSON.stringify(updatedFavorites));
    
    // Update statistics with correct count
    const newStats = {...statistics, favoritePatients: updatedFavorites.length};
    setStatistics(newStats);
  };

  // View patient details
  const viewPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setDetailVisible(true);
  };

  // Get status color
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

  // Get status icon
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

  // Format date for display
  const formatDate = (date) => {
    return moment(date).format('MMM D, YYYY [at] h:mm A');
  };

  // Load data when component mounts
  useEffect(() => {
    fetchPatientRecords();
  }, []);

  // Table columns for patient list
  const columns = [
    {
      title: 'Favorite',
      key: 'favorite',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="text" 
          icon={record.isFavorite ? <HeartFilled style={{ color: '#f5222d' }} /> : <HeartOutlined />} 
          onClick={() => toggleFavorite(record._id)}
        />
      ),
    },
    {
      title: 'Patient',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ 
              backgroundColor: record.isFavorite ? '#f5222d' : '#1890ff',
              marginRight: 12 
            }} 
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              <MailOutlined style={{ marginRight: 5 }} /> {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Appointments',
      key: 'appointments',
      render: (_, record) => (
        <div>
          <Badge count={record.appointments.length} style={{ backgroundColor: record.appointments.length ? '#1890ff' : '#d9d9d9' }}>
            <Tag color="blue">{record.appointments.length} Appointments</Tag>
          </Badge>
          {record.appointments.length > 0 && (
            <Tag 
              color={getStatusColor(record.appointments[0].status)}
              icon={getStatusIcon(record.appointments[0].status)}
              style={{ marginLeft: 8 }}
            >
              Latest: {record.appointments[0].status.toUpperCase()}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt) => (
        <Tooltip title={formatDate(createdAt)}>
          {moment(createdAt).format('MMM D, YYYY')}
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          onClick={() => viewPatientDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Get appointment distribution data for pie chart
  const getAppointmentPieData = () => {
    const statusCounts = { 
      pending: 0, 
      approved: 0, 
      completed: 0, 
      rejected: 0, 
      cancelled: 0 
    };
    
    patients.forEach(patient => {
      patient.appointments.forEach(appointment => {
        if (statusCounts[appointment.status] !== undefined) {
          statusCounts[appointment.status]++;
        }
      });
    });
    
    return Object.keys(statusCounts).map(status => ({
      type: status.charAt(0).toUpperCase() + status.slice(1),
      value: statusCounts[status]
    }));
  };

  // Get appointment trend data for line chart
  const getAppointmentTrendData = () => {
    const last6Months = [];
    const counts = {};
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months').format('MMM YYYY');
      last6Months.push(month);
      counts[month] = { total: 0, completed: 0 };
    }
    
    // Count appointments by month
    patients.forEach(patient => {
      patient.appointments.forEach(appointment => {
        const month = moment(appointment.createdAt).format('MMM YYYY');
        if (counts[month]) {
          counts[month].total++;
          if (appointment.status === 'completed') {
            counts[month].completed++;
          }
        }
      });
    });
    
    // Format for chart
    const result = [];
    last6Months.forEach(month => {
      result.push({
        month,
        type: 'Total',
        value: counts[month].total
      });
      result.push({
        month,
        type: 'Completed',
        value: counts[month].completed
      });
    });
    
    return result;
  };

  return (
    <Layout>
      <div className="patient-records-container p-4">
        <div className="header mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Patient Records Management</h1>
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={fetchPatientRecords}
              loading={loading}
            >
              Refresh Data
            </Button>
          </div>
          <p className="text-gray-500 mt-1">
            Comprehensive view of all patient records and appointment histories
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-section mb-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card hoverable>
                <Statistic 
                  title="Total Patients" 
                  value={statistics.totalPatients} 
                  prefix={<TeamOutlined />} 
                  valueStyle={{ color: '#1890ff' }}
                />
                <div className="mt-2">
                  <Tag color="blue">{statistics.newPatientsThisMonth} new this month</Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card hoverable>
                <Statistic 
                  title="Active Patients" 
                  value={statistics.activePatients} 
                  prefix={<UserOutlined />} 
                  valueStyle={{ color: '#52c41a' }}
                />
                <div className="mt-2">
                  <Progress 
                    percent={Math.round((statistics.activePatients / (statistics.totalPatients || 1)) * 100)} 
                    size="small" 
                    status="success"
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card hoverable>
                <Statistic 
                  title="Avg. Appointments" 
                  value={statistics.appointmentsPerPatient} 
                  prefix={<CalendarOutlined />} 
                  precision={1}
                  valueStyle={{ color: '#722ed1' }}
                />
                <div className="mt-2">
                  <Tag color="purple">Per Patient</Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card hoverable>
                <Statistic 
                  title="Favorite Patients" 
                  value={statistics.favoritePatients} 
                  prefix={<HeartFilled />} 
                  valueStyle={{ color: '#f5222d' }}
                />
                <div className="mt-2">
                  <Progress 
                    percent={Math.round((statistics.favoritePatients / (statistics.totalPatients || 1)) * 100)} 
                    size="small" 
                    strokeColor="#f5222d"
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultActiveKey="1" onChange={setActiveTab} className="mb-6">
          <TabPane 
            tab={<span><TeamOutlined /> All Patients</span>} 
            key="1"
          >
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Search
                placeholder="Search by name or email"
                allowClear
                enterButton="Search"
                size="large"
                onSearch={handleSearch}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ maxWidth: '600px', width: '100%' }}
              />
              
              <Select 
                defaultValue="all" 
                style={{ width: 200 }} 
                size="large"
                onChange={(value) => {
                  if (value === 'all') {
                    setFilteredPatients(patients);
                  } else if (value === 'favorites') {
                    setFilteredPatients(patients.filter(p => p.isFavorite));
                  } else if (value === 'active') {
                    setFilteredPatients(patients.filter(p => p.status === 'active'));
                  } else if (value === 'recent') {
                    const oneMonthAgo = moment().subtract(1, 'month');
                    setFilteredPatients(patients.filter(p => 
                      moment(p.createdAt).isAfter(oneMonthAgo)
                    ));
                  }
                }}
              >
                <Option value="all">All Patients</Option>
                <Option value="favorites">Favorites</Option>
                <Option value="active">Active</Option>
                <Option value="recent">Recent (30 days)</Option>
              </Select>
            </div>
            
            <Card className="mb-4">
              <div className="responsive-table-container">
                <Table
                  columns={columns}
                  dataSource={filteredPatients}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `Total ${total} patients`
                  }}
                  scroll={{ x: 'max-content' }}
                />
                <div className="scroll-indicator">Scroll →</div>
              </div>
            </Card>
          </TabPane>
          
          <TabPane 
            tab={<span><BarChartOutlined /> Analytics</span>} 
            key="2"
          >
            <div className="analytics-container">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card 
                    title={
                      <div className="flex items-center">
                        <PieChartOutlined style={{ marginRight: 8 }} />
                        <span>Appointment Status Distribution</span>
                      </div>
                    } 
                    className="h-full"
                  >
                    {patients.length > 0 ? (
                      <Pie
                        data={getAppointmentPieData()}
                        angleField="value"
                        colorField="type"
                        radius={0.8}
                        label={{ type: 'outer', content: '{name} {percentage}' }}
                        interactions={[{ type: 'pie-legend-active' }, { type: 'element-active' }]}
                      />
                    ) : (
                      <Empty description="No appointment data available" />
                    )}
                  </Card>
                </Col>
                
                <Col xs={24} lg={12}>
                  <Card 
                    title={
                      <div className="flex items-center">
                        <BarChartOutlined style={{ marginRight: 8 }} />
                        <span>Appointment Trends (6 Months)</span>
                      </div>
                    } 
                    className="h-full"
                  >
                    {patients.length > 0 ? (
                      <Line
                        data={getAppointmentTrendData()}
                        xField="month"
                        yField="value"
                        seriesField="type"
                        point={{ size: 4 }}
                        smooth
                        label={{ style: { fill: 'black', opacity: 0.6 } }}
                        color={['#1890ff', '#52c41a']}
                      />
                    ) : (
                      <Empty description="No appointment data available" />
                    )}
                  </Card>
                </Col>
                
                <Col xs={24}>
                  <Card 
                    title={
                      <div className="flex items-center">
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        <span>General Statistics</span>
                      </div>
                    }
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <Statistic 
                          title="Total Appointments" 
                          value={statistics.completedAppointments + statistics.pendingAppointments} 
                          prefix={<CalendarOutlined />}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic 
                          title="Completed Appointments" 
                          value={statistics.completedAppointments} 
                          prefix={<CheckCircleOutlined />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic 
                          title="Pending Appointments" 
                          value={statistics.pendingAppointments} 
                          prefix={<ClockCircleOutlined />}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </div>
          </TabPane>
        </Tabs>
        
        {/* Patient Details Drawer */}
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="text-xl font-bold">Patient Details</span>
                {selectedPatient && (
                  <Button 
                    type="text" 
                    icon={selectedPatient.isFavorite ? <HeartFilled style={{ color: '#f5222d' }} /> : <HeartOutlined />} 
                    onClick={() => selectedPatient && toggleFavorite(selectedPatient._id)}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </div>
              {selectedPatient && (
                <Tag color={selectedPatient.status === 'active' ? 'green' : 'red'}>
                  {selectedPatient.status.toUpperCase()}
                </Tag>
              )}
            </div>
          }
          width={720}
          placement="right"
          onClose={() => setDetailVisible(false)}
          visible={detailVisible}
          bodyStyle={{ paddingBottom: 80 }}
        >
          {selectedPatient ? (
            <div className="patient-details">
              <div className="basic-info mb-6">
                <div className="flex items-center mb-4">
                  <Avatar 
                    size={64} 
                    icon={<UserOutlined />} 
                    style={{ 
                      backgroundColor: selectedPatient.isFavorite ? '#f5222d' : '#1890ff',
                    }} 
                  />
                  <div className="ml-4">
                    <h2 className="text-xl font-bold">{selectedPatient.name}</h2>
                    <div className="text-gray-500 flex items-center">
                      <MailOutlined style={{ marginRight: 8 }} /> {selectedPatient.email}
                    </div>
                    {selectedPatient.phone && selectedPatient.phone !== 'N/A' && (
                      <div className="text-gray-500 flex items-center">
                        <PhoneOutlined style={{ marginRight: 8 }} /> {selectedPatient.phone}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="patient-stats mb-6">
                  <Card>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic 
                          title="Total Appointments" 
                          value={selectedPatient.appointmentCount} 
                          prefix={<CalendarOutlined />} 
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="Registered On" 
                          value={moment(selectedPatient.createdAt).format('MMM D, YYYY')} 
                          prefix={<HistoryOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="Patient Status" 
                          value={selectedPatient.status.toUpperCase()} 
                          valueStyle={{ 
                            color: selectedPatient.status === 'active' ? '#52c41a' : '#f5222d' 
                          }}
                          prefix={<UserOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>
                </div>
              </div>
              
              <Divider orientation="left">Appointment History</Divider>
              
              {selectedPatient.appointments.length > 0 ? (
                <div className="appointment-history">
                  <Timeline mode="left">
                    {selectedPatient.appointments.map((appointment, index) => (
                      <Timeline.Item 
                        key={appointment._id || index}
                        color={getStatusColor(appointment.status)}
                        label={moment(appointment.createdAt).format('MMM D, YYYY')}
                        dot={getStatusIcon(appointment.status)}
                      >
                        <Card 
                          size="small" 
                          title={
                            <div className="flex justify-between">
                              <span>
                                Appointment {appointment.status === 'completed' ? 'Completed' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                              <Tag color={getStatusColor(appointment.status)}>
                                {appointment.status.toUpperCase()}
                              </Tag>
                            </div>
                          }
                          style={{ marginBottom: 16 }}
                        >
                          <p><strong>Date & Time:</strong> {appointment.date} at {appointment.time}</p>
                          <p><strong>Doctor:</strong> {appointment.doctorInfo ? `Dr. ${appointment.doctorInfo.firstname} ${appointment.doctorInfo.lastname}` : 'N/A'}</p>
                          <p><strong>Reason:</strong> {appointment.reason}</p>
                          {appointment.status === 'rejected' && appointment.rejectionReason && (
                            <p><strong>Rejection Reason:</strong> {appointment.rejectionReason}</p>
                          )}
                          <p><strong>Created:</strong> {formatDate(appointment.createdAt)}</p>
                        </Card>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              ) : (
                <Empty description="No appointment history available" />
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <Spin size="large" />
            </div>
          )}
        </Drawer>
      </div>
    </Layout>
  );
};

export default PatientRecords; 