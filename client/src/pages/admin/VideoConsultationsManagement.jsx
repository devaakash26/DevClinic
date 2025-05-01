import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Table, Tag, Button, Space, Input, DatePicker, Select, Modal, Tooltip, Badge, Card, Tabs, Statistic, Row, Col, notification } from 'antd';
import { VideoCameraOutlined, SendOutlined, LinkOutlined, ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, EyeOutlined, CalendarOutlined, TeamOutlined, UserOutlined, MailOutlined, BellOutlined } from '@ant-design/icons';
import moment from 'moment';
import { hideLoading, showLoading } from '../../redux/alertsSlice';
import io from 'socket.io-client';

const { TabPane } = Tabs;
const { Option } = Select;
const { confirm } = Modal;

const statusColors = {
  'active': '#52c41a',       // Green for active meetings
  'imminent': '#1890ff',     // Blue for imminent meetings
  'scheduled': '#8c8c8c',    // Gray for scheduled future meetings
  'ended': '#ff4d4f'         // Red for ended meetings
};

const completionStatusIcons = {
  'Completed successfully': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  'Both joined': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  'Only doctor joined': <UserOutlined style={{ color: '#faad14' }} />,
  'Only patient joined': <UserOutlined style={{ color: '#faad14' }} />,
  'Not started': <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
  'No-show': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  'Doctor no-show': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  'Patient no-show': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
};

