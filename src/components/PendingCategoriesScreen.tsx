import { ChevronRight, Menu } from 'lucide-react';

const categories = [
    { name: "I. BRANDING & PROPERTY IDENTIFICATION", total: 5, completed: 2 },
    { name: "II. BRANDING AT RECEPTION / FRONT OFFICE", total: 4, completed: 0 },
    { name: "III. BRANDING IN GUEST ROOM", total: 6, completed: 1 },
    { name: "SWISS-CARE AMENITIES", total: 3, completed: 3 },
    { name: "IV. BRANDING IN FOOD & BEVERAGE AND BANQUET", total: 8, completed: 0 },
    { name: "V. SALES & MARKETING - PHYSICAL", total: 4, completed: 2 },
    { name: "VI. SALES & MARKETING - DIGITAL", total: 5, completed: 0 },
    { name: "VII. BRANDING AT PUBLIC AREAS", total: 6, completed: 4 },
    { name: "VIII. BRANDING AT BACK OFFICE & STAFF", total: 3, completed: 0 },
    { name: "IX. BONUS", total: 2, completed: 0 },
];

export default function PendingCategoriesScreen({ onBack, onNavigate }: { onBack: () => void, onNavigate: (screen: 'brandingPropertyIdentification') => void }) {
    const totalTasks = categories.reduce((sum, c) => sum + c.total, 0);
    const totalCompleted = categories.reduce((sum, c) => sum + c.completed, 0);
    const progress = (totalCompleted / totalTasks) * 100;

    return (
        <div className="min-h-screen pt-20 pb-8 bg-transparent">
            <header className="fixed top-0 z-40 w-full flex items-center px-4 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight className="rotate-180" /></button>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight ml-4">Pending Tasks</h1>
            </header>
            <main className="max-w-2xl mx-auto p-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Overall Progress</h2>
                    <p className="text-4xl font-bold text-slate-900 mt-2">
                        {totalCompleted} <span className="text-base text-slate-400 font-normal">/ {totalTasks} tasks</span>
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="space-y-3">
                    {categories.map((category, index) => {
                        const catProgress = (category.completed / category.total) * 100;
                        return (
                            <div 
                                key={index} 
                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer"
                                onClick={() => index === 0 && onNavigate('brandingPropertyIdentification')}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-bold text-slate-800">{category.name}</span>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                        {category.completed}/{category.total}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${catProgress}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
