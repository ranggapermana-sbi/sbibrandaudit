import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileUp, AlertCircle, Trash2, Loader2, FileText, Check, UploadCloud } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuditItem {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    inputType: string;
    points?: number;
    filled_by_hotel?: boolean;
    min_value?: number;
}

interface AuditorEvidenceFormProps {
    item: AuditItem;
    hotel: any;
    submission: any;
    onSaved: () => void;
    userProfile: any;
}

const IMGBB_API_KEY = '15f299b33841c0f24f364546a6d5ef3c';

// Helper to resize image
const resizeImage = (file: File, maxSizeMB: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas toBlob failed"));
                        return;
                    }
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    }));
                }, 'image/jpeg', 0.8);
            };
            img.onerror = () => reject(new Error("Image load error"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsDataURL(file);
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

const uploadToIMGBB = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            console.error("IMGBB Upload Failed:", data);
            throw new Error(data.error?.message || "Upload failed");
        }
    } catch (err) {
        console.error("IMGBB fetch error:", err);
        throw err;
    }
};

const splitEvidenceUrls = (value: string): string[] => {
    if (!value) return [];
    const urls: string[] = [];
    const parts = value.split(',');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('data:image/') && part.includes(';base64')) {
            let fullBase64 = parts[i];
            if (i + 1 < parts.length) {
                fullBase64 += ',' + parts[i + 1];
                i++;
            }
            urls.push(fullBase64.trim());
        } else if (part) {
            urls.push(part);
        }
    }
    return urls;
};

