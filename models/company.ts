import { Schema, model, models, Types, Model, InferSchemaType, Document, HydratedDocumentFromSchema } from 'mongoose';



export interface ICompany {
  name: string
  admins: string[]
  basic_users: string[],
  stripe_id?: string
  stripe_customer_id: string
  tip_levels: number[]
  custom_tip: boolean
  invites: {
    admins: string[]
    basic_users: string[]
  },
  devices: Types.ObjectId[]
}

export type CompanyProps = HydratedDocumentFromSchema<typeof companySchema>

const companySchema = new Schema<ICompany>({
  name: String,
  admins: [String],
  basic_users: [String],
  stripe_id: String,
  stripe_customer_id: String,
  tip_levels: { type: [Number], default: [2,5,10] },
  custom_tip: { type: Boolean, default: false },
  invites: {
    admins: [String],
    basic_users: [String]
  },
  devices: [{ type: Schema.Types.ObjectId, ref: 'Device' }]
}, {strict: true, timestamps: true})


const Company = model<ICompany>('Company', companySchema, 'companies')

export default Company