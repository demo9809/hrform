import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AssetService } from '../../utils/assetService';
import { toast } from 'sonner';
import { Asset } from '../../types/database';

interface EditAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset: Asset;
}

interface AssetFormValues {
    name: string;
    asset_code: string;
    category: string;
    brand: string;
    model: string;
    serial_number: string;
    purchase_date: string;
    purchase_cost: number;
    warranty_expiry_date: string;
    status: string;
}

const ASSET_CATEGORIES = [
    'Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphones', 'Charger', 'Phone', 'Tablet', 'Adapter', 'CPU', 'Camera', 'Camera Accessories', 'Mic', 'Light', 'Other',
];

export function EditAssetModal({ isOpen, onClose, onSuccess, asset }: EditAssetModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AssetFormValues>();

    useEffect(() => {
        if (asset && isOpen) {
            setValue('name', asset.name);
            setValue('asset_code', asset.asset_code);
            setValue('category', asset.category);
            setValue('brand', asset.brand || '');
            setValue('model', asset.model || '');
            setValue('serial_number', asset.serial_number || '');
            setValue('purchase_date', asset.purchase_date || '');
            setValue('purchase_cost', asset.purchase_cost || 0);
            setValue('warranty_expiry_date', asset.warranty_expiry_date || '');
            setValue('status', asset.status);
        }
    }, [asset, isOpen, setValue]);

    const onSubmit = async (data: AssetFormValues) => {
        setIsLoading(true);
        try {
            await AssetService.updateAsset(asset.id, {
                ...data,
                status: data.status as any,
                purchase_cost: data.purchase_cost !== undefined && data.purchase_cost !== null ? Number(data.purchase_cost) : undefined,
                purchase_date: (data.purchase_date || null) as any,
                warranty_expiry_date: (data.warranty_expiry_date || null) as any,
            });
            toast.success('Asset updated successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update asset');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Asset</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label htmlFor="asset_code">Asset Code *</Label>
                            <Input
                                id="asset_code"
                                {...register('asset_code', { required: 'Asset Code is required' })}
                            />
                            {errors.asset_code && <span className="text-sm text-red-500">{errors.asset_code.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Asset Name *</Label>
                            <Input
                                id="name"
                                {...register('name', { required: 'Asset Name is required' })}
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select onValueChange={(val) => setValue('category', val)} defaultValue={asset.category}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select onValueChange={(val) => setValue('status', val as any)} defaultValue={asset.status}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Assigned">Assigned</SelectItem>
                                    <SelectItem value="Returned">Returned</SelectItem>
                                    <SelectItem value="Damaged">Damaged</SelectItem>
                                    <SelectItem value="Lost">Lost</SelectItem>
                                    <SelectItem value="Retired">Retired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input id="brand" {...register('brand')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="model">Model</Label>
                            <Input id="model" {...register('model')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serial_number">Serial Number</Label>
                            <Input id="serial_number" {...register('serial_number')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_date">Purchase Date</Label>
                            <Input type="date" id="purchase_date" {...register('purchase_date')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="warranty_expiry_date">Warranty Expiry</Label>
                            <Input type="date" id="warranty_expiry_date" {...register('warranty_expiry_date')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_cost">Cost</Label>
                            <Input type="number" step="0.01" id="purchase_cost" {...register('purchase_cost')} />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
