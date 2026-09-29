import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Alert, Space, Typography } from 'antd';
import { LockOutlined, UserOutlined, CrownOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../api';
import { antMessage } from '../utils/antAppBridge';

const { Text } = Typography;
const { Option } = Select;

export default function SupervisorUnlockModal({ open, onCancel, onSuccess, currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [fetchingSupervisors, setFetchingSupervisors] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      fetchSupervisorsList();
    }
  }, [open]);

  const fetchSupervisorsList = async () => {
    setFetchingSupervisors(true);
    try {
      const res = await api.get('/api/auth/supervisors');
      if (res.data.success) {
        setSupervisors(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch supervisors error:', err);
    } finally {
      setFetchingSupervisors(false);
    }
  };

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/supervisor-unlock', {
        supervisor_username: values.supervisor_username,
        supervisor_password: values.supervisor_password
      });

      if (res.data.success) {
        const { accessToken, refreshToken, user } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        antMessage.success(res.data.message || 'تم تفعيل وضع المشرف بنجاح');
        form.resetFields();
        if (onSuccess) onSuccess(user);
      } else {
        antMessage.error(res.data.message || 'فشل التحقق من بيانات المشرف');
      }
    } catch (err) {
      antMessage.error(err.response?.data?.message || 'بيانات المشرف غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CrownOutlined style={{ color: '#d97706', fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>تسجيل دخول مشرف الفرع</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={460}
      centered
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          message="وضع الصلاحيات الإشرافية"
          description="يتيح لك هذا الوضع إدارة خزنة الفرع وتحويل النقدية، كشوفات الجرد المجمع، وسندات التسوية المخزنية. يمكنك قفله والعودة لوضع البائع بأي وقت."
          style={{ borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {supervisors.length > 0 ? (
          <Form.Item
            label="اختر مشرف الفرع"
            name="supervisor_username"
            rules={[{ required: true, message: 'يرجى اختيار المشرف من القائمة' }]}
          >
            <Select
              size="large"
              placeholder="-- اضغط هنا لاختيار المشرف --"
              allowClear
              loading={fetchingSupervisors}
              suffixIcon={<UserOutlined />}
            >
              {supervisors.map((s) => (
                <Option key={s.username} value={s.username}>
                  {s.full_name} ({s.username})
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item
            label="اسم مستخدم المشرف"
            name="supervisor_username"
            rules={[{ required: true, message: 'يرجى كتابة اسم مستخدم المشرف' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="اسم مستخدم المشرف أو الإيميل"
            />
          </Form.Item>
        )}

        <Form.Item
          label="كلمة مرور المشرف"
          name="supervisor_password"
          rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
            placeholder="كلمة المرور الخاصة بحساب المشرف"
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Space>
            <Button onClick={onCancel} disabled={loading}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              icon={<CrownOutlined />}
            >
              تأكيد وتفعيل وضع المشرف
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}
