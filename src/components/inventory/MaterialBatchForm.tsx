import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { InventoryItem, Rep, MaterialBatch } from '../../types';
import { FilePlus, AlertCircle, CheckCircle2, DollarSign, Calendar, Truck, Coins, Layers } from 'lucide-react';

export const MaterialBatchForm: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form Fields
  const [selectedItemId, setSelectedItemId] = useState('');
  const [sourceType, setSourceType] = useState<'rep' | 'cash'>('rep');
  const [repId, setRepId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [packageQty, setPackageQty] = useState<number | ''>(1);
  const [unitPricePerPackage, setUnitPricePerPackage] = useState<number | ''>('');
  const [currency, setCurrency] = useState<'SYP' | 'USD'>('SYP');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recent Batches List
  const [recentBatches, setRecentBatches] = useState<MaterialBatch[]>([]);

  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const { data: itemData } = await supabase.from('inventory_items').select('*').order('name', { ascending: true });
      if (itemData) setItems(itemData);

      const { data: repData } = await supabase.from('reps').select('*').eq('is_active', true).order('name', { ascending: true });
      if (repData) setReps(repData);

      const { data: batchData } = await supabase
        .from('material_batches')
        .select('*, inventory_items(*), reps(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (batchData) setRecentBatches(batchData as any);
    } catch (err) {
      console.error('Error loading batch form lookups:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Calculations
  const qty = Number(packageQty) || 0;
  const price = Number(unitPricePerPackage) || 0;
  const unitsPerPkg = selectedItem ? selectedItem.units_per_package : 1;
  const totalUnits = qty * unitsPerPkg;
  const unitCost = unitsPerPkg > 0 ? price / unitsPerPkg : 0;
  const totalPrice = qty * price;

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedItemId) {
      setErrorMsg('يرجى اختيار الصنف المادي.');
      return;
    }

    if (sourceType === 'rep' && !repId) {
      setErrorMsg('يرجى اختيار المندوب المورد للدفعة.');
      return;
    }

    if (qty <= 0 || isNaN(qty)) {
      setErrorMsg('كمية العلب يجب أن تكون أكبر من 0.');
      return;
    }

    if (price < 0 || isNaN(price)) {
      setErrorMsg('سعر العلبة يجب ألا يكون سالباً.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        item_id: selectedItemId,
        source_type: sourceType,
        rep_id: sourceType === 'rep' ? repId : null,
        purchase_date: purchaseDate,
        package_qty: qty,
        unit_price_per_package: price,
        currency: currency,
        unit_cost: unitCost,
        remaining_units: totalUnits,
      };

      const { error } = await supabase.from('material_batches').insert([payload]);

      if (error) throw error;

      setSuccessMsg(`تم تسليم دفعة "${selectedItem?.name}" بنجاح بإجمالي ${totalUnits} وحدة.`);
      setSelectedItemId('');
      setRepId('');
      setPackageQty(1);
      setUnitPricePerPackage('');
      fetchLookups();
    } catch (err: any) {
      console.error('Error saving material batch:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تسليم الشحنة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Creation Form */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">فاتورة استلام مواد / شراء دفعة مستلزمات</h3>
              <p className="text-xs text-slate-400">سجل الدفعات الواردة من المندوبين أو الشراء النظير كاش</p>
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

          <form onSubmit={handleSubmitBatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Item Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الصنف المادي / المادة <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- اختر الصنف --</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.units_per_package} قطعة/علبة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">مصدر الشراء / التوريد</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('rep');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      sourceType === 'rep'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>عن طريق مندوب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('cash');
                      setRepId('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      sourceType === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>شراء مباشر (كاش)</span>
                  </button>
                </div>
              </div>

              {/* Rep Selection if Rep */}
              {sourceType === 'rep' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    المندوب المورد <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={repId}
                    onChange={(e) => setRepId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">-- اختر المندوب --</option>
                    {reps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} {rep.phone ? `(${rep.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Purchase Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الشراء / الاستلام</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              {/* Package Qty */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عدد العلب المسلمة <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packageQty}
                  onChange={(e) => setPackageQty(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              {/* Unit Price per package */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  سعر العلبة الواحدة <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unitPricePerPackage}
                    onChange={(e) => setUnitPricePerPackage(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'SYP' | 'USD')}
                    className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="SYP">ل.س</option>
                    <option value="USD">$</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Calculations Preview Card */}
            {selectedItem && (
              <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">سعة العلبة الواحدة</span>
                  <strong className="text-slate-200 font-mono">{unitsPerPkg} وحدة</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">إجمالي عدد الوحدات</span>
                  <strong className="text-blue-400 font-mono">{totalUnits} قطعة/أمبولة</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">التكلفة الفردية للقطعة</span>
                  <strong className="text-emerald-400 font-mono">
                    {unitCost.toFixed(2)} {currency}
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-bold">إجمالي الفاتورة / المستحق:</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {totalPrice.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loadingLookups}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FilePlus className="w-4 h-4" />
                  <span>تسجيل استلام الدفعة</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Batches List */}
        <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
            <Layers className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-sm text-white">آخر الدفعات المستلمة</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {recentBatches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">لا توجد دفعات مستلمة مؤخراً.</div>
            ) : (
              recentBatches.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-900/80 border border-slate-700/70 rounded-xl space-y-1.5 text-xs hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span>{b.inventory_items?.name || 'مادة'}</span>
                    <span className="font-mono text-[10px] text-slate-400">{b.purchase_date}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>المصدر: {b.source_type === 'rep' ? b.reps?.name || 'مندوب' : 'شراء كاش'}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      العلب: {b.package_qty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>الرصيد المتبقي:</span>
                    <span className="font-mono font-extrabold text-blue-300">
                      {b.remaining_units} قطعة
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
