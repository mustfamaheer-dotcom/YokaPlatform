import React from 'react';
import { Result, Button } from 'antd';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #fecaca',
            margin: '20px auto',
            maxWidth: 800,
            textAlign: 'center'
          }}
        >
          <Result
            status="error"
            icon={<AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto' }} />}
            title="حدث خطأ غير متوقع أثناء تحميل هذا القسم"
            subTitle={
              this.state.error?.message ||
              'تعذر معالجة البيانات المحاسبية أو عرض محتوى الشاشة بشكل صحيح. يمكنك إعادة المحاولة الآن.'
            }
            extra={[
              <Button
                type="primary"
                key="retry"
                icon={<RotateCcw size={16} style={{ marginLeft: 6 }} />}
                onClick={this.handleRetry}
                style={{
                  backgroundColor: '#4f46e5',
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 40,
                  padding: '0 24px'
                }}
              >
                إعادة المحاولة
              </Button>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