export default function AuditorEvidenceForm({ item, hotel, submission, onSaved, userProfile }: AuditorEvidenceFormProps) {
    const [value, setValue] = useState('');
    const [isNa, setIsNa] = useState(false);
    const [naReason, setNaReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Photos state for camera/image inputs
    const [photos, setPhotos] = useState<Array<{ id: string; url: string; file: File | null }>>([]);
    const [dragActive, setDragActive] = useState(false);

    // Document state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [copied, setCopied] = useState(false);

    const handleCopyLink = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error("Failed to copy:", err);
            alert("Could not copy automatically. Link: " + text.substring(0, 100) + "...");
        });
    };

    const handleDocumentDownload = (val: string) => {
        if (!val) return;
        try {
            if (val.startsWith('data:')) {
                const mimeMatch = val.match(/^data:([^;]+);/);
                let ext = '.bin';
                if (mimeMatch) {
                    const mime = mimeMatch[1];
                    if (mime.includes('pdf')) ext = '.pdf';
                    else if (mime.includes('wordprocessingml.document') || mime.includes('docx')) ext = '.docx';
                    else if (mime.includes('msword') || mime.includes('doc')) ext = '.doc';
                    else if (mime.includes('spreadsheetml.sheet') || mime.includes('xlsx')) ext = '.xlsx';
                    else if (mime.includes('ms-excel') || mime.includes('xls')) ext = '.xls';
                    else if (mime.includes('png')) ext = '.png';
                    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
                    else if (mime.includes('zip')) ext = '.zip';
                }
                
                const link = document.createElement('a');
                link.href = val;
                const cleanedName = (item.name || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
                link.download = `Evidence_${cleanedName}${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const link = document.createElement('a');
                link.href = val;
                link.target = '_blank';
                link.rel = 'noreferrer';
                if (val.startsWith('blob:')) {
                    link.download = `Evidence_${(item.name || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                }
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (e) {
            console.error("Error opening/downloading document:", e);
            window.open(val, '_blank');
        }
    };

    // Load existing submission data
    useEffect(() => {
        if (submission) {
            const val = submission.value || '';
            setValue(val);
            setIsNa(submission.is_na || false);
            setNaReason(submission.na_reason || submission.notes || submission.remark || '');
            
            if (val && (item.inputType === 'camera' || item.inputType === 'image')) {
                const urls = splitEvidenceUrls(val);
                setPhotos(urls.map((u: string, idx: number) => ({
                    id: `loaded_${idx}_${Date.now()}`,
                    url: u,
                    file: null
                })));
            } else {
                setPhotos([]);
            }
            setSelectedFile(null);
        } else {
            setValue('');
            setIsNa(false);
            setNaReason('');
            setPhotos([]);
            setSelectedFile(null);
        }
        setSaveSuccess(false);
    }, [submission, item.id]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const files = Array.from(e.dataTransfer.files) as File[];
            if (item.inputType === 'camera' || item.inputType === 'image') {
                const newPhotos = files.filter(f => f.type.startsWith('image/')).map(file => ({
                    id: `${Date.now()}_${Math.random()}`,
                    url: URL.createObjectURL(file),
                    file
                }));
                setPhotos(prev => [...prev, ...newPhotos]);
            } else if (item.inputType === 'document') {
                setSelectedFile(files[0]);
                setValue(files[0].name);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const files = Array.from(e.target.files) as File[];
            if (item.inputType === 'camera' || item.inputType === 'image') {
                const newPhotos = files.map(file => ({
                    id: `${Date.now()}_${Math.random()}`,
                    url: URL.createObjectURL(file),
                    file
                }));
                setPhotos(prev => [...prev, ...newPhotos]);
            } else if (item.inputType === 'document') {
                setSelectedFile(files[0]);
                setValue(files[0].name);
            }
        }
    };

    const handleRemovePhoto = (id: string) => {
        setPhotos(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSaveSuccess(false);

        let finalValue = value;

        if (isNa) {
            if (!naReason.trim()) {
                alert("Please provide an N/A explanation.");
                setIsSubmitting(false);
                return;
            }
            finalValue = '';
        } else {
            // Processing based on input types
            if (item.inputType === 'camera' || item.inputType === 'image') {
                if (photos.length > 0) {
                    const uploadedUrls: string[] = [];
                    for (const p of photos) {
                        if (p.file) {
                            try {
                                const resized = await resizeImage(p.file, 1);
                                const uploadedUrl = await uploadToIMGBB(resized);
                                uploadedUrls.push(uploadedUrl);
                            } catch (err) {
                                console.error("Image upload failed:", err);
                                alert("Failed to upload image. Please try again.");
                                setIsSubmitting(false);
                                return;
                            }
                        } else {
                            uploadedUrls.push(p.url);
                        }
                    }
                    finalValue = uploadedUrls.join(',');
                } else {
                    alert("Please upload at least one image.");
                    setIsSubmitting(false);
                    return;
                }
            } else if (item.inputType === 'document') {
                if (selectedFile) {
                    const fileExt = selectedFile.name.split('.').pop();
                    const fileName = `${hotel.id}_${item.id}_${Date.now()}.${fileExt}`;
                    try {
                        const { error } = await supabase.storage.from('documents').upload(fileName, selectedFile);
                        if (error) throw error;
                        
                        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
                        finalValue = urlData.publicUrl;
                    } catch (err) {
                        console.warn("Supabase storage upload failed, using Base64 fallback:", err);
                        finalValue = await fileToBase64(selectedFile);
                    }
                } else if (!finalValue) {
                    alert("Please select a document.");
                    setIsSubmitting(false);
                    return;
                }
            } else if (item.inputType === 'numeric') {
                if (!finalValue) {
                    alert("Please enter a numeric value.");
                    setIsSubmitting(false);
                    return;
                }
                if (item.min_value !== undefined && Number(finalValue) < item.min_value) {
                    // Just a warning, but let them save
                    console.log("Value is below minimum required.");
                }
            } else if (item.inputType === 'text') {
                if (!finalValue.trim()) {
                    alert("Please enter a text response.");
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        const submitterName = userProfile 
            ? `Auditor: ${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || `Auditor: ${userProfile.email}`
            : 'Auditor';

        const fullSubmissionData = {
            hotel_id: hotel.id,
            item_id: item.id,
            input_type: item.inputType,
            value: finalValue,
            is_na: isNa,
            na_reason: naReason,
            notes: naReason,
            submitted_by: submitterName,
            submitted_by_name: submitterName,
            created_at: submission?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('audit_submissions').upsert(fullSubmissionData, { onConflict: 'hotel_id,item_id' });
            if (error) {
                console.warn("Full upsert failed, attempting fallback to core schema fields:", error);
                const coreSubmissionData = {
                    hotel_id: hotel.id,
                    item_id: item.id,
                    input_type: item.inputType,
                    value: finalValue,
                    is_na: isNa,
                    na_reason: naReason,
                    created_at: submission?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                const { error: fallbackError } = await supabase.from('audit_submissions').upsert(coreSubmissionData, { onConflict: 'hotel_id,item_id' });
                if (fallbackError) {
                    throw fallbackError;
                }
            }

            // Sync with local storage
            try {
                localStorage.setItem(`sbi_audit_${hotel.id}_${item.id}`, JSON.stringify({
                    ...fullSubmissionData,
                    isSubmitted: true
                }));
            } catch (lsErr) {
                console.warn("LocalStorage save failed, string might be too large:", lsErr);
                if (finalValue && finalValue.length > 500000) {
                    try {
                        localStorage.setItem(`sbi_audit_${hotel.id}_${item.id}`, JSON.stringify({
                            ...fullSubmissionData,
                            value: 'base64_too_large_for_local_storage',
                            isSubmitted: true
                        }));
                    } catch (lsErr2) {
                        console.error("Even small localStorage save failed:", lsErr2);
                    }
                }
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            onSaved();
        } catch (err: any) {
            console.error("Failed to save submission:", err);
            alert("Error saving evidence: " + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Auditor Filled Evidence (Auditor-Only Checklist)
                </span>
                
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                    <input 
                        type="checkbox" 
                        checked={isNa} 
                        onChange={(e) => setIsNa(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    Not Available (N/A)
                </label>
            </div>

            {isNa ? (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block">Reason / Notes for N/A</label>
                    <textarea
                        value={naReason}
                        onChange={(e) => setNaReason(e.target.value)}
                        placeholder="Please specify why this item is not applicable or not available at this property..."
                        className="w-full p-2.5 bg-white border border-slate-200 focus:border-indigo-350 focus:ring-1 focus:ring-indigo-350 rounded-lg text-xs outline-none text-slate-800 placeholder:text-slate-400"
                        rows={2}
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Image / Camera upload */}
                    {(item.inputType === 'camera' || item.inputType === 'image') && (
                        <div className="space-y-3">
                            {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {photos.map(p => (
                                        <div key={p.id} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                                            <img src={p.url} alt="evidence" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(p.id)}
                                                className="absolute top-1 right-1 p-1 bg-rose-500/90 text-white rounded-full hover:bg-rose-600 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                                    dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 bg-white hover:bg-slate-50/50'
                                }`}
                            >
                                <UploadCloud size={24} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-600">Drag & drop files or <span className="text-indigo-600">Browse</span></span>
                                <span className="text-[9px] text-slate-400">Supports JPG, PNG</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}

                    {/* Document Upload */}
                    {item.inputType === 'document' && (
                        <div className="space-y-2">
                            {value && (
                                <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                                        <FileText size={16} className="text-indigo-500 shrink-0" />
                                        <span className="truncate">{selectedFile ? selectedFile.name : (value.split('/').pop() || 'Current PDF Document')}</span>
                                    </div>
                                    {!selectedFile && value && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => handleDocumentDownload(value)} 
                                                className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                            >
                                                Download / Open
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(value)}
                                                className="text-[10px] bg-slate-50 text-slate-700 px-2 py-1 rounded-md font-bold hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                                {copied ? 'Copied!' : 'Copy Link'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                                    dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 bg-white hover:bg-slate-50/50'
                                }`}
                            >
                                <FileUp size={24} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-600">Drag & drop a document or <span className="text-indigo-600">Browse</span></span>
                                <span className="text-[9px] text-slate-400">Supports PDF, Word, Excel, ZIP, Images</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}

                    {/* Numeric Input */}
                    {item.inputType === 'numeric' && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                                <label className="text-slate-500 uppercase tracking-wide">Numeric Value</label>
                                {item.min_value !== undefined && (
                                    <span className="text-indigo-600">Minimum: {item.min_value}</span>
                                )}
                            </div>
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Enter measurement, count, or value..."
                                className="w-full p-2.5 bg-white border border-slate-200 focus:border-indigo-350 focus:ring-1 focus:ring-indigo-350 rounded-lg text-xs outline-none text-slate-800"
                            />
                        </div>
                    )}

                    {/* Text Input */}
                    {item.inputType === 'text' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Auditor Observation Response</label>
                            <textarea
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Enter detailed inspection observation text..."
                                className="w-full p-2.5 bg-white border border-slate-200 focus:border-indigo-350 focus:ring-1 focus:ring-indigo-350 rounded-lg text-xs outline-none text-slate-800 placeholder:text-slate-400"
                                rows={2.5}
                            />
                        </div>
                    )}

                    {/* Checkbox Input */}
                    {item.inputType === 'checkbox' && (
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Is this criteria compliant?</span>
                            <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-600">
                                    <input
                                        type="radio"
                                        name={`compliance_radio_${item.id}`}
                                        checked={value === 'true'}
                                        onChange={() => setValue('true')}
                                        className="text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5"
                                    />
                                    Yes (Compliant)
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-600">
                                    <input
                                        type="radio"
                                        name={`compliance_radio_${item.id}`}
                                        checked={value === 'false'}
                                        onChange={() => setValue('false')}
                                        className="text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
                                    />
                                    No (Non-Compliant)
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
                {saveSuccess && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                        <Check size={12} /> Evidence Saved successfully
                    </span>
                )}
                
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-wide rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={12} className="animate-spin" /> Saving...
                        </>
                    ) : (
                        'Save Evidence'
                    )}
                </button>
            </div>
        </form>
    );
}
