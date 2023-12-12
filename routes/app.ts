import { Router, Request, Response, RequestHandler } from 'express'
import { UserAuthRequest } from '../server'
import Company from '../models/company'
import type { CompanyProps } from '../models/company'
import Device, { DeviceProps } from '../models/device'
import { checkCompanyAuth } from './tools'
// import Stripe from 'stripe'
import stripe from '../utils/stripe'

// if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
// const stripe = new Stripe(process.env.STRIPE_SECRET)

const appRouter = Router()

type ValidationProps = {
  validCompany: boolean,
  companyCount: number,
  validDevice: boolean,
  deviceCount: number,
  company?: CompanyProps,
  device?: DeviceProps|null,
  accountActive: boolean,
  paymentsEnabled: boolean,
  stripeUpdateLink?: string
}

appRouter.get('/validate', async (req, res) => {
  const validation: ValidationProps = {
    validCompany: false,
    validDevice: false,
    companyCount: 0,
    deviceCount: 0,
    accountActive: false,
    paymentsEnabled: false
  }

  // Validate company
  try {
    validation.companyCount = await Company.countDocuments({$or: [
      {admins: req.auth.userId},
      {basic_users: req.auth.userId}
    ]})
    if(!req.header('companyId')) throw new Error()
    validation.company = await checkCompanyAuth({ companyId: req.header('companyId'), userId: req.auth.userId })
    validation.validCompany = true
  } catch(e) {
    console.log('Failed company validation', e)
    return res.send(validation)
  }

  // Check stripe customer account
  try {
    let data = await stripe.customer.subscriptions(validation.company.stripe_customer_id)
    if(data.length) validation.accountActive = true
    for(const sub of data){
      if(sub.status !== 'active' && sub.status !== 'trialing') validation.accountActive = false
    }
  } catch(e) {
    console.log('Failed to validate customer account')
  }

  // Check stripe connected account
  try {
    if(!validation.company.stripe_id) throw new Error()
    let account = await stripe.account.get(validation.company.stripe_id)
    validation.paymentsEnabled = Boolean(account.payouts_enabled && account.charges_enabled)
    validation.stripeUpdateLink = await stripe.account.getUpdateLink(
      account.id, 
      process.env.WEB_URL + '/dash/company/'+ validation.company._id+'/settings'
    )
  } catch(e) {
    console.log('Failed to validate stripe account')
  }

  // Validate device
  try {
    validation.deviceCount = await Device.countDocuments({ company: validation.company._id })
    if(!req.header('deviceId')) throw new Error()
    validation.device = await Device.findOne({$and: [
      {_id: req.header('deviceId')},
      {company: validation.company._id}
    ]})
    if(!validation.device) throw new Error()
    validation.validDevice = true
  } catch(e) {
    console.log('Failed to validate device')
  }

  res.send(validation)
})

export default appRouter