const VideoConsultationsManagement = () => {
  const dispatch = useDispatch();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0,
    noShow: 0
  });

  // Add socket.io connection
  const [socket, setSocket] = useState(null);

  // Fetch consultations
  const fetchConsultations = async () => {
    try {
      dispatch(showLoading());
      setLoading(true);
      
      // Build query params
      const params = {};
      if (dateFilter) params.date = dateFilter.format('YYYY-MM-DD');
      if (statusFilter) params.status = statusFilter;
      
      const response = await axios.get('/api/admin/get-all-video-consultations', { params });
      
      if (response.data.success) {
        setConsultations(response.data.data);
        
        // Calculate statistics
        const stats = {
          total: response.data.data.length,
          active: 0,
          upcoming: 0,
          completed: 0,
          noShow: 0
        };
        
        response.data.data.forEach(consultation => {
          if (consultation.meetingStatus === 'active') {
            stats.active++;
          } else if (consultation.meetingStatus === 'scheduled' || consultation.meetingStatus === 'imminent') {
            stats.upcoming++;
          } else if (consultation.meetingStatus === 'ended') {
            if (consultation.completionStatus.includes('successfully') || consultation.completionStatus === 'Both joined') {
              stats.completed++;
            } else if (consultation.completionStatus.includes('no-show')) {
              stats.noShow++;
            }
          }
        });
        
        setStatistics(stats);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Error fetching video consultations');
      console.error(error);
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [dateFilter, statusFilter]);

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection
    const newSocket = io();
    setSocket(newSocket);
    
    // Socket event listeners
    newSocket.on('admin_video_consultation_update', handleVideoConsultationUpdate);
    
    // Cleanup on unmount
    return () => {
      newSocket.off('admin_video_consultation_update', handleVideoConsultationUpdate);
      newSocket.disconnect();
    };
  }, []);
  
  // Handle video consultation status updates from socket
  const handleVideoConsultationUpdate = (update) => {
    // Display a notification
    const { userType, action, appointmentId } = update;
    const notificationType = action === 'join' ? 'success' : 'warning';
    const title = `${userType.charAt(0).toUpperCase() + userType.slice(1)} ${action === 'join' ? 'joined' : 'left'} consultation`;
    
    notification[notificationType]({
      message: title,
      description: `Appointment ID: ${appointmentId}`,
      icon: <BellOutlined style={{ color: action === 'join' ? '#52c41a' : '#ff4d4f' }} />
    });
    
    // Update the consultations array with the new status
    setConsultations(prevConsultations => {
      return prevConsultations.map(consultation => {
        if (consultation._id === appointmentId) {
          // Create updated consultation object
          const updatedConsultation = { ...consultation };
          
          // Update the join status
          if (userType === 'doctor') {
            updatedConsultation.doctorJoined = update.doctorJoined;
          } else if (userType === 'patient') {
            updatedConsultation.patientJoined = update.patientJoined;
          }
          
          // Update completion status
          if (updatedConsultation.doctorJoined && updatedConsultation.patientJoined) {
            updatedConsultation.completionStatus = 'Both joined';
          } else if (updatedConsultation.doctorJoined) {
            updatedConsultation.completionStatus = 'Only doctor joined';
          } else if (updatedConsultation.patientJoined) {
            updatedConsultation.completionStatus = 'Only patient joined';
          } else {
            updatedConsultation.completionStatus = 'Not started';
          }
          
          return updatedConsultation;
        }
        return consultation;
      });
    });
  };
  
  // Set up auto-refresh for active consultations
  useEffect(() => {
    const hasActiveConsultations = consultations.some(
      c => c.meetingStatus === 'active' || c.meetingStatus === 'imminent'
    );
    
    let refreshInterval;
    
    if (hasActiveConsultations) {
      // Refresh data every 30 seconds for active consultations
      refreshInterval = setInterval(() => {
        fetchConsultations();
      }, 30000);
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [consultations]);

  // Filter consultations based on search text
  const getFilteredConsultations = () => {
    if (!searchText) return consultations;
    
    return consultations.filter(consultation => {
      const patientName = consultation.userInfo?.name || '';
      const doctorName = `${consultation.doctorInfo?.firstname} ${consultation.doctorInfo?.lastname}` || '';
      
      return (
        patientName.toLowerCase().includes(searchText.toLowerCase()) ||
        doctorName.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  };

  // Send reminder to doctor and/or patient
  const sendReminder = async (consultation, sendToDoctor = true, sendToPatient = true) => {
    try {
      setSendingReminder(true);
      
      const response = await axios.post('/api/admin/send-consultation-reminder', {
        appointmentId: consultation._id,
        sendToDoctor,
        sendToPatient
      });
      
      if (response.data.success) {
        toast.success('Reminders sent successfully');
        
        // Show specific messages for each recipient
        if (sendToDoctor && response.data.data.doctorEmail) {
          toast.success('Reminder sent to doctor');
        } else if (sendToDoctor) {
          toast.error('Failed to send reminder to doctor');
        }
        
        if (sendToPatient && response.data.data.patientEmail) {
          toast.success('Reminder sent to patient');
        } else if (sendToPatient) {
          toast.error('Failed to send reminder to patient');
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Error sending reminders');
      console.error(error);
    } finally {
      setSendingReminder(false);
      setActionsModalVisible(false);
    }
  };

  // Create video link for an appointment that doesn't have one
  const createVideoLink = async (appointmentId) => {
    try {
      setCreatingLink(true);
      
      const response = await axios.post('/api/admin/create-video-link', {
        appointmentId
      });
      
      if (response.data.success) {
        toast.success('Video consultation link created successfully');
        fetchConsultations(); // Refresh the list
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Error creating video link');
      console.error(error);
    } finally {
      setCreatingLink(false);
      setActionsModalVisible(false);
    }
  };

  // Confirm sending reminders
  const showSendReminderConfirm = (consultation) => {
    confirm({
      title: 'Send Reminders',
      icon: <ExclamationCircleOutlined />,
      content: 'Do you want to send reminders to both doctor and patient?',
      okText: 'Yes, both',
      cancelText: 'Cancel',
      onOk() {
        sendReminder(consultation, true, true);
      },
      onCancel() {},
      okButtonProps: {
        type: 'primary',
        danger: false
      },
      extra: (
        <Space direction="vertical" style={{ marginTop: 16 }}>
          <Button
            onClick={() => {
              Modal.destroyAll();
              sendReminder(consultation, true, false);
            }}
          >
            Send to Doctor Only
          </Button>
          <Button
            onClick={() => {
              Modal.destroyAll();
              sendReminder(consultation, false, true);
            }}
          >
            Send to Patient Only
          </Button>
        </Space>
      )
    });
  };

  // Open meeting in new tab
  const openMeeting = (link) => {
    window.open(link, '_blank');
  };

  // Define columns for the table
  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (text, record) => (
        <Tag color={statusColors[record.meetingStatus]} style={{ fontWeight: 'bold' }}>
          {record.meetingStatus.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Imminent', value: 'imminent' },
        { text: 'Scheduled', value: 'scheduled' },
        { text: 'Ended', value: 'ended' }
      ],
      onFilter: (value, record) => record.meetingStatus === value,
      sorter: (a, b) => {
        const statusOrder = { active: 0, imminent: 1, scheduled: 2, ended: 3 };
        return statusOrder[a.meetingStatus] - statusOrder[b.meetingStatus];
      }
    },
    {
      title: 'Date & Time',
      dataIndex: 'formattedDateTime',
      key: 'dateTime',
      sorter: (a, b) => {
        const dateA = moment(`${a.date} ${a.time}`, 'DD-MM-YYYY HH:mm');
        const dateB = moment(`${b.date} ${b.time}`, 'DD-MM-YYYY HH:mm');
        return dateA - dateB;
      }
    },
    {
      title: 'Timing',
      dataIndex: 'timingDisplay',
      key: 'timing',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>
    },
    {
      title: 'Doctor',
      key: 'doctor',
      render: (text, record) => (
        <span>
          Dr. {record.doctorInfo?.firstname} {record.doctorInfo?.lastname}
          {record.doctorJoined && <Badge status="success" style={{ marginLeft: 8 }} />}
        </span>
      )
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (text, record) => (
        <span>
          {record.userInfo?.name || 'Unknown'}
          {record.patientJoined && <Badge status="success" style={{ marginLeft: 8 }} />}
        </span>
      )
    },
    {
      title: 'Participation',
      key: 'participation',
      render: (text, record) => (
        <Tooltip title={record.completionStatus}>
          <span>
            {completionStatusIcons[record.completionStatus]} {record.completionStatus}
          </span>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (text, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedConsultation(record);
                setDetailsModalVisible(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title="Actions">
            <Button
              icon={<VideoCameraOutlined />}
              onClick={() => {
                setSelectedConsultation(record);
                setActionsModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Render consultation details modal
  const renderDetailsModal = () => {
    if (!selectedConsultation) return null;
    
    const patientName = selectedConsultation.userInfo?.name || 'Unknown';
    const doctorName = `Dr. ${selectedConsultation.doctorInfo?.firstname} ${selectedConsultation.doctorInfo?.lastname}` || 'Unknown';
    
    return (
      <Modal
        title={<span><VideoCameraOutlined /> Video Consultation Details</span>}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>Close</Button>,
          selectedConsultation.meetingLink && (
            <Button
              key="openMeeting"
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={() => openMeeting(selectedConsultation.meetingLink)}
            >
              Open Meeting
            </Button>
          )
        ]}
        width={700}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Meeting Information" bordered={false}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic 
                    title="Status" 
                    value={selectedConsultation.meetingStatus.toUpperCase()} 
                    valueStyle={{ color: statusColors[selectedConsultation.meetingStatus] }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Date" 
                    value={selectedConsultation.formattedDate}
                    prefix={<CalendarOutlined />} 
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Time" 
                    value={selectedConsultation.formattedTime} 
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              title={<span><UserOutlined /> Doctor Information</span>} 
              bordered={false}
              extra={
                <Tag color={selectedConsultation.doctorJoined ? 'success' : 'default'}>
                  {selectedConsultation.doctorJoined ? 'Joined' : 'Not Joined'}
                </Tag>
              }
            >
              <p><strong>Name:</strong> {doctorName}</p>
              <p><strong>Email:</strong> {selectedConsultation.doctorInfo?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedConsultation.doctorInfo?.phone || 'N/A'}</p>
              <p><strong>Specialty:</strong> {selectedConsultation.doctorInfo?.specialization || 'N/A'}</p>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              title={<span><UserOutlined /> Patient Information</span>} 
              bordered={false}
              extra={
                <Tag color={selectedConsultation.patientJoined ? 'success' : 'default'}>
                  {selectedConsultation.patientJoined ? 'Joined' : 'Not Joined'}
                </Tag>
              }
            >
              <p><strong>Name:</strong> {patientName}</p>
              <p><strong>Email:</strong> {selectedConsultation.userInfo?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedConsultation.userInfo?.phone || 'N/A'}</p>
              <p><strong>Reason:</strong> {selectedConsultation.reason || 'N/A'}</p>
            </Card>
          </Col>
          
          {selectedConsultation.meetingLink && (
            <Col span={24}>
              <Card title="Meeting Link" bordered={false}>
                <Input.TextArea 
                  value={selectedConsultation.meetingLink} 
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  readOnly
                />
                <div style={{ marginTop: 8 }}>
                  <Button 
                    type="primary" 
                    icon={<LinkOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(selectedConsultation.meetingLink);
                      toast.success('Meeting link copied to clipboard');
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      </Modal>
    );
  };

  // Render actions modal
  const renderActionsModal = () => {
    if (!selectedConsultation) return null;
    
    return (
      <Modal
        title="Video Consultation Actions"
        open={actionsModalVisible}
        onCancel={() => setActionsModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {selectedConsultation.meetingLink ? (
            <>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => showSendReminderConfirm(selectedConsultation)}
                loading={sendingReminder}
                block
              >
                Send Reminders
              </Button>
              
              <Button
                icon={<LinkOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(selectedConsultation.meetingLink);
                  toast.success('Meeting link copied to clipboard');
                }}
                block
              >
                Copy Meeting Link
              </Button>
              
              <Button
                icon={<VideoCameraOutlined />}
                onClick={() => openMeeting(selectedConsultation.meetingLink)}
                block
              >
                Join Meeting
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => createVideoLink(selectedConsultation._id)}
              loading={creatingLink}
              block
            >
              Create Video Link
            </Button>
          )}
        </Space>
      </Modal>
    );
  };

  return (
    <div className="video-consultations-management">
      <h1><VideoCameraOutlined /> Video Consultations Management</h1>
      
      <div className="statistics-cards" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Consultations"
                value={statistics.total}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Now"
                value={statistics.active}
                valueStyle={{ color: '#52c41a' }}
                prefix={<VideoCameraOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Upcoming"
                value={statistics.upcoming}
                valueStyle={{ color: '#1890ff' }}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed/No-show"
                value={`${statistics.completed}/${statistics.noShow}`}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>
      
      <div className="filter-section" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search by doctor or patient name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <DatePicker
              placeholder="Filter by date"
              style={{ width: '100%' }}
              onChange={setDateFilter}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="completed">Completed</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6} style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              onClick={fetchConsultations} 
              loading={loading}
            >
              Refresh Data
            </Button>
          </Col>
        </Row>
      </div>
      
      <Tabs defaultActiveKey="all">
        <TabPane tab="All Consultations" key="all">
          <Table
            columns={columns}
            dataSource={getFilteredConsultations()}
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} consultations`
            }}
          />
        </TabPane>
        <TabPane tab="Active & Imminent" key="active">
          <Table
            columns={columns}
            dataSource={getFilteredConsultations().filter(
              c => c.meetingStatus === 'active' || c.meetingStatus === 'imminent'
            )}
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} consultations`
            }}
          />
        </TabPane>
        <TabPane tab="Upcoming" key="upcoming">
          <Table
            columns={columns}
            dataSource={getFilteredConsultations().filter(
              c => c.meetingStatus === 'scheduled'
            )}
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} consultations`
            }}
          />
        </TabPane>
        <TabPane tab="Completed" key="completed">
          <Table
            columns={columns}
            dataSource={getFilteredConsultations().filter(
              c => c.meetingStatus === 'ended'
            )}
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} consultations`
            }}
          />
        </TabPane>
      </Tabs>
      
      {renderDetailsModal()}
      {renderActionsModal()}
    </div>
  );
};

export default VideoConsultationsManagement; 