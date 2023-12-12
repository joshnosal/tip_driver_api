import { User, clerkClient } from '@clerk/clerk-sdk-node'

const getPrimaryEmail = async (user: string|User): Promise<string> => {
  if(typeof user === 'string') {
    user = await clerkClient.users.getUser(user)
  }
  for(const email of user.emailAddresses) {
    if(email.id === user.primaryEmailAddressId) return email.emailAddress
  }
  throw new Error('Server error')
}

const getUserName = async (user: string|User): Promise<string> => {
  if(typeof user === 'string') {
    user = await clerkClient.users.getUser(user)
  }
  let name: string = ''
  if(user.firstName) name += user.firstName
  if(user.lastName) name += ' ' + user.lastName
  if(!name) name += await getPrimaryEmail(user)
  return name
}

const clerk = {
  getPrimaryEmail,
  getUserName
}

export default clerk