import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AssetService } from '../../utils/assetService';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
    assigned_to?: string;
}

const ASSET_CATEGORIES = [
    'Laptop',
    'Monitor',
    'Mouse',
    'Keyboard',
    'Headphones',
    'Charger',
    'Phone',
    'Tablet',
    'Adapter',
    'CPU',
    'Camera',
    'Camera Accessories',
    'Mic',
    'Light',
    'External Storage',
    'Other',
];

export function AddAssetModal({ isOpen, onClose, onSuccess }: AddAssetModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<{ id: string, full_name: string, employee_id: string }[]>([]);

    // Using simple effect to fetch employees when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchEmployees = async () => {
                const { data } = await supabase
                    .from('employees')
                    .select('id, full_name, employee_id')
                    // Removed status filter to show all employees as requested
                    .order('full_name');
                if (data) setEmployees(data);
            };
            fetchEmployees();
        }
    }, [isOpen]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AssetFormValues>({
        defaultValues: {
            assigned_to: 'HR'
        }
    });

    const onSubmit = async (data: AssetFormValues) => {
        setIsLoading(true);
        try {
            // 1. Create the asset
            // Explicitly destruct assigned_to to exclude it from the asset creation payload
            const { assigned_to, ...assetData } = data;

            const createdAsset = await AssetService.createAsset({
                ...assetData,
                status: 'Available',
                purchase_cost: data.purchase_cost ? Number(data.purchase_cost) : undefined,
                purchase_date: data.purchase_date ? data.purchase_date : undefined,
                warranty_expiry_date: data.warranty_expiry_date ? data.warranty_expiry_date : undefined,
            });

            // 2. If assigned to an employee (UUID), create assignment record
            if (data.assigned_to && data.assigned_to !== 'HR' && createdAsset) {
                await AssetService.assignAsset(createdAsset.id, data.assigned_to, {
                    condition: 'New',
                    remarks: 'Initial assignment upon creation'
                });
            }

            toast.success('Asset created successfully');
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create asset');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label htmlFor="asset_code">Asset Code *</Label>
                            <Input
                                id="asset_code"
                                placeholder="e.g. LAP-001"
                                {...register('asset_code', { required: 'Asset Code is required' })}
                            />
                            {errors.asset_code && <span className="text-sm text-red-500">{errors.asset_code.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Asset Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. MacBook Pro M3"
                                {...register('name', { required: 'Asset Name is required' })}
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select onValueChange={(val) => setValue('category', val, { shouldValidate: true })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" {...register('category', { required: 'Category is required' })} />
                            {errors.category && <span className="text-sm text-red-500">{errors.category.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assigned_to">Assign To *</Label>
                            <Select defaultValue="HR" onValueChange={(val) => setValue('assigned_to', val, { shouldValidate: true })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HR">HR Department (In Stock)</SelectItem>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name} ({emp.employee_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" {...register('assigned_to', { required: 'Assignment is required' })} />
                            {errors.assigned_to && <span className="text-sm text-red-500">{errors.assigned_to.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input id="brand" {...register('brand')} placeholder="e.g. Apple" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="model">Model</Label>
                            <Input id="model" {...register('model')} placeholder="e.g. A2992" />
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
                            <Input type="number" step="0.01" id="purchase_cost" {...register('purchase_cost')} placeholder="0.00" />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isLoading ? 'Create Asset' : 'Create Asset'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
