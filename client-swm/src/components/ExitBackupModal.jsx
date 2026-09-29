import React, { useState } from 'react';
import { Modal, Button, Typography, Space, Tag, Spin, Alert } from 'antd';
import {
  Database,
  Power,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDriveDownload,
  LogOut,
  Building
} from 'lucide-react';
import api from '../api';
import { antMessage } from '../utils/antAppBridge';

const { Title, Text, Paragraph } = Typography;

export default function ExitBackupModal({ open, onCancel, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [backupResult, setBackupResult] = useState(null);
  const [closedAttempted, setClosedAttempted] = useState(false);

  const branchName = currentUser?.branch_name || currentUser?.branchName || 'الفرع الرئيسي';

  const handleStartBackupAndExit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/swm/system/backup');
      if (res.data.success) {
        setBackupResult(res.data.data);
        antMessage.success('تم إتمام النسخ الاحتياطي للنظام بنجاح!');

        // 1. Clear session tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // 2. Attempt window.close() to simulate "Exit to Desktop"
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            // ignore
          }
          setClosedAttempted(true);
        }, 1200);
      } else {
        antMessage.error(res.data.message || 'فشل في إجراء النسخ الاحتياطي');
        setLoading(false);
      }
    } catch (err) {
      console.error('Backup & Exit error:', err);
      antMessage.error(err.response?.data?.message || 'حدث خطأ أثناء إجراء النسخ الاحتياطي للنظام');
      setLoading(false);
    }
  };

  const handleManualClose = () => {
    try {
      window.open('', '_self', '');
      window.close();
    } catch (e) {
      // ignore
    }
    window.location.href = '/login';
  };

  return (
    <Modal
      open={open}
      onCancel={loading ? undefined : onCancel}
      footer={null}
      centered
      width={520}
      closable={!loading}
      maskClosable={!loading}
      styles={{ body: { padding: '28px 24px' } }}
    >
      <div style={{ textAlign: 'center', direction: 'rtl' }}>
        {!backupResult ? (
          <>
            {/* Modal Icon */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #fecaca',
                boxShadow: '0 8px 20px rgba(220, 38, 38, 0.15)'
              }}
            >
              <Power size={34} strokeWidth={2.4} />
            </div>

            <Title level={4} style={{ color: '#0f172a', fontWeight: 800, marginBottom: 8 }}>
              خروج ونسخ احتياطي للنظام (Exit & Backup)
            </Title>

            <Paragraph style={{ color: '#475569', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
              سيقوم النظام بإنشاء نسخة احتياطية فورية وشاملة لقاعدة البيانات (mysqldump / SQL Archive)، لحفظ وتأمين كافة مبيعات وحركات اليوم، ثم إنهاء الجلسة وإغلاق نافذة النظام.
            </Paragraph>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                textAlign: 'right',
                fontSize: 12.5
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>الفرع:</span>
                <strong style={{ color: '#0f172a' }}>{branchName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>المستخدم:</span>
                <strong style={{ color: '#0f172a' }}>{currentUser?.fullName || currentUser?.username}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>الإجراء اللاحق:</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>تصفير الجلسة وإغلاق التطبيق</span>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#dc2626', fontWeight: 700, fontSize: 14 }}>
                  جاري تفريغ قاعدة البيانات وإنشاء النسخة الاحتياطية وتأمين النظام...
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  يرجى الانتظار بضع ثوانٍ وعدم إغلاق المتصفح
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Button
                  size="large"
                  onClick={onCancel}
                  style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                >
                  إلغاء وتراجع
                </Button>
                <Button
                  size="large"
                  type="primary"
                  danger
                  icon={<HardDriveDownload size={18} style={{ marginLeft: 6 }} />}
                  onClick={handleStartBackupAndExit}
                  style={{
                    flex: 1.4,
                    borderRadius: 8,
                    fontWeight: 700,
                    backgroundColor: '#dc2626',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  تأكيد النسخ والخروج
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Success & Window Closed screen */
          <div>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #a7f3d0'
              }}
            >
              <CheckCircle2 size={36} strokeWidth={2.4} />
            </div>

            <Title level={4} style={{ color: '#065f46', fontWeight: 800, marginBottom: 6 }}>
              تم النسخ الاحتياطي وحفظ البيانات بنجاح!
            </Title>

            <Paragraph style={{ color: '#475569', fontSize: 13, marginBottom: 14 }}>
              تم تسجيل الخروج وتفريغ الجلسة بأمان. يمكنك الآن إغلاق هذه النافذة أو العودة لصفحة تسجيل الدخول.
            </Paragraph>

            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                textAlign: 'right',
                fontSize: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#166534' }}>الملف المحفوظ:</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{backupResult.filename}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#166534' }}>حجم الأرشيف:</span>
                <strong>{backupResult.sizeFormatted}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#166534' }}>إجمالي الجداول والصفوف:</span>
                <strong>{backupResult.tablesCount} جدول ({backupResult.totalRecords} سجل)</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                type="primary"
                danger
                size="large"
                onClick={handleManualClose}
                style={{ flex: 1, borderRadius: 8, fontWeight: 700 }}
              >
                إغلاق النافذة / خروج
              </Button>
              <Button
                size="large"
                onClick={() => window.location.href = '/login'}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                تسجيل الدخول
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
