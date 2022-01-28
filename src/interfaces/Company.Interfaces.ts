// Modules
import { Decimal128, Int32 } from 'bson';

export interface ICompany {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
  accountCode?: string;
  identities?: {
    connection: 'waads' | 'google-oauth2' | 'apple';
    domains: string[];
    waadTenantIds: string[];
  }[];
  customerIdP?: string;
  customerIdV?: string;
  customerIdG?: string;
  paymentTerm?: 'PREFUNDED' | '7+1-CDN-ACH' | '14+1-CDN-ACH' | '30+1-CDN-ACH';
  slug?: string;
  website?: string;
  location?: {
    type: string;
    coordinates: Decimal128[];
    formattedAddress: string;
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  logoLink?: string;
  creditRating?: Int32;
  entityType?:
    | 'Sole Proprietorship'
    | 'General Partnership'
    | 'Limited Partnership'
    | 'Limited Liability Company (LLC)'
    | 'C-Corporation'
    | 'S-Corporation'
    | 'Non-Profit';
  taxId?: string;
  yearlyRevenue?: Decimal128;
  metaData?: { costCodes: Record<string, unknown>[] };
  accountStatus?: string;
  creditLimit?: string;
  accountBalance?: string;
  lastDepositAmount?: string;
  lastDepositDate?: string;
  preAuthAmount?: string;
  unbilledAmount?: string;
  pendingCardCharges?: string;
  pendingCardApprovals?: string;
}
