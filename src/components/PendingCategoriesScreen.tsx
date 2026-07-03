import React, { useState, useEffect } from 'react';
import { ChevronRight, FolderOpen, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingCategoriesProps {
  onBack: () => void;
  onNavigate: (screen: 'brandingPropertyIdentification', category: any) => void;
}

export default function PendingCategoriesScreen({ onBack, onNavigate }: PendingCategoriesProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategoriesAndItems = async () => {
        setIsLoading(true);
        try {
            // Fetch categories
            const { data: catsData, error: catsError } = await supabase
                .from('audit_categories')
                .select('*')
                .order('sort_order', { ascending: true });
            if (catsError) throw catsError;

            // Fetch items
            const { data: itemsData, error: itemsError } = await supabase
                .from('audit_items')
                .select('category_id, filled_by_hotel');
            if (itemsError) throw itemsError;

            // Group and map them dynamically
            const mapped = (catsData || []).map((cat: any) => {
                const catItems = (itemsData || []).filter((item: any) => 
                    item.category_id === cat.id && 
                    item.filled_by_hotel !== false && item.filled_by_hotel !== 'false'
                );
                
                // Retrieve completed count from localStorage mock-progress
                const completedKey = `sbi_cat_completed_${cat.id}`;
                const completedCount = Number(localStorage.getItem(completedKey) || '0');
                
                return {
                    id: cat.id,
                    name: cat.name,
                    total: catItems.length,
                    completed: Math.min(completedCount, catItems.length)
                };
            });

            setCategories(mapped);
        } catch (err) {
            console.error("Error syncing pending categories with DB:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoriesAndItems();
    }, []);

    const totalTasks = categories.reduce((sum, c) => sum + c.total, 0);
    const totalCompleted = categories.reduce((sum, c) => sum + c.completed, 0);
    const progress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

    return (
        <div className="min-h-screen pt-16 sm:pt-20 pb-8 bg-slate-50/50 px-2 sm:px-4">
            <header className="fixed top-0 left-0 z-40 w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
                <button onClick={onBack} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <ChevronRight className="rotate-180" size={20} />
                </button>
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight ml-2.5 sm:ml-4">Self-Audit Pending Tasks</h1>
            </header>
            <main className="max-w-4xl mx-auto py-3 sm:py-5 px-1 sm:px-3">
                <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm mb-4 sm:mb-6">
                    <h2 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Self-Audit Progress</h2>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900 mt-1 sm:mt-2">
                        {totalCompleted} <span className="text-xs sm:text-base text-slate-400 font-normal">/ {totalTasks} tasks completed</span>
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 mt-3 sm:mt-4 overflow-hidden">
                        <div className="bg-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center gap-2 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                        Syncing categories and checklist counters...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs sm:text-sm bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                        No audit categories found in the database.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                        {categories.map((category) => {
                            const catProgress = category.total > 0 ? (category.completed / category.total) * 100 : 0;
                            return (
                                <div 
                                    key={category.id} 
                                    className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group active:scale-[0.99] flex flex-col justify-between"
                                    onClick={() => onNavigate('brandingPropertyIdentification', category)}
                                >
                                    <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                        <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 pr-2">
                                            <FolderOpen size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                            <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                {category.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 sm:py-1 rounded-md whitespace-nowrap">
                                            {category.completed}/{category.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                                        <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${catProgress}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
