import { relations } from 'drizzle-orm';
import {
  tenant,
  user,
  profile,
  product,
  productDeployment,
  subscription,
  entitlement,
  featureFlag,
  notification,
  report,
  auditLog,
  analyticsEvent,
  fileObject,
  tenantMembership,
} from './core';
import { messageThread, threadParticipant, message } from './messaging';
import { datingProfile, datingPhoto, datingSwipe, datingMatch } from './dating';
import { business, staff, service, booking, businessHours } from './booking';
import { listing, order } from './marketplace';
import { space, spaceMember, post, comment } from './community';
import { assistantSession, assistantMessage, agentTask, toolInvocation } from './ai-agent';

export const tenantRelations = relations(tenant, ({ many }) => ({
  users: many(user),
  products: many(product),
  deployments: many(productDeployment),
  memberships: many(tenantMembership),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  tenant: one(tenant, { fields: [user.tenantId], references: [tenant.id] }),
  profile: one(profile, { fields: [user.id], references: [profile.userId] }),
  subscriptions: many(subscription),
  entitlements: many(entitlement),
  notifications: many(notification),
  reportsFiled: many(report, { relationName: 'reporter' }),
  memberships: many(tenantMembership),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  tenant: one(tenant, { fields: [product.tenantId], references: [tenant.id] }),
  deployments: many(productDeployment),
}));

export const productDeploymentRelations = relations(productDeployment, ({ one }) => ({
  tenant: one(tenant, { fields: [productDeployment.tenantId], references: [tenant.id] }),
  product: one(product, { fields: [productDeployment.productId], references: [product.id] }),
}));

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  tenant: one(tenant, { fields: [subscription.tenantId], references: [tenant.id] }),
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
  product: one(product, { fields: [subscription.productId], references: [product.id] }),
  entitlements: many(entitlement),
}));

export const entitlementRelations = relations(entitlement, ({ one }) => ({
  user: one(user, { fields: [entitlement.userId], references: [user.id] }),
  subscription: one(subscription, {
    fields: [entitlement.subscriptionId],
    references: [subscription.id],
  }),
}));

export const messageThreadRelations = relations(messageThread, ({ one, many }) => ({
  tenant: one(tenant, { fields: [messageThread.tenantId], references: [tenant.id] }),
  product: one(product, { fields: [messageThread.productId], references: [product.id] }),
  participants: many(threadParticipant),
  messages: many(message),
}));

export const threadParticipantRelations = relations(threadParticipant, ({ one }) => ({
  thread: one(messageThread, {
    fields: [threadParticipant.threadId],
    references: [messageThread.id],
  }),
  user: one(user, { fields: [threadParticipant.userId], references: [user.id] }),
}));

export const messageRelations = relations(message, ({ one }) => ({
  thread: one(messageThread, { fields: [message.threadId], references: [messageThread.id] }),
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
}));

export const datingProfileRelations = relations(datingProfile, ({ many, one }) => ({
  photos: many(datingPhoto),
  user: one(user, { fields: [datingProfile.userId], references: [user.id] }),
  product: one(product, { fields: [datingProfile.productId], references: [product.id] }),
}));

export const datingPhotoRelations = relations(datingPhoto, ({ one }) => ({
  profile: one(datingProfile, { fields: [datingPhoto.profileId], references: [datingProfile.id] }),
}));

export const datingMatchRelations = relations(datingMatch, ({ one }) => ({
  userA: one(user, { fields: [datingMatch.userAId], references: [user.id], relationName: 'matchA' }),
  userB: one(user, { fields: [datingMatch.userBId], references: [user.id], relationName: 'matchB' }),
}));

export const businessRelations = relations(business, ({ many, one }) => ({
  staff: many(staff),
  services: many(service),
  bookings: many(booking),
  product: one(product, { fields: [business.productId], references: [product.id] }),
}));

export const bookingRelations = relations(booking, ({ one }) => ({
  business: one(business, { fields: [booking.businessId], references: [business.id] }),
  service: one(service, { fields: [booking.serviceId], references: [service.id] }),
  staff: one(staff, { fields: [booking.staffId], references: [staff.id] }),
}));

export const listingRelations = relations(listing, ({ one, many }) => ({
  seller: one(user, { fields: [listing.sellerId], references: [user.id] }),
  product: one(product, { fields: [listing.productId], references: [product.id] }),
  orders: many(order),
}));

export const orderRelations = relations(order, ({ one }) => ({
  listing: one(listing, { fields: [order.listingId], references: [listing.id] }),
  buyer: one(user, { fields: [order.buyerId], references: [user.id], relationName: 'buyer' }),
  seller: one(user, { fields: [order.sellerId], references: [user.id], relationName: 'seller' }),
}));

export const spaceRelations = relations(space, ({ many, one }) => ({
  members: many(spaceMember),
  posts: many(post),
  product: one(product, { fields: [space.productId], references: [product.id] }),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  space: one(space, { fields: [post.spaceId], references: [space.id] }),
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  comments: many(comment),
}));

export const assistantSessionRelations = relations(assistantSession, ({ many, one }) => ({
  messages: many(assistantMessage),
  tasks: many(agentTask),
  user: one(user, { fields: [assistantSession.userId], references: [user.id] }),
}));

export const agentTaskRelations = relations(agentTask, ({ one, many }) => ({
  session: one(assistantSession, {
    fields: [agentTask.sessionId],
    references: [assistantSession.id],
  }),
  owner: one(user, { fields: [agentTask.ownerId], references: [user.id] }),
  invocations: many(toolInvocation),
}));

// silence unused warnings for tables only referenced by relations metadata
void [
  profile,
  featureFlag,
  notification,
  report,
  auditLog,
  analyticsEvent,
  fileObject,
  staff,
  service,
  businessHours,
  spaceMember,
  comment,
  assistantMessage,
  toolInvocation,
];
