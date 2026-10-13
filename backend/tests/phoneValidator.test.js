import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber, substituteTemplate } from '../src/utils/phoneValidator.js';

test('normalizePhoneNumber - standard 10-12 digit inputs', () => {
  const res1 = normalizePhoneNumber('+919876543210');
  assert.equal(res1.isValid, true);
  assert.equal(res1.normalized, '919876543210');
  assert.equal(res1.e164, '+919876543210');

  const res2 = normalizePhoneNumber('  +1 (555) 019-2834  ');
  assert.equal(res2.isValid, true);
  assert.equal(res2.normalized, '15550192834');
});

test('normalizePhoneNumber - invalid characters and length', () => {
  const resInvalid = normalizePhoneNumber('12345ABC');
  assert.equal(resInvalid.isValid, false);
  assert.match(resInvalid.error, /invalid characters/i);

  const resTooShort = normalizePhoneNumber('12345');
  assert.equal(resTooShort.isValid, false);
  assert.match(resTooShort.error, /length/i);

  const resEmpty = normalizePhoneNumber('');
  assert.equal(resEmpty.isValid, false);
});

test('substituteTemplate - replaces variables correctly', () => {
  const tpl = 'Hi {name}, your balance is {balance} for account {phone}.';
  const result = substituteTemplate(tpl, {
    name: 'Mayank',
    balance: '₹500',
    phone: '919876543210'
  });
  assert.equal(result, 'Hi Mayank, your balance is ₹500 for account 919876543210.');
});
