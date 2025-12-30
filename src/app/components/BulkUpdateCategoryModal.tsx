import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AssetService } from '../../utils/assetService';
import { toast } from 'sonner';

// Reusing same categories as other modals
const ASSET_CATEGORIES = [
    'Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Headphones', 'Charger', 'Phone', 'Tablet', 'Adapter', 'CPU', 'Camera', 'Camera Accessories', 'Mic', 'Light', 'External Storage', 'Other',
];

interface BulkUpdateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetIds: string[];
}

interface UpdateCategoryFormValues {
    category: string;
}

export function BulkUpdateCategoryModal({ isOpen, onClose, onSuccess, assetIds }: BulkUpdateCategoryModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(modalRef);
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<UpdateCategoryFormValues>();

    const onSubmit = async (data: UpdateCategoryFormValues) => {
        setIsLoading(true);
        try {
            await AssetService.bulkUpdateCategory(assetIds, data.category);
            toast.success(`${assetIds.length} assets updated successfully`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update categories');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]" ref={modalRef}>
                <DialogHeader>
                    <DialogTitle>Bulk Update Category</DialogTitle>
                    <DialogDescription>
                        You are about to change the category for <strong>{assetIds.length}</strong> assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">New Category *</Label>
                        <Select onValueChange={(val) => setValue('category', val, { shouldValidate: true })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSET_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <input type="hidden" {...register('category', { required: 'Category is required' })} />
                        {errors.category && <span className="text-sm text-red-500">{errors.category.message}</span>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isLoading ? 'Updating...' : 'Update Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
