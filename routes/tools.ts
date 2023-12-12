import { Router, Request, Response, RequestHandler } from 'express'
import { UserAuthRequest } from '../server'
import Company from '../models/company'
import type { CompanyProps } from '../models/company'
import { DeviceProps } from '../models/device'

type CheckAuthProps = {companyId?: string|null, userId?: string|null, role?: 'admin' }
export const checkCompanyAuth = async ({ companyId, userId, role }: CheckAuthProps): Promise<CompanyProps> => {
  if(!companyId || !userId) throw new Error()
  if(role === 'admin') {
    let company = await Company.findOne({$and: [
      { _id: companyId },
      { admins: userId }
    ]})
    if(!company) throw new Error()
    return company
  } else {
    let company = await Company.findOne({$and: [
      { _id: companyId },
      {$or: [
        { admins: userId },
        { basic_users: userId }
      ]}
    ]})
    if(!company) throw new Error()
    return company
  }
}

export const companyAuthMiddleware = (role?: 'admin'): RequestHandler => async (req, res, next) => {
  try {
    req.company = await checkCompanyAuth({
      companyId: req.header('companyId'),
      userId: req.auth.userId,
      role
    })
    next()
  } catch(e) {
    res.sendStatus(401)
  }
}

