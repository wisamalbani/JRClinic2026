import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Package, Plus, Search, AlertCircle, CheckCircle2, Box } from 'lucide-react';

export const InventoryItemsManager: React.FC = () => {
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Item Form State
  const [name, setName] = useState('');
  const [unitsPerPackage, setUnitsPerPackage] = useState<number | ''>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setItems(data);
    } catch (err: any) {
      console.error('Error fetching inventory items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الصنف المادي.');
      return;
    }

    const units = Number(unitsPerPackage);
    if (isNaN(units) || units <= 0) {
      setErrorMsg('عدد القطع/الجرعات في العلبة يجب أن يكون عدداً صحيحاً أكبر من صفر.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('inventory_items').insert([
        {
          name: name.trim(),
          units_per_package: units,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا الصنف موجود بالفعل بجدول المواد.');
        }
        throw error;
      }

      setSuccessMsg(`تم إضافة الصنف "${name}" بنجاح.`);
      setName('');
      setUnitsPerPackage(1);
      fetchItems();
    } catch (err: any) {
      console.error('Error adding inventory item:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إضافة الصنف.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form (Owner only write) */}
        {isOwner ? (
          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
              <Package className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white">إضافة صنف مادي جديد</h3>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الصنف المادي <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مخدر موضع، إبر فيلر، معجون..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عدد القطع / الوحدات بالعلبة الواحدة <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={unitsPerPackage}
                  onChange={(e) => setUnitsPerPackage(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  مثال: عبوة تحتوي 10 أمبولات أو 50 قطعة.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>حفظ الصنف المادي</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-center text-slate-400 text-xs">
            صلاحية إضافة أصناف مادية حصرية لمالك المركز. السكرتير يستعرض القائمة فقط.
          </div>
        )}

        {/* List of items */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white">دليل الأصناف والمستلزمات الطبية</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                {items.length}
              </span>
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث عن صنف..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
              <span>جاري تحميل دليل الأصناف...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
              لا توجد أصناف مادية مسجلة حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم الصنف المادي</th>
                    <th className="p-3">عدد القطع / الوحدات بالعلبة</th>
                    <th className="p-3">تاريخ الإضافة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-100">{item.name}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">
                        {item.units_per_package} <span className="text-[10px] font-sans text-slate-400">وحدة/علبة</span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-EG') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
