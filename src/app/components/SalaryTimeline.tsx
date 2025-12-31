import { TrendingUp, TrendingDown, Circle, Calendar, ArrowRight, Edit2, Trash2 } from 'lucide-react';
import { SalaryRevision } from '../../types/database';

interface SalaryTimelineProps {
    revisions: SalaryRevision[];
    onEdit: (revision: SalaryRevision) => void;
    onDelete: (id: string) => void;
    currentSalary?: number;
    nextIncrementDate?: string;
}

export function SalaryTimeline({ revisions, onEdit, onDelete, currentSalary, nextIncrementDate }: SalaryTimelineProps) {
    // Sort revisions by effective_date ASC
    const sortedRevisions = [...revisions].sort((a, b) =>
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                    <div className="text-sm text-teal-600 font-medium mb-1">Current Salary</div>
                    <div className="text-2xl font-bold text-teal-900">
                        {currentSalary ? `₹${currentSalary.toLocaleString('en-IN')}` : 'N/A'}
                    </div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="text-sm text-indigo-600 font-medium mb-1">Next Increment Due</div>
                    <div className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 opacity-75" />
                        {nextIncrementDate ? new Date(nextIncrementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Scheduled'}
                    </div>
                </div>
            </div>

            <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 py-2">
                {sortedRevisions.length === 0 ? (
                    <div className="pl-6 text-gray-500 text-sm italic">No salary history recorded.</div>
                ) : (
                    sortedRevisions.map((rev, index) => {
                        const prevRev = index > 0 ? sortedRevisions[index - 1] : null;
                        const isGrowth = prevRev ? rev.amount > prevRev.amount : true;
                        const diff = prevRev ? rev.amount - prevRev.amount : 0;
                        const percentage = prevRev && prevRev.amount > 0
                            ? ((diff / prevRev.amount) * 100).toFixed(1)
                            : null;

                        return (
                            <div key={rev.id} className="relative pl-6 group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isGrowth ? 'bg-teal-500' : 'bg-orange-500'}`}></div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:shadow-sm transition-shadow">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 text-lg">
                                                ₹{rev.amount.toLocaleString('en-IN')}
                                            </span>
                                            {percentage && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isGrowth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {isGrowth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {percentage}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions (Edit/Delete) - Visible on Hover or Always */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onEdit(rev)}
                                                className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                title="Edit Revision"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(rev.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Revision"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(rev.effective_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        <span className="text-gray-300 mx-2">|</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                                            {rev.reason}
                                        </span>
                                    </div>

                                    {rev.comments && (
                                        <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100 italic">
                                            "{rev.comments}"
                                        </p>
                                    )}

                                    {/* Growth Details for non-first entries */}
                                    {prevRev && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                                            <span>Previous: ₹{prevRev.amount.toLocaleString('en-IN')}</span>
                                            <ArrowRight className="w-3 h-3" />
                                            <span className={isGrowth ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                {isGrowth ? '+' : ''}₹{diff.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
