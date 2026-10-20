import React from 'react';
import { Result, Button, Space } from 'antd';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ECP ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '60px 20px',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            margin: '40px auto',
            maxWidth: 680,
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)'
          }}
        >
          <Result
            status="warning"
            icon={<AlertCircle size={52} color="#C8A45C" style={{ margin: '0 auto' }} />}
            title={<span style={{ fontWeight: 800, fontSize: 22, color: '#0F172A' }}>حدث خطأ غير متوقع أثناء تحميل الصفحة</span>}
            subTitle={
              <span style={{ color: '#64748B', fontSize: 14 }}>
                نعتذر عن هذا الخطأ المؤقت. يمكنك تحديث الصفحة أو العودة للصفحة الرئيسية لمتابعة التسوق.
              </span>
            }
            extra={
              <Space size="middle" style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  icon={<RotateCcw size={16} style={{ marginLeft: 6 }} />}
                  onClick={this.handleRetry}
                  style={{
                    backgroundColor: '#C8A45C',
                    color: '#0F172A',
                    borderRadius: 8,
                    fontWeight: 700,
                    height: 42,
                    padding: '0 20px',
                    border: 'none'
                  }}
                >
                  إعادة المحاولة
                </Button>
                <Button
                  icon={<Home size={16} style={{ marginLeft: 6 }} />}
                  onClick={this.handleGoHome}
                  style={{
                    borderRadius: 8,
                    fontWeight: 700,
                    height: 42,
                    padding: '0 20px',
                    borderColor: '#CBD5E1',
                    color: '#0F172A'
                  }}
                >
                  الرئيسية
                </Button>
              </Space>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
