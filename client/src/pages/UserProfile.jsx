import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card, Form, Input, Button, Avatar, Row, Col, Tabs, Upload, Divider, Modal, Alert } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, EditOutlined, SaveOutlined, LoadingOutlined, PlusOutlined, LockOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { showLoading, hideLoading } from '../redux/loader';
import { setUser } from '../redux/userInfo';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const UserProfile = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(user?.profilePicture || null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isDeleteAccountModalVisible, setIsDeleteAccountModalVisible] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
      });
      setImageUrl(user.profilePicture);
    }
  }, [user, form]);

  const handleEditToggle = () => {
    if (activeTab !== '1') {
      setActiveTab('1');
    }
    setIsEditing(!isEditing);
  };

  const onTabChange = (key) => {
    setActiveTab(key);
    if (key !== '1' && isEditing) {
      setIsEditing(false);
    }
  };

  const handleProfileUpdate = async (values) => {
    try {
      setLoading(true);
      dispatch(showLoading());
      
      // Map form field names to match backend expectations
      const dataToUpdate = {
        ...values,
        userId: user._id,
        profilePicture: imageUrl,
        // Ensure mobile is being sent if it exists in the form
        mobile: values.phone || values.mobile || user.mobile || user.phone
      };
      
      const response = await axios.post(
        'http://localhost:4000/api/user/update-profile',
        dataToUpdate,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Get the updated user data
        const updatedUser = response.data.data;
        
        // Ensure we're not losing any data when updating the Redux state
        const mergedUser = {
          ...user,
          ...updatedUser,
          name: updatedUser.name,
          phone: updatedUser.phone || user.phone,
          mobile: updatedUser.mobile || user.mobile,
          address: updatedUser.address,
          profilePicture: updatedUser.profilePicture || user.profilePicture
        };
        
        // Update the Redux state
        dispatch(setUser(mergedUser));
        
        // Show success message
        toast.success('Profile updated successfully');
        
        // Exit edit mode
        setIsEditing(false);
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      dispatch(hideLoading());
    }
  };

  const handleImageUpload = (info) => {
    if (info.file.status === 'uploading') {
      setUploadLoading(true);
      return;
    }
    
    if (info.file.status === 'done') {
      setUploadLoading(false);
      if (info.file.response && info.file.response.success) {
        // Get the image URL from the response
        const uploadedImageUrl = info.file.response.data.url;
        setImageUrl(uploadedImageUrl);
      }
    } else if (info.file.status === 'error') {
      setUploadLoading(false);
      toast.error('Image upload failed');
    }
  };

  // Function to handle file upload before sending to server
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast.error('You can only upload image files!');
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      toast.error('Image must be smaller than 2MB!');
    }
    
    return isImage && isLt2M;
  };

  // Custom upload request to handle the file upload
  const customUploadRequest = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('userId', user._id);
    
    try {
      setUploadLoading(true);
      dispatch(showLoading());
      
      const response = await axios.post(
        'http://localhost:4000/api/user/upload-profile-picture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        onSuccess(response.data, file);
        // Update the image URL from the response
        const imageUrl = response.data.data.url;
        setImageUrl(imageUrl);
        
        // Update the user state with the new profile picture
        dispatch(setUser({ ...user, profilePicture: imageUrl }));
        
        toast.success('Profile picture uploaded successfully');
      } else {
        onError(new Error(response.data.message || 'Upload failed'));
        toast.error(response.data.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      onError(error);
      toast.error('Something went wrong during upload');
    } finally {
      setUploadLoading(false);
      dispatch(hideLoading());
    }
  };

  const uploadButton = (
    <div>
      {uploadLoading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  // Handle password update
  const handlePasswordUpdate = async (values) => {
    try {
      setPasswordUpdateLoading(true);
      dispatch(showLoading());
      
      const response = await axios.post(
        'http://localhost:4000/api/user/update-password',
        {
          userId: user._id,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Password updated successfully');
        setIsPasswordModalVisible(false);
        passwordForm.resetFields();
      } else {
        toast.error(response.data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Current password is incorrect');
    } finally {
      setPasswordUpdateLoading(false);
      dispatch(hideLoading());
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setDeleteAccountLoading(true);
      dispatch(showLoading());
      
      const response = await axios.post(
        'http://localhost:4000/api/user/delete-account',
        { userId: user._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Clear token and user data
        localStorage.removeItem('token');
        dispatch(setUser(null));
        
        // Show success message and redirect to login
        toast.success('Your account has been deleted');
        navigate('/login');
      } else {
        toast.error(response.data.message || 'Failed to delete account');
        setIsDeleteAccountModalVisible(false);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Something went wrong');
    } finally {
      setDeleteAccountLoading(false);
      dispatch(hideLoading());
    }
  };

  return (
    <Layout>
      <div className="container">
        <Card 
          className="shadow-md"
          title={
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="mb-0">My Profile</h2>
              {activeTab === '1' && (
                <Button 
                  type={isEditing ? "primary" : "default"}
                  icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
                  onClick={handleEditToggle}
                >
                  {isEditing ? "Save Mode" : "Edit Profile"}
                </Button>
              )}
            </div>
          }
        >
          <Tabs activeKey={activeTab} onChange={onTabChange}>
            <TabPane tab="Personal Information" key="1">
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8} className="text-center">
                  <div className="mb-4">
                    {isEditing ? (
                      <Upload
                        name="profileImage"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        customRequest={customUploadRequest}
                        beforeUpload={beforeUpload}
                        onChange={handleImageUpload}
                      >
                        {imageUrl ? (
                          <img src={imageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          uploadButton
                        )}
                      </Upload>
                    ) : (
                      <Avatar 
                        size={120} 
                        src={imageUrl} 
                        icon={<UserOutlined />}
                        style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                      />
                    )}
                  </div>
                  <h3 className="mt-2">{user?.name}</h3>
                  <p className="text-muted">
                    {user?.isAdmin ? 'Administrator' : user?.isDoctor ? 'Doctor' : 'Patient'}
                  </p>
                  <p className="text-muted">
                    Member since {new Date(user?.createdAt).toLocaleDateString()}
                  </p>
                </Col>

                <Col xs={24} md={16}>
                  <Form
                    layout="vertical"
                    form={form}
                    onFinish={handleProfileUpdate}
                    initialValues={{
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: user?.phone || user?.mobile || '',
                      address: user?.address || '',
                    }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="name"
                          label="Full Name"
                          rules={[{ required: true, message: 'Please enter your name' }]}
                        >
                          <Input 
                            prefix={<UserOutlined />} 
                            disabled={!isEditing} 
                            placeholder="Full Name"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="email"
                          label="Email"
                          rules={[
                            { required: true, message: 'Please enter your email' },
                            { type: 'email', message: 'Please enter a valid email' }
                          ]}
                        >
                          <Input 
                            prefix={<MailOutlined />} 
                            disabled 
                            placeholder="Email"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="mobile"
                          label="Phone Number"
                        >
                          <Input 
                            prefix={<PhoneOutlined />} 
                            disabled={!isEditing} 
                            placeholder="Phone Number"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item
                          name="address"
                          label="Address"
                        >
                          <Input.TextArea 
                            rows={3} 
                            disabled={!isEditing} 
                            placeholder="Your Address"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {isEditing && (
                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit" 
                          loading={loading}
                          block
                        >
                          Update Profile
                        </Button>
                      </Form.Item>
                    )}
                  </Form>

                  {user?.isDoctor && (
                    <>
                      <Divider>Doctor Information</Divider>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Card size="small" title="Specialization">
                            {user?.doctor?.specialization || user?.doctor?.department || 'Not specified'}
                          </Card>
                        </Col>
                        <Col xs={24} md={12}>
                          <Card size="small" title="Experience">
                            {user?.doctor?.experience || 'Not specified'} years
                          </Card>
                        </Col>
                        <Col xs={24}>
                          <Card size="small" title="Professional Bio">
                            {user?.doctor?.professionalBio || 'No professional bio provided'}
                          </Card>
                        </Col>
                      </Row>
                    </>
                  )}
                </Col>
              </Row>
            </TabPane>
            
            {user?.isDoctor && (
              <TabPane tab="Doctor Portfolio" key="2">
                <p>Doctor portfolio information will appear here</p>
              </TabPane>
            )}

            <TabPane tab="Account Settings" key="3">
              <div className="account-settings">
                <Row gutter={[24, 24]}>
                  <Col xs={24}>
                    <Card 
                      title="Security Settings"
                      className="shadow-sm mb-4"
                    >
                      <Button 
                        onClick={() => setIsPasswordModalVisible(true)}
                        type="primary" 
                        icon={<LockOutlined />}
                        className="mb-3"
                      >
                        Change Password
                      </Button>
                    </Card>
                  </Col>
                  
                  <Col xs={24}>
                    <Card 
                      title="Delete Account"
                      className="shadow-sm border-danger-subtle"
                    >
                      <Alert
                        message="Warning: Account Deletion is Permanent"
                        description="Once you delete your account, there is no going back. Please be certain."
                        type="warning"
                        showIcon
                        className="mb-3"
                      />
                      <Button 
                        danger 
                        type="primary" 
                        icon={<DeleteOutlined />}
                        onClick={() => setIsDeleteAccountModalVisible(true)}
                      >
                        Delete Account
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>
          </Tabs>
          
          {/* Password Change Modal */}
          <Modal
            title="Change Password"
            visible={isPasswordModalVisible}
            onCancel={() => setIsPasswordModalVisible(false)}
            footer={null}
            centered
          >
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordUpdate}
            >
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[
                  { required: true, message: 'Please enter your current password' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Current Password" 
                />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="New Password" 
                />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Confirm New Password" 
                />
              </Form.Item>
              
              <div className="d-flex justify-content-end">
                <Button 
                  onClick={() => setIsPasswordModalVisible(false)} 
                  className="me-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={passwordUpdateLoading}
                >
                  Update Password
                </Button>
              </div>
            </Form>
          </Modal>
          
          {/* Delete Account Modal */}
          <Modal
            title={
              <div className="text-danger d-flex align-items-center">
                <ExclamationCircleOutlined className="me-2" /> Delete Account
              </div>
            }
            visible={isDeleteAccountModalVisible}
            onCancel={() => {
              setIsDeleteAccountModalVisible(false);
              setDeleteConfirmInput('');
            }}
            footer={null}
            centered
          >
            <div className="mb-4">
              <Alert
                message="This action cannot be undone"
                description="Deleting your account will remove all your personal data, appointments, medical records, and you will lose access to all services."
                type="error"
                showIcon
                className="mb-3"
              />
              
              <p>Please type <strong>delete my account</strong> to confirm:</p>
              <Input
                placeholder="delete my account"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                className="mb-3"
              />
              
              <div className="d-flex justify-content-end">
                <Button 
                  onClick={() => {
                    setIsDeleteAccountModalVisible(false);
                    setDeleteConfirmInput('');
                  }} 
                  className="me-2"
                >
                  Cancel
                </Button>
                <Button 
                  danger 
                  type="primary"
                  loading={deleteAccountLoading}
                  disabled={deleteConfirmInput !== 'delete my account'}
                  onClick={handleDeleteAccount}
                >
                  Permanently Delete Account
                </Button>
              </div>
            </div>
          </Modal>
        </Card>
      </div>
    </Layout>
  );
};

export default UserProfile; 