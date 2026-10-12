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
