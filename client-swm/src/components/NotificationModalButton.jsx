import React, { useState, useEffect } from 'react';
import { Button, Modal, Badge, Typography, message, Space, Tag } from 'antd';
import { BellOutlined, CheckCircleOutlined, SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getNotificationStatus, requestNotificationPermission } from '../utils/pushNotifications';
import api from '../api';

const { Text, Title } = Typography;

export default function NotificationModalButton({ currentUser, isMobile = false }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(() => getNotificationStatus());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const refreshStatus = () => setStatus(getNotificationStatus());

  useEffect(() => {
    refreshStatus();
    window.addEventListener('focus', refreshStatus);
    return () => window.removeEventListener('focus', refreshStatus);
  }, []);

  const isPrivileged = ['super_admin', 'admin'].includes(currentUser?.role) || currentUser?.isMainWarehouse;
  if (!isPrivileged) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestNotificationPermission();
      refreshStatus();
      if (res.success) {
        message.success('🎉 تم تفعيل الإشعارات بنجاح على هذا الجهاز!');
      } else if (res.reason === 'denied') {
        message.warning('⚠️ الإشعارات محظورة في إعدادات الهاتف. يرجى تفعيلها من إعدادات الآيفون.');
      } else {
        message.info('لم يتم منح الإذن بعد.');
      }
    } catch (e) {
      message.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.post('/api/swm/push/test');
      if (res.data?.success) {
        message.success('🔔 تم إرسال الإشعار التجريبي! تفقد إشعارات جهازك الآن.');
      }
    } catch (e) {
      message.error(e.response?.data?.message || e.message || 'فشل إرسال الإشعار');
    } finally {
      setTesting(false);
    }
  };

  const isGranted = status.permission === 'granted';

  return (
    <>
      <Badge dot={!isGranted} offset={[-4, 4]} color="#C8A45C">
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: isMobile ? 18 : 17, color: isGranted ? '#10b981' : '#C8A45C' }} />}
          onClick={() => {
            refreshStatus();
            setOpen(true);
          }}
          style={{
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            padding: 0,
            borderRadius: 8,
            backgroundColor: isGranted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(200, 164, 92, 0.12)',
            border: `1px solid ${isGranted ? '#10b981' : '#C8A45C'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="إشعارات النظام الفورية"
        />
      </Badge>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl' }}>
            <BellOutlined style={{ color: '#C8A45C', fontSize: 20 }} />
            <span style={{ fontWeight: 800 }}>إشعارات العمليات الفورية (FCM)</span>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={440}
      >
        <div style={{ direction: 'rtl', textAlign: 'right', padding: '10px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              حالة الإشعارات على هذا الجهاز:
            </Text>
            {isGranted ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13 }}>
                الإشعارات مفعلة ونشطة على هذا الجهاز ✅
              </Tag>
            ) : status.permission === 'denied' ? (
              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13 }}>
                الإشعارات محظورة في إعدادات الهاتف ❌
              </Tag>
            ) : (
              <Tag color="warning" icon={<BellOutlined />} style={{ padding: '4px 10px', fontSize: 13 }}>
                بانتظار الموافقة والتفعيل ⚠️
              </Tag>
            )}
          </div>

          {status.isIOS && !status.isStandalone && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              color: '#92400e',
              marginBottom: 16
            }}>
              💡 <strong>تنبيه لمستخدمي الآيفون:</strong> نظام iOS يتطلب تثبيت التطبيق على الشاشة الرئيسية أولاً لاستقبال الإشعارات (زر المشاركة ⎋ {' > '} إضافة إلى الصفحة الرئيسية).
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {!isGranted ? (
              <Button
                type="primary"
                size="large"
                icon={<BellOutlined />}
                loading={loading}
                onClick={handleEnable}
                style={{
                  background: '#C8A45C',
                  borderColor: '#C8A45C',
                  color: '#0B0F17',
                  fontWeight: 800,
                  borderRadius: 8
                }}
              >
                تفعيل الإشعارات على هذا الجهاز الآن 🔔
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                loading={testing}
                onClick={handleTest}
                style={{
                  background: '#10b981',
                  borderColor: '#10b981',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: 8
                }}
              >
                إرسال إشعار تجريبي لاختبار الهاتف 📲
              </Button>
            )}

            {isGranted && (
              <Button
                size="middle"
                icon={<BellOutlined />}
                loading={loading}
                onClick={handleEnable}
                style={{ borderRadius: 8 }}
              >
                تحديث اشتراك الجهاز / إعادة التسجيل
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
