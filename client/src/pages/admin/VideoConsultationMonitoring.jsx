import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { hideLoading, showLoading } from '../../redux/loader';
import { getApiUrl } from '../../services/apiService';
import API_ENDPOINTS from '../../services/apiConfig';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import { useSocket } from '../../context/SocketContext';
import { 
  Badge, Button, Card, Col, Row, Spin, Typography, Tabs, Tag, 
  Modal, Drawer, Statistic, Timeline, Empty, Switch, Select, 
  Input, Form, Table, Tooltip, Alert, Avatar, message, Collapse,
  Divider, Space
} from 'antd';
import {
  VideoCameraOutlined, UserOutlined, ClockCircleOutlined, 
  EyeOutlined, StopOutlined, SyncOutlined, BarChartOutlined,
  CalendarOutlined, TeamOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, InfoCircleOutlined, SearchOutlined,
  FilterOutlined, BellOutlined, ReloadOutlined, SettingOutlined,
  AuditOutlined, HistoryOutlined, PushpinOutlined, LinkOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './VideoConsultationMonitoring.css';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const VideoConsultationMonitoring = () => {
  const [consultations, setConsultations] = useState([]);
  const [activeConsultations, setActiveConsultations] = useState([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);
  const [pastConsultations, setPastConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [statsTotalConsultations, setStatsTotalConsultations] = useState(0);
  const [statsActiveConsultations, setStatsActiveConsultations] = useState(0);
  const [statsCompletedToday, setStatsCompletedToday] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pinnedConsultations, setPinnedConsultations] = useState([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  
  const dispatch = useDispatch();
  const { socket } = useSocket();

  // Auto-refresh timer
  useEffect(() => {
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchAllConsultations();
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(intervalId);
  }, [autoRefresh]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (socket) {
      const handleConsultationUpdate = (data) => {
        if (data.type === 'consultationStatusChanged') {
          fetchAllConsultations();
          message.info(`Consultation status changed: ${data.message}`);
        }
      };

      socket.on('consultation_update', handleConsultationUpdate);
      
      return () => {
        socket.off('consultation_update', handleConsultationUpdate);
      };
    }
  }, [socket]);

  // Initial data loading
  useEffect(() => {
    fetchAllConsultations();
  }, []);

  const fetchAllConsultations = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      console.log('Fetching video consultations for admin...');
      
      const response = await axios.get(
        getApiUrl(API_ENDPOINTS.ADMIN.GET_ALL_VIDEO_CONSULTATIONS),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('API response:', response.data);
      
      if (response.data.success) {
        // Process the raw consultations to ensure consistent structure
        const allConsultations = response.data.data.map(consultation => {
          // Extract user and doctor info
          const userInfo = consultation.userInfo || {};
          const doctorInfo = consultation.doctorInfo || {};
          
          // Ensure consultation has all required fields for UI
          return {
            ...consultation,
            _id: consultation._id,
            patientName: userInfo.name || 'Unknown Patient',
            doctorName: `${doctorInfo.firstname || ''} ${doctorInfo.lastname || ''}`.trim() || 'Unknown Doctor',
            date: consultation.formattedDate || consultation.date,
            time: consultation.formattedTime || consultation.time,
            status: consultation.meetingStatus || consultation.status || 'upcoming',
            reason: consultation.reason || '',
            isDoctor: consultation.videoConsultation?.doctorJoined || false,
            isPatient: consultation.videoConsultation?.patientJoined || false,
            remainingTime: consultation.minutesUntil || '',
            duration: consultation.duration || 30
          };
        });
        
        console.log('Processed consultations:', allConsultations);
        setConsultations(allConsultations);
        
        // Filter consultations by status
        const active = allConsultations.filter(c => 
          c.status === 'active' || c.meetingStatus === 'active' || c.status === 'imminent' || c.meetingStatus === 'imminent');
        const upcoming = allConsultations.filter(c => 
          c.status === 'upcoming' || c.meetingStatus === 'scheduled');
        const past = allConsultations.filter(c => 
          c.status === 'ended' || c.meetingStatus === 'ended' || c.status === 'cancelled');
        
        console.log('Active consultations:', active.length);
        console.log('Upcoming consultations:', upcoming.length);
        console.log('Past consultations:', past.length);
        
        setActiveConsultations(active);
        setUpcomingConsultations(upcoming);
        setPastConsultations(past);
        
        // Set statistics
        setStatsTotalConsultations(allConsultations.length);
        setStatsActiveConsultations(active.length);
        setStatsCompletedToday(past.filter(c => {
          const consultationDate = new Date(c.date);
          const today = new Date();
          return consultationDate.toDateString() === today.toDateString() && 
                 (c.status === 'ended' || c.meetingStatus === 'ended');
        }).length);
      } else {
        toast.error(response.data.message);
        console.error('API error:', response.data.message);
      }
      
      setLoading(false);
      dispatch(hideLoading());
    } catch (error) {
      setLoading(false);
      dispatch(hideLoading());
      toast.error('Error fetching video consultations');
      console.error('Fetch error:', error);
    }
  };

  const getConsultationDetails = async (consultationId) => {
    try {
      dispatch(showLoading());
      
      const response = await axios.get(
        getApiUrl(API_ENDPOINTS.ADMIN.GET_VIDEO_CONSULTATION_DETAILS(consultationId)),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      dispatch(hideLoading());
      
      if (response.data.success) {
        setSelectedConsultation(response.data.data);
        setDetailsDrawerVisible(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      toast.error('Error fetching consultation details');
      console.error(error);
    }
  };

  const handleMonitorConsultation = async (consultationId) => {
    try {
      dispatch(showLoading());
      
      const response = await axios.post(
        getApiUrl(API_ENDPOINTS.ADMIN.MONITOR_VIDEO_CONSULTATION),
        { consultationId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      dispatch(hideLoading());
      
      if (response.data.success) {
        window.open(response.data.monitoringLink, '_blank');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      toast.error('Error monitoring consultation');
      console.error(error);
    }
  };

  const handleEndConsultation = async (consultationId) => {
    Modal.confirm({
      title: 'End Consultation',
      content: 'Are you sure you want to end this consultation? This will disconnect both parties.',
      okText: 'Yes, End Consultation',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          dispatch(showLoading());
          
          const response = await axios.post(
            getApiUrl(API_ENDPOINTS.ADMIN.END_VIDEO_CONSULTATION),
            { consultationId },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          dispatch(hideLoading());
          
          if (response.data.success) {
            toast.success('Consultation ended successfully');
            fetchAllConsultations();
          } else {
            toast.error(response.data.message);
          }
        } catch (error) {
          dispatch(hideLoading());
          toast.error('Error ending consultation');
          console.error(error);
        }
      }
    });
  };

  const togglePinConsultation = (consultationId) => {
    if (pinnedConsultations.includes(consultationId)) {
      setPinnedConsultations(pinnedConsultations.filter(id => id !== consultationId));
    } else {
      setPinnedConsultations([...pinnedConsultations, consultationId]);
    }
  };

  // Filter consultations based on search and status filter
  const getFilteredConsultations = (consultationsArray) => {
    if (!consultationsArray || !Array.isArray(consultationsArray)) {
      console.warn('getFilteredConsultations called with invalid consultationsArray:', consultationsArray);
      return [];
    }
    
    return consultationsArray.filter(consultation => {
      // Search text filter
      const matchesSearch = !searchText || (
        (consultation.patientName || '')?.toLowerCase().includes(searchText.toLowerCase()) ||
        (consultation.doctorName || '')?.toLowerCase().includes(searchText.toLowerCase()) ||
        (consultation.reason || '')?.toLowerCase().includes(searchText.toLowerCase())
      );
      
      // Status filter
      const consultStatus = consultation.meetingStatus || consultation.status || '';
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && (consultStatus === 'active')) ||
        (filterStatus === 'imminent' && (consultStatus === 'imminent')) ||
        (filterStatus === 'upcoming' && (consultStatus === 'upcoming' || consultStatus === 'scheduled')) ||
        (filterStatus === 'ended' && (consultStatus === 'ended')) ||
        (filterStatus === 'cancelled' && (consultStatus === 'cancelled'));
      
      return matchesSearch && matchesStatus;
    });
  };

  // Consultation Card Component
  const ConsultationCard = ({ consultation }) => {
    if (!consultation || !consultation._id) {
      console.error('Invalid consultation object:', consultation);
      return null;
    }
    
    const isPinned = pinnedConsultations.includes(consultation._id);
    const consultationStatus = consultation.meetingStatus || consultation.status || 'unknown';
    
    const statusColor = 
      consultationStatus === 'active' ? 'green' :
      consultationStatus === 'imminent' ? 'orange' :
      consultationStatus === 'upcoming' || consultationStatus === 'scheduled' ? 'blue' : 'gray';
    
    const statusText = 
      consultationStatus === 'active' ? 'Active' :
      consultationStatus === 'imminent' ? 'Starting Soon' :
      consultationStatus === 'upcoming' || consultationStatus === 'scheduled' ? 'Scheduled' :
      consultationStatus === 'completed' ? 'Completed' : 'Pending';
    
    // Check if meeting link exists and is not empty
    const hasMeetingLink = consultation.videoConsultation?.meetingLink && 
                          consultation.videoConsultation.meetingLink.trim() !== '';
    
    // Function to regenerate a meeting link
    const handleRegenerateLink = async () => {
      try {
        setActionInProgress(consultation._id);
        
        message.loading({
          content: 'Regenerating meeting link...',
          key: 'regenerateLink',
          duration: 0
        });
        
        const response = await axios.post(
          getApiUrl(API_ENDPOINTS.ADMIN.CREATE_VIDEO_LINK),
          { appointmentId: consultation._id },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (response.data.success) {
          message.success({
            content: 'Meeting link regenerated successfully',
            key: 'regenerateLink',
            duration: 2
          });
          
          // Refresh consultation data
          fetchAllConsultations();
        } else {
          message.error({
            content: 'Failed to regenerate meeting link',
            key: 'regenerateLink',
            duration: 2
          });
        }
      } catch (error) {
        console.error('Error regenerating meeting link:', error);
        message.error({
          content: 'Error regenerating meeting link: ' + (error.response?.data?.message || error.message),
          key: 'regenerateLink',
          duration: 2
        });
      } finally {
        setActionInProgress(null);
      }
    };
    
    return (
      <Card
        hoverable
        className={`mb-4 consultation-card ${isPinned ? 'border-2 border-primary shadow-md' : ''}`}
        actions={[
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => getConsultationDetails(consultation._id)}
            />
          </Tooltip>,
          <Tooltip title={hasMeetingLink ? "Join Consultation" : "No Meeting Link"}>
            <Button
              type="text"
              icon={<VideoCameraOutlined />}
              onClick={() => {
                if (hasMeetingLink) {
                  window.open(consultation.videoConsultation.meetingLink, '_blank');
                } else {
                  message.warning('No meeting link available');
                }
              }}
              disabled={!hasMeetingLink}
            />
          </Tooltip>,
          <Tooltip title={isPinned ? "Unpin Consultation" : "Pin Consultation"}>
            <Button
              type="text"
              icon={<PushpinOutlined />}
              onClick={() => togglePinConsultation(consultation._id)}
              className={isPinned ? 'text-primary' : ''}
            />
          </Tooltip>
        ]}
        extra={
          <Space>
            <Badge status={statusColor} text={statusText} />
            {!hasMeetingLink && (
              <Tooltip title="Regenerate Meeting Link">
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRegenerateLink}
                  loading={actionInProgress === consultation._id}
                >
                  Generate Link
                </Button>
              </Tooltip>
            )}
          </Space>
        }
      >
        <div className="mb-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {consultation.patientName || 'Unknown Patient'}
              </h3>
              <p className="text-gray-500 text-sm mb-2">
                <TeamOutlined className="mr-1" /> 
                With {consultation.doctorName || 'Unknown Doctor'}
              </p>
            </div>
          </div>
        </div>
        
        <Space direction="vertical" className="w-full" size={2}>
          <div className="flex items-center">
            <CalendarOutlined className="mr-2 text-gray-500" />
            <span>{consultation.formattedDate || moment(consultation.date, 'DD-MM-YYYY').format('dddd, MMMM D, YYYY')}</span>
          </div>
          <div className="flex items-center">
            <ClockCircleOutlined className="mr-2 text-gray-500" />
            <span>{consultation.formattedTime || moment(consultation.time, 'HH:mm').format('h:mm A')}</span>
          </div>
          {consultation.reason && (
            <div className="flex items-center mt-1">
              <span className="text-gray-600">{consultation.reason}</span>
            </div>
          )}
          
          {/* Meeting link status */}
          <div className="mt-3 text-gray-600">
            {hasMeetingLink ? (
              <Tag color="success">
                <LinkOutlined /> Meeting Link Ready
              </Tag>
            ) : (
              <Tag color="error">
                <CloseOutlined /> No Meeting Link
              </Tag>
            )}
            
            {/* Show join status if link exists */}
            {hasMeetingLink && (
              <div className="mt-2">
                <Space>
                  <Tag color={consultation.videoConsultation?.joinedByDoctor ? "success" : "default"}>
                    {consultation.videoConsultation?.joinedByDoctor ? 
                      <CheckCircleOutlined /> : <ClockCircleOutlined />} Doctor
                  </Tag>
                  <Tag color={consultation.videoConsultation?.joinedByPatient ? "success" : "default"}>
                    {consultation.videoConsultation?.joinedByPatient ? 
                      <CheckCircleOutlined /> : <ClockCircleOutlined />} Patient
                  </Tag>
                </Space>
              </div>
            )}
          </div>
        </Space>
        
        {showDebugInfo && (
          <div className="mt-3 p-2 bg-gray-100 text-xs font-mono rounded">
            <pre>{JSON.stringify(consultation, null, 2)}</pre>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <Title level={2} className="mb-1">
              <VideoCameraOutlined className="mr-2" />
              Video Consultation Monitoring
            </Title>
            <Text type="secondary" className="text-base">
              Monitor and manage all video consultations in real-time
            </Text>
          </div>
          
          <div className="flex mt-4 lg:mt-0 space-x-3">
            <Tooltip title="Toggle debug info">
              <Button 
                icon={<InfoCircleOutlined />} 
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                type={showDebugInfo ? 'primary' : 'default'}
              />
            </Tooltip>
            <Tooltip title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}>
              <Button 
                type={autoRefresh ? 'primary' : 'default'}
                icon={<SyncOutlined spin={autoRefresh} />}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Auto Refresh: On' : 'Auto Refresh: Off'}
              </Button>
            </Tooltip>
            <Button 
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchAllConsultations}
              loading={loading}
            >
              Refresh Now
            </Button>
          </div>
        </div>

        {/* Statistics Row */}
        <Row gutter={16} className="mb-6">
          <Col xs={24} md={8}>
            <Card className="statistic-card">
              <Statistic 
                title="Total Consultations" 
                value={statsTotalConsultations} 
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="statistic-card">
              <Statistic 
                title="Active Now" 
                value={statsActiveConsultations} 
                prefix={<VideoCameraOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="statistic-card">
              <Statistic 
                title="Completed Today" 
                value={statsCompletedToday} 
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search by patient, doctor or reason" 
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className="w-full"
              />
            </div>
            <div className="flex gap-4">
              <Select 
                placeholder="Filter by status"
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: 180 }}
              >
                <Option value="all">All Statuses</Option>
                <Option value="active">Active</Option>
                <Option value="imminent">Starting Soon</Option>
                <Option value="upcoming">Upcoming</Option>
                <Option value="ended">Ended</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : consultations.length === 0 ? (
          <Card>
            <Empty 
              description={
                <div>
                  <p>No video consultations found</p>
                  <p style={{ fontSize: '14px', color: '#888' }}>
                    There are no video consultations available to display. 
                    This could be because none have been scheduled yet or there's an issue with data fetching.
                  </p>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={fetchAllConsultations}
              >
                Refresh Data
              </Button>
            </Empty>
          </Card>
        ) : (
          <Tabs 
            defaultActiveKey="active" 
            type="card" 
            className="consultation-tabs"
            items={[
              // Pinned Consultations Tab (conditionally included)
              ...(pinnedConsultations.length > 0 ? [{
                key: "pinned",
                label: (
                  <span>
                    <PushpinOutlined />
                    Pinned ({pinnedConsultations.length})
                  </span>
                ),
                children: (
                  <Row gutter={[16, 16]}>
                    {consultations
                      .filter(c => pinnedConsultations.includes(c._id))
                      .map(consultation => (
                        <Col xs={24} md={12} lg={8} xl={6} key={consultation._id}>
                          <ConsultationCard consultation={consultation} />
                        </Col>
                      ))}
                  </Row>
                )
              }] : []),
              
              // Active Consultations Tab
              {
                key: "active",
                label: (
                  <span>
                    <VideoCameraOutlined />
                    Active ({getFilteredConsultations(activeConsultations).length})
                  </span>
                ),
                children: (
                  getFilteredConsultations(activeConsultations).length === 0 ? (
                    <Empty 
                      description="No active consultations at this time. Active consultations will appear here." 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {getFilteredConsultations(activeConsultations).map(consultation => (
                        <Col xs={24} md={12} lg={8} xl={6} key={consultation._id}>
                          <ConsultationCard consultation={consultation} />
                        </Col>
                      ))}
                    </Row>
                  )
                )
              },
              
              // Upcoming Consultations Tab
              {
                key: "upcoming",
                label: (
                  <span>
                    <CalendarOutlined />
                    Upcoming ({getFilteredConsultations(upcomingConsultations).length})
                  </span>
                ),
                children: (
                  getFilteredConsultations(upcomingConsultations).length === 0 ? (
                    <Empty 
                      description="No upcoming consultations scheduled. Future consultations will appear here." 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {getFilteredConsultations(upcomingConsultations).map(consultation => (
                        <Col xs={24} md={12} lg={8} xl={6} key={consultation._id}>
                          <ConsultationCard consultation={consultation} />
                        </Col>
                      ))}
                    </Row>
                  )
                )
              },
              
              // Past Consultations Tab
              {
                key: "past",
                label: (
                  <span>
                    <HistoryOutlined />
                    Past ({getFilteredConsultations(pastConsultations).length})
                  </span>
                ),
                children: (
                  getFilteredConsultations(pastConsultations).length === 0 ? (
                    <Empty 
                      description="No past consultations found. Completed consultations will appear here." 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {getFilteredConsultations(pastConsultations).map(consultation => (
                        <Col xs={24} md={12} lg={8} xl={6} key={consultation._id}>
                          <ConsultationCard consultation={consultation} />
                        </Col>
                      ))}
                    </Row>
                  )
                )
              }
            ]}
          />
        )}
        
        {/* Consultation Details Drawer */}
        <Drawer
          title={
            <div className="flex items-center">
              <VideoCameraOutlined className="mr-2 text-blue-500" />
              <span>Consultation Details</span>
            </div>
          }
          width={640}
          placement="right"
          onClose={() => setDetailsDrawerVisible(false)}
          open={detailsDrawerVisible}
          footer={
            <div className="flex justify-between">
              <Button onClick={() => setDetailsDrawerVisible(false)}>
                Close
              </Button>
              {selectedConsultation?.status === 'active' && (
                <Button 
                  type="primary" 
                  icon={<VideoCameraOutlined />}
                  onClick={() => handleMonitorConsultation(selectedConsultation?._id)}
                >
                  Monitor Call
                </Button>
              )}
            </div>
          }
        >
          {selectedConsultation && (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Text type="secondary">Patient</Text>
                    <div className="flex items-center mt-1">
                      <Avatar size={32} icon={<UserOutlined />} src={selectedConsultation.patientImage} />
                      <Text strong className="ml-2">{selectedConsultation.patientName}</Text>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Doctor</Text>
                    <div className="flex items-center mt-1">
                      <Avatar size={32} icon={<UserOutlined />} src={selectedConsultation.doctorImage} />
                      <Text strong className="ml-2">Dr. {selectedConsultation.doctorName}</Text>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Date & Time</Text>
                    <div className="mt-1">
                      <Text>{selectedConsultation.date} at {selectedConsultation.time}</Text>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Status</Text>
                    <div className="mt-1">
                      <Tag color={
                        selectedConsultation.status === 'active' ? 'green' :
                        selectedConsultation.status === 'imminent' ? 'orange' :
                        selectedConsultation.status === 'upcoming' ? 'blue' : 'gray'
                      }>
                        {selectedConsultation.status === 'active' ? 'In Progress' :
                         selectedConsultation.status === 'imminent' ? 'Starting Soon' :
                         selectedConsultation.status === 'upcoming' ? 'Upcoming' :
                         selectedConsultation.status === 'cancelled' ? 'Cancelled' : 'Ended'}
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>

              <Divider orientation="left">Consultation Information</Divider>
              
              <Collapse defaultActiveKey={['1']} className="mb-6">
                <Panel header="Appointment Details" key="1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                    <div>
                      <Text type="secondary">Consultation Type</Text>
                      <div className="mt-1">
                        <Text>{selectedConsultation.type || 'Video Consultation'}</Text>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Duration</Text>
                      <div className="mt-1">
                        <Text>{selectedConsultation.duration || 30} minutes</Text>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Appointment ID</Text>
                      <div className="mt-1">
                        <Text copyable>{selectedConsultation._id}</Text>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Created On</Text>
                      <div className="mt-1">
                        <Text>{selectedConsultation.createdAt}</Text>
                      </div>
                    </div>
                  </div>
                </Panel>
                
                <Panel header="Reason & Symptoms" key="2">
                  <Paragraph>
                    {selectedConsultation.reason || 'No reason specified'}
                  </Paragraph>
                  {selectedConsultation.symptoms && (
                    <div className="mt-4">
                      <Text type="secondary">Symptoms:</Text>
                      <div className="mt-1">
                        {selectedConsultation.symptoms.map((symptom, index) => (
                          <Tag key={index}>{symptom}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>
                
                <Panel header="Participants Status" key="3">
                  <div className="space-y-4">
                    <div>
                      <Text type="secondary">Doctor</Text>
                      <div className="mt-1 flex items-center">
                        {selectedConsultation.isDoctor ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Online</Tag>
                        ) : (
                          <Tag color="red" icon={<CloseCircleOutlined />}>Offline</Tag>
                        )}
                        {selectedConsultation.doctorJoinTime && (
                          <Text type="secondary" className="ml-2">
                            Joined at {selectedConsultation.doctorJoinTime}
                          </Text>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Text type="secondary">Patient</Text>
                      <div className="mt-1 flex items-center">
                        {selectedConsultation.isPatient ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Online</Tag>
                        ) : (
                          <Tag color="red" icon={<CloseCircleOutlined />}>Offline</Tag>
                        )}
                        {selectedConsultation.patientJoinTime && (
                          <Text type="secondary" className="ml-2">
                            Joined at {selectedConsultation.patientJoinTime}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
                
                {selectedConsultation.timeline && (
                  <Panel header="Timeline" key="4">
                    <Timeline>
                      {selectedConsultation.timeline.map((event, index) => (
                        <Timeline.Item key={index} color={event.color || 'blue'}>
                          <Text strong>{event.title}</Text>
                          <div>
                            <Text type="secondary">{event.time}</Text>
                          </div>
                          {event.description && <div>{event.description}</div>}
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </Panel>
                )}
              </Collapse>
              
              {selectedConsultation.status === 'active' && (
                <div className="mb-6">
                  <Alert
                    message="Active Consultation Controls"
                    description={
                      <div className="mt-3">
                        <Button 
                          type="primary" 
                          danger
                          icon={<StopOutlined />} 
                          onClick={() => handleEndConsultation(selectedConsultation._id)}
                        >
                          End Consultation
                        </Button>
                        <Text type="secondary" className="block mt-2">
                          Ending the consultation will disconnect both parties immediately.
                        </Text>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </Layout>
  );
};

export default VideoConsultationMonitoring; 