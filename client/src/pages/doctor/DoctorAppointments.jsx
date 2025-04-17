import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Table, 
  Tag, 
  Space, 
  Button, 
  Modal, 
  Input, 
  Card, 
  Avatar, 
  Timeline, 
  Badge, 
  Tooltip,
  Select,
  DatePicker,
  Statistic,
  Row,
  Col,
  Tabs,
  Divider,
  Popconfirm
} from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  FileTextOutlined,
  HeartOutlined,
  AlertOutlined,
  MessageOutlined,
  FilterOutlined,
  SearchOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import Layout from '../../components/Layout';
import { showLoading, hideLoading } from '../../redux/loader';
import moment from 'moment';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const DoctorAppointments = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.user);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectionModal, setRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [appointmentToReject, setAppointmentToReject] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewDetailsModal, setViewDetailsModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0
  });

  // Fetch appointments data
  const getAppointmentsData = async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      const response = await axios.get("http://localhost:4000/api/doctor/get-patient-list", {
        params: { doctorId: user?._id },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      dispatch(hideLoading());
      setLoading(false);
      
      if (response.data.success) {
        setAppointments(response.data.patients);
        console.log("Appointments fetched:", response.data.patients);
        calculateStats(response.data.patients);
      } else {
        toast.error(response.data.message || "Failed to fetch appointments");
      }
    } catch (error) {
      dispatch(hideLoading());
      setLoading(false);
      toast.error("Error fetching appointments");
      console.error(error);
    }
  };

  // Change appointment status (approve/reject)
  const changeAppointmentStatus = async (record, status) => {
    try {
      if (status === 'rejected' && !rejectionReason && !record.rejectionReason) {
        setAppointmentToReject({ ...record, newStatus: status });
        setRejectionModal(true);
        return;
      }
      
      // dispatch(showLoading());
      const response = await axios.post(
        "http://localhost:4000/api/doctor/update-appointment-status",
        {
          appointmentId: record._id,
          status: status,
          patientId: record.userId,
          ...(status === 'rejected' && { rejectionReason: rejectionReason || record.rejectionReason || "Doctor unavailable" })
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // dispatch(hideLoading());
      
      if (response.data.success) {
        toast.success(response.data.message || "Status updated successfully");
        getAppointmentsData();
      }
    } catch (error) {
      toast.error("Error changing appointment status");
      dispatch(hideLoading());
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    changeAppointmentStatus(appointmentToReject, 'rejected');
    
    setRejectionModal(false);
    setRejectionReason('');
    setAppointmentToReject(null);
  };

  // Delete appointment
  const deleteAppointment = async (appointmentId) => {
    try {
      dispatch(showLoading());
      const response = await axios.delete(
        "http://localhost:4000/api/doctor/delete-appointment",
        {
          data: { appointmentId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      dispatch(hideLoading());
      if (response.data.success) {
        toast.success(response.data.message || "Appointment deleted");
        getAppointmentsData();
      }
    } catch (error) {
      dispatch(hideLoading());
      toast.error("Error deleting appointment");
    }
  };

  const renderStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'gold', icon: <ClockCircleOutlined />, text: 'Pending' },
      approved: { color: 'green', icon: <CheckCircleOutlined />, text: 'Approved' },
      rejected: { color: 'red', icon: <CloseCircleOutlined />, text: 'Rejected' },
      completed: { color: 'blue', icon: <CheckCircleOutlined />, text: 'Completed' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setViewDetailsModal(true);
  };

  const calculateStats = (appointments) => {
    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      approved: appointments.filter(a => a.status === 'approved').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      rejected: appointments.filter(a => a.status === 'rejected').length
    };
    setStats(stats);
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.userInfo?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                         appointment.reason?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    const matchesDate = !dateRange || (
      moment(appointment.date, "DD-MM-YYYY").isSameOrAfter(dateRange[0], 'day') &&
      moment(appointment.date, "DD-MM-YYYY").isSameOrBefore(dateRange[1], 'day')
    );
    return matchesSearch && matchesStatus && matchesDate;
  });

  const columns = [
    {
      title: "Patient",
      dataIndex: "userInfo",
      key: "patient",
      render: (userInfo) => (
        <div className="flex items-center">
          <Avatar 
            src={userInfo?.image} 
            icon={<UserOutlined />} 
            className="mr-2"
          />
          <div>
            <div className="font-medium">{userInfo?.name}</div>
            <div className="text-gray-500 text-xs">{userInfo?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => moment(a.date, "DD-MM-YYYY").unix() - moment(b.date, "DD-MM-YYYY").unix(),
      render: (date, record) => (
        <div>
          <div className="font-medium">{moment(date, "DD-MM-YYYY").format("DD MMM YYYY")}</div>
          <div className="text-gray-500 text-sm">{moment(record.time, "HH:mm").format("h:mm A")}</div>
        </div>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Approved', value: 'approved' },
        { text: 'Completed', value: 'completed' },
        { text: 'Rejected', value: 'rejected' }
      ],
      onFilter: (value, record) => record.status === value,
      render: renderStatusTag,
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              onClick={() => viewAppointmentDetails(record)}
            />
          </Tooltip>
          {record.status === "pending" && (
            <>
              <Tooltip title="Approve">
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => changeAppointmentStatus(record, "approved")}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button 
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setAppointmentToReject({ ...record, newStatus: 'rejected' });
                    setRejectionModal(true);
                  }}
                />
              </Tooltip>
            </>
          )}
          {record.status === "approved" && (
            <Tooltip title="Mark as Completed">
              <Button 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Confirm Treatment Completion',
                    content: 'Are you sure this treatment has been completed? An email will be sent to the patient thanking them for using DevClinic.',
                    okText: 'Yes, Complete',
                    cancelText: 'Cancel',
                    onOk: () => changeAppointmentStatus(record, "completed")
                  });
                }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Are you sure you want to delete this appointment?"
            description="This action cannot be undone."
            onConfirm={() => deleteAppointment(record._id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button 
                type="text" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Load appointments when component mounts
  useEffect(() => {
    if (user?._id) {
      getAppointmentsData();
    }
  }, [user]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
          <p className="text-gray-600">Manage your patient appointments</p>
        </div>

        {/* Statistics Cards */}
        <Row gutter={16} className="mb-6">
          <Col span={4}>
            <Card>
              <Statistic
                title="Total Appointments"
                value={stats.total}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Approved"
                value={stats.approved}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                valueStyle={{ color: '#1890ff' }}
                prefix={<CheckOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Rejected"
                value={stats.rejected}
                valueStyle={{ color: '#f5222d' }}
                prefix={<CloseOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search by patient name or reason"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="completed">Completed</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 300 }}
            />
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setDateRange(null);
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>

        {/* Appointments Table */}
        <Card className="shadow-lg">
          <Table
            columns={columns}
            dataSource={filteredAppointments}
            loading={loading}
            rowKey="_id"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} appointments`
            }}
          />
        </Card>

        {/* View Details Modal */}
        <Modal
          title="Appointment Details"
          open={viewDetailsModal}
          onCancel={() => setViewDetailsModal(false)}
          footer={null}
          width={800}
        >
          {selectedAppointment && (
            <div className="space-y-6">
              <Tabs defaultActiveKey="1">
                <TabPane tab="Patient Information" key="1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-4">
                      <Avatar 
                        size={64} 
                        src={selectedAppointment.userInfo?.image} 
                        icon={<UserOutlined />}
                      />
                      <div>
                        <h3 className="text-lg font-semibold">{selectedAppointment.userInfo?.name}</h3>
                        <div className="flex items-center text-gray-600">
                          <MailOutlined className="mr-2" />
                          {selectedAppointment.userInfo?.email}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <PhoneOutlined className="mr-2" />
                          {selectedAppointment.emergencyContact || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <CalendarOutlined className="mr-2 text-blue-500" />
                        <span className="font-medium">Appointment Date:</span>
                        <span className="ml-2">{moment(selectedAppointment.date, "DD-MM-YYYY").format("DD MMM YYYY")}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockCircleOutlined className="mr-2 text-blue-500" />
                        <span className="font-medium">Time:</span>
                        <span className="ml-2">{moment(selectedAppointment.time, "HH:mm").format("h:mm A")}</span>
                      </div>
                      <div className="flex items-center">
                        <Badge status={selectedAppointment.status === 'approved' ? 'success' : 
                                     selectedAppointment.status === 'rejected' ? 'error' : 
                                     selectedAppointment.status === 'completed' ? 'processing' : 'warning'} />
                        <span className="font-medium ml-2">Status:</span>
                        <span className="ml-2">{renderStatusTag(selectedAppointment.status)}</span>
                      </div>
                    </div>
                  </div>
                </TabPane>
                <TabPane tab="Medical Information" key="2">
                  <Timeline>
                    <Timeline.Item dot={<HeartOutlined className="text-red-500" />}>
                      <div className="font-medium">Reason for Visit</div>
                      <p className="text-gray-600">{selectedAppointment.reason}</p>
                    </Timeline.Item>
                    {selectedAppointment.symptoms && (
                      <Timeline.Item dot={<AlertOutlined className="text-orange-500" />}>
                        <div className="font-medium">Symptoms</div>
                        <p className="text-gray-600">{selectedAppointment.symptoms}</p>
                      </Timeline.Item>
                    )}
                    {selectedAppointment.medicalHistory && (
                      <Timeline.Item dot={<FileTextOutlined className="text-blue-500" />}>
                        <div className="font-medium">Medical History</div>
                        <p className="text-gray-600">{selectedAppointment.medicalHistory}</p>
                      </Timeline.Item>
                    )}
                    {selectedAppointment.additionalNotes && (
                      <Timeline.Item dot={<MessageOutlined className="text-green-500" />}>
                        <div className="font-medium">Additional Notes</div>
                        <p className="text-gray-600">{selectedAppointment.additionalNotes}</p>
                      </Timeline.Item>
                    )}
                  </Timeline>
                </TabPane>
                <TabPane tab="Communication" key="3">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <MessageOutlined className="mr-2 text-blue-500" />
                      <span className="font-medium">Preferred Communication:</span>
                      <span className="ml-2 text-gray-600 capitalize">{selectedAppointment.preferredCommunication}</span>
                    </div>
                    <Divider />
                    <div>
                      <h4 className="font-medium mb-2">Appointment History</h4>
                      <p className="text-gray-600">
                        Created: {moment(selectedAppointment.createdAt).format('DD MMM YYYY HH:mm')}
                      </p>
                      {selectedAppointment.updatedAt && (
                        <p className="text-gray-600">
                          Last Updated: {moment(selectedAppointment.updatedAt).format('DD MMM YYYY HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </TabPane>
              </Tabs>
            </div>
          )}
        </Modal>

        {/* Rejection Modal */}
        <Modal
          title="Reject Appointment"
          open={rejectionModal}
          onOk={handleReject}
          onCancel={() => {
            setRejectionModal(false);
            setRejectionReason('');
            setAppointmentToReject(null);
          }}
        >
          <div className="space-y-4">
            <p>Please provide a reason for rejecting this appointment:</p>
            <Input.TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
            />
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default DoctorAppointments; 