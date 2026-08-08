import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Transaction, CashBox, Clinic, ExpenseCategory } from '../types';
import { TransactionFormModal } from './TransactionFormModal';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Edit2,
  Trash2,
  Plus,
  Search,
  Lock,
  Building2,
  Tag,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const TransactionsList: React.FC = () => {
  const { user, profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading] = useState(true);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Delete Confirm Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txData) setTransactions(txData);

      // 2. Master lookup data
      const { data: cbData } = await supabase.from('cash_boxes').select('*');
      if (cbData) setCashBoxes(cbData);

      const { data: clData } = await supabase.from('clinics').select('*');
      if (clData) setClinics(clData);

      const { data: catData } = await supabase.from('expense_categories').select('*');
      if (catData) setCategories(catData);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Owner Delete Transaction with Audit Log
  const handleDeleteTransaction = async () => {
    if (!deleteId || !isOwner) return;

    setDeleteLoading(true);
    try {
      // 1. Get transaction before deletion for audit log
      const { data: txToDelete } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', deleteId)
        .single();

      // 2. Delete transaction
      const { error: deleteErr } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteId);

      if (deleteErr) {
        alert(`خطأ أثناء الحذف: ${deleteErr.message}`);
      } else {
        // 3. Log Audit
        await supabase.from('audit_log').insert({
          user_id: user?.id,
          action: 'DELETE_TRANSACTION',
          table_name: 'transactions',
          record_id: deleteId,
          old_value: txToDelete,
          new_value: null,
        });

        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  // Lookups
  const getCashBoxName = (id: string) => cashBoxes.find((cb) => cb.id === id)?.name || 'غير معروف';
  const getClinicName = (id?: string | null) => {
    if (!id) return 'المركز الرئيسي';
    const cl = clinics.find((c) => c.id === id);
    return cl ? `${cl.doctor_name}` : 'غير معروف';
  };
  const getCategoryName = (id?: string | null) => {
    if (!id) return '-';
    return categories.find((cat) => cat.id === id)?.name || '-';
  };

  // Filtered List
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || tx.type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 dir-rtl font-sans">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-5 rounded-3xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            سجل الحركات المالية
          </h2>
          <p className="text-xs text-slate-400">
            عرض وتصفية المقبوضات والمصروفات ({filteredTransactions.length} حركة)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Transaction Button (Available for Secretary + Owner) */}
          <button
            onClick={() => {
              setSelectedTransaction(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة حركة مالية
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المريض أو البيان..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex gap-1.5 bg-slate-800 p-1 border border-slate-700 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المقبوضات (قبض)
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'expense' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المصروفات (صرف)
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-850 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th className="p-4">نوع الحركة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">المبلغ والعملة</th>
                <th className="p-4">اسم المريض</th>
                <th className="p-4">الصندوق</th>
                <th className="p-4">العيادة / البند</th>
                <th className="p-4">حالة التعليق</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    جاري تحميل الحركات المالية...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    لا توجد حركات مالية مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
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
                      {tx.currency === 'USD' && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          سعر الصرف: {tx.exchange_rate_used}
                        </span>
                      )}
                    </td>

                    {/* Patient Name */}
                    <td className="p-4 font-semibold text-slate-200">
                      {tx.patient_name || '-'}
                    </td>

                    {/* Cash Box */}
                    <td className="p-4">
                      {getCashBoxName(tx.cash_box_id)}
                      {tx.is_cash_movement === false && (
                        <span className="block text-[10px] text-purple-400 font-bold">
                          (استهلاك مواد - غير نقدي)
                        </span>
                      )}
                    </td>

                    {/* Clinic / Category */}
                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-3 h-3 text-blue-400" />
                        <span>{getClinicName(tx.clinic_id)}</span>
                      </div>
                      {tx.expense_category_id && (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Tag className="w-3 h-3 text-emerald-400" />
                          <span>{getCategoryName(tx.expense_category_id)}</span>
                        </div>
                      )}
                    </td>

                    {/* Suspense Status */}
                    <td className="p-4">
                      {tx.is_suspense ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Lock className="w-3 h-3" />
                          معلقة
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">مكتملة</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      {isOwner ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(tx.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic" title="إضافة فقط للسكرتارية">
                          عرض فقط
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal for Owner */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">تأكيد حذف الحركة المالية</h3>
                <p className="text-xs text-slate-400">سيتم تسجيل العملية في سجل التدقيق (audit_log)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت تأكد من حذف هذه الحركة؟ هذه العملية لا يمكن التراجع عنها وستحفظ القيمة القديمة في سجل التدقيق.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteTransaction}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {deleteLoading ? 'جاري الحذف...' : 'حذف الحركة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialTransaction={selectedTransaction}
      />
    </div>
  );
};
