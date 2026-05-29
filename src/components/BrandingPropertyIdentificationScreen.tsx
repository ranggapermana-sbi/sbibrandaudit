import { ChevronRight } from 'lucide-react';

const tasks = [
    "Entrance Signage - Day Shot",
    "Entrance Signage - Night Shot",
    "Rooftop Signage - Day Shot",
    "Rooftop Signage - Night Shot",
    "Flag"
];

export default function BrandingPropertyIdentificationScreen({ onBack }: { onBack: () => void }) {
    return (
        <div className="min-h-screen pt-20 pb-8">
            <header className="fixed top-0 z-40 w-full flex items-center px-4 py-3 bg-white border-b border-slate-200">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight className="rotate-180" /></button>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight ml-4">Branding & Property</h1>
            </header>
            <main className="max-w-2xl mx-auto p-4 space-y-3">
                {tasks.map((task, index) => (
                    <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{task}</span>
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold">Photo</button>
                    </div>
                ))}
            </main>
        </div>
    );
}
