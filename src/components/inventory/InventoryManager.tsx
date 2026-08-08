import React, { useState } from 'react';
import { InventoryItemsManager } from './InventoryItemsManager';
import { RepsManager } from './RepsManager';
import { MaterialBatchForm } from './MaterialBatchForm';
import { MaterialConsumptionForm } from './MaterialConsumptionForm';
import { RepStatementView } from './RepStatementView';
import {
  Package,
  Boxes,
  Users,
  FilePlus,
  FlaskConical,
  Wallet,
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [subTab, setSubTab] = useState<'items' | 'reps' | 'batch' | 'consumption' | 'statement'>('consumption');

  return (
    <div className="space-y-6">
      {/* Sub-navigation Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">إدارة المواد والمخزون والمندوبين (المرحلة الخامسة)</h2>
            <p className="text-xs text-slate-400">متابعة الأصناف، شحنات التوريد، الاستهلاك بالعيادات، ومستحقات المندوبين</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/80 overflow-x-auto max-w-full">
          <button
            onClick={() => setSubTab('consumption')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'consumption'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>تسجيل استهلاك</span>
          </button>

          <button
            onClick={() => setSubTab('batch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'batch'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>استلام مواد (دفعة)</span>
          </button>

          <button
            onClick={() => setSubTab('statement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'statement'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>كشف حساب مندوب</span>
          </button>

          <button
            onClick={() => setSubTab('items')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'items'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>الأصناف والمستلزمات</span>
          </button>

          <button
            onClick={() => setSubTab('reps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'reps'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>المندوبون</span>
          </button>
        </div>
      </div>

      {/* Render Sub Tab */}
      {subTab === 'consumption' && <MaterialConsumptionForm />}
      {subTab === 'batch' && <MaterialBatchForm />}
      {subTab === 'statement' && <RepStatementView />}
      {subTab === 'items' && <InventoryItemsManager />}
      {subTab === 'reps' && <RepsManager />}
    </div>
  );
};
