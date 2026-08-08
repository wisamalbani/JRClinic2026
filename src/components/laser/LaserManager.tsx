import React, { useState } from 'react';
import { LaserInputForm } from './LaserInputForm';
import { LaserReportView } from './LaserReportView';
import { LaserSettingsManager } from './LaserSettingsManager';
import { Sparkles, FileText, Settings, PlusCircle } from 'lucide-react';

interface LaserManagerProps {
  userRole: 'owner' | 'secretary' | string;
}

export const LaserManager: React.FC<LaserManagerProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'input' | 'report' | 'settings'>('input');

  const isOwner = userRole === 'owner';

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'input'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          حركات صندوق الليزر (قبض / صرف / سحب)
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'report'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          تقرير الليزر الشهري
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            إدارة الكادر، النسب والرواتب والصيانة
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'input' && <LaserInputForm />}
      {activeTab === 'report' && <LaserReportView />}
      {activeTab === 'settings' && isOwner && <LaserSettingsManager />}
    </div>
  );
};
