import React, { useState, useEffect } from 'react';
import { Button, Alert, Typography, App as AntApp } from 'antd';
import { BellOutlined, CheckCircleOutlined, SendOutlined, CloseOutlined, SyncOutlined } from '@ant-design/icons';
import { getNotificationStatus, requestNotificationPermission } from '../utils/pushNotifications';
import api from '../api';

const { Text } = Typography;

export default function NotificationPermissionPrompt({ currentUser }) {
  const { message, modal } = AntApp.useApp();
  const [status, setStatus] = useState(() => getNotificationStatus());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('swm_dismiss_notif_banner') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('swm_dismiss_notif_banner', 'true');
    } catch (e) {}
  };

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

  // When dismissed by clicking 'X', hide immediately regardless of activation state
  if (dismissed) {
    return null;
  }

  const isFullyActive = status.permission === 'granted' && status.hasToken;
  const isPermissionGrantedOnly = status.permission === 'granted' && !status.hasToken;

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      setStatus(getNotificationStatus());

      if (result.success) {
        message.success('🎉 تم تسجيل وتفعيل إشعارات الدفع بنجاح على هذا الجهاز!');
      } else if (result.reason === 'denied') {
        modal.warning({
          title: 'الإشعارات محظورة في إعدادات الهاتف',
          zIndex: 100000,
          content: (
            <div style={{ textAlign: 'right', direction: 'rtl', lineHeight: 1.8 }}>
              <p>تم رفض إذن الإشعارات سابقاً في هذا الجهاز.</p>
              <p><strong>لتفعيلها على الآيفون:</strong></p>
              <ol style={{ paddingRight: 20 }}>
                <li>افتح تطبيق <strong>الإعدادات (Settings)</strong> في جهازك.</li>
                <li>انزل للأسفل واختر <strong>الإشعارات (Notifications)</strong> أو تطبيق <strong>Yoka SWM</strong>.</li>
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
        modal.error({
          title: 'فشل استخراج رمز الجهاز من Firebase',
          zIndex: 100000,
          content: (
            <div style={{ textAlign: 'right', direction: 'rtl' }}>
              <p>حدث خطأ أثناء الاتصال بخدمة Firebase Cloud Messaging:</p>
              <pre style={{ background: '#f8fafc', color: '#0f172a', padding: 10, borderRadius: 6, fontSize: 12, wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                {String(result.reason || 'Unknown error')}
              </pre>
            </div>
          ),
          okText: 'إغلاق'
        });
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
          onClose={handleDismiss}
        />
      </div>
    );
  }

  // State 2: Permission NOT granted yet OR Token missing
  if (!isFullyActive) {
    return (
      <div style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
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
                {isPermissionGrantedOnly ? 'إكمال تسجيل إشعارات الآيفون' : 'تفعيل إشعارات الآيفون للمالك'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {isPermissionGrantedOnly
                  ? 'تم السماح بالإذن في iOS، اضغط لتسجيل رمز الجهاز في Firebase'
                  : 'مطلوب إذنك لتصلك تنبيهات العمليات المخزنية على هاتفك فوراً'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="إغلاق التنبيه"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 18,
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              flexShrink: 0
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            size="large"
            icon={isPermissionGrantedOnly ? <SyncOutlined /> : <BellOutlined />}
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
            {isPermissionGrantedOnly ? 'تسجيل رمز الجهاز في Firebase الآن 🔔' : 'تفعيل الإشعارات الآن 🔔'}
          </Button>
        </div>
      </div>
    );
  }

  // State 3: Fully Active! Show status with Test Notification trigger
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
            type="button"
            onClick={handleDismiss}
            aria-label="إغلاق التنبيه"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation'
            }}
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
