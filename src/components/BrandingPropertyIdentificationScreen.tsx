import React, { useState, useEffect } from 'react';
import { ChevronRight, Camera, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BrandingPropertyProps {
  selectedCategory: any;
  onBack: () => void;
}

export default function BrandingPropertyIdentificationScreen({ selectedCategory, onBack }: BrandingPropertyProps) {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!selectedCategory?.id) {
            setIsLoading(false);
            return;
        }

        const fetchCategoryItems = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('audit_items')
                    .select('*')
                    .eq('category_id', selectedCategory.id);
                
                if (error) throw error;
                
                // Sort by sort_order first, then name
                const sorted = (data || []).sort((a: any, b: any) => {
                    if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
                        return Number(a.sort_order) - Number(b.sort_order);
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                
                setItems(sorted);
                
                // Retrieve uploaded photos status from localStorage mock
                const stored = localStorage.getItem(`sbi_photos_${selectedCategory.id}`);
                if (stored) {
                    setUploadedPhotos(JSON.parse(stored));
                }
            } catch (err) {
                console.error("Error fetching category items:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategoryItems();
    }, [selectedCategory]);

    const handleUploadPhoto = (itemId: string) => {
        // Mock photo URLs for a beautiful aesthetic feel
        const mockPhotos = [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80'
        ];
        
        // Pick one randomly
        const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
        
        const updated = {
            ...uploadedPhotos,
            [itemId]: randomPhoto
        };
        setUploadedPhotos(updated);
        localStorage.setItem(`sbi_photos_${selectedCategory?.id}`, JSON.stringify(updated));

        // Save progress to localStorage (update completed count)
        const completedCount = Object.keys(updated).length;
        localStorage.setItem(`sbi_cat_completed_${selectedCategory?.id}`, String(completedCount));
    };

    const handleClearPhoto = (itemId: string) => {
        const updated = { ...uploadedPhotos };
        delete updated[itemId];
        setUploadedPhotos(updated);
        localStorage.setItem(`sbi_photos_${selectedCategory?.id}`, JSON.stringify(updated));

        const completedCount = Object.keys(updated).length;
        localStorage.setItem(`sbi_cat_completed_${selectedCategory?.id}`, String(completedCount));
    };

    return (
        <div className="min-h-screen pt-20 pb-8 bg-transparent">
            <header className="fixed top-0 z-40 w-full flex items-center px-4 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <ChevronRight className="rotate-180" />
                </button>
                <div className="ml-4 min-w-0">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        {selectedCategory?.name || 'Self-Audit Items'}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Upload brand evidence photo
                    </p>
                </div>
            </header>
            
            <main className="max-w-2xl mx-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                        Syncing items for this category...
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-slate-200">
                        No active checklist items configured for this category in the database.
                    </div>
                ) : (
                    items.map((item) => {
                        const hasPhoto = !!uploadedPhotos[item.id];
                        const photoUrl = uploadedPhotos[item.id];
                        
                        return (
                            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300">
                                <div className="space-y-1.5 min-w-0 flex-1">
                                    <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                        {item.points || 0} PTS
                                    </span>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed pr-2">
                                        {item.name}
                                    </p>
                                    {hasPhoto && (
                                        <div className="relative inline-block mt-3 group">
                                            <img 
                                                src={photoUrl} 
                                                alt="Evidence screenshot preview" 
                                                className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                <button 
                                                    onClick={() => handleClearPhoto(item.id)}
                                                    className="text-white text-[10px] font-bold bg-red-600/80 px-2 py-1 rounded hover:bg-red-600 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                                    {hasPhoto ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 flex items-center gap-1">
                                                <CheckCircle2 size={13} />
                                                Uploaded
                                            </span>
                                            <button 
                                                onClick={() => handleUploadPhoto(item.id)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all"
                                                title="Upload replacement photo"
                                            >
                                                <Camera size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleUploadPhoto(item.id)}
                                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/10 flex items-center gap-1.5"
                                        >
                                            <Camera size={14} />
                                            Attach Photo
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}
