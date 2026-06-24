import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, CheckCircle, Clock, Save, FileCheck, 
    ArrowRight, Camera, Image as ImageIcon, Check, AlertCircle, FileText, 
    Info, Loader2, Sparkles, Send, RefreshCw, X, HelpCircle, Eye, Building, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingCategoriesProps {
    userProfile: any;
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

interface Assessment {
    status: 'pass' | 'fail' | 'na' | null;
    remarks: string;
    photoUrl?: string;
    photoName?: string;
}

export default function PendingCategoriesScreen({ userProfile, onBack, onNavigate }: PendingCategoriesProps) {
    const [departments, setDepartments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('');
    
    // Core assessment states
    const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);
    
    // Details panel toggle per item ID
    const [expandedItemDetails, setExpandedItemDetails] = useState<Record<string, boolean>>({});

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [completedSubmission, setCompletedSubmission] = useState<any>(null);

    // Fetch dynamic audit data from Supabase
    useEffect(() => {
        const loadAuditData = async () => {
            setIsLoading(true);
            try {
                // Fetch departments, categories, items, and batches from Supabase
                const [deptsRes, catsRes, itemsRes, batchesRes] = await Promise.all([
                    supabase.from('audit_departments').select('*').order('name', { ascending: true }),
                    supabase.from('audit_categories').select('*').order('name', { ascending: true }),
                    supabase.from('audit_items').select('*'),
                    supabase.from('audit_batches').select('*').order('name', { ascending: true })
                ]);

                if (deptsRes.error) throw deptsRes.error;
                if (catsRes.error) throw catsRes.error;
                if (itemsRes.error) throw itemsRes.error;
                if (batchesRes.error) throw batchesRes.error;

                setDepartments(deptsRes.data || []);
                setCategories(catsRes.data || []);
                
                // Sort items by sort_order or name
                const sortedItems = (itemsRes.data || []).sort((a: any, b: any) => {
                    if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
                        return Number(a.sort_order) - Number(b.sort_order);
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                setItems(sortedItems);
                
                const loadedBatches = batchesRes.data || [];
                setBatches(loadedBatches);

                if (loadedBatches.length > 0) {
                    setSelectedBatchId(loadedBatches[0].id);
                }

                // Default active category
                if (catsRes.data && catsRes.data.length > 0) {
                    setActiveCategoryId(catsRes.data[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch database checklist metadata:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadAuditData();
    }, []);

    // Load active draft when batch selection changes
    useEffect(() => {
        if (selectedBatchId && userProfile?.id) {
            const draftKey = `sbi_audit_draft_${userProfile.id}_${selectedBatchId}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                try {
                    setAssessments(JSON.parse(savedDraft));
                } catch (e) {
                    console.error("Error parsing audit draft", e);
                    setAssessments({});
                }
            } else {
                setAssessments({});
            }
        }
    }, [selectedBatchId, userProfile?.id]);

    // Handle single assessment updates
    const updateAssessment = (itemId: string, field: keyof Assessment, value: any) => {
        setAssessments(prev => {
            const current = prev[itemId] || { status: null, remarks: '' };
            const updated = {
                ...current,
                [field]: value
            };
            const next = {
                ...prev,
                [itemId]: updated
            };
            
            // Auto save draft to local storage
            saveDraft(next);
            return next;
        });
    };

    // Save draft routine
    const saveDraft = (currentAssessments = assessments) => {
        if (!selectedBatchId || !userProfile?.id) return;
        
        const draftKey = `sbi_audit_draft_${userProfile.id}_${selectedBatchId}`;
        localStorage.setItem(draftKey, JSON.stringify(currentAssessments));

        // Save progress to global draft metadata list for Dashboard counters
        const draftsKey = `sbi_all_drafts_${userProfile.id}`;
        const allDrafts = JSON.parse(localStorage.getItem(draftsKey) || '{}');
        
        const totalCount = items.length;
        const assessedCount = Object.keys(currentAssessments).filter(id => currentAssessments[id].status !== null).length;

        allDrafts[selectedBatchId] = {
            batchId: selectedBatchId,
            batchName: batches.find(b => b.id === selectedBatchId)?.name || 'Audit Session',
            updatedAt: new Date().toISOString(),
            progress: totalCount ? Math.round((assessedCount / totalCount) * 100) : 0,
            assessed: assessedCount,
            total: totalCount
        };
        localStorage.setItem(draftsKey, JSON.stringify(allDrafts));
    };

    // Trigger explicit manual save toast feedback
    const handleManualSave = () => {
        setIsSaving(true);
        saveDraft();
        setTimeout(() => {
            setIsSaving(false);
            setShowSaveToast(true);
            setTimeout(() => setShowSaveToast(false), 3000);
        }, 600);
    };

    // File input change handler - Converts file to Base64 data url for storage and display
    const handlePhotoFileChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit size to ~5MB for Base64 storage
        if (file.size > 5 * 1024 * 1024) {
            alert("This image is too large. Please upload an evidence photo smaller than 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            updateAssessment(itemId, 'photoUrl', base64String);
            updateAssessment(itemId, 'photoName', file.name);
        };
        reader.readAsDataURL(file);
    };

    // Submit finished report
    const handleSubmitInspection = () => {
        if (!selectedBatchId) return;

        setIsSubmitting(true);

        const assessedItemsList = items.filter(i => assessments[i.id] && assessments[i.id].status !== null);
        const passedItemsList = assessedItemsList.filter(i => assessments[i.id]?.status === 'pass');
        const failedItemsList = assessedItemsList.filter(i => assessments[i.id]?.status === 'fail');

        const score = passedItemsList.reduce((sum, item) => sum + (item.points || 0), 0);
        const maxScore = items.reduce((sum, item) => sum + (item.points || 0), 0);
        const passRate = maxScore ? Math.round((score / maxScore) * 100) : 0;

        const submissionId = `sub_${Date.now()}`;
        const newSubmission = {
            id: submissionId,
            user_id: userProfile?.id,
            user_name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
            hotel_id: userProfile?.hotel_id,
            hotel_name: userProfile?.hotel_name || 'Swiss-Belhotel Property',
            hotel_code: userProfile?.hotel_code,
            batch_id: selectedBatchId,
            batch_name: batches.find(b => b.id === selectedBatchId)?.name || 'Standard Batch',
            submitted_at: new Date().toISOString(),
            assessmentsCount: assessedItemsList.length,
            passedCount: passedItemsList.length,
            failedCount: failedItemsList.length,
            score: score,
            max_score: maxScore,
            pass_rate: passRate,
            status: 'Submitted'
        };

        // Write to submission list in localStorage
        const submissionsKey = `sbi_submissions_${userProfile?.id || 'all'}`;
        const savedSubs = JSON.parse(localStorage.getItem(submissionsKey) || '[]');
        savedSubs.unshift(newSubmission);
        localStorage.setItem(submissionsKey, JSON.stringify(savedSubs));

        // Clear local draft references for clean state
        localStorage.removeItem(`sbi_audit_draft_${userProfile?.id}_${selectedBatchId}`);
        const draftsKey = `sbi_all_drafts_${userProfile?.id}`;
        const allDrafts = JSON.parse(localStorage.getItem(draftsKey) || '{}');
        delete allDrafts[selectedBatchId];
        localStorage.setItem(draftsKey, JSON.stringify(allDrafts));

        setTimeout(() => {
            setCompletedSubmission(newSubmission);
            setIsSuccessOpen(true);
            setIsSubmitting(false);
        }, 1200);
    };

    // Calculations
    const totalTasks = items.length;
    const totalCompleted = items.filter(item => assessments[item.id]?.status !== undefined && assessments[item.id]?.status !== null).length;
    const progressPercent = totalTasks ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    const passedCount = items.filter(item => assessments[item.id]?.status === 'pass').length;
    const failedCount = items.filter(item => assessments[item.id]?.status === 'fail').length;
    const naCount = items.filter(item => assessments[item.id]?.status === 'na').length;

    const currentScore = items.reduce((sum, item) => {
        const status = assessments[item.id]?.status;
        return status === 'pass' ? sum + (item.points || 0) : sum;
    }, 0);
    const maxPotentialScore = items.reduce((sum, item) => sum + (item.points || 0), 0);

    // Filter categories and items
    const activeCategory = categories.find(c => c.id === activeCategoryId);
    const activeCategoryItems = items.filter(item => item.category_id === activeCategoryId);
    const activeCategoryCompleted = activeCategoryItems.filter(item => assessments[item.id]?.status !== undefined && assessments[item.id]?.status !== null).length;

    return (
        <div className="min-h-screen pt-20 pb-28 bg-slate-50/50">
            {/* Header */}
            <header className="fixed top-0 z-40 w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200">
                <div className="flex items-center">
                    <button 
                        onClick={onBack} 
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors mr-2 outline-none"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Active Audit Checklist</h1>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{userProfile?.hotel_name || 'Swiss-Belhotel'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Batch Selection */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
                        <span className="text-[9px] uppercase text-slate-400">Batch:</span>
                        <select 
                            value={selectedBatchId} 
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="bg-transparent outline-none cursor-pointer pr-1"
                        >
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                            {batches.length === 0 && <option value="">Default Batch</option>}
                        </select>
                    </div>

                    <button 
                        onClick={handleManualSave}
                        disabled={isSaving}
                        className="p-2 sm:px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        title="Save Draft"
                    >
                        <Save size={15} />
                        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Draft'}</span>
                    </button>
                </div>
            </header>

            {/* Save Draft Toast Notification */}
            {showSaveToast && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
                    <CheckCircle size={16} />
                    Draft Progress Synchronized Safely!
                </div>
            )}

            {isLoading ? (
                <div className="max-w-4xl mx-auto p-4 py-16 text-center text-slate-400 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    Connecting with Database Checklist...
                </div>
            ) : (
                <main className="max-w-5xl mx-auto p-4">
                    {/* Scorecard Summary Section */}
                    <section className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 sm:p-8 rounded-[32px] text-white shadow-xl mb-6 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-550/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 w-64 h-64 bg-emerald-550/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            {/* Column 1: Progress */}
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Self-Inspection Progress</h3>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-4xl font-extrabold tracking-tight">{totalCompleted}</p>
                                    <p className="text-sm text-slate-400">/ {totalTasks} standards assessed</p>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{progressPercent}% complete</p>
                            </div>

                            {/* Column 2: Pass/Fail counts */}
                            <div className="flex justify-around bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Passed</p>
                                    <p className="text-2xl font-extrabold text-emerald-400 mt-1">{passedCount}</p>
                                </div>
                                <div className="border-l border-white/15 h-8 self-center" />
                                <div>
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Failed</p>
                                    <p className="text-2xl font-extrabold text-red-400 mt-1">{failedCount}</p>
                                </div>
                                <div className="border-l border-white/15 h-8 self-center" />
                                <div>
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">N/A</p>
                                    <p className="text-2xl font-extrabold text-slate-350 mt-1">{naCount}</p>
                                </div>
                            </div>

                            {/* Column 3: Score & Submission */}
                            <div className="text-center md:text-right flex flex-col md:items-end justify-center">
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Current Brand Score</h3>
                                <p className="text-4xl font-extrabold text-indigo-300 mt-1.5">{currentScore} <span className="text-sm font-normal text-slate-400">/ {maxPotentialScore} PTS</span></p>
                                <button 
                                    onClick={handleSubmitInspection}
                                    disabled={totalCompleted === 0 || isSubmitting}
                                    className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-full transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 w-full md:w-auto disabled:opacity-40"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={13} />
                                            Submit Inspection
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Layout: Sidebar Categories vs Checklist Items */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sidebar: Categories Selection */}
                        <div className="space-y-3 lg:col-span-1">
                            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Checklist Categories</h2>
                            <div className="space-y-2 max-h-[60vh] lg:max-h-[80vh] overflow-y-auto pr-1">
                                {categories.map((cat) => {
                                    const catItems = items.filter(i => i.category_id === cat.id);
                                    const catAssessed = catItems.filter(i => assessments[i.id]?.status !== undefined && assessments[i.id]?.status !== null).length;
                                    const catTotal = catItems.length;
                                    const catProgress = catTotal ? Math.round((catAssessed / catTotal) * 100) : 0;
                                    const isActive = cat.id === activeCategoryId;

                                    return (
                                        <div 
                                            key={cat.id} 
                                            onClick={() => setActiveCategoryId(cat.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                                                isActive 
                                                    ? 'bg-white border-indigo-600 shadow-md ring-1 ring-indigo-600' 
                                                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`p-1 rounded-lg shrink-0 ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
                                                        <Layers size={14} />
                                                    </div>
                                                    <span className={`text-xs font-bold tracking-tight truncate ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                        {cat.name}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] shrink-0 font-extrabold px-1.5 py-0.5 rounded ${
                                                    catAssessed === catTotal && catTotal > 0
                                                        ? 'bg-emerald-50 text-emerald-700' 
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {catAssessed}/{catTotal}
                                                </span>
                                            </div>

                                            {/* Micro Progress Bar */}
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-1.5 rounded-full transition-all ${
                                                        catAssessed === catTotal && catTotal > 0 ? 'bg-emerald-500' : 'bg-indigo-600'
                                                    }`} 
                                                    style={{ width: `${catProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Content Area: Interactive Item Checklist */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{activeCategory?.name || 'Category Checklist'}</h2>
                                    <p className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                                        <span>{activeCategoryItems.length} Checklist Items</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span>{activeCategoryCompleted} assessed</span>
                                    </p>
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {activeCategoryItems.reduce((acc, i) => acc + (i.points || 0), 0)} Potential PTS
                                </span>
                            </div>

                            <div className="space-y-3">
                                {activeCategoryItems.length === 0 ? (
                                    <div className="bg-white py-12 px-4 rounded-2xl border border-slate-200 text-center text-slate-405 font-bold text-sm">
                                        No checklist standards found in this category.
                                    </div>
                                ) : (
                                    activeCategoryItems.map((item) => {
                                        const assessment = assessments[item.id] || { status: null, remarks: '', photoUrl: '', photoName: '' };
                                        const isExpanded = !!expandedItemDetails[item.id];

                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-sm ${
                                                    assessment.status === 'pass' 
                                                        ? 'border-emerald-100 bg-emerald-50/10' 
                                                        : assessment.status === 'fail' 
                                                        ? 'border-red-100 bg-red-50/10' 
                                                        : 'border-slate-200/80'
                                                }`}
                                            >
                                                {/* Checklist Row */}
                                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                                            assessment.status === 'pass' 
                                                                ? 'bg-emerald-100 text-emerald-600' 
                                                                : assessment.status === 'fail' 
                                                                ? 'bg-red-100 text-red-600' 
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            <FileText size={15} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-800 text-xs sm:text-sm leading-relaxed">
                                                                {item.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    {item.points || 0} PTS
                                                                </span>
                                                                <button 
                                                                    onClick={() => setExpandedItemDetails(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                                    className={`text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 hover:text-indigo-600 ${
                                                                        assessment.remarks || assessment.photoUrl ? 'text-indigo-600' : 'text-slate-400'
                                                                    }`}
                                                                >
                                                                    <Camera size={11} />
                                                                    {assessment.remarks || assessment.photoUrl ? 'View Evidence' : 'Add Evidence'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Assessment Pass/Fail/NA Selector Buttons */}
                                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                                        <button 
                                                            onClick={() => updateAssessment(item.id, 'status', 'pass')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1 ${
                                                                assessment.status === 'pass' 
                                                                    ? 'bg-emerald-600 text-white shadow' 
                                                                    : 'text-slate-550 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <Check size={12} />
                                                            Pass
                                                        </button>
                                                        <button 
                                                            onClick={() => updateAssessment(item.id, 'status', 'fail')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center gap-1 ${
                                                                assessment.status === 'fail' 
                                                                    ? 'bg-red-600 text-white shadow' 
                                                                    : 'text-slate-550 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <X size={12} />
                                                            Fail
                                                        </button>
                                                        <button 
                                                            onClick={() => updateAssessment(item.id, 'status', 'na')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                                                                assessment.status === 'na' 
                                                                    ? 'bg-slate-500 text-white shadow' 
                                                                    : 'text-slate-550 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            N/A
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded Remarks and Photo Upload Evidence Panel */}
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Remarks Text input */}
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                                                                    Auditee Remarks & Corrective Action
                                                                </label>
                                                                <textarea 
                                                                    value={assessment.remarks}
                                                                    onChange={(e) => updateAssessment(item.id, 'remarks', e.target.value)}
                                                                    placeholder="Describe evidence details, room number, or immediate fixes..."
                                                                    className="w-full bg-white border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl p-3 text-slate-700 text-xs outline-none transition-all resize-none h-20"
                                                                />
                                                            </div>

                                                            {/* Photo Evidence Upload */}
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                                                                    Evidence Photo Attachment
                                                                </label>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative shrink-0">
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*"
                                                                            onChange={(e) => handlePhotoFileChange(item.id, e)}
                                                                            id={`file-${item.id}`}
                                                                            className="hidden"
                                                                        />
                                                                        <label 
                                                                            htmlFor={`file-${item.id}`}
                                                                            className="w-20 h-20 bg-white hover:bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-colors relative"
                                                                        >
                                                                            {assessment.photoUrl ? (
                                                                                <img 
                                                                                    src={assessment.photoUrl} 
                                                                                    alt="Evidence" 
                                                                                    className="w-full h-full object-cover rounded-[10px]" 
                                                                                />
                                                                            ) : (
                                                                                <>
                                                                                    <Camera size={18} className="text-slate-400" />
                                                                                    <span className="text-[8px] font-extrabold uppercase text-slate-400">Capture</span>
                                                                                </>
                                                                            )}
                                                                        </label>
                                                                        {assessment.photoUrl && (
                                                                            <button 
                                                                                onClick={() => {
                                                                                    updateAssessment(item.id, 'photoUrl', '');
                                                                                    updateAssessment(item.id, 'photoName', '');
                                                                                }}
                                                                                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full hover:scale-105 shadow transition-transform"
                                                                            >
                                                                                <X size={10} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-bold text-slate-700">
                                                                            {assessment.photoName ? assessment.photoName : 'No file selected'}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                                                                            Attach real time visual capture or screenshots as compliance audit proofs. Max size 5MB.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* Submit Success / Receipt Modal */}
            {isSuccessOpen && completedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-[32px] border border-slate-100 p-6 sm:p-8 w-full max-w-[480px] shadow-2xl relative animate-slideUp text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                            <CheckCircle size={36} />
                        </div>

                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Audit Checklist Submitted!</h3>
                        <p className="text-slate-450 text-xs mt-1.5 font-medium">Your Swiss-Belhotel self-inspection scorecard has been generated.</p>

                        <div className="mt-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-3.5 text-xs font-bold text-slate-700">
                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-450 uppercase text-[10px] font-extrabold tracking-wide">Hotel Property</span>
                                <span className="text-slate-800">{completedSubmission.hotel_name} ({completedSubmission.hotel_code || 'SBH'})</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-450 uppercase text-[10px] font-extrabold tracking-wide">Audit Batch</span>
                                <span className="text-slate-800">{completedSubmission.batch_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-450 uppercase text-[10px] font-extrabold tracking-wide">Overall Score</span>
                                <span className="text-indigo-650 text-sm font-black">{completedSubmission.score} / {completedSubmission.max_score} PTS</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-450 uppercase text-[10px] font-extrabold tracking-wide">Standards Pass Rate</span>
                                <span className="text-emerald-600 font-extrabold">{completedSubmission.pass_rate}% Pass</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-slate-450 uppercase text-[10px] font-extrabold tracking-wide">Timestamp</span>
                                <span className="text-slate-500 font-medium font-mono">{new Date(completedSubmission.submitted_at).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button 
                                onClick={() => {
                                    setIsSuccessOpen(false);
                                    onBack();
                                }}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs tracking-wider transition-all uppercase shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
                            >
                                Continue to Dashboard
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
