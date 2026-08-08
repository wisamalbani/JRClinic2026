import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Transaction, CashBox } from '../types';
import { TransactionFormModal } from './TransactionFormModal';
import {
  Lock,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

export const SuspenseTransactions: React.FC = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [suspenseTxs, setSuspenseTxs] = useState<Transaction[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchSuspenseData = useCallback(async () => {
    if (!isOwner) return;

    setLoading(true);
    try {
      // 1. Fetch suspense transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_suspense', true)
        .order('created_at', { ascending: false });

      if (txData) setSuspenseTxs(txData);

      // 2. Fetch cash boxes lookup
      const { data: cbData } = await supabase.from('cash_boxes').select('*');
      if (cbData) setCashBoxes(cbData);
    } catch (err) {
      console.error('Error fetching suspense transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    fetchSuspenseData();
  }, [fetchSuspenseData]);

  if (!isOwner) {
    return (
      <div className="p-8 bg-slate-800 border border-slate-700 rounded-3xl text-center space-y-3 dir-rtl font-sans">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="font-bold text-white text-base">صلاحية محصورة بمالك المركز</h3>
        <p className="text-xs text-slate-400">
          شاشة إدارة الحركات المعلقة (Suspense Transactions) متاحة حصراً لدور المالك (Owner).
        </p>
      </div>
    );
  }

  const getCashBoxName = (id: string) => cashBoxes.find((cb) => cb.id === id)?.name || 'غير معروف';

  return (
    <div className="space-y-6 dir-rtl font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-800 border border-amber-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            شاشة إدارة الحركات المعلقة (Suspense List)
          </div>
          <h2 className="text-xl font-extrabold text-white pt-1">
            الحركات المالية المعلقة ({suspenseTxs.length})
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            هذه الشاشة تعرض جميع المقبوضات والمصروفات غير المحددة بعيادة أو تصنيف. يمكنك إعادة تصنيفها وتخصيصها للعيادة أو البند المناسب.
          </p>
        </div>

        <button
          onClick={fetchSuspenseData}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors shrink-0"
          title="تحديث القائمة"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table List */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-850 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th className="p-4">نوع الحركة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">المبلغ والعملة</th>
                <th className="p-4">اسم المريض / البيان</th>
                <th className="p-4">الصندوق</th>
                <th className="p-4">حالة التعليق</th>
                <th className="p-4 text-center">إعادة التصنيف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    جاري تحميل الحركات المعلقة...
                  </td>
                </tr>
              ) : suspenseTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                    ممتاز! لا توجد حركات معلقة حالياً. جميع الحركات مصنفة بنجاح.
                  </td>
                </tr>
              ) : (
                suspenseTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-750/50 transition-colors">
                    {/* Type */}
                    <td className="p-4 font-bold">
                      {tx.type === 'income' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          قبض
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          صرف
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4 font-mono text-slate-400">{tx.date}</td>

                    {/* Amount & Currency */}
                    <td className="p-4 font-mono font-bold text-white dir-ltr text-right">
                      {Number(tx.amount).toLocaleString()}{' '}
                      <span className="text-[10px] text-slate-400 font-sans">{tx.currency}</span>
                    </td>

                    {/* Patient / Desc */}
                    <td className="p-4 space-y-0.5">
                      <span className="font-semibold text-slate-200 block">
                        {tx.patient_name || 'بدون اسم مريض'}
                      </span>
                      {tx.description && (
                        <span className="text-[11px] text-slate-400 block">{tx.description}</span>
                      )}
                    </td>

                    {/* Cash Box */}
                    <td className="p-4">{getCashBoxName(tx.cash_box_id)}</td>

                    {/* Suspense status */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        <Lock className="w-3 h-3" />
                        معلقة
                      </span>
                    </td>

                    {/* Reclassify Action */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>إعادة تصنيف</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reclassify */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSuspenseData}
        initialTransaction={selectedTx}
        isReclassifyMode={true}
      />
    </div>
  );
};
