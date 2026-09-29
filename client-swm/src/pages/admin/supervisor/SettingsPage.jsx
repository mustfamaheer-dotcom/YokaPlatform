import React from 'react';
import { Typography } from 'antd';
import { Sliders } from 'lucide-react';
import SupervisorPageLayout from './SupervisorPageLayout';
import InvoiceSettingsCard from './InvoiceSettingsCard';

export default function SettingsPage({ currentUser }) {
  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;

  return (
    <SupervisorPageLayout
      currentUser={currentUser}
      pageTitle="قواعد وإعدادات فواتير الفرع"
      pageIcon={<Sliders size={20} />}
      pageSubtitle="ضبط حدود الخصومات، أذونات المرتجع، وقواعد التحقق لكاشير وبائعي الفرع"
    >
      <InvoiceSettingsCard branchId={branchId} />
    </SupervisorPageLayout>
  );
}
