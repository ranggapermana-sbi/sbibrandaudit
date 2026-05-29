import { ArrowLeft, ChevronDown } from 'lucide-react';

export default function Step1Screen({ onNext }: { onNext: () => void }) {
    return (
        <div className="min-h-screen bg-transparent">
            <header className="fixed top-0 w-full bg-white/70 backdrop-blur-md border-b flex items-center p-4 gap-4 z-50">
                <button className="p-2 hover:bg-gray-100 rounded-full"><div className="w-8 h-8 rounded-full bg-gray-200"></div></button>
                <img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-10" />
            </header>
            <main className="max-w-2xl mx-auto pt-20 p-4">
                <div className="mb-8">
                    <p className="text-blue-600 font-semibold text-sm">Step 1 of 5</p>
                    <h2 className="text-2xl font-bold">Hotel Details</h2>
                    <div className="w-full bg-gray-200 h-2 mt-4 rounded-full"><div className="w-1/5 bg-blue-600 h-full rounded-full"></div></div>
                </div>
                
                <div className="bg-white border p-6 rounded-xl space-y-6">
                    <h2 className="text-xl font-bold">Hotel Identification</h2>
                    
                    <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-2">Batch *</label>
                        <select className="w-full p-3 rounded-lg border border-gray-300">
                            <option>Select Audit Batch</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-2">Full Hotel Name *</label>
                        <select className="w-full p-3 rounded-lg border border-gray-300">
                            <option>Select Property</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-2">4-Letter Hotel Code *</label>
                        <input className="w-full p-3 rounded-lg border border-gray-300" placeholder="e.g., GBDA" />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-2">Country *</label>
                        <select className="w-full p-3 rounded-lg border border-gray-300">
                            <option>Select Country</option>
                        </select>
                    </div>

                    <h3 className="text-lg font-bold">Point of Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input className="p-4 rounded-xl border border-slate-200 w-full" placeholder="First Name" />
                        <input className="p-4 rounded-xl border border-slate-200 w-full" placeholder="Last Name" />
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-white/70 backdrop-blur-md border-t flex justify-end pb-safe z-50">
                    <button onClick={onNext} className="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold w-full sm:w-auto">Next</button>
                </div>
            </main>
        </div>
    );
}
