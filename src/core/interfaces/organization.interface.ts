export interface Area {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface AreaWriteData {
  code: string;
  name: string;
  active: boolean;
}

export interface Specialty {
  id: number;
  name: string;
}

export interface SpecialtyWriteData {
  name: string;
}

export interface Team {
  id: number;
  area: number;
  area_name: string;
  name: string;
  active: boolean;
  active_members: number;
}

export interface TeamWriteData {
  area: number;
  name: string;
  active: boolean;
}

export interface TeamMember {
  id: number;
  worker: number;
  worker_name: string;
  joined_date: string;
  left_date: string | null;
}

export interface TeamMemberWriteData {
  worker_id: number;
  joined_date?: string;
}
