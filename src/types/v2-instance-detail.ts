import type { JsonRecord } from "@/types/json"

export interface V2CategoryRef {
  id: string
  name: string
  display_name?: string | null
}

export interface V2FranchiseRef {
  id: string
  code: string
  name: string
}

export interface V2ProgramRef {
  id: string
  name: string
  display_name?: string | null
  description?: string | null
  category_id?: string
  franchise_id?: string
  category?: V2CategoryRef | V2CategoryRef[] | null
  franchise?: V2FranchiseRef | V2FranchiseRef[] | null
}

export interface V2OfferingTypeRef {
  id: string
  code: string
  name: string
  offering_schema?: { fields?: Record<string, { display_scope?: string }> } | null
  instance_schema?: { fields?: Record<string, { display_scope?: string }> } | null
}

export interface V2OfferingRef {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  base_price?: number | null
  poster_url?: string | null
  status: string
  type_config_data?: JsonRecord | null
  offering_type_id?: string
  offering_type?: V2OfferingTypeRef | V2OfferingTypeRef[] | null
}

export interface V2CampusRef {
  id: string
  name: string
  display_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

/** Row shape from v2_instance select with program/offering/campus joins. */
export interface V2InstanceDetailRow {
  id: string
  program_id: string
  offering_id: string
  campus_id?: string | null
  status: string
  price_override?: number | null
  current_students?: number | null
  start_date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  max_students?: number | null
  amilia_link?: string | null
  instance_data_ext?: JsonRecord | null
  program?: V2ProgramRef | V2ProgramRef[] | null
  offering?: V2OfferingRef | V2OfferingRef[] | null
  campus?: V2CampusRef | V2CampusRef[] | null
}
