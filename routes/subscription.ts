import { Router } from 'express'
import { ClerkExpressWithAuth, RequireAuthProp, StrictAuthProp } from '@clerk/clerk-sdk-node'
import Company from '../models/company'
import { companyAuthMiddleware } from './tools'
import Device from '../models/device'
import stripe from '../utils/stripe'

const subscriptionRouter = Router()

subscriptionRouter.get('/start', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    const priceId = req.header('priceId')
    if(!priceId) throw new Error('Missing price ID')

    const price = await stripe.subscription.getPrice(priceId)

    await stripe.subscription.start(req.company.stripe_customer_id, price.id)

    res.send({})

  } catch(e) {
    console.log('/device', e)
    res.sendStatus(500)
  }
})

subscriptionRouter.get('/stop', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    const priceId = req.header('priceId')
    if(!priceId) throw new Error('Missing price ID')

    const price = await stripe.subscription.getPrice(priceId)

    await stripe.subscription.stop(req.company.stripe_customer_id, price.id)

    res.send({})
  } catch(e) {
    console.log('/device', e)
    res.sendStatus(500)
  }
})

subscriptionRouter.get('/pause', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    const priceId = req.header('priceId')
    if(!priceId) throw new Error('Missing price ID')

    const price = await stripe.subscription.getPrice(priceId)

    await stripe.subscription.stop(req.company.stripe_customer_id, price.id)

    res.send({})

  } catch(e) {
    console.log('/device', e)
    res.sendStatus(500)
  }
})

subscriptionRouter.get('/had_trial', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    res.send(await stripe.subscription.hadTrial(req.company.stripe_customer_id))
  } catch(e) {
    res.sendStatus(500)
  }
})

subscriptionRouter.get('/customer_subscriptions', companyAuthMiddleware('admin'), async (req, res, next) => {
  try {
    res.send(await stripe.customer.subscriptions(req.company.stripe_customer_id))
  } catch(e) {
    res.sendStatus(500)
  }
})


export default subscriptionRouter