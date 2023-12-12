import Stripe from 'stripe'

if(!process.env.STRIPE_SECRET) throw new Error('Missing stripe credentials')
const stripeSDK = new Stripe(process.env.STRIPE_SECRET)

const get = async (id: string) => {
  const account = await stripeSDK.accounts.retrieve(id)
  return account
}

const getUpdateLink = async (id: string, url: string) => {
  const link = await stripeSDK.accountLinks.create({
    account: id,
    type: 'account_onboarding',
    refresh_url: url,
    return_url: url
  })
  return link.url
}

const getDashboardLink = async (accountId: string) => {
  let link = await stripeSDK.accounts.createLoginLink(accountId)
  return link.url
}

const create = async ({ name, email, companyId, returnUrl}: {name: string, email: string, companyId: string, returnUrl: string}) => {
  let account = await stripeSDK.accounts.create({
    type: 'express',
    business_type: 'company',
    business_profile: {
      name,
      support_email: email
    },
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: {
      companyId
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'weekly',
          weekly_anchor: 'monday'
        },
        debit_negative_balances: false
      }
    }
  })
  const link = await stripeSDK.accountLinks.create({
    account: account.id,
    type: 'account_onboarding',
    refresh_url: returnUrl,
    return_url: returnUrl
  })
  return { account, link }
}


const account = {
  get,
  getUpdateLink,
  getDashboardLink,
  create
}

export default account