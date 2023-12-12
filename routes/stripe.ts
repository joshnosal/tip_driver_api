import { Router } from 'express'
import { ClerkExpressWithAuth, RequireAuthProp, StrictAuthProp } from '@clerk/clerk-sdk-node'
import Company from '../models/company'
import { companyAuthMiddleware } from './tools'
import stripe from '../utils/stripe'
import clerk from '../utils/clerk'

const stripeRouter = Router()

stripeRouter.get('/account', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    if(!req.company.stripe_id) return res.send()

    res.send(await stripe.account.get(req.company.stripe_id))

  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/payment_method', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    res.send(await stripe.customer.getPaymentMethod(req.company.stripe_customer_id))
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/add_payment_method', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    const paymentMethodId = req.header('paymentMethodId')
    if(!paymentMethodId || !req.company.stripe_customer_id) throw new Error('Missing stripe account id')
    await stripe.customer.attachPaymentMethod({ paymentMethodId, customerId: req.company.stripe_customer_id })
    res.send({})
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/delete_payment_method', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    await stripe.customer.removePaymentMethod(req.company.stripe_customer_id)
    res.send({})
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/prices', async (req, res) => {
  try {
    res.send(await stripe.subscription.allPrices())
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/products', async (req, res) => {
  try {
    res.send(await stripe.subscription.allProducts())
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/create_account', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    let redirectUrl = req.header('redirectUrl')
    if(!redirectUrl) throw new Error('Missing redirect url')
    
    let { account, link } = await stripe.account.create({
      name: req.company.name,
      email: await clerk.getPrimaryEmail(req.auth.userId),
      companyId: req.company._id.toString(),
      returnUrl: redirectUrl
    })

    await Company.updateOne({ _id: req.company._id}, { stripe_id: account.id})

    res.send(link.url)

  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/update_link', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    let redirectUrl = req.header('redirectUrl')
    if(!redirectUrl) throw new Error('Missing redirect url')

    if(!req.company.stripe_id) throw new Error('Missing stripe account')
    res.send(await stripe.account.getUpdateLink(req.company.stripe_id, redirectUrl))
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/dashboard_link', companyAuthMiddleware('admin'), async (req, res) => {
  try {
    if(!req.company.stripe_id) throw new Error('Missing stripe account')
    res.send(await stripe.account.getDashboardLink(req.company.stripe_id))
  } catch(e) {
    res.sendStatus(500)
  }
})

stripeRouter.get('/public_key', (req, res) => {
  res.send(process.env.STRIPE_PUBLIC)
})

export default stripeRouter