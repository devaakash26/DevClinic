import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Col, Empty, Row, Spin, Tag, Typography, Modal, Alert, Avatar, Divider } from 'antd';
import { VideoCameraOutlined, ClockCircleOutlined, ScheduleOutlined, UserOutlined, ExclamationCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import moment from 'moment';
import { hideLoading, showLoading } from '../../redux/loader';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import API_ENDPOINTS from '../../services/apiConfig';
import { getApiUrl } from '../../services/apiService';

const { Title, Text, Paragraph } = Typography;

const VideoConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const { user } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    getVideoConsultations();
  }, []);

  const getVideoConsultations = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      const response = await axios.get(
        getApiUrl(API_ENDPOINTS.USER.GET_VIDEO_CONSULTATIONS),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      dispatch(hideLoading());
      setLoading(false);
      
      if (response.data.success) {
        setConsultations(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      setLoading(false);
      toast.error('Error fetching video consultations. Please try again later.');
      console.error(error);
    }
  };

  const handleJoinClick = (consultation) => {
    setSelectedConsultation(consultation);
    setJoinModalVisible(true);
  };

  const joinVideoConsultation = async () => {
    if (!selectedConsultation) return;
    
    try {
      setJoining(true);
      dispatch(showLoading());
      
      // Update join status
      await axios.post(
        getApiUrl(API_ENDPOINTS.USER.UPDATE_VIDEO_JOIN_STATUS),
        {
          appointmentId: selectedConsultation._id,
          userId: user._id,
          joined: true
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      dispatch(hideLoading());
      setJoining(false);
      setJoinModalVisible(false);
      
      // Open the meeting link in a new tab
      window.open(selectedConsultation.videoConsultation.meetingLink, '_blank');
      
      // Refresh the list
      getVideoConsultations();
    } catch (error) {
      dispatch(hideLoading());
      setJoining(false);
      toast.error('Error joining video consultation. Please try again.');
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'imminent':
        return 'orange';
      case 'upcoming':
        return 'blue';
      case 'ended':
        return 'gray';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'In Progress';
      case 'imminent':
        return 'Starting Soon';
      case 'upcoming':
        return 'Upcoming';
      case 'ended':
        return 'Ended';
      default:
        return 'Unknown';
    }
  };
  
  // Format the time until appointment in HH:MM format
  const formatTimeUntil = (consultation) => {
    // Extract the minutes from minutesUntil string if it's in "Starts in X minutes" format
    if (consultation.minutesUntil && consultation.minutesUntil.startsWith('Starts in ')) {
      const minutesStr = consultation.minutesUntil.replace('Starts in ', '').replace(' minutes', '').replace(' minute', '');
      const minutes = parseInt(minutesStr, 10);
      
      if (!isNaN(minutes)) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours === 0) {
          return `Starts in ${mins}m`;
        }
        return `Starts in ${hours}h ${mins}m`;
      }
    }
    
    // Return original if not in expected format or for non-upcoming appointments
    return consultation.minutesUntil;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Title level={2} className="m-0">
            <VideoCameraOutlined className="mr-2" />
            Video Consultations
          </Title>
          <Button type="primary" onClick={getVideoConsultations} loading={loading}>
            Refresh
          </Button>
        </div>

        <Alert
          message="How Video Consultations Work"
          description={
            <>
              <p>Join your video consultation by clicking the "Join Call" button at your scheduled appointment time.</p>
              <ol className="list-decimal ml-5 mt-2">
                <li>Allow camera and microphone access when prompted</li>
                <li>Test your audio and video before joining</li>
                <li>For the best experience, use Chrome, Firefox, or Edge browser</li>
                <li>Ensure you have a stable internet connection</li>
              </ol>
            </>
          }
          type="info"
          showIcon
          className="mb-6"
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : consultations.length === 0 ? (
          <Empty
            description="No video consultations scheduled"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-20"
          />
        ) : (
          <Row gutter={[16, 16]}>
            {consultations.map((consultation) => (
              <Col xs={24} md={12} lg={8} key={consultation._id}>
                <Card
                  className="h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                  cover={
                    <div className={`h-8 ${getStatusColor(consultation.joinStatus) === 'green' ? 'bg-green-500' : 
                                         getStatusColor(consultation.joinStatus) === 'orange' ? 'bg-orange-500' : 
                                         getStatusColor(consultation.joinStatus) === 'blue' ? 'bg-blue-500' : 
                                         'bg-gray-500'}`}
                    />
                  }
                  bodyStyle={{ padding: '16px' }}
                >
                  <div className="flex items-start mb-4">
                    <Avatar 
                      size={64} 
                      icon={<UserOutlined />}
                      src={consultation.doctorInfo.image}
                      className="mr-4"
                    />
                    <div>
                      <Text className="text-lg font-semibold block">Dr. {consultation.doctorInfo.firstname} {consultation.doctorInfo.lastname}</Text>
                      <Tag color={getStatusColor(consultation.joinStatus)} className="mt-1">
                        {getStatusText(consultation.joinStatus)}
                      </Tag>
                      {consultation.joinStatus !== 'ended' && consultation.videoConsultation.joinedByDoctor && (
                        <Tag color="green" className="ml-1 mt-1">
                          Doctor Online
                        </Tag>
                      )}
                    </div>
                  </div>

                  <Divider className="my-3" />
                  
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <CalendarOutlined className="mr-2 text-blue-500" />
                      <Text>{consultation.formattedDate}</Text>
                    </div>
                    <div className="flex items-center mb-2">
                      <ClockCircleOutlined className="mr-2 text-blue-500" />
                      <Text>{consultation.formattedTime}</Text>
                    </div>
                    {consultation.joinStatus !== 'ended' && (
                      <div className="flex items-center mb-2">
                        <ScheduleOutlined className="mr-2 text-blue-500" />
                        <Text className="font-medium" type={consultation.joinStatus === 'active' ? 'success' : 'secondary'}>
                          {formatTimeUntil(consultation)}
                        </Text>
                      </div>
                    )}
                  </div>
                  
                  <Paragraph ellipsis={{ rows: 2 }} className="text-gray-600">
                    <Text strong>Reason: </Text>
                    {consultation.reason}
                  </Paragraph>
                  
                  <Button
                    type="primary"
                    icon={<VideoCameraOutlined />}
                    onClick={() => handleJoinClick(consultation)}
                    disabled={consultation.joinStatus === 'ended' || consultation.joinStatus === 'upcoming'}
                    block
                    size="large"
                    className="mt-4"
                    style={{ 
                      backgroundColor: consultation.joinStatus === 'active' ? '#52c41a' : 
                                       consultation.joinStatus === 'imminent' ? '#1890ff' : 
                                       consultation.joinStatus === 'ended' ? '#d9d9d9' : '#d9d9d9'
                    }}
                  >
                    {consultation.joinStatus === 'ended' ? 'Call Ended' : 
                     consultation.joinStatus === 'upcoming' && consultation.minutesUntil !== 'Starts in 1 minute' ? 'Not Started Yet' : 
                     'Join Call'}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      <Modal
        title={
          <div className="flex items-center">
            <VideoCameraOutlined className="mr-2 text-blue-500" />
            Join Video Consultation
          </div>
        }
        open={joinModalVisible}
        onCancel={() => setJoinModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setJoinModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="join"
            type="primary"
            loading={joining}
            onClick={joinVideoConsultation}
          >
            Join Now
          </Button>
        ]}
      >
        {selectedConsultation && (
          <>
            <p className="mb-4">You are about to join your video consultation with:</p>
            <p className="font-semibold mb-2">Dr. {selectedConsultation.doctorInfo.firstname} {selectedConsultation.doctorInfo.lastname}</p>
            <p className="mb-4">{selectedConsultation.formattedDate} at {selectedConsultation.formattedTime}</p>
            
            <Alert
              message="Before you join"
              description={
                <ul className="list-disc ml-5">
                  <li>Ensure you're in a quiet, well-lit area</li>
                  <li>Your browser will ask for permission to use your camera and microphone</li>
                  <li>Test your audio and video before entering the call</li>
                  <li>Have any relevant medical documents ready</li>
                </ul>
              }
              type="info"
              showIcon
              className="mb-4"
            />
            
            {selectedConsultation.videoConsultation.joinedByDoctor ? (
              <Alert message="The doctor has already joined the call." type="success" showIcon />
            ) : (
              <Alert message="The doctor hasn't joined the call yet." type="warning" showIcon />
            )}
          </>
        )}
      </Modal>
    </Layout>
  );
};

export default VideoConsultations; 