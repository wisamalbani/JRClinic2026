import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryItem, Clinic, MaterialBatch, MaterialConsumption } from '../../types';
import { FlaskConical, AlertCircle, CheckCircle2, Building2, Calendar, FileText, Check, ShieldAlert } from 'lucide-react';

export const MaterialConsumptionForm: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Selections
  const [selectedItemId, setSelectedItemId] = useState('');
  const [availableBatches, setAvailableBatches] = useState<MaterialBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [quantityUnits, setQuantityUnits] = useState<number | ''>('');
  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Submission State
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recent Consumptions List
  const [recentConsumptions, setRecentConsumptions] = useState<MaterialConsumption[]>([]);

  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const { data: itemData } = await supabase.from('inventory_items').select('*').order('name', { ascending: true });
      if (itemData) setItems(itemData);

      const { data: clinicData } = await supabase.from('clinics').select('*').order('number', { ascending: true });
      if (clinicData) setClinics(clinicData);

      fetchRecentConsumptions();
    } catch (err) {
      console.error('Error fetching consumption lookups:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  const fetchRecentConsumptions = async () => {
    try {
      const { data } = await supabase
        .from('material_consumption')
        .select('*, clinics(*), material_batches(*, inventory_items(*))')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setRecentConsumptions(data as any);
    } catch (err) {
      console.error('Error fetching recent consumptions:', err);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  // Fetch Available Batches when Item changes
  useEffect(() => {
    if (!selectedItemId) {
      setAvailableBatches([]);
      setSelectedBatchId('');
      return;
    }

    const fetchBatches = async () => {
      setLoadingBatches(true);
      setErrorMsg(null);
      try {
        const { data, error } = await supabase
          .from('material_batches')
          .select('*, inventory_items(*), reps(*)')
          .eq('item_id', selectedItemId)
          .gt('remaining_units', 0)
          .order('purchase_date', { ascending: true }); // FIFO order

        if (error) throw error;
        setAvailableBatches((data as any) || []);
        if (data && data.length > 0) {
          setSelectedBatchId(data[0].id); // Auto select oldest available batch
        } else {
          setSelectedBatchId('');
        }
      } catch (err: any) {
        console.error('Error fetching available batches:', err);
        setErrorMsg('حدث خطأ أثناء تحميل الدفعات المتوفرة لهذه المادة.');
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchBatches();
  }, [selectedItemId]);

  const selectedBatch = availableBatches.find((b) => b.id === selectedBatchId);
  const qty = Number(quantityUnits) || 0;
  const isOverLimit = selectedBatch ? qty > selectedBatch.remaining_units : false;
  const isInvalidQty = qty <= 0 || isOverLimit;

  const handleConsumptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedItemId) {
      setErrorMsg('يرجى اختيار الصنف المادي.');
      return;
    }

    if (!selectedBatchId || !selectedBatch) {
      setErrorMsg('يرجى اختيار الدفعة المتوفرة للاستهلاك.');
      return;
    }

    if (!selectedClinicId) {
      setErrorMsg('يرجى تحديد العيادة المستهلكة.');
      return;
    }

    if (isInvalidQty) {
      if (isOverLimit) {
        setErrorMsg(`الكمية المطلوبة (${qty}) تتجاوز الرصيد المتاح بالدفعة المختارة (${selectedBatch.remaining_units}).`);
      } else {
        setErrorMsg('يرجى إدخال كمية استهلاك صحيحة أكبر من صفر.');
      }
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('material_consumption').insert([
        {
          batch_id: selectedBatchId,
          clinic_id: selectedClinicId,
          quantity_units: qty,
          date: consumptionDate,
          notes: notes.trim() || null,
        },
      ]);

      if (error) throw error;

      setSuccessMsg(`تم تسجيل استهلاك ${qty} قطعة من المادة بنجاح وتحويل تكلفتها كمصروف على العيادة.`);
      setQuantityUnits('');
      setNotes('');
      
      // Refresh available batches and list
      const { data: updatedBatches } = await supabase
        .from('material_batches')
        .select('*, inventory_items(*), reps(*)')
        .eq('item_id', selectedItemId)
        .gt('remaining_units', 0)
        .order('purchase_date', { ascending: true });

      setAvailableBatches((updatedBatches as any) || []);
      if (updatedBatches && updatedBatches.length > 0) {
        setSelectedBatchId(updatedBatches[0].id);
      } else {
        setSelectedBatchId('');
      }

      fetchRecentConsumptions();
    } catch (err: any) {
      console.error('Error logging consumption:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل عملية الاستهلاك.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Consumption Form */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">تسجيل استهلاك مواد بالعيادات</h3>
              <p className="text-xs text-slate-400">سحب كميات من الدفعات المتوفرة وتحميل تكلفتها على العيادة</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleConsumptionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Item selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اختر الصنف المادي <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">-- اختر مادة --</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clinic Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  العيادة المستهلكة <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">-- اختر العيادة --</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      عيادة {c.number} - {c.doctor_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Available Batches Radio/List */}
            {selectedItemId && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  الدفعات المتوفرة لهذه المادة (رصيد &gt; 0) <span className="text-red-400">*</span>
                </label>

                {loadingBatches ? (
                  <div className="p-4 bg-slate-900/60 rounded-xl text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-purple-500 border-t-transparent" />
                    <span>جاري تحميل الدفعات المتوفرة...</span>
                  </div>
                ) : availableBatches.length === 0 ? (
                  <div className="p-4 bg-slate-900/80 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>لا توجد أي دفعات بـ رصيد متبقي لهذه المادة! يرجى إضافة دفعة جديدة أولاً من تبويب "استلام مواد".</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                    {availableBatches.map((b) => {
                      const isSelected = b.id === selectedBatchId;
                      const sourceName = b.source_type === 'rep' ? `مندوب: ${b.reps?.name || ''}` : 'شراء كاش';
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBatchId(b.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500/50'
                              : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white">{sourceName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{b.purchase_date}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1">
                            <span className="text-slate-400">سعر القطعة:</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {Number(b.unit_cost).toFixed(2)} {b.currency}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-800">
                            <span className="text-slate-300 font-bold">الرصيد المتاح بالدفعة:</span>
                            <span className="font-mono font-extrabold text-purple-300">
                              {b.remaining_units} قطعة
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quantity and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الكمية المستهلكة (بالقطع/الوحدات) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch?.remaining_units || 999999}
                  value={quantityUnits}
                  onChange={(e) => setQuantityUnits(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: 5"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-slate-100 font-mono focus:outline-none ${
                    isOverLimit
                      ? 'border-red-500 focus:border-red-500 bg-red-950/20 text-red-200'
                      : 'border-slate-700 focus:border-purple-500'
                  }`}
                  required
                />

                {isOverLimit && (
                  <p className="text-[10px] text-red-400 mt-1 font-bold">
                    ⚠️ عذراً، الكمية المدخلة أكبر من الرصيد المتاح بالدفعة المختارة ({selectedBatch?.remaining_units}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الاستهلاك</label>
                <input
                  type="date"
                  value={consumptionDate}
                  onChange={(e) => setConsumptionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات / بيان (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: أُستخدمت لجلسة مريض معين..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Live Cost calculation summary */}
            {selectedBatch && qty > 0 && !isOverLimit && (
              <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">التكلفة المسجلة كمصروف على العيادة:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {(qty * Number(selectedBatch.unit_cost)).toLocaleString()} {selectedBatch.currency}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isInvalidQty || !selectedBatchId}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  <span>تأكيد وتسجيل الاستهلاك</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Consumptions History */}
        <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="font-extrabold text-sm text-white">سجل الاستهلاكات الأخيرة</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {recentConsumptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">لا توجد عمليات استهلاك مسجلة.</div>
            ) : (
              recentConsumptions.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-900/80 border border-slate-700/70 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span>{c.material_batches?.inventory_items?.name || 'مادة'}</span>
                    <span className="font-mono text-[10px] text-slate-400">{c.date}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>عيادة: {c.clinics?.doctor_name || `عيادة ${c.clinics?.number}`}</span>
                    <span className="font-mono font-bold text-purple-300">{c.quantity_units} قطعة</span>
                  </div>

                  {c.notes && (
                    <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                      "{c.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
