import { useRef, useState } from 'react';
import { TriangleAlert, X, Trash2 } from 'lucide-react';
import { AssetService } from '../../utils/assetService';
import { toast } from 'sonner';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';
import { Asset } from '../../types/database';

interface DeleteAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSuccess: () => void;
}

export function DeleteAssetModal({ isOpen, onClose, asset, onSuccess }: DeleteAssetModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(modalRef);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !asset) return null;

    const handleDelete = async () => {
        setLoading(true);
        try {
            await AssetService.deleteAsset(asset.id);
            toast.success('Asset deleted successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete asset');
        } finally {
            setLoading(false);
        }
    };

    // Calculate number of past assignments if available
    // note: asset.assignments might not always be populated depending on where this is called from
    // but useful if we have it.
    const assignmentsCount = (asset as any).assignments?.length || 0;
    const currentAssignment = asset.current_assignment;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            >
                {/* Header - Red Warning Style */}
                <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                        <TriangleAlert className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-900">Delete Asset?</h3>
                        <p className="text-sm text-red-700 mt-1">
                            You are about to delete <span className="font-semibold">{asset.name}</span> ({asset.asset_code}).
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-red-200 rounded-full text-red-700 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {currentAssignment?.employee && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                            <strong>Warning:</strong> This asset is currently assigned to <u>{currentAssignment.employee.full_name}</u>.
                            It is recommended to return the asset before deleting it to maintain accurate records.
                        </div>
                    )}

                    <p className="text-gray-600 text-sm leading-relaxed">
                        This action will <strong>permanently remove</strong> the asset and all its associated data, including:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 pl-2 space-y-1">
                        <li>Asset details and specifications</li>
                        <li><strong>{assignmentsCount > 0 ? assignmentsCount : 'All'} assignment history records</strong></li>
                        <li>Warranty and purchase information</li>
                    </ul>
                    <p className="text-sm font-medium text-gray-900 pt-2">
                        This action cannot be undone.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 transition"
                    >
                        {loading ? 'Deleting...' : 'Yes, Delete Asset'}
                        {!loading && <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
