export interface AccountFilters { search?: string; active?: boolean }
export interface RecoveryRequestFilters { search?: string }
export interface InvitationData {
  first_names: string; last_names: string; email: string; role: string;
  all_areas: boolean; area_ids: number[];
}
