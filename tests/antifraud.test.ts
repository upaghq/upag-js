import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UpagJs } from '../src/client';
import { Antifraud } from '../src/resources/antifraud';

const TAGS = 'https://h.online-metrix.net/fp/tags.js';
const ORG_SANDBOX = '45ssiuz3';
const ORG_PRODUCTION = '9ozphlqx';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tagsScript(): HTMLScriptElement {
  return document.getElementById('upag-antifraud') as HTMLScriptElement;
}

describe('Antifraud', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('picks the production org from a pk_live_ key', () => {
    const upag = new UpagJs({ publicKey: 'pk_live_abc' });

    expect(upag.antifraud).toBeInstanceOf(Antifraud);
    expect(upag.antifraud.sessionId()).toMatch(UUID);
    expect(tagsScript().src).toContain(`${TAGS}?org_id=${ORG_PRODUCTION}&session_id=braspag_marlim_advanced`);
    expect(tagsScript().src).toContain(upag.antifraud.sessionId());
  });

  it('picks the sandbox org from a pk_test_ key', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc' });

    expect(tagsScript().src).toContain(`org_id=${ORG_SANDBOX}`);
  });

  it('treats an unknown pk_ key as production', () => {
    const upag = new UpagJs({ publicKey: 'pk_xxx' });

    expect(tagsScript().src).toContain(`org_id=${ORG_PRODUCTION}`);
  });

  it('rotate replaces the tag and the session id', () => {
    const upag = new UpagJs({ publicKey: 'pk_live_abc' });
    const first = upag.antifraud.sessionId();

    const next = upag.antifraud.rotate();

    expect(next).not.toBe(first);
    expect(upag.antifraud.sessionId()).toBe(next);
    expect(document.querySelectorAll('#upag-antifraud')).toHaveLength(1);
    expect(tagsScript().src).toContain(next);
  });
});
