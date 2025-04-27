import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Layout from '../../components/Layout';
import { 
  Card, Typography, Tabs, Spin, 
  Empty, Row, Col, Input, Button, 
  Avatar, Badge, Collapse, Tag, 
  Tooltip, Divider, Modal, Image,
  message, List, Statistic, Progress,
  Select, Table, Space
} from 'antd';
import { 
  SearchOutlined, FilterOutlined, 
  FileTextOutlined, FilePdfOutlined, 
  FileImageOutlined, EyeOutlined, 
  DownloadOutlined, UserOutlined,
  FileOutlined, CalendarOutlined,
  BarChartOutlined, PieChartOutlined,
  MedicineBoxOutlined, TeamOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { hideLoading, showLoading } from '../../redux/loader';
import { api } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Search } = Input;
const { Option } = Select;

const AdminMedicalRecords = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPatients: 0,
    totalDoctors: 0,
    recordTypes: {}
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState(null);
  const [patientFilter, setPatientFilter] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  
  const dispatch = useDispatch();
  
  // Fetch all medical records
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      const token = localStorage.getItem('token');
      
      const response = await api.get(`admin/medical-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        const fetchedRecords = response.data.data || [];
        console.log('Medical records data:', fetchedRecords);
        
        // Log a sample record to inspect its structure
        if (fetchedRecords.length > 0) {
          console.log('Sample record structure:', {
            record: fetchedRecords[0],
            fields: Object.keys(fetchedRecords[0]),
            doctorId: fetchedRecords[0].doctorId,
            doctorName: fetchedRecords[0].doctorName,
          });
        }
        
        setRecords(fetchedRecords);
        setFilteredRecords(fetchedRecords);
        
        // Extract unique doctors and patients with better handling
        const uniqueDoctors = new Map();
        const uniquePatients = new Map();
        
        fetchedRecords.forEach(record => {
          // Handle doctor information
          if (record.doctorId && record.doctorId._id) {
            // If doctorId is populated, use it
            uniqueDoctors.set(record.doctorId._id, {
              _id: record.doctorId._id,
              name: record.doctorId.name || `${record.doctorId.firstname || ''} ${record.doctorId.lastname || ''}`,
              firstname: record.doctorId.firstname,
              lastname: record.doctorId.lastname
            });
          } else if (record.doctorName) {
            // If only doctorName is available (string), create a synthetic record
            // Use a consistent ID format for doctorName to avoid duplicates
            const syntheticId = `name-${record.doctorName.replace(/\s+/g, '-').toLowerCase()}`;
            uniqueDoctors.set(syntheticId, {
              _id: syntheticId,
              name: record.doctorName,
              isSynthetic: true
            });
          }
          
          // Handle patient information
          if (record.patientId && record.patientId._id) {
            uniquePatients.set(record.patientId._id, record.patientId);
          }
        });
        
        const extractedDoctors = Array.from(uniqueDoctors.values());
        const extractedPatients = Array.from(uniquePatients.values());
        
        console.log('Extracted doctors:', extractedDoctors);
        console.log('Extracted patients:', extractedPatients);
        
        setDoctors(extractedDoctors);
        setPatients(extractedPatients);
        
        // Calculate statistics
        calculateStats(fetchedRecords);
      } else {
        message.error(response.data.message || 'Failed to load medical records');
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      message.error('Failed to fetch medical records');
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  };
  
  // Calculate statistics from records
  const calculateStats = (data) => {
    const recordTypes = {};
    const uniqueDoctors = new Set();
    const uniquePatients = new Set();
    
    data.forEach(record => {
      // Count record types
      if (!recordTypes[record.recordType]) {
        recordTypes[record.recordType] = 0;
      }
      recordTypes[record.recordType]++;
      
      // Count unique doctors
      if (record.doctorId && record.doctorId._id) {
        uniqueDoctors.add(record.doctorId._id);
      }
      
      // Count unique patients
      if (record.patientId && record.patientId._id) {
        uniquePatients.add(record.patientId._id);
      }
    });
    
    setStats({
      totalRecords: data.length,
      totalDoctors: uniqueDoctors.size,
      totalPatients: uniquePatients.size,
      recordTypes
    });
  };
  
  // Initial data loading
  useEffect(() => {
    fetchMedicalRecords();
  }, []);
  
  // Filter records based on search text and filters
  useEffect(() => {
    let filtered = [...records];
    
    // Apply doctor filter with improved handling
    if (doctorFilter) {
      filtered = filtered.filter(record => {
        // For synthetic IDs (from doctorName)
        if (doctorFilter.startsWith('name-')) {
          const doctorNameInFilter = doctorFilter.substring(5).replace(/-/g, ' ');
          return record.doctorName && record.doctorName.toLowerCase() === doctorNameInFilter;
        }
        
        // For regular doctorId references
        return record.doctorId && record.doctorId._id === doctorFilter;
      });
    }
    
    // Apply patient filter
    if (patientFilter) {
      filtered = filtered.filter(record => 
        record.patientId && record.patientId._id === patientFilter
      );
    }
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(record => 
        record.title.toLowerCase().includes(searchLower) ||
        (record.description && record.description.toLowerCase().includes(searchLower)) ||
        (record.doctorId?.name && record.doctorId.name.toLowerCase().includes(searchLower)) ||
        (record.doctorId?.firstname && record.doctorId.firstname.toLowerCase().includes(searchLower)) ||
        (record.doctorId?.lastname && record.doctorId.lastname.toLowerCase().includes(searchLower)) ||
        (record.doctorName && record.doctorName.toLowerCase().includes(searchLower)) ||
        (record.patientId?.name && record.patientId.name.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredRecords(filtered);
  }, [searchText, doctorFilter, patientFilter, records]);
  
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
  
  // Get file icon based on file type
  const getFileIcon = (fileUrl) => {
    if (!fileUrl) return <FileTextOutlined />;
    
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    } else if (
      fileUrl.toLowerCase().endsWith('.jpg') ||
      fileUrl.toLowerCase().endsWith('.jpeg') ||
      fileUrl.toLowerCase().endsWith('.png')
    ) {
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    }
    
    return <FileTextOutlined />;
  };
  
  // Preview image or document
  const handlePreview = (url, fileType) => {
    if (!url) {
      message.error('No file URL available to preview');
      return;
    }
    
    if (fileType === 'image') {
      // For images, show in modal
      setPreviewImage(url);
      setPreviewVisible(true);
    } else if (fileType === 'pdf') {
      // For PDFs, show in modal or open in new tab based on browser capability
      // Some browsers may not support PDF iframe preview
      try {
        setPdfPreviewUrl(url);
        setPdfPreviewVisible(true);
      } catch (error) {
        console.error('Error previewing PDF:', error);
        // Fallback to opening in new tab
        window.open(url, '_blank');
      }
    } else {
      // For other file types, open in new tab
      window.open(url, '_blank');
    }
  };
  
  // Download file
  const handleDownload = (url, fileName) => {
    if (!url) {
      message.error('No file URL provided');
      return;
    }
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = fileName || 'medical_record';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setSearchText('');
    setDoctorFilter(null);
    setPatientFilter(null);
  };
  
  // Render statistics dashboard
  const renderStatsDashboard = () => {
    return (
      <Card className="mb-4 sm:mb-6 shadow-md">
        <Title level={4} className="mb-4 text-lg sm:text-xl">Medical Records Overview</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic 
              title="Total Records"
              value={stats.totalRecords}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic 
              title="Total Patients"
              value={stats.totalPatients}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic 
              title="Total Doctors"
              value={stats.totalDoctors}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
        
        <Divider className="my-3 sm:my-4" />
        
        <Title level={5} className="mb-2 sm:mb-3 text-base sm:text-lg">Records by Type</Title>
        <Row gutter={[12, 12]}>
          {Object.entries(stats.recordTypes).map(([type, count], index) => (
            <Col xs={12} sm={12} md={8} lg={6} key={index}>
              <Card size="small" className="h-full">
                <Statistic 
                  title={getRecordTypeTag(type)}
                  value={count}
                  valueStyle={{ fontSize: '1rem', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };
  
  // Table columns with responsive adjustments
  const columns = [
    {
      title: 'Record',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div className="flex items-center">
          <div className="mr-2">
            {getFileIcon(record.fileUrl)}
          </div>
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-gray-500">
              {moment(record.createdAt).format('MMM D, YYYY')}
            </div>
          </div>
        </div>
      ),
      responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    {
      title: 'Patient',
      dataIndex: 'patientId',
      key: 'patient',
      render: (patientId) => {
        if (!patientId) return <span className="text-gray-400">Unknown</span>;
        
        return (
          <div className="flex items-center">
            <Avatar icon={<UserOutlined />} className="mr-2" />
            <span>{patientId.name}</span>
          </div>
        );
      },
      responsive: ['sm', 'md', 'lg', 'xl'],
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorId',
      key: 'doctor',
      render: (doctorId, record) => {
        // First try to use doctorName field if available
        if (record.doctorName) {
          return (
            <div className="flex items-center">
              <Avatar icon={<UserOutlined />} className="mr-2" />
              <span>{record.doctorName}</span>
            </div>
          );
        }
        
        // If no doctorName, try to use doctorId
        if (!doctorId) return <span className="text-gray-400">Unknown</span>;
        
        // Handle different formats of doctorId
        let doctorName = 'Unknown';
        if (typeof doctorId === 'object') {
          if (doctorId.name) {
            doctorName = `Dr. ${doctorId.name}`;
          } else if (doctorId.firstname || doctorId.lastname) {
            doctorName = `Dr. ${doctorId.firstname || ''} ${doctorId.lastname || ''}`.trim();
          }
        }
        
        return (
          <div className="flex items-center">
            <Avatar icon={<UserOutlined />} className="mr-2" />
            <span>{doctorName}</span>
          </div>
        );
      },
      responsive: ['sm', 'md', 'lg', 'xl'],
    },
    {
      title: 'Type',
      dataIndex: 'recordType',
      key: 'recordType',
      render: (type) => getRecordTypeTag(type),
      responsive: ['md', 'lg', 'xl'],
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('MMM D, YYYY'),
      responsive: ['lg', 'xl'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.fileUrl && (
            <>
              <Tooltip title="View File">
                <Button 
                  type="text" 
                  icon={<EyeOutlined />} 
                  onClick={() => handlePreview(
                    record.fileUrl, 
                    record.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                    record.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? 'image' : 'other'
                  )}
                />
              </Tooltip>
              <Tooltip title="Download">
                <Button 
                  type="text" 
                  icon={<DownloadOutlined />} 
                  onClick={() => handleDownload(record.fileUrl, record.title)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              onClick={(e) => {
                // This is a workaround to trigger the expandable row
                const expandIcon = document.querySelector(`[data-row-key="${record._id}"] .ant-table-row-expand-icon`);
                if (expandIcon) {
                  expandIcon.click();
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
      responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  ];
  
  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Title level={2} className="mb-4 sm:mb-6 text-xl sm:text-2xl">Medical Records Management</Title>
        
        {/* Stats Dashboard */}
        {renderStatsDashboard()}
        
        {/* Filters */}
        <Card className="mb-4 sm:mb-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex-1">
              <Search
                placeholder="Search records, patients, or doctors"
                allowClear
                enterButton
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={setSearchText}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                placeholder="Filter by Doctor"
                allowClear
                style={{ width: '100%', minWidth: 'auto' }}
                value={doctorFilter}
                onChange={setDoctorFilter}
              >
                {doctors.map(doctor => (
                  <Option key={doctor._id} value={doctor._id}>
                    {doctor.isSynthetic 
                      ? doctor.name 
                      : `Dr. ${doctor.name || `${doctor.firstname || ''} ${doctor.lastname || ''}`}`
                    }
                  </Option>
                ))}
              </Select>
              
              <Select
                placeholder="Filter by Patient"
                allowClear
                style={{ width: '100%', minWidth: 'auto' }}
                value={patientFilter}
                onChange={setPatientFilter}
              >
                {patients.map(patient => (
                  <Option key={patient._id} value={patient._id}>
                    {patient.name}
                  </Option>
                ))}
              </Select>
              
              <Button onClick={handleResetFilters} icon={<FilterOutlined />}>
                Reset
              </Button>
            </div>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div className="flex justify-between items-center mb-2">
            <Text className="text-gray-500">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'} found
            </Text>
          </div>
        </Card>
        
        {/* Records Table */}
        <Card className="shadow-md overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="_id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No medical records found"
                />
              )
            }}
            scroll={{ x: 'max-content' }}
            expandable={{
              expandedRowRender: record => {
                // Format doctor name consistently
                let doctorDisplay = 'Unknown';
                if (record.doctorName) {
                  doctorDisplay = record.doctorName;
                } else if (record.doctorId) {
                  if (record.doctorId.name) {
                    doctorDisplay = `Dr. ${record.doctorId.name}`;
                  } else if (record.doctorId.firstname || record.doctorId.lastname) {
                    doctorDisplay = `Dr. ${record.doctorId.firstname || ''} ${record.doctorId.lastname || ''}`.trim();
                  }
                }
                
                return (
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="mb-3">
                      <div className="block sm:hidden">
                        <p><strong>Patient:</strong> {record.patientId?.name || 'Unknown'}</p>
                        <p><strong>Doctor:</strong> {doctorDisplay}</p>
                        <p><strong>Type:</strong> {getRecordTypeTag(record.recordType)}</p>
                        <p><strong>Date:</strong> {moment(record.createdAt).format('MMM D, YYYY')}</p>
                      </div>
                      
                      {record.description && (
                        <div className="mt-2">
                          <p className="font-medium">Description:</p>
                          <p className="text-gray-600">{record.description}</p>
                        </div>
                      )}
                      
                      <Row gutter={[16, 16]} className="mt-3">
                        <Col span={24} md={12}>
                          <Card size="small" title="Record Details" className="bg-white">
                            <p><strong>Record ID:</strong> {record._id}</p>
                            <p><strong>File Name:</strong> {record.fileName || 'N/A'}</p>
                            <p><strong>File Type:</strong> {record.fileType || 'N/A'}</p>
                            <p><strong>Created:</strong> {moment(record.createdAt).format('MMMM D, YYYY [at] h:mm A')}</p>
                            <p><strong>Last Updated:</strong> {moment(record.updatedAt).format('MMMM D, YYYY [at] h:mm A')}</p>
                          </Card>
                        </Col>
                        <Col span={24} md={12}>
                          <Card size="small" title="Provider Information" className="bg-white">
                            <p><strong>Doctor:</strong> {doctorDisplay}</p>
                            {record.doctorId && record.doctorId.email && (
                              <p><strong>Email:</strong> {record.doctorId.email}</p>
                            )}
                            {record.doctorId && record.doctorId.phone && (
                              <p><strong>Phone:</strong> {record.doctorId.phone}</p>
                            )}
                            {record.patientId && (
                              <p><strong>Patient:</strong> {record.patientId.name || 'Unknown'}</p>
                            )}
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </div>
                );
              },
              expandRowByClick: false,
            }}
          />
        </Card>
        
        {/* Image Preview Modal */}
        <Modal
          visible={previewVisible}
          title="Image Preview"
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width="95%"
          style={{ maxWidth: '800px' }}
          centered
          bodyStyle={{ padding: '12px' }}
        >
          <Image
            alt="Medical record"
            style={{ width: '100%' }}
            src={previewImage}
            preview={false}
          />
        </Modal>
        
        {/* PDF Preview Modal */}
        <Modal
          visible={pdfPreviewVisible}
          title="PDF Preview"
          footer={null}
          onCancel={() => setPdfPreviewVisible(false)}
          width="95%"
          style={{ maxWidth: '800px' }}
          centered
          bodyStyle={{ padding: '12px' }}
        >
          <div style={{ height: '70vh', width: '100%' }}>
            <iframe
              src={pdfPreviewUrl}
              title="PDF Preview"
              width="100%"
              height="100%"
              frameBorder="0"
            />
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default AdminMedicalRecords; 