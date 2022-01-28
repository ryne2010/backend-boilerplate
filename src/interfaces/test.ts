// // Generated by ts-to-zod
// import { ObjectId } from 'bson';
// import { z } from 'zod';

// export const iVendorSchema = z.object({
//   _id: z.instanceof(ObjectId),
//   displayName: z.string(),
//   searchName: z.string(),
//   companyName: z.string(),
//   rawName: z.string(),
//   vendorType: z.union([
//     z.literal('online'),
//     z.literal('multi'),
//     z.literal('brick'),
//   ]),

//   international: z.boolean(),
//   reviewFlag: z.boolean(),
//   avatar: z.string(),
//   primaryLocationId: z.instanceof(ObjectId),
//   primaryLocation: z.object({
//     type: z.literal('Point'),
//     coordinates: z.tuple([z.number(), z.number()]),
//     formattedAddress: z.string(),
//     street: z.string(),
//     city: z.string(),
//     state: z.string(),
//     zipcode: z.string(),
//     country: z.string(),
//   }),
//   approvedAuthData: z.tuple([
//     z.object({
//       authorization: z.object({
//         acceptLocation: z.string(),
//         vendorName: z.string(),
//         vendorCity: z.string(),
//         vendorState: z.string(),
//         mcc: z.number(),
//         mccDescription: z.string(),
//       }),
//       post: z
//         .object({
//           acceptLocation: z.string(),
//           vendorName: z.string(),
//           vendorCity: z.string(),
//           vendorState: z.string(),
//           mcc: z.number(),
//           mccDescription: z.string(),
//         })
//         .optional(),
//     }),
//   ]),
//   verifyFunc: z.string(),
//   mccArray: z.array(z.number()),
//   mccGroup: z.array(z.number()),
//   vendrixCategory: z.array(z.string()).optional(),
// });