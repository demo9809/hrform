import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Search, Filter, Monitor, History as HistoryIcon, Download, Trash2, Cpu, Plug, Camera, Mic, Lightbulb, Aperture, ChevronLeft, ChevronRight, Layers, UserPlus, HardDrive } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AssetService } from '../../utils/assetService';
import { Asset } from '../../types/database';
import { AddAssetModal } from '../components/AddAssetModal';
import { DeleteAssetModal } from '../components/DeleteAssetModal';
import { BulkAssignModal } from '../components/BulkAssignModal';
import { BulkUpdateCategoryModal } from '../components/BulkUpdateCategoryModal';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';

export function AssetList() {
    const navigate = useNavigate();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Bulk Selection State
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
    const [isBulkCategoryOpen, setIsBulkCategoryOpen] = useState(false);

    const fetchAssets = async () => {
        setLoading(true);
        setSelectedAssetIds([]); // Clear selection on refresh
        try {
            // Fetch ALL assets to calculate stats content locally
            const data = await AssetService.fetchAssets({});
            setAssets(data || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering
    const filteredAssets = assets.filter(asset => {
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            asset.name.toLowerCase().includes(searchLower) ||
            asset.asset_code.toLowerCase().includes(searchLower) ||
            (asset.serial_number || '').toLowerCase().includes(searchLower);

        return matchesStatus && matchesCategory && matchesSearch;
    });

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedAssetIds([]); // Clear selection when filters change to avoid confusion
    }, [searchTerm, statusFilter, categoryFilter]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedAssetIds.length === paginatedAssets.length && paginatedAssets.length > 0 && selectedAssetIds.every(id => paginatedAssets.some(a => a.id === id))) {
            // If all currently visible are selected, deselect them
            setSelectedAssetIds([]);
        } else {
            // Select all visible on current page
            setSelectedAssetIds(paginatedAssets.map(a => a.id));
        }
    };

    const toggleSelectAsset = (id: string) => {
        if (selectedAssetIds.includes(id)) {
            setSelectedAssetIds(prev => prev.filter(aId => aId !== id));
        } else {
            setSelectedAssetIds(prev => [...prev, id]);
        }
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage);

    // Calculate Counts by Category
    const categoryCounts = assets.reduce((acc, asset) => {
        const cat = asset.category || 'Other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Calculate Status Counts
    const statusCounts = {
        total: assets.length,
        assigned: assets.filter(a => a.status === 'Assigned').length,
        available: assets.filter(a => a.status === 'Available').length,
        maintenance: assets.filter(a => a.status === 'Damaged' || a.status === 'Retired').length
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-800 border-green-200';
            case 'Assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Damaged': return 'bg-red-100 text-red-800 border-red-200';
            case 'Lost': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Retired': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Returned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('laptop') || cat.includes('computer') || cat.includes('mac')) return <Monitor className="w-4 h-4" />;
        if (cat.includes('phone') || cat.includes('mobile')) return <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg></div>;
        if (cat.includes('keyboard') || cat.includes('mouse')) return <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" ry="2" /><path d="M6 18h12" /></svg></div>;
        if (cat.includes('cpu') || cat.includes('processor')) return <Cpu className="w-4 h-4" />;
        if (cat.includes('adapter') || cat.includes('charger') || cat.includes('plug')) return <Plug className="w-4 h-4" />;
        if (cat.includes('camera')) return <Camera className="w-4 h-4" />;
        if (cat.includes('mic') || cat.includes('microphone')) return <Mic className="w-4 h-4" />;
        if (cat.includes('light')) return <Lightbulb className="w-4 h-4" />;
        return <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" x2="12" y1="22.08" y2="12" /></svg></div>;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');

        // Add Title
        doc.setFontSize(18);
        doc.text('Asset List', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        // Define Columns
        const tableColumn = ["Asset Code", "Name", "Category", "Status", "Assigned To", "Assigned Date", "Condition", "Serial Number", "Model", "Purchase Date", "Price"];
        const tableRows: any[] = [];

        assets.forEach(asset => {
            const assetData = [
                asset.asset_code,
                asset.name,
                asset.category,
                asset.status,
                asset.current_assignment?.employee?.full_name || (asset.status === 'Returned' ? `Returned from ${asset.current_assignment?.employee?.full_name || 'Unknown'}` : 'Unassigned'),
                asset.current_assignment?.assigned_at ? new Date(asset.current_assignment.assigned_at).toLocaleDateString() : '-',
                asset.condition || '-',
                asset.serial_number || '-',
                asset.model || '-',
                asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-',
                asset.purchase_cost ? asset.purchase_cost.toString() : '-'
            ];
            tableRows.push(assetData);
        });

        // Generate Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 20 }, // Code
                1: { cellWidth: 30 }, // Name
                2: { cellWidth: 20 }, // Category
                3: { cellWidth: 20 }, // Status
                4: { cellWidth: 35 }, // Assigned To
                5: { cellWidth: 25 }, // Assigned Date
                6: { cellWidth: 20 }, // Condition
                7: { cellWidth: 25 }, // Serial
                8: { cellWidth: 25 }, // Model
                9: { cellWidth: 25 }, // Date
                10: { cellWidth: 15 }, // Price
            }
        });

        doc.save('asset_list.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(assets.map(asset => ({
            "Asset Code": asset.asset_code,
            "Name": asset.name,
            "Category": asset.category,
            "Status": asset.status,
            "Assigned To": asset.current_assignment?.employee?.full_name || (asset.status === 'Returned' ? `Returned from ${asset.current_assignment?.employee?.full_name || 'Unknown'}` : 'Unassigned'),
            "Assigned Date": asset.current_assignment?.assigned_at ? new Date(asset.current_assignment.assigned_at).toLocaleDateString() : '-',
            "Condition": asset.condition,
            "Serial Number": asset.serial_number,
            "Model": asset.model,
            "Purchase Date": asset.purchase_date,
            "Purchase Price": asset.purchase_cost
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
        XLSX.writeFile(workbook, "asset_list.xlsx");
    };

    return (
        <AdminLayout
            title="Asset Management"
            description="Manage company assets and assignments."
            actions={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportPDF}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Asset
                    </Button>
                </div>
            }
        >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 border-b border-gray-100 bg-gray-50/30">
                    {/* Summary Card */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                        <span className="text-xs text-gray-500 font-medium uppercase">Total Assets</span>
                        <div className="flex justify-between items-end">
                            <span className="text-2xl font-bold text-gray-900">{statusCounts.total}</span>
                            <div className="p-1.5 bg-gray-100 rounded-md">
                                <Monitor className="w-4 h-4 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Category Cards */}
                    {Object.entries(categoryCounts).map(([cat, count]) => (
                        <div key={cat} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                            <span className="text-xs text-gray-500 font-medium uppercase truncate" title={cat}>{cat}</span>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-bold text-gray-900">{count}</span>
                                <div className="p-1.5 bg-teal-50 rounded-md text-teal-600">
                                    {getCategoryIcon(cat)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search by code, name, or serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border border-gray-300 focus:border-teal-500 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full md:w-[180px] bg-white border border-gray-300 focus:ring-teal-500">
                                <SelectValue placeholder="Filter by Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {Object.keys(categoryCounts).sort().map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px] bg-white border border-gray-300 focus:ring-teal-500">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Assigned">Assigned</SelectItem>
                                <SelectItem value="Returned">Returned</SelectItem>
                                <SelectItem value="Damaged">Damaged</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                                <SelectItem value="Retired">Retired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table for Desktop */}
                <div className="hidden md:block overflow-x-auto">
                    {/* Bulk Actions Bar */}
                    {selectedAssetIds.length > 0 && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 pl-2">
                                <span className="text-sm font-medium text-teal-800">{selectedAssetIds.length} assets selected</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="bg-white border-teal-200 text-teal-700 hover:bg-teal-100" onClick={() => setIsBulkCategoryOpen(true)}>
                                    <Layers className="w-4 h-4 mr-2" />
                                    Change Category
                                </Button>
                                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setIsBulkAssignOpen(true)}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Assign Selected
                                </Button>
                            </div>
                        </div>
                    )}

                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead className="w-[50px] pl-6">
                                    <Checkbox
                                        checked={paginatedAssets.length > 0 && selectedAssetIds.length === paginatedAssets.length && paginatedAssets.every(a => selectedAssetIds.includes(a.id))}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-gray-600">Asset Info</TableHead>
                                <TableHead className="font-semibold text-gray-600">Category</TableHead>
                                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                                <TableHead className="font-semibold text-gray-600">Assigned To</TableHead>
                                <TableHead className="text-right font-semibold text-gray-600 pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                                            Loading assets...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredAssets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                        No assets found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedAssets.map((asset) => (
                                    <TableRow
                                        key={asset.id}
                                        className={`hover:bg-gray-50 cursor-pointer group transition-colors ${selectedAssetIds.includes(asset.id) ? 'bg-teal-50/30' : ''}`}
                                        onClick={(e) => {
                                            // Handle row click navigation, but ignore if clicking checkbox
                                            if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                                            navigate(`/admin/assets/${asset.id}`);
                                        }}
                                    >
                                        <TableCell className="pl-6">
                                            <Checkbox
                                                checked={selectedAssetIds.includes(asset.id)}
                                                onCheckedChange={() => toggleSelectAsset(asset.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label={`Select ${asset.name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                                    {getCategoryIcon(asset.category)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{asset.name}</span>
                                                    <span className="text-xs text-gray-500 font-mono">{asset.asset_code}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                                {asset.category}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-normal ${getStatusColor(asset.status)}`}>
                                                {asset.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {asset.current_assignment?.employee ? (
                                                asset.status === 'Returned' ? (
                                                    <div className="flex items-center gap-2 opacity-75">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold border border-gray-200">
                                                            <HistoryIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-600">From: {asset.current_assignment.employee.full_name}</span>
                                                            <span className="text-xs text-gray-500">
                                                                Returned {asset.current_assignment.returned_at ? new Date(asset.current_assignment.returned_at).toLocaleDateString() : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
                                                            {getInitials(asset.current_assignment.employee.full_name)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900">{asset.current_assignment.employee.full_name}</span>
                                                            <span className="text-xs text-gray-500">
                                                                Since {new Date(asset.current_assignment.assigned_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                                                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-500 italic">Unassigned</span>
                                                        <span className="text-xs text-gray-400">In Stock</span>
                                                    </div>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/admin/assets/${asset.id}`);
                                                    }}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAssetToDelete(asset);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden divide-y divide-gray-200">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No assets found matching your filters.</div>
                    ) : (
                        filteredAssets.map((asset) => (
                            <div
                                key={asset.id}
                                className="p-4 bg-white active:bg-gray-50 cursor-pointer"
                                onClick={() => navigate(`/admin/assets/${asset.id}`)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                            {getCategoryIcon(asset.category)}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{asset.name}</h3>
                                            <p className="text-xs text-gray-500 font-mono">{asset.asset_code}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`${getStatusColor(asset.status)}`}>
                                        {asset.status}
                                    </Badge>
                                </div>

                                {asset.current_assignment?.employee ? (
                                    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 mt-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
                                            {getInitials(asset.current_assignment.employee.full_name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{asset.current_assignment.employee.full_name}</p>
                                            <p className="text-xs text-gray-500">Assigned: {new Date(asset.current_assignment.assigned_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 text-sm text-gray-500 italic pl-1">
                                        Available in stock
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Show</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) => {
                                setItemsPerPage(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[70px] bg-white h-8 border-gray-300">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>entries</span>
                        <span className="text-gray-400 mx-2">|</span>
                        <span>
                            Showing {Math.min(filteredAssets.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredAssets.length, currentPage * itemsPerPage)} of {filteredAssets.length} entries
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-sm font-medium text-gray-900">
                            Page {currentPage} of {Math.max(1, totalPages)}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <AddAssetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchAssets}
            />
            <DeleteAssetModal
                isOpen={!!assetToDelete}
                onClose={() => setAssetToDelete(null)}
                asset={assetToDelete}
                onSuccess={() => {
                    fetchAssets();
                    setAssetToDelete(null);
                }}
            />
            <BulkAssignModal
                isOpen={isBulkAssignOpen}
                onClose={() => setIsBulkAssignOpen(false)}
                onSuccess={() => {
                    fetchAssets();
                    setSelectedAssetIds([]);
                }}
                assetIds={selectedAssetIds}
            />
            <BulkUpdateCategoryModal
                isOpen={isBulkCategoryOpen}
                onClose={() => setIsBulkCategoryOpen(false)}
                onSuccess={() => {
                    fetchAssets();
                    setSelectedAssetIds([]);
                }}
                assetIds={selectedAssetIds}
            />
        </AdminLayout >
    );
}
