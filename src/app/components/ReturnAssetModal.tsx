import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { AssetService } from '../../utils/assetService';
import { toast } from 'sonner';
import { AssetStatus } from '../../types/database';

interface ReturnAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetId: string;
    assetName: string;
    currentAssignmentId: string;
}

interface ReturnFormValues {
    condition: string;
    remarks: string;
    newStatus: AssetStatus;
}

export function ReturnAssetModal({ isOpen, onClose, onSuccess, assetId, assetName, currentAssignmentId }: ReturnAssetModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, setValue } = useForm<ReturnFormValues>({
        defaultValues: {
            condition: 'Good',
            newStatus: 'Available'
        }
    });

    const onSubmit = async (data: ReturnFormValues) => {
        setIsLoading(true);
        try {
            await AssetService.returnAsset(currentAssignmentId, assetId, {
                condition: data.condition,
                remarks: data.remarks,
                newStatus: data.newStatus
            });
            toast.success('Asset returned successfully');
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to return asset');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Return Asset: {assetName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="condition">Condition on Return *</Label>
                        <Select onValueChange={(val) => setValue('condition', val)} defaultValue="Good">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Fair">Fair</SelectItem>
                                <SelectItem value="Damaged">Damaged (Needs Repair)</SelectItem>
                                <SelectItem value="Scrap">Scrap (Unusable)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newStatus">New Status *</Label>
                        <Select onValueChange={(val) => setValue('newStatus', val as AssetStatus)} defaultValue="Available">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Available">Available (In Stock)</SelectItem>
                                <SelectItem value="Damaged">Damaged</SelectItem>
                                <SelectItem value="Retired">Retired</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input id="remarks" {...register('remarks')} placeholder="Optional remarks..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isLoading ? 'Processing...' : 'Confirm Return'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
