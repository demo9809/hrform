import { supabase } from './supabase/client';
import { Asset, AssetAssignment, AssetStatus } from '../types/database';

export const AssetService = {
    async fetchAssets(filters?: { status?: string; category?: string; search?: string }) {
        let query = supabase
            .from('assets')
            .select(`
        *,
        current_assignment:asset_assignments!left(
          id,
          employee_id,
          assigned_at,
          employee:employees!left(full_name, employee_id)
        )
      `)
            .order('created_at', { ascending: false });

        // We only want the *active* assignment for the 'current_assignment' join
        // Typically this is done by filtering where returned_at is null.
        // However, Supabase joins with filters can be tricky. 
        // For a simple list, we might just fetch all and filter in memory or rely on status='Assigned'

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.category) {
            query = query.eq('category', filters.category);
        }
        if (filters?.search) {
            query = query.or(`asset_code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Post-process: 'current_assignment' comes back as an array [Assignment, ...] due to 1:M relation.
        // We need to find the one that is active (returned_at is null) and set it as the single object.
        const processedData = (data || []).map((asset: any) => {
            const assignments = Array.isArray(asset.current_assignment) ? asset.current_assignment : [];
            // Sort by assigned_at desc to get the latest interaction
            assignments.sort((a: any, b: any) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
            const latest = assignments[0];

            return {
                ...asset,
                current_assignment: latest || null
            };
        });

        return processedData as Asset[];
    },

    async getAssetById(id: string) {
        const { data, error } = await supabase
            .from('assets')
            .select(`
        *,
        assignments:asset_assignments(
          *,
          employee:employees(full_name, employee_id, department)
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('assets')
            .insert(asset)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateAsset(id: string, updates: Partial<Asset>) {
        const { data, error } = await supabase
            .from('assets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async assignAsset(
        assetId: string,
        employeeId: string,
        details: { condition: string; remarks?: string; assignedBy?: string }
    ) {
        // 1. Create assignment record
        const { error: assignmentError } = await supabase
            .from('asset_assignments')
            .insert({
                asset_id: assetId,
                employee_id: employeeId,
                condition_on_assignment: details.condition,
                remarks: details.remarks,
                assigned_by: details.assignedBy,
                assigned_at: new Date().toISOString(),
            });

        if (assignmentError) throw assignmentError;

        // 2. Update asset status
        const { data, error: updateError } = await supabase
            .from('assets')
            .update({ status: 'Assigned' })
            .eq('id', assetId)
            .select()
            .single();

        if (updateError) throw updateError;
        return data;
    },

    async returnAsset(
        assignmentId: string,
        assetId: string,
        details: { condition: string; remarks?: string; newStatus: AssetStatus }
    ) {
        // 1. Close the assignment
        const { error: assignmentError } = await supabase
            .from('asset_assignments')
            .update({
                returned_at: new Date().toISOString(),
                condition_on_return: details.condition,
                // We might want to append remarks instead of overwriting, or just assume the new remarks are for the return
            })
            .eq('id', assignmentId);

        if (assignmentError) throw assignmentError;

        // 2. Update asset status
        const { data, error: updateError } = await supabase
            .from('assets')
            .update({ status: 'Returned' }) // Or 'Available' based on inspection? Usually needs check.
            .eq('id', assetId)
            .select()
            .single();

        if (updateError) throw updateError;
        return data;
    },



    async deleteAsset(id: string) {
        // 1. Delete all assignments for this asset (Manual Cascade)
        const { error: assignmentError } = await supabase
            .from('asset_assignments')
            .delete()
            .eq('asset_id', id);

        if (assignmentError) throw assignmentError;

        // 2. Delete the asset itself
        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getEmployeeAssets(employeeId: string) {
        const { data, error } = await supabase
            .from('asset_assignments')
            .select(`
        *,
        asset:assets(*)
      `)
            .eq('employee_id', employeeId)
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        return data as AssetAssignment[];
    }
};
