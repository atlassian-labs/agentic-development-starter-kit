'use strict';

const { setTimeout: wait } = require('node:timers/promises');

function createDemoHandlers(mode = 'happy') {
  let reviewCount = 0;

  return {
    planner: async ({ traceTool }) => {
      await traceTool('repository.read', async () => {
        await wait(8);
      });
      return { artifact: '# Plan\n\nImplement the smallest tested change.' };
    },

    coder: async ({ attempt, traceTool }) => {
      await traceTool('source.edit', async () => {
        await wait(12);
      });
      await traceTool('tests.run', async () => {
        await wait(10);
        if (mode === 'error') {
          const error = new Error('The deterministic test command failed');
          error.name = 'TestCommandError';
          throw error;
        }
      });
      return { artifact: `Implementation attempt ${attempt}` };
    },

    reviewer: async ({ traceTool }) => {
      reviewCount += 1;
      await traceTool('review.inspect', async () => {
        await wait(7);
      });
      if (mode === 'bounce' && reviewCount === 1) {
        return {
          verdict: 'bounce',
          artifact: JSON.stringify({ verdict: 'bounce', issues: [{ severity: 'MUST_FIX' }] }),
        };
      }
      return {
        verdict: 'approve',
        artifact: JSON.stringify({ verdict: 'approve', issues: [] }),
      };
    },

    humanCheckpoint: async () => ({ verdict: 'approve', artifact: 'Approved' }),
  };
}

module.exports = {
  createDemoHandlers,
};
