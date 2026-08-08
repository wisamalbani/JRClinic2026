import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ExpenseCategory, ExchangeRate } from '../types';
import { Tag, DollarSign, Plus, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { saveTodayExchangeRate, getTodayExchangeRate } from '../services/exchangeRate';

export const ExpenseCategoriesManager: React.FC = () => {
  const { user, profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // Today Exchange Rate State
  const [todayRate, setTodayRate] = useState<string>('');
  const [rateSource, setRateSource] = useState<string>('إدخال يدوي');
  const [rateMsg, setRateMsg] = useState<string | null>(null);

  const fetchSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData } = await supabase
        .from('expense_categories')
        .select('*')
        .order('created_at', { ascending: false });
      if (catData) setCategories(catData);

      // 2. Fetch exchange rates
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);
      if (rateData) setRates(rateData);

      // 3. Get today's rate
      const currentRateObj = await getTodayExchangeRate();
      if (currentRateObj.rate) {
        setTodayRate(String(currentRateObj.rate));
        setRateSource(currentRateObj.source);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  // Handle Category Add
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    if (!newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name: newCategoryName.trim(), is_active: true })
        .select()
        .single();

      if (error) {
        setCatError(`خطأ في الإضافة: ${error.message}`);
      } else if (data) {
        setCategories((prev) => [data, ...prev]);
        setNewCategoryName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Today Rate
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateMsg(null);

    const numRate = Number(todayRate);
    if (!numRate || numRate <= 0) {
      setRateMsg('يرجى إدخال سعر صرف صحيح.');
      return;
    }

    const success = await saveTodayExchangeRate(numRate, user?.id, rateSource);
    if (success) {
      setRateMsg('تم حفظ سعر الصرف لتاريخ اليوم بنجاح!');
      fetchSettingsData();
      setTimeout(() => setRateMsg(null), 3000);
    } else {
      setRateMsg('حدث خطأ أثناء حفظ سعر الصرف.');
    }
  };

  return (
    <div className="space-y-8 dir-rtl font-sans">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">تصنيفات المصاريف وأسعار الصرف</h2>
          <p className="text-xs text-slate-400">إدارة البنود المرجعية وسعر صرف الليرة السورية مقابل العملات</p>
        </div>
        <button
          onClick={fetchSettingsData}
          className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Expense Categories Section */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              تصنيفات المصاريف (Expense Categories)
            </h3>
            <span className="text-xs text-slate-400">{categories.length} بند</span>
          </div>

          {/* Add Form (Owner Only) */}
          {isOwner ? (
            <form onSubmit={handleAddCategory} className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">إضافة تصنيف مصروف جديد</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="مثال: صيانة مصعد، مواد تعقيم..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
              {catError && <p className="text-xs text-red-400 mt-1">{catError}</p>}
            </form>
          ) : (
            <p className="text-xs text-slate-400 italic">إضافة تصنيف جديد مخصصة لدور المالك (Owner) فقط.</p>
          )}

          {/* List */}
          <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-slate-200">{cat.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  نشط
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Today's Exchange Rate Section */}
        <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              سعر الصرف لليوم (USD / SYP)
            </h3>
            <span className="text-xs text-slate-400">{new Date().toISOString().split('T')[0]}</span>
          </div>

          <form onSubmit={handleSaveRate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">سعر صرف الليرة مقابل الدولار *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={todayRate}
                  onChange={(e) => setTodayRate(e.target.value)}
                  placeholder="مثال: 15000"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-500 text-left"
                  dir="ltr"
                />
                <DollarSign className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">مصدر السعر</label>
              <input
                type="text"
                value={rateSource}
                onChange={(e) => setRateSource(e.target.value)}
                placeholder="النشرة الرسمية، sp-today..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>حفظ سعر الصرف لليوم</span>
            </button>

            {rateMsg && (
              <p
                className={`text-xs p-2.5 rounded-xl flex items-center gap-1.5 ${
                  rateMsg.includes('بنجاح')
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rateMsg}</span>
              </p>
            )}
          </form>

          {/* Recent Rates History */}
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-400 block mb-2">سجل أسعار الصرف الأخيرة:</span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {rates.map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="text-slate-400 font-mono">{r.date}</span>
                  <span className="font-mono font-bold text-amber-300">{r.rate} SYP</span>
                  <span className="text-[10px] text-slate-500">{r.source || 'يدوي'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
