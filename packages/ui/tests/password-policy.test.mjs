process.env.NODE_ENV = 'test';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { passwordError } from '../src/services/password-policy.ts';

test('new password validation explains each rejection', () => {
  for (const [password, message] of [['user123@example.com', 'email address'], ['abc12', 'at least 6'], ['abcdef', 'number'], ['123456', 'letter'], ['password123', 'common and weak'], ['A'.repeat(129) + '1', '128']]) {
    assert.ok(passwordError(password)?.includes(message));
  }
  for (const password of ['abc123', 'ABC123', 'Curator7', 'curator7!']) assert.equal(passwordError(password), null);
});
