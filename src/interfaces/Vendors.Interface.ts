import { ObjectId } from 'bson';

// Modules
export interface IVendor {
  _id: ObjectId;
  displayName: string;
  searchName: string;
  companyName: string;
  rawName: string;
  vendorType: 'online' | 'multi' | 'brick';
  international: boolean;
  reviewFlag: boolean;
  avatar: string;
  primaryLocationId: ObjectId;
  primaryLocation: {
    type: 'Point';
    coordinates: [number, number];
    formattedAddress: string;
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  approvedAuthData: [
    {
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
  verifyFunc: string;
  mccArray: number[];
  mccGroup: number[];
  vendrixCategory?: string[];
  //vendrixCategoryId?: ObjectId[];
}
