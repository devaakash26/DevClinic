import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { api } from '../../utils/apiUtils';
import {
  Card, Button, Typography, Tabs, Spin, Empty, Input, Tag, Table,
  Space, Modal, Divider, Image, Avatar, Timeline, Statistic
} from 'antd';
import {
  FileTextOutlined, SearchOutlined, FilePdfOutlined,
  FileImageOutlined, DownloadOutlined, MailOutlined,
  ClockCircleOutlined, InfoCircleOutlined, UserOutlined
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import { showLoading, hideLoading } from '../../redux/loader';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

const PatientMedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    recordTypes: {}
  });
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.user);
  
  // Fetch all patient's medical records
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      const token = localStorage.getItem('token');
      
      const response = await api.get(`user/patient-medical-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        const fetchedRecords = response.data.data || [];
        
        // Process each record to ensure doctor information is properly formatted
        const processedRecords = fetchedRecords.map(record => {
          // Create a processed record with all original data
          const processedRecord = {...record};
          
          // Process doctor information
          if (record.doctorId) {
            // If doctorId is a string but we have doctorInfo, use that instead
            if (typeof record.doctorId === 'string' && record.doctorInfo) {
              processedRecord.doctorId = record.doctorInfo;
            }
            
            // If we have a doctor name but not structured as firstname/lastname
            if (!processedRecord.doctorId.firstname && !processedRecord.doctorId.lastname && 
                processedRecord.doctorId.name) {
              // Parse the name if it has "Dr." prefix
              const name = processedRecord.doctorId.name;
              if (name.startsWith('Dr.')) {
                const nameWithoutPrefix = name.substring(3).trim();
                const nameParts = nameWithoutPrefix.split(' ');
                if (nameParts.length >= 2) {
                  processedRecord.doctorId.firstname = nameParts[0];
                  processedRecord.doctorId.lastname = nameParts.slice(1).join(' ');
                }
              }
            }
          } else if (record.doctorInfo) {
            // If doctorId is missing but we have doctorInfo
            processedRecord.doctorId = record.doctorInfo;
          } else if (record.doctorName) {
            // If we only have doctorName as a string
            processedRecord.doctorName = record.doctorName;
          }
          
          return processedRecord;
        });
        
        setRecords(processedRecords);
        setFilteredRecords(processedRecords);
        calculateStats(processedRecords);
        
        console.log("Processed medical records:", processedRecords);
      } else {
        toast.error(response.data.message || "Failed to fetch medical records");
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
      toast.error("Failed to fetch your medical records");
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  };
  
  // Calculate statistics from records
  const calculateStats = (data) => {
    const recordTypes = {};
    
    data.forEach(record => {
      if (!recordTypes[record.recordType]) {
        recordTypes[record.recordType] = 0;
      }
      recordTypes[record.recordType]++;
    });
    
    setStats({
      totalRecords: data.length,
      recordTypes
    });
  };
  
  useEffect(() => {
    fetchMedicalRecords();
  }, []);
  
  // Filter records based on search text and active tab
  useEffect(() => {
    let filtered = [...records];
    
    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(record => record.recordType === activeTab);
    }
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(record => 
        record.title.toLowerCase().includes(searchLower) ||
        (record.description && record.description.toLowerCase().includes(searchLower)) ||
        (record.doctorId?.firstname && record.doctorId.firstname.toLowerCase().includes(searchLower)) ||
        (record.doctorId?.lastname && record.doctorId.lastname.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredRecords(filtered);
  }, [searchText, activeTab, records]);
  
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
  
  // Preview image
  const handlePreview = (url) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };
  
  // Request email delivery of a medical record
  const requestEmailDelivery = async (recordId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
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
        toast.success("Medical record has been sent to your email");
      } else {
        toast.error(response.data.message || "Failed to send medical record email");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error sending medical record email:", error);
      toast.error("Error sending medical record to your email");
    }
  };
  
  // Get file icon based on file type
  const getFileIcon = (record) => {
    if (!record.fileUrl) return <FileTextOutlined />;
    
    if (record.fileUrl.toLowerCase().endsWith('.pdf')) {
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    } else if (
      record.fileUrl.toLowerCase().endsWith('.jpg') ||
      record.fileUrl.toLowerCase().endsWith('.jpeg') ||
      record.fileUrl.toLowerCase().endsWith('.png')
    ) {
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    }
    
    return <FileTextOutlined />;
  };
  
  // Get tag color based on record type
  const getRecordTypeTag = (type) => {
    const colors = {
      clinical_report: 'blue',
      lab_test: 'green',
      prescription: 'purple',
      imaging: 'orange',
      other: 'default'
    };
    
    const labels = {
      clinical_report: 'Clinical Report',
      lab_test: 'Lab Test',
      prescription: 'Prescription',
      imaging: 'Imaging',
      other: 'Other'
    };
    
    return (
      <Tag color={colors[type] || 'default'}>
        {labels[type] || type}
      </Tag>
    );
  };
  
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div className="flex items-center">
          {getFileIcon(record)}
          <span className="ml-2">{text}</span>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'recordType',
      key: 'recordType',
      render: type => getRecordTypeTag(type),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorName',
      key: 'doctor',
      render: (doctorName, record) => doctorName || "Doctor information unavailable",
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: date => moment(date).format('DD MMM YYYY'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            onClick={() => openMedicalRecord(record.fileUrl)}
            disabled={!record.fileUrl}
          >
            View
          </Button>
          <Button
            size="small"
            onClick={() => requestEmailDelivery(record._id)}
            icon={<MailOutlined />}
          >
            Send to Email
          </Button>
        </Space>
      ),
    },
  ];
  
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Title level={2}>My Medical Records</Title>
            <Search
              placeholder="Search records"
              allowClear
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <Statistic
                title="Total Records"
                value={stats.totalRecords}
                prefix={<FileTextOutlined />}
              />
            </Card>
            {Object.keys(stats.recordTypes).slice(0, 2).map(type => (
              <Card key={type}>
                <Statistic
                  title={type.replace('_', ' ')}
                  value={stats.recordTypes[type]}
                  suffix={`Records`}
                />
              </Card>
            ))}
          </div>
        </div>
        
        <Card className="mb-6">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="All Records" key="all" />
            {Object.keys(stats.recordTypes).map(type => (
              <TabPane tab={type.replace('_', ' ')} key={type} />
            ))}
          </Tabs>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <Table
              columns={columns}
              dataSource={filteredRecords}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty
              description={
                activeTab === 'all'
                  ? "You don't have any medical records yet"
                  : `No ${activeTab.replace('_', ' ')} records found`
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-8"
            />
          )}
        </Card>
        
        <Modal
          visible={previewVisible}
          title="Image Preview"
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          <img alt="preview" style={{ width: '100%' }} src={previewImage} />
        </Modal>
      </div>
    </Layout>
  );
};

export default PatientMedicalRecords; 