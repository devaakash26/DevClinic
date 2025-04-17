import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Form, Input, Button, Alert, notification, Card, Divider, Select } from 'antd';
import { 
  MailOutlined, PhoneOutlined, SendOutlined, 
  EnvironmentOutlined, QuestionCircleOutlined,
  MessageOutlined, UserOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { FaPhone, FaEnvelope, FaHeadset, FaMapMarkerAlt, FaExclamationTriangle, FaQuestionCircle } from 'react-icons/fa';
import axios from 'axios';
import { useSelector } from 'react-redux';

const { TextArea } = Input;
const { Option } = Select;

const Contact = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.user);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // If the user is logged in, add their details to the form data
      if (user) {
        values.userId = user._id;
        values.userEmail = user.email;
        values.userName = user.name;
      }
      
      const response = await axios.post('http://localhost:4000/api/support/contact', values, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setSuccess(true);
        form.resetFields();
        notification.success({
          message: 'Support Request Submitted',
          description: 'Thank you for reaching out. Our team will get back to you soon.',
          placement: 'topRight',
          duration: 5,
        });
      }
    } catch (err) {
      console.error("Error submitting support request:", err);
      setError(err.response?.data?.message || 'An error occurred while submitting your request');
      notification.error({
        message: 'Error',
        description: err.response?.data?.message || 'An error occurred while submitting your request',
        placement: 'topRight',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Support & Contact</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're here to help! Reach out to our support team with any questions or issues you may have.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Emergency Contact */}
          <Card 
            className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-red-500"
            title={
              <div className="flex items-center text-red-500">
                <FaExclamationTriangle className="mr-2" /> Emergency Contact
              </div>
            }
          >
            <div className="flex flex-col space-y-4">
              <div className="flex items-start">
                <FaPhone className="mt-1 text-red-500 mr-3" />
                <div>
                  <p className="font-semibold">24/7 Hotline</p>
                  <p className="text-lg">7599579985</p>
                </div>
              </div>
              <div className="flex items-start">
                <FaEnvelope className="mt-1 text-red-500 mr-3" />
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:pgrm.aakash@gmail.com" className="text-blue-600 hover:underline">
                    pgrm.aakash@gmail.com
                  </a>
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-md text-sm text-red-700 mt-2">
                For immediate assistance with urgent medical matters.
              </div>
            </div>
          </Card>

          {/* General Support */}
          <Card 
            className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-blue-500"
            title={
              <div className="flex items-center text-blue-500">
                <FaHeadset className="mr-2" /> General Support
              </div>
            }
          >
            <div className="flex flex-col space-y-4">
              <div className="flex items-start">
                <FaPhone className="mt-1 text-blue-500 mr-3" />
                <div>
                  <p className="font-semibold">Support Line</p>
                  <p>+91 7599579985</p>
                  <p className="text-xs text-gray-500">Mon-Fri: 9am - 6pm</p>
                </div>
              </div>
              <div className="flex items-start">
                <FaEnvelope className="mt-1 text-blue-500 mr-3" />
                <div>
                  <p className="font-semibold">Email Support</p>
                  <a href="mailto:pgrm.aakash@gmail.com" className="text-blue-600 hover:underline">
                  pgrm.aakash@gmail.com
                  </a>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 mt-2">
                For general inquiries, account help, and non-urgent support.
              </div>
            </div>
          </Card>

          {/* Technical Assistance */}
          <Card 
            className="hover:shadow-lg transition-shadow duration-300 border-t-4 border-indigo-500"
            title={
              <div className="flex items-center text-indigo-500">
                <FaQuestionCircle className="mr-2" /> Technical Assistance
              </div>
            }
          >
            <div className="flex flex-col space-y-4">
              <div className="flex items-start">
                <FaEnvelope className="mt-1 text-indigo-500 mr-3" />
                <div>
                  <p className="font-semibold">Tech Support Email</p>
                  <a href="mailto:pgrm.aakash@gmail.com" className="text-blue-600 hover:underline">
                    pgrm.aakash@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <FaMapMarkerAlt className="mt-1 text-indigo-500 mr-3" />
                <div>
                  <p className="font-semibold">Technical Office</p>
                  <p className="text-gray-700">DevClinic Tech Center</p>
                  <p className="text-gray-500 text-sm">Tower B, IT Park, Delhi</p>
                </div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-md text-sm text-indigo-700 mt-2">
                For app-related technical issues, platform questions, or bugs.
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Form Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row">
              {/* Form */}
              <div className="md:w-2/3 md:pr-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Get in Touch</h2>
                  <p className="text-gray-600">
                    Fill out the form below and our support team will get back to you as soon as possible.
                  </p>
                </div>

                {success && (
                  <Alert
                    message="Support Request Sent"
                    description="Thank you for reaching out! Our team will contact you shortly."
                    type="success"
                    showIcon
                    className="mb-6"
                  />
                )}

                {error && (
                  <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    className="mb-6"
                  />
                )}

                <Form
                  form={form}
                  name="contactForm"
                  layout="vertical"
                  onFinish={onFinish}
                  initialValues={{
                    name: user?.name || '',
                    email: user?.email || '',
                    subject: '',
                    message: '',
                    priority: 'normal'
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="name"
                      label="Full Name"
                      rules={[{ required: true, message: 'Please enter your name' }]}
                    >
                      <Input 
                        prefix={<UserOutlined className="text-gray-400" />} 
                        placeholder="Your Name" 
                        size="large"
                        disabled={!!user}
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label="Email Address"
                      rules={[
                        { required: true, message: 'Please enter your email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined className="text-gray-400" />} 
                        placeholder="Your Email" 
                        size="large"
                        disabled={!!user}
                      />
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="subject"
                      label="Subject"
                      rules={[{ required: true, message: 'Please enter a subject' }]}
                    >
                      <Input 
                        prefix={<InfoCircleOutlined className="text-gray-400" />} 
                        placeholder="Subject of your inquiry" 
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      name="priority"
                      label="Priority"
                      rules={[{ required: true, message: 'Please select a priority' }]}
                    >
                      <Select size="large" placeholder="Select Priority">
                        <Option value="low">Low - General Question</Option>
                        <Option value="normal">Normal - Support Needed</Option>
                        <Option value="high">High - Important Issue</Option>
                        <Option value="urgent">Urgent - Critical Problem</Option>
                      </Select>
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="message"
                    label="Message"
                    rules={[{ required: true, message: 'Please enter your message' }]}
                  >
                    <TextArea
                      prefix={<MessageOutlined className="text-gray-400" />}
                      placeholder="Describe your issue or question in detail"
                      rows={6}
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SendOutlined />}
                      size="large"
                      className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 w-full md:w-auto"
                    >
                      Submit Support Request
                    </Button>
                  </Form.Item>
                </Form>
              </div>

              {/* Contact Info */}
              <div className="md:w-1/3 mt-8 md:mt-0 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-3 mr-4">
                      <PhoneOutlined className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-gray-700 font-medium">Phone</h4>
                      <p className="text-gray-600">+91 7599579985</p>
                      <p className="text-sm text-gray-500">Mon-Sat, 9am-6pm</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-3 mr-4">
                      <MailOutlined className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-gray-700 font-medium">Email</h4>
                      <a href="mailto:pgrm.aakash@gmail.com" className="text-blue-600 hover:underline">
                        pgrm.aakash@gmail.com
                      </a>
                      <p className="text-sm text-gray-500">We'll respond as soon as possible</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-3 mr-4">
                      <EnvironmentOutlined className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-gray-700 font-medium">Address</h4>
                      <p className="text-gray-600">Ganga Nagar</p>
                      {/* <p className="text-gray-500">123</p> */}
                      <p className="text-gray-500"> Meerut, India</p>
                    </div>
                  </div>

                  <Divider className="my-4" />

                  <p className="text-sm text-gray-500">
                    When contacting support, please include any relevant details and screenshots to help us resolve your issue quickly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                <QuestionCircleOutlined className="mr-2 text-blue-500" />
                How do I book an appointment?
              </h3>
              <p className="text-gray-600">
                Sign in to your account, navigate to the Doctors page, select your preferred doctor, 
                and click "Book Appointment". Follow the prompts to select a date and time.
              </p>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                <QuestionCircleOutlined className="mr-2 text-blue-500" />
                Can I reschedule my appointment?
              </h3>
              <p className="text-gray-600">
                Yes, you can reschedule by visiting the Appointments section in your dashboard. 
                Select the appointment you wish to change and click "Reschedule".
              </p>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                <QuestionCircleOutlined className="mr-2 text-blue-500" />
                How do I access my medical records?
              </h3>
              <p className="text-gray-600">
                Medical records can be accessed from your profile page. 
                Click on "Medical Records" to view all your documents and test results.
              </p>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                <QuestionCircleOutlined className="mr-2 text-blue-500" />
                Is my personal information secure?
              </h3>
              <p className="text-gray-600">
                Yes, DevClinic prioritizes your privacy and security. All data is encrypted and 
                our platform complies with healthcare data protection standards.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact; 