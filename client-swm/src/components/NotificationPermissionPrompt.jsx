import React, { useState, useEffect } from 'react';
import { Button, message, Alert, Modal, Card, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { getNotificationStatus, requestNotificationPermission } from '../utils/pushNotifications';
import api from '../api';

const { Text } = Typography;

export default function NotificationPermissionPrompt({ currentUser }) {
  const [status, setStatus] = useState(() => getNotificationStatus());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Refresh status periodically and on visibility change
  useEffect(() => {
    const update = () => setStatus(getNotificationStatus());
    update();
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);

  // Relevant for Owner / Admins (super_admin, admin, main warehouse)
  const isPrivileged = ['super_admin', 'admin'].includes(currentUser?.role) || currentUser?.isMainWarehouse;
  if (!isPrivileged) {
    return null;
  }

  // If dismissed and already granted, hide completely
  if (dismissed && status.permission === 'granted') {
    return null;
  }

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      setStatus(getNotificationStatus());

      if (result.success) {
        message.success('🎉 تم تفعيل إشعارات الدفع بنجاح على هذا الجهاز!');
      } else if (result.reason === 'denied') {
        Modal.warning({
          title: 'الإشعارات محظورة في إعدادات الهاتف',
          content: (
            <div style={{ textAlign: 'right', direction: 'rtl', lineHeight: 1.8 }}>
              <p>تم رفض إذن الإشعارات سابقاً في هذا الجهاز.</p>
              <p><strong>لتفعيلها على الآيفون:</strong></p>
              <ol style={{ paddingRight: 20 }}>
                <li>افتح تطبيق <strong>الإعدادات (Settings)</strong> في جهازك.</li>
                <li>انزل للأسفل واختر <strong>الإشعارات (Notifications)</strong> أو اختر تطبيق <strong>Yoka SWM</strong>.</li>
                <li>قم بتفعيل خيار <strong>السماح بالإشعارات (Allow Notifications)</strong>.</li>
                <li>ثم أعد فتح التطبيق هنا.</li>
              </ol>
            </div>
          ),
          okText: 'فهمت'
        });
      } else if (result.reason === 'not_supported') {
        message.error('هذا المتصفح لا يدعم استلام إشعارات الدفع.');
      } else {
        message.info('لم يتم منح الإذن بعد. يرجى الضغط والموافقة على نافذة الإشعارات.');
      }
    } catch (err) {
      message.error(err.message || 'حدث خطأ أثناء طلب الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTesting(true);
    try {
      const res = await api.post('/api/swm/push/test');
      if (res.data?.success) {
        message.success('🔔 تم إرسال إشعار تجريبي! تفقد شاشة القفل أو شريط الإشعارات.');
      } else {
        message.warning(res.data?.message || 'تم الإرسال ولكن لم يتم تأكيد الاستلام.');
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'فشل إرسال الإشعار التجريبي');
    } finally {
      setTesting(false);
    }
  };

  // State 1: On iOS Safari but NOT installed to Home Screen
  if (status.isIOS && !status.isStandalone) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 520,
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        borderRadius: 14,
        overflow: 'hidden'
      }}>
        <Alert
          type="warning"
          showIcon
          message={<span style={{ fontWeight: 800, fontSize: 15 }}>تثبيت التطبيق لتفعيل إشعارات الآيفون 📲</span>}
          description={(
            <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>
              نظام iOS يتطلب تثبيت التطبيق على الشاشة الرئيسية أولاً لتتمكن من استلام إشعارات العمليات المخزنية:
              <div style={{ marginTop: 6, fontWeight: 700, color: '#b45309' }}>
                اضغط على زر المشاركة ⎋ في أسفل سفاري ثم اختر «إضافة إلى الصفحة الرئيسية» (+).
              </div>
            </div>
          )}
          closable
          onClose={() => setDismissed(true)}
        />
      </div>
    );
  }

  // State 2: Permission NOT granted yet ('default' or 'unsupported')
  if (status.permission !== 'granted') {
    return (
      <div style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: '92%',
        maxWidth: 540,
        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
        borderRadius: 16,
        border: '2px solid #C8A45C',
        background: '#0B0F17',
        color: '#fff',
        padding: '16px 20px',
        direction: 'rtl'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(200, 164, 92, 0.15)',
              color: '#C8A45C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20
            }}>
              <BellOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#C8A45C' }}>
                تفعيل إشعارات الآيفون للمالك
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                مطلوب إذنك لتصلك تنبيهات العمليات المخزنية على هاتفك فوراً
              </div>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            size="large"
            icon={<BellOutlined />}
            loading={loading}
            onClick={handleRequestPermission}
            style={{
              background: '#C8A45C',
              borderColor: '#C8A45C',
              color: '#0B0F17',
              fontWeight: 800,
              flex: 1,
              borderRadius: 10
            }}
          >
            تفعيل الإشعارات الآن 🔔
          </Button>
        </div>
      </div>
    );
  }

  // State 3: Granted! Show status with Test Notification trigger
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 9999,
      maxWidth: 360,
      background: '#0B0F17',
      border: '1px solid #1e293b',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      borderRadius: 12,
      padding: '10px 14px',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
          <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
            إشعارات المالك مفعّلة ✅
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<SendOutlined />}
            loading={testing}
            onClick={handleSendTestPush}
            style={{ fontSize: 11, borderColor: '#C8A45C', color: '#C8A45C' }}
          >
            إرسال إشعار تجريبي
          </Button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 2
            }}
          >
            <CloseOutlined style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
