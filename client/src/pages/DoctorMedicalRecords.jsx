import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Layout from '../components/Layout';
import { 
  Card, Typography, Tabs, Spin, 
  Empty, Row, Col, Input, Button, 
  Avatar, Badge, Collapse, Tag, 
  Tooltip, Divider, Modal, Image,
  message, List, Statistic, Progress,
  Select
} from 'antd';
import { 
  SearchOutlined, FilterOutlined, 
  FileAddOutlined, FileTextOutlined, 
  FilePdfOutlined, FileImageOutlined, 
  PlusOutlined, EyeOutlined, DownloadOutlined,
  UserOutlined, FileOutlined, 
  CalendarOutlined, ClockCircleOutlined,
  BarChartOutlined, PieChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import MedicalRecordUpload from '../components/MedicalRecordUpload';
import { hideLoading, showLoading } from '../redux/loader';
import { fixCloudinaryPdfUrl, downloadPdf } from '../utils/pdfUtils';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Search } = Input;

const DoctorMedicalRecords = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(true);
  const [patientRecords, setPatientRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPatients: 0,
    recordTypes: {}
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
  const [pdfFallbackView, setPdfFallbackView] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  
  const dispatch = useDispatch();
  
  // Fetch all medical records grouped by patient
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      // Get the necessary IDs
      const token = localStorage.getItem('token');
      const doctorId = localStorage.getItem('doctorId');
      const userId = localStorage.getItem('userId');
      
      console.log("Current IDs:", {
        doctorId,
        userId,
        token: token ? `${token.substring(0, 10)}...` : null
      });
      
      // Try both doctorId and userId in case one works
      const response = await axios.get(
        'http://localhost:4000/api/doctor/medical-records',
        {
          params: {
            doctorId: doctorId, 
            userId: userId
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log("API Response:", response.data);
      
      if (response.data.success) {
        const data = response.data.data || [];
        console.log(`Found ${data.length} patient groups with records`);
        
        if (data.length === 0) {
          message.info("No medical records found for this doctor");
        }
        
        setPatientRecords(data);
        setFilteredRecords(data);
        
        // Calculate statistics
        calculateStats(data);
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
      message.error(error.response?.data?.message || "Failed to fetch medical records");
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  };
  
  // Calculate statistics from records
  const calculateStats = (data) => {
    const recordTypes = {};
    let totalRecords = 0;
    
    data.forEach(patientData => {
      totalRecords += patientData.records.length;
      
      patientData.records.forEach(record => {
        if (!recordTypes[record.recordType]) {
          recordTypes[record.recordType] = 0;
        }
        recordTypes[record.recordType]++;
      });
    });
    
    setStats({
      totalRecords,
      totalPatients: data.length,
      recordTypes
    });
  };
  
  // Add a function to fetch patients list
  const fetchPatientsList = async () => {
    try {
      const token = localStorage.getItem('token');
      const doctorId = localStorage.getItem('doctorId');
      
      if (!doctorId) {
        // message.error('Doctor IDat  not found. Please login again.');
        return;
      }
      
      const response = await axios.get('http://localhost:4000/api/doctor/get-patient-list', {
        params: { doctorId },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        // Extract unique patients from appointments
        const uniquePatientsMap = new Map();
        response.data.patients.forEach(appointment => {
          if (appointment.userId && !uniquePatientsMap.has(appointment.userId._id)) {
            uniquePatientsMap.set(appointment.userId._id, appointment.userId);
          }
        });
        
        // Convert map to array
        const uniquePatients = Array.from(uniquePatientsMap.values());
        setPatientsList(uniquePatients);
        console.log("Fetched patients list:", uniquePatients);
      }
    } catch (error) {
      console.error("Error fetching patients list:", error);
      message.error("Failed to fetch patients list");
    }
  };
  
  // Modify the useEffect to also fetch patients list
  useEffect(() => {
    fetchMedicalRecords();
    fetchPatientsList();
  }, []);
  
  // Filter records based on search text
  useEffect(() => {
    if (!searchText) {
      setFilteredRecords(patientRecords);
      return;
    }
    
    const searchLower = searchText.toLowerCase();
    const filtered = patientRecords.filter(patientData => {
      // Search in patient info
      if (
        patientData.patient.name?.toLowerCase().includes(searchLower) ||
        patientData.patient.email?.toLowerCase().includes(searchLower)
      ) {
        return true;
      }
      
      // Search in records
      return patientData.records.some(record => 
        record.title.toLowerCase().includes(searchLower) ||
        (record.description && record.description.toLowerCase().includes(searchLower))
      );
    });
    
    setFilteredRecords(filtered);
  }, [searchText, patientRecords]);
  
  // Handle record type filter
  const handleFilterByType = (type) => {
    if (!type) {
      setFilteredRecords(patientRecords);
      return;
    }
    
    const filtered = patientRecords.map(patientData => {
      return {
        ...patientData,
        records: patientData.records.filter(record => record.recordType === type)
      };
    }).filter(patientData => patientData.records.length > 0);
    
    setFilteredRecords(filtered);
  };
  
  const handleSearch = (value) => {
    setSearchText(value);
  };
  
  // Add a function to handle patient selection
  const handlePatientSelect = (patientId) => {
    const patient = patientsList.find(p => p._id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      console.log("Selected patient:", patient);
    }
  };
  
  // Modify the "Upload New Record" button click handler
  const handleNewRecordClick = () => {
    // If we have patients but no selected patient, select the first one
    if (!selectedPatient && patientsList.length > 0) {
      setSelectedPatient(patientsList[0]);
    }
    setUploadModalVisible(true);
  };
  
  const handleUploadSuccess = (newRecord) => {
    message.success("Record uploaded successfully");
    setUploadModalVisible(false);
    fetchMedicalRecords();
  };
  
  const getRecordTypeTag = (type) => {
    const typeConfig = {
      clinical_report: { color: 'blue', text: 'Clinical Report' },
      lab_test: { color: 'purple', text: 'Lab Test' },
      prescription: { color: 'green', text: 'Prescription' },
      imaging: { color: 'magenta', text: 'Imaging/Scan' },
      other: { color: 'orange', text: 'Other' }
    };
    
    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };
  
  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf' || fileType === 'pdf') {
      return <FilePdfOutlined className="text-red-500 text-xl" />;
    } else if (fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      return <FileImageOutlined className="text-blue-500 text-xl" />;
    } else {
      return <FileTextOutlined className="text-orange-500 text-xl" />;
    }
  };
  
  const handlePreview = (url, fileType) => {
    if (!url) return;
    
    if (fileType === 'application/pdf' || fileType === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
      // Reset fallback view state
      setPdfFallbackView(false);
      
      // Fix the Cloudinary URL for PDF viewing
      const pdfUrl = fixCloudinaryPdfUrl(url);
      
      // Set the URL and open the preview modal
      setPdfPreviewUrl(pdfUrl);
      setPdfPreviewVisible(true);
    } else if (fileType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileType) || 
               url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      setPreviewImage(url);
      setPreviewVisible(true);
    } else {
      // For other file types, just open in a new tab
      window.open(url, '_blank');
    }
  };
  
  const handleDownload = (url, fileName, fileType) => {
    if (!url) return;
    
    if (fileType === 'application/pdf' || fileType === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
      downloadPdf(url, fileName);
    } else {
      // For other file types, open in new tab
      window.open(url, '_blank');
    }
  };
  
  // Add a function to handle adding a record from patient card
  const handleAddRecord = (patient) => {
    // Mark this patient as selected from a patient card
    const patientWithFlag = {
      ...patient,
      fromPatientCard: true
    };
    setSelectedPatient(patientWithFlag);
    setUploadModalVisible(true);
  };
  
  // Render Stats Dashboard
  const renderStatsDashboard = () => {
    const recordTypesForChart = Object.entries(stats.recordTypes)
      .map(([key, value]) => ({
        type: key,
        count: value,
        color: {
          clinical_report: '#1890ff',
          lab_test: '#722ed1',
          prescription: '#52c41a',
          imaging: '#eb2f96',
          other: '#fa8c16'
        }[key] || '#bfbfbf'
      }));
      
    return (
      <div className="stats-dashboard">
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={8}>
            <Card className="h-full">
              <Statistic 
                title="Total Patients" 
                value={stats.totalPatients} 
                prefix={<UserOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="h-full">
              <Statistic 
                title="Total Records" 
                value={stats.totalRecords} 
                prefix={<FileOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="h-full">
              <Statistic 
                title="Most Common Type" 
                value={Object.entries(stats.recordTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key]) => key.replace('_', ' '))
                  .map(s => s.charAt(0).toUpperCase() + s.slice(1))[0] || 'None'
                } 
                prefix={<PieChartOutlined />} 
              />
            </Card>
          </Col>
        </Row>
        
        <Card title="Record Types Distribution" className="mb-6">
          <div className="record-types-distribution">
            {recordTypesForChart.map(type => (
              <div key={type.type} className="mb-4">
                <div className="flex justify-between mb-1">
                  <Text>{type.type.replace('_', ' ')}</Text>
                  <Text>{type.count} records</Text>
                </div>
                <Progress 
                  percent={Math.round((type.count / stats.totalRecords) * 100)} 
                  strokeColor={type.color}
                  showInfo={false}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };
  
  // Render patient cards with records
  const renderPatientRecords = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      );
    }
    
    if (!filteredRecords || filteredRecords.length === 0) {
      return (
        <Empty 
          description="No medical records found" 
          className="py-8"
        />
      );
    }
    
    return (
      <div className="patient-records-list">
        {filteredRecords.map(patientData => (
          <Card 
            key={patientData.patient._id}
            className="mb-6 shadow-sm hover:shadow-md transition-shadow"
            title={
              <div className="flex items-center">
                <Avatar 
                  src={patientData.patient.photo} 
                  size={48}
                  icon={<UserOutlined />}
                  className="mr-3"
                />
                <div>
                  <Title level={4} className="m-0">
                    {patientData.patient.name || 'Patient'}
                  </Title>
                  <Text type="secondary" className="block text-sm">
                    {patientData.patient.email || 'No email'}
                  </Text>
                </div>
              </div>
            }
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleAddRecord(patientData.patient)}
              >
                Add Record
              </Button>
            }
          >
            <div className="patient-info-summary flex flex-wrap gap-4 mb-4">
              {patientData.patient.gender && (
                <Text className="patient-info-item">
                  <strong>Gender:</strong> {patientData.patient.gender}
                </Text>
              )}
              {patientData.patient.age && (
                <Text className="patient-info-item">
                  <strong>Age:</strong> {patientData.patient.age}
                </Text>
              )}
              {patientData.patient.phone && (
                <Text className="patient-info-item">
                  <strong>Phone:</strong> {patientData.patient.phone}
                </Text>
              )}
              <Divider className="my-3" />
              <Text>
                <strong>Medical Records:</strong> {patientData.records.length}
              </Text>
            </div>
            
            <Collapse 
              defaultActiveKey={['1']} 
              className="records-collapse"
            >
              <Panel 
                header={
                  <div className="flex justify-between items-center w-full">
                    <span>Medical Records</span>
                    <Badge count={patientData.records.length} className="mr-2" />
                  </div>
                } 
                key="1"
              >
                <List
                  dataSource={patientData.records}
                  renderItem={record => (
                    <List.Item
                      key={record._id}
                      actions={[
                        <Tooltip title="View">
                          <Button 
                            icon={<EyeOutlined />} 
                            onClick={() => handlePreview(record.fileUrl, record.fileType)}
                            disabled={!record.fileUrl}
                          />
                        </Tooltip>,
                        <Tooltip title="Download">
                          <Button 
                            icon={<DownloadOutlined />} 
                            onClick={() => handleDownload(record.fileUrl, record.title, record.fileType)}
                            disabled={!record.fileUrl}
                          />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={getFileIcon(record.fileType)}
                        title={
                          <div className="flex items-center">
                            <span className="mr-2">{record.title}</span>
                            {getRecordTypeTag(record.recordType)}
                          </div>
                        }
                        description={
                          <div>
                            {record.description && (
                              <Text className="block text-sm mb-1">{record.description}</Text>
                            )}
                            <Text type="secondary" className="text-xs">
                              <CalendarOutlined className="mr-1" />
                              Uploaded: {moment(record.createdAt).format('MMM D, YYYY')}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Panel>
            </Collapse>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="medical-records-page">
        <div className="page-header flex justify-between items-center mb-6">
          <Title level={2}>Medical Records</Title>
          <div className="flex gap-2">
            <Search
              placeholder="Search records or patients"
              allowClear
              onSearch={handleSearch}
              style={{ width: 250 }}
            />
          </div>
        </div>
        
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-6">
          <TabPane tab="Patient Records" key="1">
            <div className="filter-section mb-4 flex flex-wrap gap-2">
              <Button 
                onClick={() => handleFilterByType(null)}
                type={!searchText ? 'primary' : 'default'}
              >
                All Records
              </Button>
              {Object.keys(stats.recordTypes).map(type => (
                <Button 
                  key={type} 
                  onClick={() => handleFilterByType(type)}
                  icon={getFileIcon(type)}
                >
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
            {renderPatientRecords()}
          </TabPane>
          <TabPane tab="Statistics" key="2">
            {renderStatsDashboard()}
          </TabPane>
        </Tabs>
        
        {/* Upload Modal */}
        <Modal
          title={
            <div className="flex items-center">
              <FileAddOutlined className="text-blue-500 mr-2" />
              <span>Upload Medical Record{selectedPatient ? ` for ${selectedPatient.name}` : ''}</span>
            </div>
          }
          open={uploadModalVisible}
          onCancel={() => {
            console.log("Closing upload modal");
            setUploadModalVisible(false);
            // Clear selected patient only if it was selected from the global button
            if (!selectedPatient?.fromPatientCard) {
              setSelectedPatient(null);
            }
          }}
          footer={null}
          width={600}
          destroyOnClose={true}
        >
          {selectedPatient ? (
            <MedicalRecordUpload
              patientId={selectedPatient._id}
              doctorId={localStorage.getItem('doctorId')}
              patientName={selectedPatient.name}
              onSuccess={handleUploadSuccess}
              onCancel={() => {
                console.log("Cancelling from inner component");
                setUploadModalVisible(false);
              }}
            />
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="mb-2">Select a Patient</h3>
                {patientsList.length > 0 ? (
                  <div>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Select a patient"
                      onChange={(patientId) => {
                        const patient = patientsList.find(p => p._id === patientId);
                        if (patient) {
                          setSelectedPatient(patient);
                        }
                      }}
                    >
                      {patientsList.map(patient => (
                        <Select.Option key={patient._id} value={patient._id}>
                          {patient.name || 'Patient'} ({patient.email || 'No email'})
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <Empty description="No patients found. Please add patients first." />
                )}
              </div>
            </div>
          )}
        </Modal>
        
        {/* Image Preview Modal */}
        <Modal
          open={previewVisible}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          centered
          width="80%"
        >
          <Image
            alt="Preview"
            style={{ width: '100%' }}
            src={previewImage}
            preview={false}
          />
        </Modal>
        
        {/* PDF Preview Modal */}
        <Modal
          title="PDF Document"
          open={pdfPreviewVisible}
          onCancel={() => setPdfPreviewVisible(false)}
          footer={[
            <Button 
              key="fallback" 
              onClick={() => setPdfFallbackView(!pdfFallbackView)}
            >
              {pdfFallbackView ? "Use iframe viewer" : "Use Google Docs viewer"}
            </Button>,
            <Button key="download" type="primary" onClick={() => window.open(pdfPreviewUrl, '_blank')}>
              Open in New Tab
            </Button>,
            <Button key="cancel" onClick={() => setPdfPreviewVisible(false)}>
              Close
            </Button>
          ]}
          width="90%"
          style={{ top: 20 }}
          bodyStyle={{ height: '80vh' }}
        >
          <div style={{ height: '100%', width: '100%' }}>
            {!pdfFallbackView ? (
              <iframe
                src={pdfPreviewUrl}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="PDF Viewer"
                onError={() => {
                  console.log("PDF iframe load error - switching to fallback view");
                  setPdfFallbackView(true);
                }}
              />
            ) : (
              // Fallback to Google Docs viewer
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfPreviewUrl)}&embedded=true`}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Google PDF Viewer"
              />
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default DoctorMedicalRecords; 