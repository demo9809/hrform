import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, UserPlus, RotateCcw, Monitor, FileText, Pencil, Trash2 } from 'lucide-react';
import { AssetService } from '../../utils/assetService';
import { Asset } from '../../types/database';
import { toast } from 'sonner';
import { AssignAssetModal } from '../components/AssignAssetModal';
import { ReturnAssetModal } from '../components/ReturnAssetModal';
import { EditAssetModal } from '../components/UpdateAssetModal';
import { DeleteAssetModal } from '../components/DeleteAssetModal';

export function AssetDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchAsset = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await AssetService.getAssetById(id);
            setAsset(data);
        } catch (error) {
            console.error('Error fetching asset:', error);
            toast.error('Failed to load asset details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAsset();
    }, [id]);

    // const handleDelete = async () => { ... } // Replaced by Modal

    // Helper to find current assignment
    const currentAssignment = (asset as any)?.assignments?.find((a: any) => !a.returned_at);

    if (loading) {
        return (
            <AdminLayout title="Asset Details">
                <div className="flex items-center justify-center h-64">Loading...</div>
            </AdminLayout>
        );
    }

    if (!asset) {
        return (
            <AdminLayout title="Asset Not Found">
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">The requested asset could not be found.</p>
                    <Button onClick={() => navigate('/admin/assets')}>Back to Assets</Button>
                </div>
            </AdminLayout>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-800';
            case 'Assigned': return 'bg-blue-100 text-blue-800';
            case 'Damaged': return 'bg-red-100 text-red-800';
            case 'Lost': return 'bg-orange-100 text-orange-800';
            case 'Retired': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AdminLayout
            title={asset.name}
            description={`Asset Code: ${asset.asset_code}`}
            onBack={() => navigate('/admin/assets')}
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsEditModalOpen(true)} title="Edit Asset">
                        <Pencil className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setIsDeleteModalOpen(true)} title="Delete Asset" className="hover:bg-red-50 hover:text-red-600 border-red-200">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-300 mx-2" />

                    {(asset.status === 'Available' || asset.status === 'Returned') && (
                        <Button
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                            onClick={() => setIsAssignModalOpen(true)}
                        >
                            <UserPlus className="w-4 h-4" />
                            Assign Asset
                        </Button>
                    )}
                    {asset.status === 'Assigned' && (
                        <Button
                            variant="outline"
                            className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2"
                            onClick={() => setIsReturnModalOpen(true)}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Return Asset
                        </Button>
                    )}
                </div>
            }
        >

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-gray-500" />
                                Asset Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                    <dd className="mt-1">
                                        <Badge variant="secondary" className={getStatusColor(asset.status)}>
                                            {asset.status}
                                        </Badge>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                                    <dd className="mt-1 text-gray-900">{asset.category}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Brand</dt>
                                    <dd className="mt-1 text-gray-900">{asset.brand || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Model</dt>
                                    <dd className="mt-1 text-gray-900">{asset.model || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                                    <dd className="mt-1 text-gray-900 font-mono text-sm">{asset.serial_number || '-'}</dd>
                                </div>
                            </dl>

                            <Separator className="my-6" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                                    <dd className="mt-1 text-gray-900">{asset.purchase_date || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Purchase Cost</dt>
                                    <dd className="mt-1 text-gray-900">{asset.purchase_cost ? `$${asset.purchase_cost}` : '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Warranty Expiry</dt>
                                    <dd className="mt-1 text-gray-900">{asset.warranty_expiry_date || '-'}</dd>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assignment History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-500" />
                                Assignment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {(asset as any).assignments?.length > 0 ? (
                                    <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                        {(asset as any).assignments.map((assignment: any, index: number) => (
                                            <div key={assignment.id} className="relative pl-6">
                                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                                                <div className="space-y-1">
                                                    <p className="font-medium text-gray-900">
                                                        {assignment.returned_at ? 'Returned from' : 'Assigned to'} {assignment.employee?.full_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(assignment.assigned_at).toLocaleDateString()}
                                                        {assignment.returned_at && ` - ${new Date(assignment.returned_at).toLocaleDateString()}`}
                                                    </p>
                                                    {assignment.returned_at && (
                                                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                            <span className="font-medium">Condition on Return:</span> {assignment.condition_on_return || 'N/A'}
                                                        </p>
                                                    )}
                                                    {!assignment.returned_at && (
                                                        <p className="text-sm text-blue-600 font-medium">Currently Active</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No assignment history.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Actions / Status */}
                <div className="space-y-6">
                    {/* Could add a Current Holder card here if needed */}
                </div>
            </div>

            {/* Modals */}
            <AssignAssetModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={fetchAsset}
                assetId={asset.id}
                assetName={asset.name}
            />
            {currentAssignment && (
                <ReturnAssetModal
                    isOpen={isReturnModalOpen}
                    onClose={() => setIsReturnModalOpen(false)}
                    onSuccess={fetchAsset}
                    assetId={asset.id}
                    assetName={asset.name}
                    currentAssignmentId={currentAssignment.id}
                />
            )}
            <EditAssetModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchAsset}
                asset={asset}
            />
            <DeleteAssetModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onSuccess={() => navigate('/admin/assets')}
                asset={asset}
            />
        </AdminLayout>
    );
}
