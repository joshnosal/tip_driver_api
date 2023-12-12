import type { StrictAuthProp } from '@clerk/clerk-sdk-node'
import type { Request as ExpressRequest } from 'express'
import type { CompanyProps } from './models/company'

declare global {
  namespace Express {
    export interface Request extends StrictAuthProp {
      company: CompanyProps
    }
  }
}
export {}