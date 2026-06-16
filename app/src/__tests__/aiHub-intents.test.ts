/**
 * Unit tests for AI Hub intent mapping and flow validation.
 * Ensures the refactored hub routes each mode to the correct intent
 * and that generate_activity / generate_whatsapp are no longer
 * handled by startCollaborativeSession.
 */
import { describe, it, expect } from 'vitest';
import {
  modeToIntent,
  modeToHubLabelKey,
  intentCategory,
  isCreateIntent,
  isImproveIntent,
  isSupportIntent,
  AI_INTENTS,
} from '../shared/intent';

describe('modeToIntent mapping', () => {
  it('maps create-meeting → create_meeting', () => {
    expect(modeToIntent('create-meeting')).toBe('create_meeting');
  });

  it('maps improve-content → improve_content', () => {
    expect(modeToIntent('improve-content')).toBe('improve_content');
  });

  it('maps improve-content with adapt → improve_content', () => {
    expect(modeToIntent('improve-content', 'adapt')).toBe('improve_content');
  });

  it('maps generate-activity → generate_activity', () => {
    expect(modeToIntent('generate-activity')).toBe('generate_activity');
  });

  it('maps generate-whatsapp → generate_whatsapp', () => {
    expect(modeToIntent('generate-whatsapp')).toBe('generate_whatsapp');
  });

  it('maps support → generate_activity by default', () => {
    expect(modeToIntent('support')).toBe('generate_activity');
  });

  it('maps support with whatsapp subIntent → generate_whatsapp', () => {
    expect(modeToIntent('support', 'whatsapp')).toBe('generate_whatsapp');
  });

  it('maps unknown mode → create_meeting (safe default)', () => {
    expect(modeToIntent('unknown')).toBe('create_meeting');
  });

  it('maps ask → ask_theology', () => {
    expect(modeToIntent('ask')).toBe('ask_theology');
  });
});

describe('modeToHubLabelKey mapping', () => {
  it('returns hub.create_meeting for create-meeting', () => {
    expect(modeToHubLabelKey('create-meeting')).toBe('hub.create_meeting');
  });

  it('returns hub.existing_improve for improve-content', () => {
    expect(modeToHubLabelKey('improve-content')).toBe('hub.existing_improve');
  });

  it('returns hub.existing_adapt for improve-content with adapt', () => {
    expect(modeToHubLabelKey('improve-content', 'adapt')).toBe('hub.existing_adapt');
  });

  it('returns hub.existing_activity for generate-activity', () => {
    expect(modeToHubLabelKey('generate-activity')).toBe('hub.existing_activity');
  });

  it('returns hub.existing_whatsapp for generate-whatsapp', () => {
    expect(modeToHubLabelKey('generate-whatsapp')).toBe('hub.existing_whatsapp');
  });
});

describe('intent categories', () => {
  it('classifies create_meeting as create', () => {
    expect(intentCategory('create_meeting')).toBe('create');
    expect(isCreateIntent('create_meeting')).toBe(true);
  });

  it('classifies improve_content as improve', () => {
    expect(intentCategory('improve_content')).toBe('improve');
    expect(isImproveIntent('improve_content')).toBe(true);
  });

  it('classifies generate_activity as support', () => {
    expect(intentCategory('generate_activity')).toBe('support');
    expect(isSupportIntent('generate_activity')).toBe(true);
  });

  it('classifies generate_whatsapp as support', () => {
    expect(intentCategory('generate_whatsapp')).toBe('support');
    expect(isSupportIntent('generate_whatsapp')).toBe(true);
  });

  it('create_meeting is not support', () => {
    expect(isSupportIntent('create_meeting')).toBe(false);
  });

  it('improve_content is not support', () => {
    expect(isSupportIntent('improve_content')).toBe(false);
  });
});

describe('AI_INTENTS registry', () => {
  it('contains all five canonical intents', () => {
    expect(AI_INTENTS).toHaveLength(5);
    expect(AI_INTENTS).toContain('create_meeting');
    expect(AI_INTENTS).toContain('improve_content');
    expect(AI_INTENTS).toContain('generate_activity');
    expect(AI_INTENTS).toContain('generate_whatsapp');
    expect(AI_INTENTS).toContain('ask_theology');
  });
});

describe('Refactoring invariants', () => {
  it('generate_activity and generate_whatsapp are support intents (not create/improve)', () => {
    // These intents now use dedicated operations (generateActivityForMeeting,
    // generateWhatsAppMessage) — NOT startCollaborativeSession.
    // They should never be classified as create or improve.
    expect(isCreateIntent('generate_activity')).toBe(false);
    expect(isCreateIntent('generate_whatsapp')).toBe(false);
    expect(isImproveIntent('generate_activity')).toBe(false);
    expect(isImproveIntent('generate_whatsapp')).toBe(false);
  });

  it('create_meeting and improve_content are the only intents that use collaborative sessions', () => {
    // Only these two should be classified as create or improve.
    const collaborativeIntents = AI_INTENTS.filter(
      (i) => isCreateIntent(i) || isImproveIntent(i)
    );
    expect(collaborativeIntents).toEqual(['create_meeting', 'improve_content']);
  });
});
