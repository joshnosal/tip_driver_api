import Stripe from 'stripe'

if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
const stripeSDK = new Stripe(process.env.STRIPE_SECRET)

const getPrice = async (priceId: string) => {
  return stripeSDK.prices.retrieve(priceId)
}

const start = async (customerId: string, priceId: string) => {
  const customer = await stripeSDK.customers.retrieve(customerId)
  if(customer.deleted) throw new Error('Customer has been deleted')

  let subs = await stripeSDK.subscriptions.list({ customer: customerId, status: 'all' })

  let hadTrial = true
  if(process.env.TRIAL_PERIOD === 'Yes') {
    hadTrial = false
    for(const sub of subs.data) {
      if(sub.trial_start) hadTrial = true
    }
  }
  // Set new trial period
  let trial_period_days = Number(process.env.TRIAL_PERIOD_DAYS || 0)
  let now = new Date()
  
  subs = await stripeSDK.subscriptions.list({ customer: customerId })
  let sub: Stripe.Subscription
  if(subs.data.length) {
    sub = subs.data[0]
    await stripeSDK.subscriptionItems.create({
      subscription: sub.id,
      price: priceId
    })
  } else {
    sub = await stripeSDK.subscriptions.create({
      customer: customerId,
      collection_method: 'charge_automatically',
      items: [{ price: priceId }],
      ...(!hadTrial && {
        trial_period_days,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel'
          }
        }
      }),
      billing_cycle_anchor: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000
    })
  }
}

const stop = async (customerId: string, priceId: string) => {
  const customer = await stripeSDK.customers.retrieve(customerId)
  if(customer.deleted) throw new Error('Customer has been deleted')

  let subs = await stripeSDK.subscriptions.list({ customer: customerId, price: priceId })
  if(!subs.data.length) {
    return
  } else if (subs.data.length < 2) {
    await stripeSDK.subscriptions.cancel(subs.data[0].id, {
      invoice_now: true,
      prorate: true
    })
  } else {
    for(const sub of subs.data) {
      for(const item of sub.items.data) {
        if(item.price.id === priceId) {
          await stripeSDK.subscriptionItems.del(item.id, {
            proration_behavior: 'always_invoice',
            clear_usage: true
          })
        }
      }
    }
  }
}

const hadTrial = async (customerId: string) => {
  const subs = await stripeSDK.subscriptions.list({customer: customerId, status: 'all'})
  for(const sub of subs.data) {
    if(sub.trial_start) return true
  }
  return false
}

const allPrices = async () => {
  return (await stripeSDK.prices.list({ expand: ['data.tiers']})).data
}

const allProducts = async () => {
  return (await stripeSDK.products.list({ expand: ['data.default_price', 'data.default_price.tiers']})).data
}


const subscription = {
  getPrice,
  start,
  stop,
  hadTrial,
  allPrices,
  allProducts
}

export default subscription