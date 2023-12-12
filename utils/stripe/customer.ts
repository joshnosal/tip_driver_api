import Stripe from 'stripe'

if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
const stripeSDK = new Stripe(process.env.STRIPE_SECRET)

const get = async (customerId: string) => {
  return await stripeSDK.customers.retrieve(customerId)
}

const subscriptions = async(customerId: string) => {
  return (await stripeSDK.subscriptions.list({ customer: customerId })).data
}

type CreateProps = {
  email?: string
  name: string
  metadata?: {[key: string]: string}
}
const create = async({ email, name, metadata }: CreateProps) => {
  return await stripeSDK.customers.create({
    name,
    email,
    metadata
  })
}

const getPaymentMethod = async (customerId: string) => {
  const customer = await stripeSDK.customers.retrieve(customerId)
  if(customer.deleted || !customer.invoice_settings.default_payment_method) return
  const paymentMethod = await stripeSDK.customers.retrievePaymentMethod(customerId, customer.invoice_settings.default_payment_method.toString())
  return paymentMethod
}

const attachPaymentMethod = async (props: {
  paymentMethodId: string
  customerId: string
}) => {
  let oldMethods = await stripeSDK.customers.listPaymentMethods(props.customerId)

  // Attach setup intent to customer account
  let intent = await stripeSDK.setupIntents.create({
    customer: props.customerId,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    payment_method: props.paymentMethodId,
  })

  // Update subscriptions
  let subs = await stripeSDK.subscriptions.list({ customer: props.customerId })
  for(const sub of subs.data) {
    await stripeSDK.subscriptions.update(sub.id, {default_payment_method: props.paymentMethodId })
  }

  // Update customer's default payment method
  await stripeSDK.customers.update(props.customerId,{
    invoice_settings: {
      default_payment_method: props.paymentMethodId
    }
  })

  // Detach old payment methods
  for(const method of oldMethods.data) {
    await stripeSDK.paymentMethods.detach(method.id)
  }
}

const removePaymentMethod = async (customerId: string) => {
  let subs = await stripeSDK.subscriptions.list({ customer: customerId })
  for(const sub of subs.data) {
    await stripeSDK.subscriptions.cancel(sub.id, { invoice_now: true })
    let invoices = await stripeSDK.invoices.list({ subscription: sub.id, status: 'draft' })
    for(const invoice of invoices.data) {
      await stripeSDK.invoices.finalizeInvoice(invoice.id)
    }
  }
  let customer = await stripeSDK.customers.retrieve(customerId)
  if(customer.deleted || !customer.invoice_settings.default_payment_method) return
  await stripeSDK.paymentMethods.detach(customer.invoice_settings.default_payment_method.toString())
}

const customer = {
  get,
  subscriptions,
  create,
  getPaymentMethod,
  attachPaymentMethod,
  removePaymentMethod
}

export default customer