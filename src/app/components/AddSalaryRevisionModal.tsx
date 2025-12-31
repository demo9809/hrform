import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { X, Loader2 } from 'lucide-react';

interface AddSalaryRevisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    currentSalary?: number;
}

export function AddSalaryRevisionModal({ isOpen, onClose, onSuccess, employeeId, currentSalary }: AddSalaryRevisionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        effective_date: new Date().toISOString().split('T')[0],
        reason: 'Annual Hike',
        comments: ''
    });

    const percentageChange = currentSalary && formData.amount
        ? ((parseFloat(formData.amount) - currentSalary) / currentSalary) * 100
        : null;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('salary_revisions')
                .insert({
                    employee_id: employeeId,
                    amount: parseFloat(formData.amount),
                    effective_date: formData.effective_date,
                    reason: formData.reason,
                    comments: formData.comments,
                });

            if (error) throw error;

            toast.success('Salary revision added successfully');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                amount: '',
                effective_date: new Date().toISOString().split('T')[0],
                reason: 'Annual Hike',
                comments: ''
            });
        } catch (error) {
            console.error('Error adding salary revision:', error);
            toast.error('Failed to add salary revision');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Add Salary Revision</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Salary Amount (Monthly)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="e.g. 50000"
                            />
                            {currentSalary && (
                                <div className="absolute right-3 top-2 text-xs text-gray-400">
                                    Current: ₹{currentSalary.toLocaleString('en-IN')}
                                </div>
                            )}
                        </div>
                        {percentageChange !== null && !isNaN(percentageChange) && (
                            <p className={`text-xs mt-1 font-medium ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentageChange >= 0 ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(2)}% {percentageChange >= 0 ? 'Hike' : 'Decrease'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Effective Date
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.effective_date}
                            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Can be past (backdated) or future date.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason
                        </label>
                        <select
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="Annual Hike">Annual Hike</option>
                            <option value="Probation Confirmation">Probation Confirmation</option>
                            <option value="Promotion">Promotion</option>
                            <option value="Correction">Correction</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comments (Optional)
                        </label>
                        <textarea
                            value={formData.comments}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            rows={3}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Revision'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
