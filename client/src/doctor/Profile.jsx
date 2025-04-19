import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiUtils';
import {
  Form,
  Tabs,
  Card,
  Button,
  Divider,
  Modal,
  Input,
  Alert,
  Avatar,
  List,
  Rate,
  Typography,
  Empty,
  Statistic,
  Row,
  Col,
  Tag,
  Space,
  Switch,
  Select,
  DatePicker,
  notification
} from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { hideLoading, showLoading } from '../redux/loader';
import Swal from 'sweetalert2';
import axios from "axios";
import toast from 'react-hot-toast';
import DoctorForm from '../components/DoctorForm';
import moment from 'moment';
import {
  LockOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  UserOutlined,
  SettingOutlined,
  StarOutlined,
  LikeOutlined,
  MessageOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;
const { confirm } = Modal;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Profile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [form] = Form.useForm();
  const [doctor, setDoctor] = useState(null);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [passwordForm] = Form.useForm();
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('1');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialStats, setTestimonialStats] = useState({
    averageRating: 0,
    totalReviews: 0
  });
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);

  // New state variables for availability management
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailabilityReason, setUnavailabilityReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [unavailableUntil, setUnavailableUntil] = useState(null);
  const [isUnavailabilityModalVisible, setIsUnavailabilityModalVisible] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const handleSubmit = async (values) => {
    try {
      dispatch(showLoading());

      // Format timing data for submission
      let formattedValues = { ...values };

      // Handle timing specifically
      if (values.timing) {
        console.log("Original timing value:", values.timing);

        // Check if timing is array with moment objects
        if (Array.isArray(values.timing)) {
          // Ensure we have both times
          if (values.timing[0] && values.timing[1]) {
            // Convert moment objects to HH:mm format
            if (moment.isMoment(values.timing[0]) && moment.isMoment(values.timing[1])) {
              const startTime = values.timing[0].format('HH:mm');
              const endTime = values.timing[1].format('HH:mm');

              // Ensure times are different
              if (startTime === endTime) {
                formattedValues.timing = [
                  startTime,
                  moment(values.timing[0]).add(1, 'hour').format('HH:mm')
                ];
              } else {
                formattedValues.timing = [startTime, endTime];
              }

              console.log("Formatted timing to strings:", formattedValues.timing);
            }
          } else {
            console.error("Missing start or end time");
            toast.error("Please select both start and end times");
            dispatch(hideLoading());
            return; // Prevent submission with invalid timing
          }
        }
      }

      // Ensure specialization is properly formatted if it's an array
      if (formattedValues.specialization && Array.isArray(formattedValues.specialization)) {
        console.log("Formatting specialization array:", formattedValues.specialization);
      }

      console.log("Submitting data:", formattedValues);

      const response = await apiFetch(`doctor/update-doctor-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...formattedValues,
          userId: user._id,
        }),
      });

      const data = await response.json();
      console.log("Response:", data);
      dispatch(hideLoading());

      if (data.success) {
        Swal.fire({
          title: data.message,
          icon: "success"
        });
        getDoctorInfo(); // Refresh doctor info after update
      } else {
        Swal.fire({
          icon: "error",
          title: data.message,
        });
      }
    } catch (error) {
      dispatch(hideLoading());
      console.error("Error during profile update:", error);
      Swal.fire({
        icon: "error",
        title: "Something Went Wrong",
      });
    }
  };

  const getDoctorInfo = async () => {
    try {
      dispatch(showLoading());
      const response = await api.get(`doctor/get-doctor-info`, {
        params: { userId: id },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      dispatch(hideLoading());
      console.log("Doctor data from server:", response.data);

      if (response.data.success) {
        const doctorData = { ...response.data.data };

        // Set availability state
        setIsAvailable(doctorData.isAvailable !== false);
        if (doctorData.unavailableReason) {
          setUnavailabilityReason(doctorData.unavailableReason);
        }
        if (doctorData.unavailableUntil) {
          setUnavailableUntil(moment(doctorData.unavailableUntil));
        }

        // Convert timing data to format expected by TimePicker.RangePicker
        if (doctorData.timing && Array.isArray(doctorData.timing)) {
          console.log("Original timing from server:", doctorData.timing);

          if (doctorData.timing.length === 2) {
            // Handle ISO date strings
            if (typeof doctorData.timing[0] === 'string' && doctorData.timing[0].includes('T')) {
              const startTime = moment(doctorData.timing[0]);
              const endTime = moment(doctorData.timing[1]);

              if (startTime && startTime.isValid() && endTime && endTime.isValid()) {
                doctorData.timing = [startTime, endTime];
                console.log("Converted ISO date strings to moment objects:", doctorData.timing);
              } else {
                // Fallback to default times if invalid
                doctorData.timing = [moment(), moment().add(1, 'hour')];
                console.log("Using default timing due to invalid dates:", doctorData.timing);
              }
            }
            // Handle HH:mm format
            else if (typeof doctorData.timing[0] === 'string') {
              const startTime = moment(doctorData.timing[0], 'HH:mm');
              const endTime = moment(doctorData.timing[1], 'HH:mm');

              if (startTime && startTime.isValid() && endTime && endTime.isValid()) {
                doctorData.timing = [startTime, endTime];
                console.log("Converted HH:mm strings to moment objects:", doctorData.timing);
              } else {
                // Fallback to default times if invalid
                doctorData.timing = [moment(), moment().add(1, 'hour')];
                console.log("Using default timing due to invalid dates:", doctorData.timing);
              }
            } else {
              console.log("Timing is already in the correct format:", doctorData.timing);
            }
          } else {
            console.log("Timing array doesn't have 2 elements, using defaults");
            doctorData.timing = [moment(), moment().add(1, 'hour')];
          }
        } else {
          console.log("No timing data or invalid format, using defaults");
          doctorData.timing = [moment(), moment().add(1, 'hour')];
        }

        // Set doctor data to state
        setDoctor(doctorData);

        // Set form values
        form.setFieldsValue({
          ...doctorData,
          userId: doctorData.userId
        });

        console.log("Form values set:", doctorData);
      } else {
        toast.error(response.data.message || "Failed to fetch doctor info");
      }
    } catch (error) {
      dispatch(hideLoading());
      console.error("Error fetching doctor info:", error);
      toast.error("Something went wrong");
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    console.log("Changed values:", changedValues);
    console.log("All values:", allValues);

    let hasChanges = false;

    // Special handling for timing
    if (changedValues.timing) {
      console.log("Timing changed:", changedValues.timing);
      console.log("Original timing:", doctor?.timing);

      // Always consider timing changes as changes
      hasChanges = true;
    } else {
      // For other fields, check if they've changed from the initial values
      hasChanges = Object.keys(changedValues).some((key) => {
        const initialValue = doctor?.[key];
        const currentValue = allValues[key];

        if (key === 'timing') return true; // Always consider timing as changed (backup check)

        if (moment.isMoment(initialValue) && moment.isMoment(currentValue)) {
          return !initialValue.isSame(currentValue);
        }

        return initialValue !== currentValue;
      });
    }

    console.log("Has changes:", hasChanges);
    setIsSubmitDisabled(!hasChanges);
  };

  // Handle password update
  const handlePasswordUpdate = async (values) => {
    try {
      setPasswordUpdateLoading(true);
      dispatch(showLoading());

      const response = await api.post(`user/update-password`,
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
  const showDeleteConfirm = () => {
    Modal.confirm({
      title: 'Are you sure you want to delete your account?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div className="mt-4">
          <p>This action cannot be undone. All your data will be permanently deleted.</p>
          <p className="mt-3 font-medium">Please type "delete my account" to confirm:</p>
          <Input
            placeholder="delete my account"
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="mt-2"
          />
        </div>
      ),
      okText: 'Delete Account',
      okType: 'danger',
      okButtonProps: {
        disabled: deleteConfirmText !== 'delete my account',
      },
      cancelText: 'Cancel',
      onOk: async () => {
        if (deleteConfirmText !== 'delete my account') {
          return Promise.reject('Please type the confirmation text correctly');
        }

        try {
          dispatch(showLoading());

          const response = await api.post(`user/delete-account`,
            { userId: user._id },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );

          if (response.data.success) {
            dispatch(hideLoading());
            localStorage.removeItem('token');
            toast.success('Account deleted successfully');
            navigate('/login');
          } else {
            dispatch(hideLoading());
            toast.error(response.data.message || 'Failed to delete account');
          }
        } catch (error) {
          dispatch(hideLoading());
          console.error('Error deleting account:', error);
          toast.error(error.response?.data?.message || 'Something went wrong');
        }
      },
    });
  };

  // Get doctor testimonials
  const getDoctorTestimonials = async () => {
    try {
      setLoadingTestimonials(true);
      const response = await api.get(`doctor/get-doctor-testimonials`,
        {
          params: { doctorId: id },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        const { testimonials, averageRating, totalReviews } = response.data.data;
        setTestimonials(testimonials || []);
        setTestimonialStats({
          averageRating: averageRating || 0,
          totalReviews: totalReviews || 0
        });
      }
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast.error("Failed to load testimonials");
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const onTabChange = (key) => {
    setActiveTab(key);
    if (key === '3') {
      // Refresh testimonials when tab is selected
      getDoctorTestimonials();
    }
  };

  // New function for toggling availability
  const showUnavailabilityModal = () => {
    setIsUnavailabilityModalVisible(true);
  };

  const handleUnavailabilityCancel = () => {
    setIsUnavailabilityModalVisible(false);
    setUnavailabilityReason(doctor?.unavailableReason || '');
    setOtherReason('');
    setUnavailableUntil(doctor?.unavailableUntil ? moment(doctor.unavailableUntil) : null);
  };

  const handleUnavailabilitySubmit = async () => {
    try {
      if (!isAvailable && !unavailabilityReason) {
        notification.error({
          message: 'Error',
          description: 'Please select a reason for unavailability',
        });
        return;
      }

      setUpdatingAvailability(true);
      // dispatch(showLoading());

      const finalReason = unavailabilityReason === 'Other' ? otherReason : unavailabilityReason;

      const response = await api.post(`doctor/update-availability`,
        {
          userId: user._id,
          isAvailable,
          unavailableReason: finalReason,
          unavailableUntil: unavailableUntil ? unavailableUntil.toISOString() : null,
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      dispatch(hideLoading());
      setUpdatingAvailability(false);

      if (response.data.success) {
        setIsUnavailabilityModalVisible(false);
        Swal.fire({
          title: response.data.message,
          icon: 'success',
        });

        // Update doctor state with new availability info
        setDoctor({
          ...doctor,
          isAvailable,
          unavailableReason: finalReason,
          unavailableUntil: unavailableUntil ? unavailableUntil.toISOString() : null,
        });
      } else {
        notification.error({
          message: 'Error',
          description: response.data.message || 'Something went wrong',
        });
      }
    } catch (error) {
      dispatch(hideLoading());
      setUpdatingAvailability(false);
      notification.error({
        message: 'Error',
        description: error.message || 'Something went wrong',
      });
    }
  };

  useEffect(() => {
    if (id) {
      getDoctorInfo();
      getDoctorTestimonials();
    }
  }, [id]);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <Card className="mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {user._id === id ? 'My Profile' : 'Doctor Profile'}
              </h1>
              {doctor && (
                <p className="text-gray-500">
                  Dr. {doctor.firstname} {doctor.lastname} - {Array.isArray(doctor.specialization)
                    ? doctor.specialization.join(', ')
                    : doctor.specialization}
                </p>
              )}
            </div>

            {doctor && user._id === id && (
              <div className="mt-3 md:mt-0">
                <Tag
                  color={doctor.isAvailable !== false ? 'green' : 'red'}
                  className="text-sm px-3 py-1"
                >
                  {doctor.isAvailable !== false ? 'Available' : 'Not Available'}
                </Tag>
              </div>
            )}
          </div>
        </Card>

        <Tabs
          defaultActiveKey="1"
          activeKey={activeTab}
          onChange={onTabChange}
        >
          <TabPane tab={<span><UserOutlined /> Basic Info</span>} key="1">
            <div className="apply-doctor">
              <span className="flex justify-start text-4xl font-bold text-slate-600 heading mb-4">Doctor Profile</span>
              <DoctorForm
                form={form}
                handleSubmit={handleSubmit}
                initialValues={doctor}
                isSubmitDisabled={isSubmitDisabled}
                onValuesChange={onValuesChange}
              />
            </div>
          </TabPane>

          {user._id === id && (
            <TabPane tab={<span><SettingOutlined /> Edit Profile</span>} key="2">
              <div className="account-settings">
                <span className="flex justify-start text-4xl font-bold text-slate-600 heading mb-4">Account Settings</span>

                <Card className="mb-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Availability Settings</h3>
                    <p className="text-gray-500 mb-4">Manage your availability for appointments</p>
                    <Divider />

                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <h4 className="font-medium text-gray-800">Current Status</h4>
                        <div className="flex items-center mt-2">
                          <Tag
                            color={isAvailable ? 'green' : 'red'}
                            className="text-sm mr-2"
                          >
                            {isAvailable ? 'Available' : 'Not Available'}
                          </Tag>
                          {!isAvailable && doctor?.unavailableReason && (
                            <span className="text-gray-500 text-sm">
                              Reason: {doctor.unavailableReason}
                            </span>
                          )}
                        </div>
                        {!isAvailable && doctor?.unavailableUntil && (
                          <p className="text-sm text-gray-500 mt-1">
                            Until: {moment(doctor.unavailableUntil).format('MMMM DD, YYYY')}
                          </p>
                        )}
                      </div>
                      <Button
                        type="primary"
                        icon={<CalendarOutlined />}
                        onClick={showUnavailabilityModal}
                      >
                        Update Availability
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Security Settings</h3>
                    <p className="text-gray-500 mb-4">Manage your account security settings</p>
                    <Divider />

                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-medium text-gray-800">Password</h4>
                        <p className="text-sm text-gray-500">Change your account password</p>
                      </div>
                      <Button
                        type="primary"
                        icon={<LockOutlined />}
                        onClick={() => setIsPasswordModalVisible(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>

                  <div className="danger-zone mt-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Danger Zone</h3>
                    <Alert
                      message="Warning: Deleting your account is permanent"
                      description="When you delete your account, all your data will be permanently deleted and cannot be recovered."
                      type="warning"
                      showIcon
                      className="mb-4"
                    />
                    <Button
                      danger
                      type="primary"
                      icon={<DeleteOutlined />}
                      onClick={showDeleteConfirm}
                    >
                      Delete Account
                    </Button>
                  </div>
                </Card>
              </div>
            </TabPane>
          )}

          <TabPane tab={<span><StarOutlined /> Testimonials & Ratings</span>} key="3">
            <div className="space-y-6">
              <Card className="shadow-md">
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <div className="text-center">
                      <Statistic
                        title="Average Rating"
                        value={testimonialStats.averageRating}
                        precision={1}
                        suffix={<span className="text-xl">/ 5</span>}
                        valueStyle={{ color: '#faad14' }}
                      />
                      <div className="mt-2">
                        <Rate disabled allowHalf value={parseFloat(testimonialStats.averageRating)} />
                      </div>
                      <div className="mt-1 text-gray-500">
                        Based on {testimonialStats.totalReviews} {testimonialStats.totalReviews === 1 ? 'review' : 'reviews'}
                      </div>
                    </div>
                  </Col>
                  <Col span={16}>
                    <div>
                      <Title level={4}>Patient Satisfaction</Title>
                      <Paragraph>
                        These ratings are collected from patients after their appointments are completed.
                      </Paragraph>
                      <div className="flex items-center mt-3">
                        <MessageOutlined style={{ color: '#1890ff' }} />
                        <Text strong className="ml-2">
                          {testimonials.length} {testimonials.length === 1 ? 'Testimonial' : 'Testimonials'} shared by patients
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card
                title="Patient Testimonials"
                className="shadow-md"
                loading={loadingTestimonials}
              >
                {testimonials.length > 0 ? (
                  <List
                    itemLayout="horizontal"
                    dataSource={testimonials}
                    renderItem={item => (
                      <List.Item>
                        <div className="w-full">
                          <div className="flex items-start">
                            <Avatar icon={<UserOutlined />} className="mr-3" />
                            <div className="flex-1">
                              <Text strong>Anonymous Patient</Text>
                              <Text type="secondary" className="ml-2">
                                {moment(item.createdAt).format('MMMM DD, YYYY')}
                              </Text>
                              <div className="mt-2">
                                <Rate disabled value={item.rating} />
                                <div className="my-2">
                                  <Tag color="blue">{item.satisfaction}</Tag>
                                </div>
                                <Paragraph>{item.comment || "Great experience with the doctor!"}</Paragraph>
                              </div>
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description={
                      <span>
                        No testimonials yet. Patients can leave testimonials after completing appointments.
                      </span>
                    }
                  />
                )}
              </Card>
            </div>
          </TabPane>
        </Tabs>

        {/* Password Change Modal */}
        <Modal
          title="Change Password"
          visible={isPasswordModalVisible}
          onCancel={() => setIsPasswordModalVisible(false)}
          footer={null}
        >
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordUpdate}
          >
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password placeholder="Enter your current password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 6, message: 'Password must be at least 6 characters long' }
              ]}
            >
              <Input.Password placeholder="Enter your new password" />
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
              <Input.Password placeholder="Confirm your new password" />
            </Form.Item>

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setIsPasswordModalVisible(false)}
                className="mr-2"
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

        {/* Availability Modal */}
        <Modal
          title={isAvailable ? "Mark as Unavailable" : "Update Unavailability"}
          visible={isUnavailabilityModalVisible}
          onCancel={handleUnavailabilityCancel}
          footer={[
            <Button key="cancel" onClick={handleUnavailabilityCancel}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={updatingAvailability}
              onClick={handleUnavailabilitySubmit}
              // disabled={!isAvailable} // 🔒 disables Update if already available
            >
              {isAvailable ? "Mark as Available" : "Mark as Unavailable"}
            </Button>,
          ]}

        >
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Availability Status:</span>
              <Switch
                checked={isAvailable}
                onChange={(checked) => setIsAvailable(checked)}
                checkedChildren="Available"
                unCheckedChildren="Unavailable"
              />
            </div>

            {!isAvailable && (
              <div className="mt-4">
                <Form layout="vertical">
                  <Form.Item
                    label="Reason for unavailability"
                    required
                    validateStatus={!unavailabilityReason ? 'error' : ''}
                    help={!unavailabilityReason ? 'Please select a reason' : ''}
                  >
                    <Select
                      placeholder="Select a reason"
                      value={unavailabilityReason}
                      onChange={(value) => setUnavailabilityReason(value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="Vacation">Vacation</Option>
                      <Option value="Personal Leave">Personal Leave</Option>
                      <Option value="Medical Leave">Medical Leave</Option>
                      <Option value="Relocating">Relocating</Option>
                      <Option value="Training">Professional Training</Option>
                      <Option value="Conference">Attending Conference</Option>
                      <Option value="Other">Other</Option>
                    </Select>
                  </Form.Item>

                  {unavailabilityReason === 'Other' && (
                    <Form.Item
                      label="Please specify"
                      required
                      validateStatus={!otherReason ? 'error' : ''}
                      help={!otherReason ? 'Please provide a reason' : ''}
                    >
                      <Input
                        placeholder="Enter reason"
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                      />
                    </Form.Item>
                  )}

                  <Form.Item label="Unavailable Until">
                    <DatePicker
                      style={{ width: '100%' }}
                      value={unavailableUntil}
                      onChange={(date) => setUnavailableUntil(date)}
                      disabledDate={(current) => current && current < moment().startOf('day')}
                      placeholder="Select a date"
                    />
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default Profile;
