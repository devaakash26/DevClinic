import React, { useState } from 'react';
import { 
  List, Card, Typography, Tag, Button, Space, 
  Tooltip, Popconfirm, Empty, Spin, Modal, Image
} from 'antd';
import {
  FilePdfOutlined, FileImageOutlined, 
  FileTextOutlined, DeleteOutlined, 
  EyeOutlined, DownloadOutlined,
  ClockCircleOutlined, UserOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { api } from '../utils/apiUtils';
import moment from 'moment';
import { fixCloudinaryPdfUrl, downloadPdf } from '../utils/pdfUtils';

const { Title, Text } = Typography;

const MedicalRecordsList = ({ 
  records, 
  loading, 
  onDelete, 
  isDoctor = false 
}) => {
  const [previewImage, setPreviewImage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
  const [pdfFallbackView, setPdfFallbackView] = useState(false);

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
    if (fileType === 'application/pdf') {
      return <FilePdfOutlined className="text-red-500 text-xl" />;
    } else if (fileType.startsWith('image/')) {
      return <FileImageOutlined className="text-blue-500 text-xl" />;
    } else {
      return <FileTextOutlined className="text-orange-500 text-xl" />;
    }
  };
  
  const handleDeleteRecord = async (recordId) => {
    try {
      await api.delete(`doctor/medical-record/${recordId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      onDelete(recordId);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };
  
  const handlePreview = (url, fileType, fileName) => {
    if (fileType.startsWith('image/')) {
      setPreviewImage(url);
      setPreviewVisible(true);
    } else if (fileType === 'application/pdf') {
      // Reset fallback view state
      setPdfFallbackView(false);
      
      // Fix the Cloudinary URL for PDF viewing
      const pdfUrl = fixCloudinaryPdfUrl(url);
      
      // Set the URL and open the preview modal
      setPdfPreviewUrl(pdfUrl);
      setPdfPreviewVisible(true);
    } else {
      // For other file types, just open in a new tab
      window.open(url, '_blank');
    }
  };

  const handleDownload = (url, fileName, fileType) => {
    // For PDFs from Cloudinary, ensure we have the correct URL
    if (fileType === 'application/pdf') {
      downloadPdf(url, fileName);
    } else {
      // For other file types, open in new tab
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No medical records found"
      />
    );
  }

  return (
    <div className="medical-records-list">
      <List
        dataSource={records}
        grid={{ 
          gutter: 16, 
          xs: 1, 
          sm: 1, 
          md: 2, 
          lg: 2, 
          xl: 3, 
          xxl: 3 
        }}
        renderItem={record => (
          <List.Item>
            <Card 
              hoverable 
              className="h-full flex flex-col"
              actions={[
                <Tooltip title="View/Open">
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => handlePreview(record.fileUrl, record.fileType, record.fileName)}
                  />
                </Tooltip>,
                <Tooltip title="Download">
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(record.fileUrl, record.fileName, record.fileType)}
                  />
                </Tooltip>,
                isDoctor && (
                  <Tooltip title="Delete">
                    <Popconfirm
                      title="Delete this record?"
                      description="This action cannot be undone"
                      onConfirm={() => handleDeleteRecord(record._id)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button 
                        type="text" 
                        icon={<DeleteOutlined />} 
                        danger
                      />
                    </Popconfirm>
                  </Tooltip>
                )
              ].filter(Boolean)}
            >
              <div className="flex mb-3">
                {getFileIcon(record.fileType)}
                <div className="ml-2 flex-1 truncate">
                  <Title level={5} className="m-0 truncate">{record.title}</Title>
                  <Space size={4}>
                    {getRecordTypeTag(record.recordType)}
                  </Space>
                </div>
              </div>
              
              {record.description && (
                <Text type="secondary" className="block mb-3 line-clamp-2">
                  {record.description}
                </Text>
              )}
              
              <div className="mt-auto text-xs text-gray-500">
                <div className="flex items-center">
                  <ClockCircleOutlined className="mr-1" /> 
                  Uploaded {moment(record.createdAt).format('MMM D, YYYY')}
                </div>
                <div className="flex items-center mt-1">
                  <UserOutlined className="mr-1" /> 
                  By {isDoctor ? 'you' : record.doctorId?.firstname + ' ' + record.doctorId?.lastname}
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />
      
      {/* Image preview modal */}
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
      
      {/* PDF preview modal */}
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
  );
};

export default MedicalRecordsList; 