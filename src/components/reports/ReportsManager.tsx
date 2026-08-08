import React, { useState } from 'react';
import { PatientReportView } from './PatientReport';
import { DoctorReportView } from './DoctorReport';
import { CashBoxStatementView } from './CashBoxStatement';
import { CustomReportsView } from './CustomReports';
import {
  FileText,
  UserCheck,
  Stethoscope,
  Wallet,
  Filter,
  BarChart3,
} from 'lucide-react';

export const ReportsManager: React.FC = () => {
  const [subTab, setSubTab] = useState<'patient' | 'doctor' | 'cashbox' | 'custom'>('doctor');

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">منظومة التقارير الشاملة (المرحلة الرابعة)</h2>
            <p className="text-xs text-slate-400">تقارير قراءة فقط شفافة لمالك المركز</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/80 overflow-x-auto max-w-full">
          <button
            onClick={() => setSubTab('doctor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'doctor'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>تقرير طبيب</span>
          </button>

          <button
            onClick={() => setSubTab('patient')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'patient'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>تقرير مريض</span>
          </button>

          <button
            onClick={() => setSubTab('cashbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'cashbox'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>كشف حساب صندوق</span>
          </button>

          <button
            onClick={() => setSubTab('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>تقارير حرة</span>
          </button>
        </div>
      </div>

      {/* Render Active Report View */}
      {subTab === 'doctor' && <DoctorReportView />}
      {subTab === 'patient' && <PatientReportView />}
      {subTab === 'cashbox' && <CashBoxStatementView />}
      {subTab === 'custom' && <CustomReportsView />}
    </div>
  );
};
