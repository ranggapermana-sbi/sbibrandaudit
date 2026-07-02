import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Camera, Loader2, CheckCircle2, Image as ImageIcon, FileUp, Hash, Type, CheckSquare, UploadCloud, X, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, HOTELS_URL, HOTELS_KEY } from '../lib/supabase';

interface BrandingPropertyProps {
  selectedCategory: any;
  userProfile: any;
  onBack: () => void;
}

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
    const IMGBB_API_KEY = '15f299b33841c0f24f364546a6d5ef3c';
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        }
        console.error("IMGBB Upload Failed:", data);
        console.warn("Falling back to Base64 representation for persistent access.");
        return await fileToBase64(file);
    } catch (err) {
        console.error("Upload failed", err);
        console.warn("Falling back to Base64 representation for persistent access.");
        return await fileToBase64(file); 
    }
}

const AuditItemCard: React.FC<{ item: any, hotelId: string }> = ({ item, hotelId }) => {
    const [value, setValue] = useState<string>('');
    const [isNa, setIsNa] = useState<boolean>(false);
    const [naReason, setNaReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Camera specific state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async (mode: 'environment' | 'user') => {
        setIsCameraOpen(true);
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error", err);
            alert("Could not access camera. Please ensure permissions are granted.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const switchCamera = () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setSelectedFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                        stopCamera();
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Initialize from Supabase with local storage fallback
    useEffect(() => {
        let active = true;
        const fetchExistingSubmission = async () => {
            if (!hotelId || !item.id) return;
            try {
                const { data, error } = await supabase
                    .from('audit_submissions')
                    .select('*')
                    .eq('hotel_id', hotelId)
                    .eq('item_id', item.id);
                
                if (!error && data && data.length > 0 && active) {
                    const submission = data[0];
                    setValue(submission.value || '');
                    setIsNa(submission.is_na || false);
                    setNaReason(submission.na_reason || '');
                    setIsSubmitted(true);
                    if (submission.value && (item.input_type === 'camera' || item.input_type === 'image')) {
                        setPreviewUrl(submission.value);
                    }
                    // Sync to local storage
                    localStorage.setItem(`sbi_audit_${hotelId}_${item.id}`, JSON.stringify({
                        ...submission,
                        isSubmitted: true
                    }));
                } else {
                    // Fall back to local storage if no cloud record
                    const stored = localStorage.getItem(`sbi_audit_${hotelId}_${item.id}`);
                    if (stored && active) {
                        try {
                            const localData = JSON.parse(stored);
                            setValue(localData.value || '');
                            setIsNa(localData.is_na || false);
                            setNaReason(localData.na_reason || '');
                            setIsSubmitted(localData.isSubmitted || false);
                            if (localData.value && (item.input_type === 'camera' || item.input_type === 'image')) {
                                setPreviewUrl(localData.value);
                            }
                        } catch (e) {}
                    } else if (active) {
                        // Reset to default empty state if neither exists
                        setValue('');
                        setIsNa(false);
                        setNaReason('');
                        setIsSubmitted(false);
                        setPreviewUrl(null);
                    }
                }
            } catch (err) {
                console.error("Error fetching submission from Supabase:", err);
            }
        };
        fetchExistingSubmission();
        return () => { active = false; };
    }, [hotelId, item.id, item.input_type]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null); 
            }
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let finalValue = value;

            if (isNa) {
                if (!naReason.trim()) {
                    alert("Please provide a reason why this is Not Available.");
                    setIsSubmitting(false);
                    return;
                }
                finalValue = ''; 
            } else {
                if (item.input_type === 'camera' || item.input_type === 'image') {
                    if (selectedFile) {
                        let fileToUpload = selectedFile;
                        try {
                            fileToUpload = await resizeImage(selectedFile, 1);
                        } catch (resizeErr) {
                            console.warn("Resize failed, using original file", resizeErr);
                        }
                        finalValue = await uploadToIMGBB(fileToUpload);
                    } else if (!finalValue) {
                        alert("Please select or capture an image.");
                        setIsSubmitting(false);
                        return;
                    }
                } else if (item.input_type === 'document') {
                    if (selectedFile) {
                        const fileExt = selectedFile.name.split('.').pop();
                        const fileName = `${hotelId}_${item.id}_${Date.now()}.${fileExt}`;
                        
                        try {
                            const { error } = await supabase.storage.from('documents').upload(fileName, selectedFile);
                            if (error) throw error;
                            
                            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
                            finalValue = urlData.publicUrl;
                        } catch (err) {
                            console.warn("Supabase storage upload failed, using local blob.", err);
                            finalValue = URL.createObjectURL(selectedFile);
                        }
                    } else if (!finalValue) {
                        alert("Please select a document.");
                        setIsSubmitting(false);
                        return;
                    }
                } else if (item.input_type === 'numeric') {
                    if (!finalValue && !isNa) {
                        alert("Please provide a numeric value.");
                        setIsSubmitting(false);
                        return;
                    }
                    if (item.min_value !== undefined && item.min_value !== null) {
                        if (Number(finalValue) < Number(item.min_value)) {
                            alert(`The minimum value required is ${item.min_value}.`);
                            setIsSubmitting(false);
                            return;
                        }
                    }
                } else if (item.input_type === 'text') {
                    if (!finalValue && !isNa) {
                        alert("Please provide a text response.");
                        setIsSubmitting(false);
                        return;
                    }
                } else if (item.input_type === 'checkbox') {
                     if (!finalValue && !isNa) {
                        alert("Please select Yes or No.");
                        setIsSubmitting(false);
                        return;
                    }
                }
            }

            const submissionData = {
                hotel_id: hotelId,
                item_id: item.id,
                input_type: item.input_type,
                value: finalValue,
                is_na: isNa,
                na_reason: naReason,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            try {
                const { error } = await supabase.from('audit_submissions').upsert(submissionData, { onConflict: 'hotel_id,item_id' });
                if (error) {
                    console.error("Supabase upsert error:", error);
                    if (error.code === '42P01') { // undefined_table
                        alert("The audit_submissions table does not exist in Supabase. Please run the SQL script provided.");
                    } else {
                        alert("Failed to save to Supabase: " + error.message);
                    }
                }
            } catch (err) {
                console.warn("Failed to save to Supabase.", err);
            }

            localStorage.setItem(`sbi_audit_${hotelId}_${item.id}`, JSON.stringify({
                ...submissionData,
                isSubmitted: true
            }));

            setValue(finalValue);
            setIsSubmitted(true);
        } catch (err) {
            console.error(err);
            alert("An error occurred during submission.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInput = () => {
        if (isNa) return null;

        switch (item.input_type) {
            case 'camera':
                return (
                    <div className="mt-3">
                        {isCameraOpen && (
                            <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fadeIn">
                                <div className="absolute top-4 right-4 z-[110] flex gap-4">
                                    <button onClick={switchCamera} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-all active:scale-95">
                                        <RefreshCw size={24} />
                                    </button>
                                    <button onClick={stopCamera} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-all active:scale-95">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                </div>
                                <div className="h-32 bg-black pb-8 flex items-center justify-center shrink-0">
                                    <button 
                                        onClick={capturePhoto}
                                        className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all active:scale-90"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {previewUrl ? (
                            <div className="relative inline-block group w-full sm:w-auto">
                                <img src={previewUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full sm:w-48 h-48 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                {!isSubmitted && (
                                    <button 
                                        onClick={() => { setPreviewUrl(null); setSelectedFile(null); setValue(''); }}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <button 
                                    onClick={() => startCamera(facingMode)}
                                    className="flex items-center justify-center gap-2 w-full py-5 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold transition-colors active:scale-95"
                                >
                                    <Camera size={22} />
                                    Take Photo
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'image':
                return (
                    <div className="mt-3">
                        {previewUrl ? (
                            <div className="relative inline-block group w-full sm:w-auto">
                                <img src={previewUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full sm:w-48 h-48 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                {!isSubmitted && (
                                    <button 
                                        onClick={() => { setPreviewUrl(null); setSelectedFile(null); setValue(''); }}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-colors active:scale-95"
                                >
                                    <ImageIcon size={24} className="text-slate-400" />
                                    Browse Image
                                    <span className="text-[10px] font-medium text-slate-400">Max size: 1MB</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'document':
                return (
                    <div className="mt-3">
                        {selectedFile || value ? (
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                                <FileUp size={24} className="text-indigo-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {selectedFile?.name || "Uploaded Document"}
                                    </p>
                                </div>
                                {!isSubmitted && (
                                    <button 
                                        onClick={() => { setSelectedFile(null); setValue(''); }}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-full shrink-0"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 w-full py-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm rounded-xl font-bold transition-all active:scale-95"
                                >
                                    <UploadCloud size={20} className="text-slate-400" />
                                    Select Document
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'numeric':
                return (
                    <div className="mt-3">
                        <input 
                            type="number" 
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-bold text-slate-800 outline-none transition-all shadow-inner"
                            placeholder="Enter number..."
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            disabled={isSubmitted}
                        />
                        {item.min_value !== undefined && item.min_value !== null && (
                            <p className="text-xs text-slate-500 mt-2 ml-1 font-medium flex items-center gap-1">
                                <AlertCircle size={14} />
                                Minimum required value: <span className="font-bold text-slate-700">{item.min_value}</span>
                            </p>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div className="mt-3">
                        <textarea 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all resize-none shadow-inner"
                            placeholder="Enter text response..."
                            rows={3}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            disabled={isSubmitted}
                        />
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="mt-3 flex gap-3">
                        <button
                            onClick={() => setValue('Yes')}
                            disabled={isSubmitted}
                            className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all shadow-sm ${
                                value === 'Yes' 
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setValue('No')}
                            disabled={isSubmitted}
                            className={`flex-1 py-4 rounded-xl font-bold text-sm border-2 transition-all shadow-sm ${
                                value === 'No' 
                                    ? 'bg-red-50 border-red-500 text-red-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            No
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="mt-3 text-sm font-medium text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        Unsupported input type ({item.input_type})
                    </div>
                );
        }
    };

    return (
        <div className={`bg-white p-6 rounded-2xl border ${isSubmitted ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200'} shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500 text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {item.points || 0} PTS
                        </span>
                        <span className="text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            {item.input_type}
                        </span>
                    </div>
                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                        {item.name}
                    </p>
                    {item.description && (
                        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                            {item.description}
                        </p>
                    )}
                </div>
                {isSubmitted && (
                    <div className="shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-600 p-2 rounded-full border border-emerald-100 shadow-sm">
                        <CheckCircle2 size={24} />
                    </div>
                )}
            </div>

            {renderInput()}

            {/* N/A Toggle & Submission */}
            <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    <div>
                        <label className="text-sm font-bold text-slate-800 block">Not Available (N/A)?</label>
                        <span className="text-xs text-slate-500 font-medium">Mark if item is missing at property</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!isSubmitted) {
                                setIsNa(!isNa);
                                if (!isNa) setValue(''); // Clear value if toggling to NA
                            }
                        }}
                        disabled={isSubmitted}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isNa ? 'bg-amber-500' : 'bg-slate-300'
                        } ${isSubmitted ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isNa ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
                
                <div className="mb-5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Remark/Notes</label>
                    <textarea 
                        className={`w-full px-4 py-3 bg-slate-50 border ${isNa ? 'border-amber-200 focus:border-amber-400 focus:bg-amber-50/20' : 'border-slate-200 focus:border-indigo-400'} focus:bg-white rounded-xl text-sm text-slate-800 outline-none transition-all resize-none shadow-sm`}
                        placeholder={isNa ? "Please provide a reason why this is not available..." : "Enter any comments, observations, or notes here..."}
                        rows={2}
                        value={naReason}
                        onChange={(e) => setNaReason(e.target.value)}
                        disabled={isSubmitted}
                    />
                </div>

                {/* Submit Button */}
                {!isSubmitted ? (
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={18} className="animate-spin" /> Saving Submission...</>
                        ) : (
                            'Submit Evidence'
                        )}
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsSubmitted(false)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98]"
                    >
                        Edit Submission
                    </button>
                )}
            </div>
        </div>
    );
};

export default function BrandingPropertyIdentificationScreen({ selectedCategory, userProfile, onBack }: BrandingPropertyProps) {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hotels, setHotels] = useState<any[]>([]);
    
    const isAuditee = !!userProfile && userProfile.access_level !== 'admin' && userProfile.access_level !== 'auditor';
    
    // Get actual hotel ID from user profile or fallback
    const initialHotelId = isAuditee ? (userProfile?.hotel_id || '') : (userProfile?.hotel_id || localStorage.getItem('selected_hotel_id') || '');
    const [selectedHotelId, setSelectedHotelId] = useState<string>(initialHotelId);

    useEffect(() => {
        if (isAuditee && userProfile?.hotel_id) {
            setSelectedHotelId(userProfile.hotel_id);
        }
    }, [isAuditee, userProfile?.hotel_id]);

    useEffect(() => {
        const loadHotels = async () => {
            try {
                const response = await fetch(`${HOTELS_URL}hotels?select=*`, {
                    headers: {
                        'apikey': HOTELS_KEY,
                        'Authorization': `Bearer ${HOTELS_KEY}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const mapped = data.map((item: any) => {
                            const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
                            const fallbackId = item.hotel_id !== undefined && item.hotel_id !== null ? String(item.hotel_id) : '';
                            const finalId = rawId || fallbackId || item.code || String(item.name || '').replace(/\s+/g, '-').toLowerCase();
                            return {
                                id: finalId,
                                name: item.name || item.hotel_name || '',
                                location: item.location || item.city_country || '',
                                code: item.code || ''
                            };
                        });
                        const sorted = mapped.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
                        setHotels(sorted);
                        if (sorted.length > 0 && (!selectedHotelId || selectedHotelId === 'demo-hotel-123')) {
                            if (!isAuditee) {
                                setSelectedHotelId(sorted[0].id);
                                localStorage.setItem('selected_hotel_id', sorted[0].id);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading hotels:", err);
            }
        };
        loadHotels();
    }, []);

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
                
                const filtered = (data || []).filter((item: any) => item.filled_by_hotel !== false && item.filled_by_hotel !== 'false');
                
                const sorted = filtered.sort((a: any, b: any) => {
                    if (a.sort_order !== undefined && a.sort_order !== null && b.sort_order !== undefined && b.sort_order !== null) {
                        return Number(a.sort_order) - Number(b.sort_order);
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                
                setItems(sorted);
            } catch (err) {
                console.error("Error fetching category items:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategoryItems();
    }, [selectedCategory]);

    return (
        <div className="min-h-screen pt-20 pb-8 bg-slate-50/50">
            <header className="fixed top-0 z-40 w-full flex items-center px-4 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronRight className="rotate-180" />
                </button>
                <div className="ml-3 min-w-0">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        {selectedCategory?.name || 'Self-Audit Items'}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">
                        Complete all checklist items
                    </p>
                </div>
            </header>
            
            <main className="max-w-2xl mx-auto p-4 space-y-5">
                {/* For Auditees, show their assigned hotel property in read-only mode */}
                {isAuditee && (
                    userProfile?.hotel_id ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1.5 animate-fadeIn">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Representing Property (Auditee Mode)</span>
                            </div>
                            <p className="text-base font-bold text-slate-800">
                                {userProfile?.hotel_name || hotels.find(h => h.id === selectedHotelId)?.name || 'Your Assigned Hotel'}
                            </p>
                            {userProfile?.hotel_code && (
                                <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-indigo-100">
                                    {userProfile.hotel_code}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm text-center animate-fadeIn">
                            <p className="text-sm font-bold text-amber-800">No Assigned Property</p>
                            <p className="text-xs text-amber-600 mt-1">Your user profile is not currently assigned to any hotel. Please contact an administrator to set up your hotel assignment.</p>
                        </div>
                    )
                )}

                {/* Property selector for Admin/Auditor or unassigned non-auditee users */}
                {!isAuditee && (!userProfile?.hotel_id || userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Representing Property (Auditor Mode)</label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedHotelId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedHotelId(val);
                                    localStorage.setItem('selected_hotel_id', val);
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm text-slate-800 outline-none transition-all appearance-none cursor-pointer"
                            >
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name} ({h.code || 'CODE'})</option>
                                ))}
                            </select>
                            <span className="absolute right-4 top-4 text-slate-400 pointer-events-none">
                                <ChevronRight className="rotate-90" size={16} />
                            </span>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-16 text-slate-500 font-bold text-sm animate-pulse flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        Syncing items for this category...
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 font-bold text-sm bg-white rounded-3xl border border-slate-200 shadow-sm px-6">
                        No active checklist items configured for this category in the database.
                    </div>
                ) : (
                    items.map((item) => (
                        <AuditItemCard key={item.id} item={item} hotelId={selectedHotelId} />
                    ))
                )}
            </main>
        </div>
    );
}

