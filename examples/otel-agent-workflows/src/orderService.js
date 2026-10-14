'use strict';

const { setTimeout: wait } = require('node:timers/promises');

function createOrderService(options) {
  const { telemetry } = options;
  const orderCount = options.orderCount || 12;
  const queryDelayMs = options.queryDelayMs || 8;

  async function lookupUser(userId, parentSpan) {
    return telemetry.inSpan(
      'demo.db.user_lookup',
      {
        'db.operation.name': 'select',
        'db.collection.name': 'users',
        'demo.lookup.cardinality': 'single',
      },
      parentSpan,
      async () => {
        await wait(queryDelayMs);
        return { id: userId };
      },
    );
  }

  async function lookupUsers(userIds, parentSpan) {
    return telemetry.inSpan(
      'demo.db.user_batch_lookup',
      {
        'db.operation.name': 'select',
        'db.collection.name': 'users',
        'demo.lookup.cardinality': 'batch',
        'demo.lookup.item_count': userIds.length,
      },
      parentSpan,
      async () => {
        await wait(queryDelayMs);
        return new Map(userIds.map((id) => [id, { id }]));
      },
    );
  }

  async function listOrders(mode = 'nplus1') {
    if (!['nplus1', 'batch'].includes(mode)) {
      throw new Error(`Unsupported lookup mode: ${mode}`);
    }

    return telemetry.inSpan(
      'demo.orders.list',
      {
        'demo.lookup.mode': mode,
        'demo.order.count': orderCount,
      },
      null,
      async (requestSpan) => {
        const orders = Array.from({ length: orderCount }, (_, index) => ({
          id: index + 1,
          userId: index + 100,
        }));

        if (mode === 'batch') {
          const users = await lookupUsers(orders.map((order) => order.userId), requestSpan);
          return orders.map((order) => ({ ...order, user: users.get(order.userId) }));
        }

        const results = [];
        for (const order of orders) {
          const user = await lookupUser(order.userId, requestSpan);
          results.push({ ...order, user });
        }
        return results;
      },
    );
  }

  return {
    listOrders,
  };
}

module.exports = {
  createOrderService,
};
