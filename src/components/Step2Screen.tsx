export default function Step2Screen() {
    return (
        <div className="min-h-screen bg-white">
            <header className="fixed top-0 w-full bg-white border-b p-4 text-center font-bold flex justify-center"><img src="https://i.ibb.co.com/WNB70XBz/sbi-logo.png" alt="Swiss-Belhotel Logo" className="h-10" /></header>
            <main className="max-w-2xl mx-auto pt-20 p-4 space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                        <p className="font-semibold">Checklist Item {i}</p>
                        <div className="flex gap-2">
                            <button className="flex-1 bg-slate-100 py-3 rounded-full text-sm font-bold active:bg-indigo-600 active:text-white">Pass</button>
                            <button className="flex-1 bg-slate-100 py-3 rounded-full text-sm font-bold active:bg-indigo-600 active:text-white">Fail</button>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
