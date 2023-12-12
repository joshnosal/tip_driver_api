import { Schema, model, models, Types, Model, Document, HydratedDocument, HydratedDocumentFromSchema } from 'mongoose';

interface IDevice {
  name: string
  company: Types.ObjectId
  device_id: string
  last_used: string
  status: 'active'|'deleted'
  ip_address: string
}

export type DeviceProps = HydratedDocumentFromSchema<typeof deviceSchema>

const deviceSchema = new Schema<IDevice>({
  name: { type: String, required: true },
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  device_id: { type: String, required: true },
  last_used: Date,
  status: { type: String, default: 'active' },
  ip_address: { type: String, required: true }
}, {strict: true, timestamps: true})

const Device = model<IDevice>('Device', deviceSchema, 'devices')

export default Device

