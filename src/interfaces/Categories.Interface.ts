// Modules
import { ObjectId } from 'bson';
export interface ICategories {
  _id: ObjectId;
  displayName: string;
  global: boolean;
  avatar: string;
  approvedMCCs: number[];
  blockedMCCs: number[];
  approvedMCCGroups: number[];
  blockedMCCGroups: number[];
  approvedVendors: ObjectId[]; // array of vendor ids, so category can be updated when vendor is updates
  blockedVendors: ObjectId[];
  // The Approved Auth Data is filled from any approved vendors
  approvedAuthData?: [
    {
      vendorId: ObjectId;
      authorization: {
        acceptLocation: string;
        vendorName: string;
        vendorCity: string;
        vendorState: string;
        mcc: number;
        mccDescription: string;
      };
      post?: {
        acceptLocation: string;
        vendorName: string;
        vendorCity: string;
        vendorState: string;
        mcc: number;
        mccDescription: string;
      };
    }
  ];
}
