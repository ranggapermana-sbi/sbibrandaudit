import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Camera, Loader2, CheckCircle2, Image as ImageIcon, FileUp, Hash, Type, CheckSquare, UploadCloud, X, AlertCircle, RefreshCw, User, Lock, Unlock, Eye, Check } from 'lucide-react';
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

interface PhotoItem {
    id: string;
    url: string;
    file: File | null;
}

const AuditItemCard: React.FC<{ 
    item: any, 
    hotelId: string, 
    userProfile?: any, 
    locked?: boolean,
    activeLock?: { locked_by_name: string; locked_by_email: string; locked_at: string },
    onAcquireLock?: () => void,
    onReleaseLock?: () => void
}> = ({ item, hotelId, userProfile, locked, activeLock, onAcquireLock, onReleaseLock }) => {
    const [value, setValue] = useState<string>('');
    const [isNa, setIsNa] = useState<boolean>(false);
    const [naReason, setNaReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedBy, setSubmittedBy] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [photos, setPhotos] = useState<PhotoItem[]>([]);

    const hasLoadedExistingRef = useRef<boolean>(false);
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

    const isLockedByAnother = activeLock && activeLock.locked_by_email !== userProfile?.email;
    const isFieldDisabled = isSubmitted || !!locked || !!isLockedByAnother;

    // Camera specific state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Photo preview and large modal states
    const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
    const [capturedPhotoFile, setCapturedPhotoFile] = useState<File | null>(null);
    const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async (mode: 'environment' | 'user') => {
        if (isFieldDisabled) return;
        if (onAcquireLock) {
            onAcquireLock();
        }
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

    const stopCamera = (shouldRevoke: boolean | any = true) => {
        const actualShouldRevoke = shouldRevoke === true || typeof shouldRevoke === 'object';
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
        if (actualShouldRevoke && capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }
        setCapturedPhotoUrl(null);
        setCapturedPhotoFile(null);
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
                        const url = URL.createObjectURL(file);
                        setCapturedPhotoUrl(url);
                        setCapturedPhotoFile(file);
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const handleRetake = () => {
        if (capturedPhotoUrl) {
            URL.revokeObjectURL(capturedPhotoUrl);
        }
        setCapturedPhotoUrl(null);
        setCapturedPhotoFile(null);
    };

    const handleConfirmPhoto = () => {
        if (capturedPhotoUrl && capturedPhotoFile) {
            const newPhoto: PhotoItem = {
                id: `local_cap_${Date.now()}`,
                url: capturedPhotoUrl,
                file: capturedPhotoFile
            };
            setPhotos(prev => [...prev, newPhoto]);
            setCapturedPhotoUrl(null);
            setCapturedPhotoFile(null);
            stopCamera(false);
        }
    };

    const removePhoto = (id: string) => {
        setPhotos(prev => {
            const itemToRemove = prev.find(p => p.id === id);
            if (itemToRemove && itemToRemove.url.startsWith('blob:')) {
                URL.revokeObjectURL(itemToRemove.url);
            }
            return prev.filter(p => p.id !== id);
        });
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
        hasLoadedExistingRef.current = false;
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
                    const val = submission.value || '';
                    setValue(val);
                    setIsNa(submission.is_na || false);
                    setNaReason(submission.na_reason || submission.notes || submission.remark || '');
                    setIsSubmitted(true);
                    setSubmittedBy(submission.submitted_by_name || submission.submitted_by || submission.user_name || '');
                    hasLoadedExistingRef.current = true;
                    
                    if (val && (item.input_type === 'camera' || item.input_type === 'image')) {
                        const urls = splitEvidenceUrls(val);
                        setPhotos(urls.map((u: string, idx: number) => ({
                            id: `loaded_${idx}_${Date.now()}`,
                            url: u,
                            file: null
                        })));
                    } else if (item.input_type === 'camera' || item.input_type === 'image') {
                        setPhotos([]);
                    }

                    if (val && item.input_type === 'document') {
                        setPreviewUrl(val);
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
                            const val = localData.value || '';
                            setValue(val);
                            setIsNa(localData.is_na || false);
                            setNaReason(localData.na_reason || localData.notes || localData.remark || '');
                            setIsSubmitted(localData.isSubmitted || false);
                            if (localData.isSubmitted) {
                                hasLoadedExistingRef.current = true;
                            }
                            setSubmittedBy(localData.submitted_by_name || localData.submitted_by || localData.submitted_by_user || '');
                            
                            if (val && (item.input_type === 'camera' || item.input_type === 'image')) {
                                const urls = splitEvidenceUrls(val);
                                setPhotos(urls.map((u: string, idx: number) => ({
                                    id: `loaded_${idx}_${Date.now()}`,
                                    url: u,
                                    file: null
                                })));
                            } else if (item.input_type === 'camera' || item.input_type === 'image') {
                                setPhotos([]);
                            }

                            if (val && item.input_type === 'document') {
                                setPreviewUrl(val);
                            }
                        } catch (e) {}
                    } else if (active) {
                        // Reset to default empty state if neither exists
                        setValue('');
                        setIsNa(false);
                        setNaReason('');
                        setIsSubmitted(false);
                        setPreviewUrl(null);
                        setSubmittedBy('');
                        setPhotos([]);
                        hasLoadedExistingRef.current = false;
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
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            if (item.input_type === 'image' || item.input_type === 'camera') {
                const newPhotos: PhotoItem[] = files.map((file: File, idx) => ({
                    id: `local_${idx}_${Date.now()}`,
                    url: URL.createObjectURL(file),
                    file: file
                }));
                setPhotos(prev => [...prev, ...newPhotos]);
            } else if (files[0]) {
                const file = files[0];
                setSelectedFile(file);
                if (file.type.startsWith('image/')) {
                    setPreviewUrl(URL.createObjectURL(file));
                } else {
                    setPreviewUrl(null); 
                }
            }
        }
    };

    const handleSubmit = async () => {
        if (isFieldDisabled) {
            alert("This item is locked by another user or already finalized.");
            return;
        }
        setIsSubmitting(true);
        try {
            // Real-time safety check 1: Double-check finalized status in Supabase right before saving
            try {
                const { data: statusData } = await supabase
                    .from('hotel_audit_status')
                    .select('is_finalized')
                    .eq('hotel_id', hotelId)
                    .maybeSingle();
                
                if (statusData?.is_finalized) {
                    alert("This property's self-audit has been finalized and locked.");
                    setIsSubmitting(false);
                    return;
                }
            } catch (statusErr) {
                console.warn("Failed to double-check finalized status:", statusErr);
            }

            // Real-time safety check 2: Double-check existing submissions to prevent race conditions or simultaneous edits overriding each other
            try {
                const { data: subData, error: subErr } = await supabase
                    .from('audit_submissions')
                    .select('*')
                    .eq('hotel_id', hotelId)
                    .eq('item_id', item.id)
                    .maybeSingle();
                
                if (!subErr && subData) {
                    const currentSubmitter = userProfile 
                        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.full_name || userProfile.name || userProfile.email 
                        : (localStorage.getItem('sbi_user_name') || 'Property User');

                    const isSameSubmitter = 
                        (subData.submitted_by_name && subData.submitted_by_name === currentSubmitter) ||
                        (subData.submitted_by && subData.submitted_by === currentSubmitter);

                    const isAdminOrAuditor = userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor';

                    if (!isSameSubmitter && !isAdminOrAuditor && !hasLoadedExistingRef.current) {
                        alert(`Submission aborted: This item has already been submitted by ${subData.submitted_by_name || subData.submitted_by || 'another user'}. Your local view will be updated.`);
                        
                        // Update our component's state to match the existing database record
                        const val = subData.value || '';
                        setValue(val);
                        setIsNa(subData.is_na || false);
                        setNaReason(subData.na_reason || subData.notes || subData.remark || '');
                        setIsSubmitted(true);
                        setSubmittedBy(subData.submitted_by_name || subData.submitted_by || '');
                        
                        if (val && (item.input_type === 'camera' || item.input_type === 'image')) {
                            const urls = splitEvidenceUrls(val);
                            setPhotos(urls.map((u: string, idx: number) => ({
                                id: `loaded_${idx}_${Date.now()}`,
                                url: u,
                                file: null
                            })));
                        }
                        
                        setIsSubmitting(false);
                        return;
                    }
                }
            } catch (subCheckErr) {
                console.warn("Failed to double-check existing submission:", subCheckErr);
            }

            // Real-time safety check 3: Double-check active locks to make sure someone else hasn't acquired the lock since the user opened the field
            try {
                const { data: lockData, error: lockErr } = await supabase
                    .from('audit_item_locks')
                    .select('*')
                    .eq('hotel_id', hotelId)
                    .eq('item_id', item.id)
                    .maybeSingle();
                
                if (!lockErr && lockData) {
                    const isExpired = Date.now() - new Date(lockData.locked_at).getTime() > 5 * 60 * 1000;
                    if (!isExpired && lockData.locked_by_email !== userProfile?.email) {
                        alert(`Submission aborted: This item is currently being edited and is locked by ${lockData.locked_by_name || 'another user'}.`);
                        setIsSubmitting(false);
                        return;
                    }
                }
            } catch (lockCheckErr) {
                console.warn("Failed to double-check locks:", lockCheckErr);
            }

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
                    if (photos.length > 0) {
                        const uploadedUrls: string[] = [];
                        for (const p of photos) {
                            if (p.file) {
                                let fileToUpload = p.file;
                                try {
                                    fileToUpload = await resizeImage(p.file, 1);
                                } catch (resizeErr) {
                                    console.warn("Resize failed, using original file", resizeErr);
                                }
                                const uploadedUrl = await uploadToIMGBB(fileToUpload);
                                uploadedUrls.push(uploadedUrl);
                            } else {
                                uploadedUrls.push(p.url);
                            }
                        }
                        finalValue = uploadedUrls.join(',');
                    } else {
                        alert("Please select or capture at least one image.");
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
                            console.warn("Supabase storage upload failed, using Base64 fallback.", err);
                            finalValue = await fileToBase64(selectedFile);
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

            const submitterName = userProfile 
                ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.full_name || userProfile.name || userProfile.email 
                : (localStorage.getItem('sbi_user_name') || 'Property User');

            const fullSubmissionData = {
                hotel_id: hotelId,
                item_id: item.id,
                input_type: item.input_type,
                value: finalValue,
                is_na: isNa,
                na_reason: naReason,
                notes: naReason,
                submitted_by: submitterName,
                submitted_by_name: submitterName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            try {
                // Upsert with full schema (includes notes and submitted_by)
                const { error } = await supabase.from('audit_submissions').upsert(fullSubmissionData, { onConflict: 'hotel_id,item_id' });
                if (error) {
                    console.warn("Supabase upsert with full fields failed, attempting fallback to core schema fields:", error);
                    // Fallback to core schema fields if additional columns don't exist in Supabase table
                    const coreSubmissionData = {
                        hotel_id: hotelId,
                        item_id: item.id,
                        input_type: item.input_type,
                        value: finalValue,
                        is_na: isNa,
                        na_reason: naReason,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    const { error: fallbackError } = await supabase.from('audit_submissions').upsert(coreSubmissionData, { onConflict: 'hotel_id,item_id' });
                    if (fallbackError) {
                        console.error("Supabase upsert fallback error:", fallbackError);
                        if (fallbackError.code === '42P01') {
                            alert("The audit_submissions table does not exist in Supabase. Please run the SQL script provided.");
                        } else {
                            alert("Failed to save to Supabase: " + fallbackError.message);
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to save to Supabase.", err);
            }

            try {
                localStorage.setItem(`sbi_audit_${hotelId}_${item.id}`, JSON.stringify({
                    ...fullSubmissionData,
                    isSubmitted: true
                }));
            } catch (lsErr) {
                console.warn("LocalStorage save failed, string might be too large:", lsErr);
                if (finalValue && finalValue.length > 500000) {
                    try {
                        localStorage.setItem(`sbi_audit_${hotelId}_${item.id}`, JSON.stringify({
                            ...fullSubmissionData,
                            value: 'base64_too_large_for_local_storage',
                            isSubmitted: true
                        }));
                    } catch (lsErr2) {
                        console.error("Even small localStorage save failed:", lsErr2);
                    }
                }
            }

            setValue(finalValue);
            setIsSubmitted(true);
            setSubmittedBy(submitterName);
            if (onReleaseLock) {
                onReleaseLock();
            }
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
                    <div className="mt-3 space-y-3">
                        {isCameraOpen && (
                            <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fadeIn">
                                <div className="absolute top-4 right-4 z-[110] flex gap-4">
                                    {!capturedPhotoUrl && (
                                        <button onClick={switchCamera} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-all active:scale-95">
                                            <RefreshCw size={24} />
                                        </button>
                                    )}
                                    <button onClick={stopCamera} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-all active:scale-95">
                                        <X size={24} />
                                    </button>
                                </div>
                                {capturedPhotoUrl ? (
                                    <div className="flex-1 relative flex flex-col bg-black overflow-hidden justify-between">
                                        <div className="flex-1 relative flex items-center justify-center">
                                            <img src={capturedPhotoUrl} alt="Captured preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="bg-slate-950/95 border-t border-slate-800 px-6 py-6 flex gap-4 justify-center items-center shrink-0 z-[120]">
                                            <button 
                                                onClick={handleRetake}
                                                className="flex-1 max-w-[180px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold py-3 px-5 rounded-xl border border-slate-700 transition-all text-sm flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw size={16} />
                                                Retake
                                            </button>
                                            <button 
                                                onClick={handleConfirmPhoto}
                                                className="flex-1 max-w-[180px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30"
                                            >
                                                <Check size={16} />
                                                Use Photo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                        </div>
                                        <div className="h-32 bg-black pb-8 flex items-center justify-center shrink-0">
                                            <button 
                                                onClick={capturePhoto}
                                                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all active:scale-90"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {photos.map((p, idx) => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => setActivePreviewImage(p.url)}
                                        className="relative group rounded-xl border border-slate-200 shadow-2xs overflow-hidden aspect-square bg-slate-50 cursor-pointer"
                                    >
                                        <img src={p.url} alt={`Evidence ${idx + 1}`} referrerPolicy={p.url?.startsWith('blob:') || p.url?.startsWith('data:') ? undefined : 'no-referrer'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                                                <Eye size={12} />
                                                Preview
                                            </span>
                                        </div>
                                        {!isFieldDisabled && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePhoto(p.id);
                                                }}
                                                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md hover:scale-110 transition-transform z-10"
                                                type="button"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <div className="absolute bottom-1 left-1 bg-slate-900/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                            Photo {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isFieldDisabled && photos.length < 5 && (
                            <div>
                                <button 
                                    onClick={() => !isFieldDisabled && startCamera(facingMode)}
                                    disabled={isFieldDisabled}
                                    className="flex items-center justify-center gap-2 w-full py-3.5 sm:py-5 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs sm:text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Camera size={20} className="sm:w-5 sm:h-5" />
                                    {photos.length > 0 ? 'Add Another Photo' : 'Take Photo'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'image':
                return (
                    <div className="mt-3 space-y-3">
                        {photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {photos.map((p, idx) => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => setActivePreviewImage(p.url)}
                                        className="relative group rounded-xl border border-slate-200 shadow-2xs overflow-hidden aspect-square bg-slate-50 cursor-pointer"
                                    >
                                        <img src={p.url} alt={`Evidence ${idx + 1}`} referrerPolicy={p.url?.startsWith('blob:') || p.url?.startsWith('data:') ? undefined : 'no-referrer'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                                                <Eye size={12} />
                                                Preview
                                            </span>
                                        </div>
                                        {!isFieldDisabled && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePhoto(p.id);
                                                }}
                                                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md hover:scale-110 transition-transform z-10"
                                                type="button"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <div className="absolute bottom-1 left-1 bg-slate-900/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                            Photo {idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isFieldDisabled && photos.length < 5 && (
                            <div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    disabled={isFieldDisabled}
                                    multiple
                                />
                                <button 
                                    onClick={() => {
                                        if (!isFieldDisabled) {
                                            if (onAcquireLock) onAcquireLock();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    disabled={isFieldDisabled}
                                    className="flex flex-col items-center justify-center gap-1.5 w-full py-4 sm:py-6 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs sm:text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ImageIcon size={22} className="text-slate-400 sm:w-6 sm:h-6" />
                                    {photos.length > 0 ? 'Add Another Image' : 'Browse Image'}
                                    <span className="text-[10px] font-medium text-slate-400">Max size: 1MB per image (Up to 5)</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'document':
                return (
                    <div className="mt-3">
                        {selectedFile || value ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm">
                                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                                    <FileUp size={20} className="text-indigo-500 shrink-0 sm:w-6 sm:h-6" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                            {selectedFile?.name || "Uploaded Document"}
                                        </p>
                                        {!selectedFile && value && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                {value.startsWith('data:') ? 'Base64 Encoded Document' : 'Cloud Stored File'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    {!selectedFile && value && (
                                        <>
                                            <button 
                                                type="button"
                                                onClick={() => handleDocumentDownload(value)} 
                                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                            >
                                                Download / Open
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyLink(value)}
                                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                            >
                                                {copied ? 'Copied!' : 'Copy Link'}
                                            </button>
                                        </>
                                    )}
                                    {!isFieldDisabled && (
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedFile(null); setValue(''); }}
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-full shrink-0"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    disabled={isFieldDisabled}
                                />
                                <button 
                                    onClick={() => {
                                        if (!isFieldDisabled) {
                                            if (onAcquireLock) onAcquireLock();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    disabled={isFieldDisabled}
                                    className="flex items-center justify-center gap-2 w-full py-3.5 sm:py-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UploadCloud size={18} className="text-slate-400 sm:w-5 sm:h-5" />
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
                            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none transition-all shadow-inner"
                            placeholder="Enter number..."
                            value={value}
                            onChange={(e) => {
                                if (onAcquireLock) onAcquireLock();
                                setValue(e.target.value);
                            }}
                            disabled={isFieldDisabled}
                        />
                        {item.min_value !== undefined && item.min_value !== null && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 ml-1 font-medium flex items-center gap-1">
                                <AlertCircle size={13} />
                                Minimum required value: <span className="font-bold text-slate-700">{item.min_value}</span>
                            </p>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div className="mt-3">
                        <textarea 
                            className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all resize-none shadow-inner"
                            placeholder="Enter text response..."
                            rows={3}
                            value={value}
                            onChange={(e) => {
                                if (onAcquireLock) onAcquireLock();
                                setValue(e.target.value);
                            }}
                            disabled={isFieldDisabled}
                        />
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="mt-3 flex gap-2 sm:gap-3">
                        <button
                            onClick={() => {
                                if (onAcquireLock) onAcquireLock();
                                setValue('Yes');
                            }}
                            disabled={isFieldDisabled}
                            className={`flex-1 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm border-2 transition-all shadow-sm ${
                                value === 'Yes' 
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => {
                                if (onAcquireLock) onAcquireLock();
                                setValue('No');
                            }}
                            disabled={isFieldDisabled}
                            className={`flex-1 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm border-2 transition-all shadow-sm ${
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
                    <div className="mt-3 text-xs sm:text-sm font-medium text-slate-400 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-center">
                        Unsupported input type ({item.input_type})
                    </div>
                );
        }
    };

    return (
        <div className={`bg-white p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border ${isSubmitted ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200'} shadow-sm transition-all hover:shadow-md flex flex-col justify-between h-full`}>
            <div>
                {isLockedByAnother && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/50 text-amber-800 px-3.5 py-3 rounded-xl text-xs font-bold mb-4 animate-pulse">
                        <Lock size={14} className="text-amber-500 shrink-0" />
                        <span>{activeLock?.locked_by_name} is currently handling this item.</span>
                    </div>
                )}
                <div className="flex items-start justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-4">
                    <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-slate-500 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {item.points || 0} PTS
                            </span>
                            <span className="text-indigo-600 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                {item.input_type}
                            </span>
                            {isSubmitted && (submittedBy || userProfile) && (
                                <span className="text-emerald-800 text-[9px] sm:text-[10px] font-extrabold bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded flex items-center gap-1 truncate max-w-[200px]">
                                    <User size={10} className="text-emerald-600 shrink-0" />
                                    <span className="truncate">{submittedBy || (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Property User')}</span>
                                </span>
                            )}
                        </div>
                        <p className="text-sm sm:text-base font-bold text-slate-800 leading-snug sm:leading-relaxed">
                            {item.name}
                        </p>
                        {item.description && (
                            <p className="text-xs sm:text-sm text-slate-500 leading-normal sm:leading-relaxed bg-slate-50 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-100 mt-1.5 sm:mt-2">
                                {item.description}
                            </p>
                        )}
                        {isSubmitted && (
                            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 rounded-lg text-xs font-semibold w-fit">
                                <User size={13} className="text-emerald-600 shrink-0" />
                                <span>Submitted by: <strong className="font-extrabold text-emerald-950">{submittedBy || (userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Property User')}</strong></span>
                            </div>
                        )}
                    </div>
                    {isSubmitted && (
                        <div className="shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-600 p-1.5 sm:p-2 rounded-full border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    )}
                </div>

                {renderInput()}
            </div>

            {/* N/A Toggle & Submission */}
            <div className="mt-4 pt-3.5 sm:mt-6 sm:pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3 sm:mb-4 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-slate-100">
                    <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-800 block">Not Available (N/A)?</label>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Mark if item is missing at property</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!isFieldDisabled) {
                                if (onAcquireLock) onAcquireLock();
                                setIsNa(!isNa);
                                if (!isNa) setValue(''); // Clear value if toggling to NA
                            }
                        }}
                        disabled={isFieldDisabled}
                        className={`relative inline-flex h-6 sm:h-7 w-11 sm:w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isNa ? 'bg-amber-500' : 'bg-slate-300'
                        } ${isFieldDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 sm:h-6 w-5 sm:w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isNa ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
                
                <div className="mb-3.5 sm:mb-5">
                    <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Remark/Notes</label>
                    <textarea 
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-50 border ${isNa ? 'border-amber-200 focus:border-amber-400 focus:bg-amber-50/20' : 'border-slate-200 focus:border-indigo-400'} focus:bg-white rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all resize-none shadow-xs`}
                        placeholder={isNa ? "Please provide a reason why this is not available..." : "Enter any comments, observations, or notes here..."}
                        rows={2}
                        value={naReason}
                        onChange={(e) => {
                            if (onAcquireLock) onAcquireLock();
                            setNaReason(e.target.value);
                        }}
                        disabled={isFieldDisabled}
                    />
                </div>

                {/* Submit Button */}
                {!isSubmitted ? (
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || isFieldDisabled}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 shadow-sm hover:shadow-md"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving Submission...</>
                        ) : (
                            'Submit Evidence'
                        )}
                    </button>
                ) : (
                    locked ? (
                        <div className="w-full bg-slate-50 border border-slate-200 text-slate-500 font-bold py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm flex justify-center items-center gap-1.5 select-none">
                            <Lock size={14} className="text-slate-400" />
                            <span>Audit Finalised - Locked</span>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsSubmitted(false)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all active:scale-[0.98]"
                        >
                            Edit Submission
                        </button>
                    )
                )}
            </div>

            {/* Full Screen Image Preview Modal */}
            {activePreviewImage && (
                <div 
                    className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xs flex flex-col justify-center items-center p-4 animate-fadeIn"
                    onClick={() => setActivePreviewImage(null)}
                >
                    <button 
                        onClick={() => setActivePreviewImage(null)}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 z-20"
                    >
                        <X size={24} />
                    </button>
                    <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center relative z-10" onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={activePreviewImage} 
                            alt="Full Screen Preview" 
                            referrerPolicy={activePreviewImage?.startsWith('blob:') || activePreviewImage?.startsWith('data:') ? undefined : 'no-referrer'}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                        />
                    </div>
                    <div className="mt-6 text-center relative z-10">
                        <button
                            type="button"
                            onClick={() => setActivePreviewImage(null)}
                            className="bg-white hover:bg-slate-100 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
                        >
                            Close Preview
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function BrandingPropertyIdentificationScreen({ selectedCategory, userProfile, onBack }: BrandingPropertyProps) {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hotels, setHotels] = useState<any[]>([]);
    const [isHotelFinalized, setIsHotelFinalized] = useState(false);
    
    const isAuditee = !!userProfile && userProfile.access_level !== 'admin' && userProfile.access_level !== 'auditor';
    
    // Get actual hotel ID from user profile or fallback
    const initialHotelId = isAuditee ? (userProfile?.hotel_id || '') : (userProfile?.hotel_id || localStorage.getItem('selected_hotel_id') || '');
    const [selectedHotelId, setSelectedHotelId] = useState<string>(initialHotelId);

    // Temporary photo-taking lock state & refs
    const [activeLocks, setActiveLocks] = useState<Record<string, { locked_by_name: string; locked_by_email: string; locked_at: string }>>({});
    const userLockedItemsRef = useRef<Set<string>>(new Set());

    // Fetch and sync locks
    useEffect(() => {
        if (!selectedHotelId) return;

        const fetchLocks = async () => {
            try {
                const { data, error } = await supabase
                    .from('audit_item_locks')
                    .select('*')
                    .eq('hotel_id', selectedHotelId);
                
                if (!error && data) {
                    const lockMap: Record<string, any> = {};
                    data.forEach(lock => {
                        const isExpired = Date.now() - new Date(lock.locked_at).getTime() > 5 * 60 * 1000;
                        if (!isExpired) {
                            lockMap[lock.item_id] = lock;
                        }
                    });
                    setActiveLocks(lockMap);
                }
            } catch (e) {
                console.error("Error fetching locks:", e);
            }
        };

        fetchLocks();

        const channel = supabase
            .channel(`locks-${selectedHotelId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'audit_item_locks',
                filter: `hotel_id=eq.${selectedHotelId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const lock = payload.new;
                    const isExpired = Date.now() - new Date(lock.locked_at).getTime() > 5 * 60 * 1000;
                    if (!isExpired) {
                        setActiveLocks(prev => ({ ...prev, [lock.item_id]: lock }));
                    }
                } else if (payload.eventType === 'DELETE') {
                    const oldLock = payload.old;
                    setActiveLocks(prev => {
                        const copy = { ...prev };
                        const itemId = oldLock.item_id;
                        if (itemId) {
                            delete copy[itemId];
                        }
                        return copy;
                    });
                }
            })
            .subscribe();

        const interval = setInterval(() => {
            setActiveLocks(prev => {
                const copy = { ...prev };
                let changed = false;
                Object.entries(copy).forEach(([itemId, lock]) => {
                    const isExpired = Date.now() - new Date((lock as any).locked_at).getTime() > 5 * 60 * 1000;
                    if (isExpired) {
                        delete copy[itemId];
                        changed = true;
                    }
                });
                return changed ? copy : prev;
            });
        }, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [selectedHotelId]);

    // Cleanup held locks when unmounting or changing category/hotel
    useEffect(() => {
        return () => {
            const lockedItems = Array.from(userLockedItemsRef.current);
            if (lockedItems.length > 0 && selectedHotelId) {
                lockedItems.forEach(async (itemId) => {
                    try {
                        await supabase
                            .from('audit_item_locks')
                            .delete()
                            .eq('hotel_id', selectedHotelId)
                            .eq('item_id', itemId);
                    } catch (e) {
                        console.error("Failed to release lock on cleanup", e);
                    }
                });
                userLockedItemsRef.current.clear();
            }
        };
    }, [selectedHotelId, selectedCategory]);

    const handleAcquireLock = async (itemId: string) => {
        if (!selectedHotelId || !userProfile) return;
        
        // Check if there is an active, unexpired lock held by someone else first
        try {
            const { data: existingLock, error } = await supabase
                .from('audit_item_locks')
                .select('*')
                .eq('hotel_id', selectedHotelId)
                .eq('item_id', itemId)
                .maybeSingle();

            if (!error && existingLock) {
                const isExpired = Date.now() - new Date(existingLock.locked_at).getTime() > 5 * 60 * 1000;
                if (!isExpired && existingLock.locked_by_email !== userProfile.email) {
                    alert(`This item is already locked by ${existingLock.locked_by_name || 'another user'} who is editing it.`);
                    // Update active locks locally to block input fields immediately
                    setActiveLocks(prev => ({ ...prev, [itemId]: existingLock }));
                    return;
                }
            }
        } catch (e) {
            console.error("Error verifying lock availability:", e);
        }

        const name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.full_name || userProfile.name || userProfile.email || 'Property User';
        const email = userProfile.email || 'unknown@swiss-belhotel.com';
        
        userLockedItemsRef.current.add(itemId);
        try {
            await supabase
                .from('audit_item_locks')
                .upsert({
                    hotel_id: selectedHotelId,
                    item_id: itemId,
                    locked_by_name: name,
                    locked_by_email: email,
                    locked_at: new Date().toISOString()
                }, { onConflict: 'hotel_id,item_id' });
        } catch (err) {
            console.error("Failed to acquire lock:", err);
        }
    };

    const handleReleaseLock = async (itemId: string) => {
        if (!selectedHotelId) return;
        userLockedItemsRef.current.delete(itemId);
        try {
            await supabase
                .from('audit_item_locks')
                .delete()
                .eq('hotel_id', selectedHotelId)
                .eq('item_id', itemId);
        } catch (err) {
            console.error("Failed to release lock:", err);
        }
    };

    const checkFinalizedStatus = async () => {
        if (!selectedHotelId) return;
        try {
            const { data, error } = await supabase
                .from('hotel_audit_status')
                .select('is_finalized')
                .eq('hotel_id', selectedHotelId)
                .maybeSingle();
            
            if (error) {
                console.warn("Could not fetch finalized status:", error);
                const localFinalized = localStorage.getItem(`sbi_audit_finalized_${selectedHotelId}`) === 'true';
                setIsHotelFinalized(localFinalized);
            } else if (data) {
                setIsHotelFinalized(!!data.is_finalized);
                localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, String(!!data.is_finalized));
            } else {
                setIsHotelFinalized(false);
                localStorage.setItem(`sbi_audit_finalized_${selectedHotelId}`, 'false');
            }
        } catch (err) {
            console.warn("Error checking finalized status:", err);
            const localFinalized = localStorage.getItem(`sbi_audit_finalized_${selectedHotelId}`) === 'true';
            setIsHotelFinalized(localFinalized);
        }
    };

    useEffect(() => {
        checkFinalizedStatus();
    }, [selectedHotelId]);

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
                    const sA = a.sort_order !== undefined && a.sort_order !== null ? Number(a.sort_order) : 999999;
                    const sB = b.sort_order !== undefined && b.sort_order !== null ? Number(b.sort_order) : 999999;
                    if (sA !== sB) {
                        return sA - sB;
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });

                // Determine group filtering for items
                let assignedItemIds: string[] | null = null;
                try {
                    // Try to fetch from database
                    const { data: groupsData } = await supabase.from('audit_checklist_groups').select('*');
                    const { data: groupHotelsData } = await supabase.from('audit_group_hotels').select('*');

                    if (groupsData && groupHotelsData) {
                        const currentHotel = hotels.find(h => 
                            String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                            String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
                        );
                        
                        const possibleHotelIds = Array.from(new Set([
                            selectedHotelId,
                            String(selectedHotelId),
                            currentHotel?.id ? String(currentHotel.id) : null,
                            currentHotel?.code ? String(currentHotel.code) : null
                        ].filter(Boolean) as string[]));

                        const assignedGroupHotels = groupHotelsData.filter((gh: any) => 
                            possibleHotelIds.some(phId => String(gh.hotel_id).toLowerCase() === String(phId).toLowerCase())
                        );

                        if (assignedGroupHotels.length > 0) {
                            const groupIds = assignedGroupHotels.map((gh: any) => gh.group_id);
                            const matchedGroups = groupsData.filter((g: any) => groupIds.includes(g.id));
                            if (matchedGroups.length > 0) {
                                const allItemIds = new Set<string>();
                                matchedGroups.forEach((g: any) => {
                                    if (g.item_ids) {
                                        g.item_ids.forEach((id: string) => allItemIds.add(String(id)));
                                    }
                                });
                                assignedItemIds = Array.from(allItemIds);
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Could not load checklist group in Branding screen:", err);
                }

                // If DB lookup didn't yield anything or wasn't found, try local storage fallback
                if (!assignedItemIds) {
                    const savedGroups = localStorage.getItem('sbi_audit_groups_v2');
                    if (savedGroups) {
                        try {
                            const parsedGroups = JSON.parse(savedGroups);
                            const currentHotel = hotels.find(h => 
                                String(h.id).toLowerCase() === String(selectedHotelId).toLowerCase() || 
                                String(h.code).toLowerCase() === String(selectedHotelId).toLowerCase()
                            );
                            const possibleHotelIds = Array.from(new Set([
                                selectedHotelId,
                                String(selectedHotelId),
                                currentHotel?.id ? String(currentHotel.id) : null,
                                currentHotel?.code ? String(currentHotel.code) : null
                            ].filter(Boolean) as string[]));

                            const assignedGroups = parsedGroups.filter((g: any) => 
                                g.hotelIds && g.hotelIds.some((hId: string) => 
                                    possibleHotelIds.some(phId => String(hId).toLowerCase() === String(phId).toLowerCase())
                                )
                            );

                            if (assignedGroups.length > 0) {
                                const allItemIds = new Set<string>();
                                assignedGroups.forEach((g: any) => {
                                    const ids = g.itemIds || g.item_ids || [];
                                    ids.forEach((id: string) => allItemIds.add(String(id)));
                                });
                                assignedItemIds = Array.from(allItemIds);
                            }
                        } catch (e) {}
                    }
                }
                
                const finalItems = assignedItemIds
                    ? sorted.filter((item: any) => assignedItemIds!.includes(String(item.id)))
                    : sorted;

                setItems(finalItems);
            } catch (err) {
                console.error("Error fetching category items:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategoryItems();
    }, [selectedCategory, selectedHotelId, hotels]);

    return (
        <div className="min-h-screen pt-16 sm:pt-20 pb-8 bg-slate-50/50 px-2 sm:px-4">
            <header className="fixed top-0 left-0 z-40 w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
                <button onClick={onBack} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronRight className="rotate-180" size={20} />
                </button>
                <div className="ml-2.5 sm:ml-3 min-w-0">
                    <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
                        {selectedCategory?.name || 'Self-Audit Items'}
                    </h1>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">
                        Complete all checklist items
                    </p>
                </div>
            </header>
            
            <main className="max-w-4xl mx-auto py-3 sm:py-5 px-1 sm:px-3 space-y-3 sm:space-y-5">
                {/* For Auditees, show their assigned hotel property in read-only mode */}
                {isAuditee && (
                    userProfile?.hotel_id ? (
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 shadow-sm space-y-1 sm:space-y-1.5 animate-fadeIn">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-600" />
                                <span className="text-[9px] sm:text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Representing Property (Auditee Mode)</span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-slate-800">
                                {userProfile?.hotel_name || hotels.find(h => h.id === selectedHotelId)?.name || 'Your Assigned Hotel'}
                            </p>
                            {userProfile?.hotel_code && (
                                <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg uppercase tracking-wider border border-indigo-100">
                                    {userProfile.hotel_code}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm text-center animate-fadeIn">
                            <p className="text-xs sm:text-sm font-bold text-amber-800">No Assigned Property</p>
                            <p className="text-[11px] sm:text-xs text-amber-600 mt-1">Your user profile is not currently assigned to any hotel. Please contact an administrator to set up your hotel assignment.</p>
                        </div>
                    )
                )}

                {/* Property selector for Admin/Auditor or unassigned non-auditee users */}
                {!isAuditee && (!userProfile?.hotel_id || userProfile?.access_level === 'admin' || userProfile?.access_level === 'auditor') && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Representing Property (Auditor Mode)</label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedHotelId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedHotelId(val);
                                    localStorage.setItem('selected_hotel_id', val);
                                }}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all appearance-none cursor-pointer"
                            >
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name} ({h.code || 'CODE'})</option>
                                ))}
                            </select>
                            <span className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none">
                                <ChevronRight className="rotate-90" size={16} />
                            </span>
                        </div>
                    </div>
                )}

                {isHotelFinalized && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs flex items-start gap-3 animate-fadeIn mb-2 sm:mb-3">
                        <Lock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-xs font-black text-amber-850">Read-Only Mode: Self-Audit Finalised</p>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                                This property's self-audit has been finalised and locked. You can view all submitted evidence, but editing is disabled unless unlocked by an Admin.
                            </p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-12 sm:py-16 text-slate-500 font-bold text-xs sm:text-sm animate-pulse flex flex-col items-center justify-center gap-3 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={28} />
                        Syncing items for this category...
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 text-slate-500 font-bold text-xs sm:text-sm bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm px-4 sm:px-6">
                        No active checklist items configured for this category in the database.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {items.map((item) => (
                            <AuditItemCard 
                                key={item.id} 
                                item={item} 
                                hotelId={selectedHotelId} 
                                userProfile={userProfile} 
                                locked={isHotelFinalized} 
                                activeLock={activeLocks[item.id]}
                                onAcquireLock={() => handleAcquireLock(item.id)}
                                onReleaseLock={() => handleReleaseLock(item.id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

