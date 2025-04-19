import React, { useState } from 'react';
import { 
  Form, Input, Select, Upload, Button, message
} from 'antd';
import { 
  UploadOutlined, FileAddOutlined, 
  FilePdfOutlined, FileImageOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { api } from '../utils/apiUtils';
import { getApiUrl } from '../services/apiService';

const { Option } = Select;
const { TextArea } = Input;

const MedicalRecordUpload = ({ 
  onCancel, 
  patientId, 
  doctorId, 
  patientName, 
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Handle cancel logic properly
  const handleCancel = () => {
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  };
  
  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      message.error('Please select a file');
      return;
    }
    
    setUploading(true);
    
    try {
      const file = fileList[0];
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      // Get the user ID and ensure we have all required IDs
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      
      // Debug doctor and patient IDs
      console.log('Upload request IDs:', {
        patientId,
        doctorId,
        userId
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('patientId', patientId);
      formData.append('doctorId', doctorId);
      formData.append('recordType', values.recordType);
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      
      // For debugging the form data
      console.log('Form data values:', {
        patientId: formData.get('patientId'),
        doctorId: formData.get('doctorId'),
        recordType: formData.get('recordType'),
        title: formData.get('title')
      });
      
      // Add additional context about file type for PDFs
      if (file.type === 'application/pdf') {
        console.log('Uploading PDF file:', file.name);
        
        // Check if file size is within reasonable limits for PDFs (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          message.error('PDF file is too large. Maximum size is 10MB.');
          setUploading(false);
          return;
        }
      }
      
      formData.append('medicalRecord', file);
      
      console.log('Starting upload request to server...');
      
      // We're using axios directly here instead of api utility because we need to use FormData
      const response = await axios.post(
        getApiUrl('doctor/upload-medical-record'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        message.success('Record uploaded successfully!');
        setFileList([]);
        form.resetFields();
        onSuccess(response.data.data);
      } else {
        console.error('Upload failed with error:', response.data);
        message.error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error('Server response error:', {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        });
        const errorMsg = error.response.data?.message || error.response.data?.error || 'Server error. Please try again.';
        message.error(errorMsg);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response from server:', error.request);
        message.error('No response from server. Check your connection.');
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        message.error(error.message || 'Failed to upload. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };
  
  const beforeUpload = (file) => {
    // Check file type
    const isValidType = 
      file.type === 'application/pdf' || 
      file.type === 'image/jpeg' || 
      file.type === 'image/png' || 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    if (!isValidType) {
      message.error('You can only upload PDF, JPG, PNG, or DOC files!');
      return Upload.LIST_IGNORE;
    }
    
    // Check file size (10MB max)
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB!');
      return Upload.LIST_IGNORE;
    }
    
    setFileList([file]);
    return false;  // Prevent automatic upload
  };
  
  const getFileIcon = (file) => {
    if (file?.type === 'application/pdf') {
      return <FilePdfOutlined />;
    } else if (file?.type?.startsWith('image/')) {
      return <FileImageOutlined />;
    } else {
      return <FileTextOutlined />;
    }
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleUpload}
    >
      <Form.Item
        name="recordType"
        label="Record Type"
        rules={[{ required: true, message: 'Please select record type' }]}
      >
        <Select placeholder="Select record type">
          <Option value="clinical_report">Clinical Report</Option>
          <Option value="lab_test">Lab Test</Option>
          <Option value="prescription">Prescription</Option>
          <Option value="imaging">Imaging/Scan</Option>
          <Option value="other">Other</Option>
        </Select>
      </Form.Item>
      
      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: 'Please enter a title' }]}
      >
        <Input placeholder="E.g., Blood Test Results, X-Ray Report" />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="Description (Optional)"
      >
        <TextArea 
          rows={3} 
          placeholder="Add any relevant details about this record"
        />
      </Form.Item>
      
      <Form.Item
        label="Document Upload"
        required
      >
        <Upload
          beforeUpload={beforeUpload}
          maxCount={1}
          fileList={fileList}
          onRemove={() => setFileList([])}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          showUploadList={{
            showPreviewIcon: false,
            showRemoveIcon: true,
          }}
        >
          <Button 
            icon={<UploadOutlined />} 
            disabled={fileList.length > 0 || uploading}
          >
            Select File
          </Button>
        </Upload>
        <div className="text-xs text-gray-500 mt-1">
          Supported formats: PDF, JPG, PNG, DOC (Max: 10MB)
        </div>
      </Form.Item>
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Upload Record
        </Button>
      </div>
    </Form>
  );
};

export default MedicalRecordUpload; 