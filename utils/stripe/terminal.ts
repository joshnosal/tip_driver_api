import Stripe from 'stripe'

if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
const stripeSDK = new Stripe(process.env.STRIPE_SECRET)

const getConnectionToken = async () => {
  return await stripeSDK.terminal.connectionTokens.create()
}

const terminal = {
  getConnectionToken
}

export default terminal