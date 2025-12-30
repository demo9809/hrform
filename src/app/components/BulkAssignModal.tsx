import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { AssetService } from '../../utils/assetService';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface BulkAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetIds: string[];
}

interface AssignFormValues {
    employee_id: string;
    condition: string;
    remarks: string;
}

export function BulkAssignModal({ isOpen, onClose, onSuccess, assetIds }: BulkAssignModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(modalRef);
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<{ id: string, full_name: string, employee_id: string }[]>([]);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AssignFormValues>({
        defaultValues: {
            condition: 'Good',
            remarks: ''
        }
    });

    useEffect(() => {
        if (isOpen) {
            const fetchEmployees = async () => {
                const { data } = await supabase
                    .from('employees')
                    .select('id, full_name, employee_id')
                    .order('full_name');
                if (data) setEmployees(data);
            };
            fetchEmployees();
        }
    }, [isOpen]);

    const onSubmit = async (data: AssignFormValues) => {
        setIsLoading(true);
        try {
            await AssetService.bulkAssignAsset(assetIds, data.employee_id, {
                condition: data.condition,
                remarks: data.remarks
            });
            toast.success(`${assetIds.length} assets assigned successfully`);
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to assign assets');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]" ref={modalRef}>
                <DialogHeader>
                    <DialogTitle>Bulk Assign Assets</DialogTitle>
                    <DialogDescription>
                        You are about to assign <strong>{assetIds.length}</strong> assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="employee_id">Assign To *</Label>
                        <Select onValueChange={(val) => setValue('employee_id', val, { shouldValidate: true })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.full_name} ({emp.employee_id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <input type="hidden" {...register('employee_id', { required: 'Employee is required' })} />
                        {errors.employee_id && <span className="text-sm text-red-500">{errors.employee_id.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="condition">Condition (for all) *</Label>
                        <Select onValueChange={(val) => setValue('condition', val)} defaultValue="Good">
                            <SelectTrigger>
                                <SelectValue placeholder="Select Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Fair">Fair</SelectItem>
                                <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks (for all)</Label>
                        <Input id="remarks" {...register('remarks')} placeholder="Optional remarks..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {isLoading ? 'Assign All' : 'Assign Assets'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
