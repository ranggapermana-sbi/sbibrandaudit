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
        <div className="min-h-screen pt-20 pb-8 bg-transparent">
            <header className="fixed top-0 z-40 w-full flex items-center px-4 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <ChevronRight className="rotate-180" />
                </button>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight ml-4">Self-Audit Pending Tasks</h1>
            </header>
            <main className="max-w-2xl mx-auto p-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Self-Audit Progress</h2>
                    <p className="text-4xl font-bold text-slate-900 mt-2">
                        {totalCompleted} <span className="text-base text-slate-400 font-normal">/ {totalTasks} tasks completed</span>
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                        Syncing categories and checklist counters...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-slate-200">
                        No audit categories found in the database.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {categories.map((category) => {
                            const catProgress = category.total > 0 ? (category.completed / category.total) * 100 : 0;
                            return (
                                <div 
                                    key={category.id} 
                                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer group"
                                    onClick={() => onNavigate('brandingPropertyIdentification', category)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-2.5 min-w-0 pr-4">
                                            <FolderOpen size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                            <span className="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                                {category.name}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                                            {category.completed}/{category.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
